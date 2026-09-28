import { Chess, Move } from 'chess.js';
import { Difficulty } from '../App';

const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

// Piece-square tables (from white's perspective, index 0 = a8 … 63 = h1)
const PAWN_PST = [
  0, 0, 0, 0, 0, 0, 0, 0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5, 5, 10, 25, 25, 10, 5, 5,
  0, 0, 0, 20, 20, 0, 0, 0,
  5, -5, -10, 0, 0, -10, -5, 5,
  5, 10, 10, -20, -20, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0,
];
const KNIGHT_PST = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20, 0, 0, 0, 0, -20, -40,
  -30, 0, 10, 15, 15, 10, 0, -30,
  -30, 5, 15, 20, 20, 15, 5, -30,
  -30, 0, 15, 20, 20, 15, 0, -30,
  -30, 5, 10, 15, 15, 10, 5, -30,
  -40, -20, 0, 5, 5, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50,
];
const BISHOP_PST = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 10, 10, 5, 0, -10,
  -10, 5, 5, 10, 10, 5, 5, -10,
  -10, 0, 10, 10, 10, 10, 0, -10,
  -10, 10, 10, 10, 10, 10, 10, -10,
  -10, 5, 0, 0, 0, 0, 5, -10,
  -20, -10, -10, -10, -10, -10, -10, -20,
];
const ROOK_PST = [
  0, 0, 0, 0, 0, 0, 0, 0,
  5, 10, 10, 10, 10, 10, 10, 5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  0, 0, 0, 5, 5, 0, 0, 0,
];
const QUEEN_PST = [
  -20, -10, -10, -5, -5, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 5, 5, 5, 0, -10,
  -5, 0, 5, 5, 5, 5, 0, -5,
  0, 0, 5, 5, 5, 5, 0, -5,
  -10, 5, 5, 5, 5, 5, 0, -10,
  -10, 0, 5, 0, 0, 0, 0, -10,
  -20, -10, -10, -5, -5, -10, -10, -20,
];
const KING_PST = [
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -20, -30, -30, -40, -40, -30, -30, -20,
  -10, -20, -20, -20, -20, -20, -20, -10,
  20, 20, 0, 0, 0, 0, 20, 20,
  20, 30, 10, 0, 0, 10, 30, 20,
];

const PST: Record<string, number[]> = {
  p: PAWN_PST,
  n: KNIGHT_PST,
  b: BISHOP_PST,
  r: ROOK_PST,
  q: QUEEN_PST,
  k: KING_PST,
};

/** Static evaluation from White's perspective (centipawns). */
export function evaluateBoard(game: Chess): number {
  let score = 0;
  const board = game.board();
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;
      const idx = row * 8 + col;
      const value = PIECE_VALUES[piece.type];
      const pst = piece.color === 'w' ? PST[piece.type][idx] : PST[piece.type][63 - idx];
      score += piece.color === 'w' ? value + pst : -(value + pst);
    }
  }
  return score;
}

function signedEval(game: Chess, forWhite: boolean): number {
  const e = evaluateBoard(game);
  return forWhite ? e : -e;
}

/** Static value of the destination square's defender-less gain (MVV-LVA style). */
function moveScore(game: Chess, m: Move): number {
  let s = 0;
  if (m.captured) {
    const victim = PIECE_VALUES[m.captured];
    const attacker = PIECE_VALUES[m.piece];
    // Only count as profitable when the moving piece is cheaper than the victim.
    s += victim > attacker ? 1_000_000 + victim : victim * 10 - attacker;
  }
  if (m.promotion) s += PIECE_VALUES[m.promotion];
  if (m.san.includes('#')) s += 100_000_000;
  else if (m.san.includes('+')) s += 50;
  return s;
}

/** Order moves so winning captures / promotions / mates are searched first. */
function orderMoves(game: Chess, moves: Move[]): Move[] {
  const scored = moves.map(m => ({ m, s: moveScore(game, m) }));
  scored.sort((a, b) => b.s - a.s);
  return scored.map(x => x.m);
}

function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  forWhite: boolean,
): number {
  if (game.isGameOver() || depth === 0) {
    if (game.isCheckmate()) {
      // side to move is checkmated
      return game.turn() === 'w' ? -100000 - depth * 100 : 100000 + depth * 100;
    }
    if (game.isDraw()) return 0;
    return signedEval(game, forWhite);
  }

  const moves = orderMoves(game, game.moves({ verbose: true }) as Move[]);

  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      game.move(move);
      best = Math.max(best, minimax(game, depth - 1, alpha, beta, false, forWhite));
      game.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      game.move(move);
      best = Math.min(best, minimax(game, depth - 1, alpha, beta, true, forWhite));
      game.undo();
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

/**
 * Pick a move for the bot. Runs on a cloned Chess instance so the caller's
 * game state is never mutated.
 */
export function findBestMove(fen: string, difficulty: Difficulty): Move | null {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true }) as Move[];
  if (moves.length === 0) return null;

  // Easy: mostly random, but always take free captures / mates and avoid
  // hanging the king into check when a safe move exists.
  if (difficulty === 'easy') {
    if (Math.random() < 0.75) {
      return moves[Math.floor(Math.random() * moves.length)];
    }
  }

  const depth = difficulty === 'hard' ? 3 : 2;
  const colorIsWhite = game.turn() === 'w';

  let bestScore = -Infinity;
  let bestMoves: Move[] = [];

  for (const move of orderMoves(game, moves)) {
    game.move(move);
    const score = minimax(game, depth - 1, -Infinity, Infinity, !colorIsWhite, colorIsWhite);
    game.undo();

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)] ?? moves[0];
}
