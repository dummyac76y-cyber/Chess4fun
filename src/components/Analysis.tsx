import { useEffect, useState } from 'react';
import { Chess, Move } from 'chess.js';
import { ArrowRight, BrainCircuit, RefreshCw, TrendingUp } from 'lucide-react';
import { evaluateBoard, findBestMove } from '../utils/chessBot';
import { Difficulty } from '../App';

interface AnalysisProps {
  game: Chess;
  analysis: { score: number; lastMove: string | null; quality?: string; qualityLoss?: number } | null;
  enabled: boolean;
  onBestMove: (move: { from: string; to: string } | null) => void;
}

function evalLabel(cp: number): { text: string; tone: string } {
  if (cp >= 250) return { text: 'White is winning', tone: 'text-emerald-300' };
  if (cp >= 70) return { text: 'White has an edge', tone: 'text-emerald-200' };
  if (cp > -70) return { text: 'Position is equal', tone: 'text-zinc-300' };
  if (cp > -250) return { text: 'Black has an edge', tone: 'text-amber-200' };
  return { text: 'Black is winning', tone: 'text-rose-300' };
}

export function Analysis({ game, analysis, enabled, onBestMove }: AnalysisProps) {
  const fen = game.fen();
  const [evalScore, setEvalScore] = useState(0);
  const [bestMove, setBestMove] = useState<Move | null>(null);
  const [thinking, setThinking] = useState(false);
  const [candidateRows, setCandidateRows] = useState<{ san: string; score: number }[]>([]);
  const sideToMove = game.turn();

  useEffect(() => {
    onBestMove(null);
    setBestMove(null);
    setCandidateRows([]);
    if (!enabled) return;
    const handle = window.setTimeout(() => {
      const position = new Chess(fen);
      setEvalScore(evaluateBoard(position));
    }, 180);
    return () => window.clearTimeout(handle);
  }, [fen, enabled, onBestMove]);

  const label = evalLabel(evalScore);
  const whitePct = Math.max(3, Math.min(97, 100 / (1 + Math.exp(-evalScore / 260))));

  const requestBestMove = () => {
    if (thinking || game.isGameOver()) return;
    setThinking(true);
    // Yield one frame before search so the analysis panel can show its busy state.
    window.setTimeout(() => {
      try {
        const position = new Chess(fen);
        const candidates = (position.moves({ verbose: true }) as Move[]).map((move) => {
          position.move(move);
          const score = evaluateBoard(position);
          position.undo();
          return { san: move.san, score: sideToMove === 'w' ? score : -score, move };
        }).sort((a, b) => b.score - a.score).slice(0, 5);
        const result = findBestMove(fen, 'hard');
        setCandidateRows(candidates.map(({ san, score }) => ({ san, score })));
        setBestMove(result);
        onBestMove(result ? { from: result.from, to: result.to } : null);
      } finally {
        setThinking(false);
      }
    }, 30);
  };

  if (!enabled) return (
    <section className="analysis-panel">
      <h3 className="analysis-title">Position analysis</h3>
      <p className="analysis-muted">Move analysis is disabled in settings.</p>
    </section>
  );

  return (
    <section className="analysis-panel">
      <div className="analysis-heading">
        <div><span className="analysis-kicker">ENGINE INSIGHT</span><h3>Position evaluation</h3></div>
        <BrainCircuit size={20} className="analysis-icon" />
      </div>
      <div className="analysis-score-row">
        <strong className={label.tone}>{(evalScore / 100 > 0 ? '+' : '') + (evalScore / 100).toFixed(1)}</strong>
        <span className={label.tone}>{label.text}</span>
      </div>
      <div className="analysis-advantage-track" role="img" aria-label={`White evaluation ${evalScore / 100} pawns`}>
        <div className="analysis-white-advantage" style={{ width: `${whitePct}%` }} />
        <span className="analysis-center-mark" />
      </div>
      <div className="analysis-scale"><span>Black advantage</span><span>Equal</span><span>White advantage</span></div>

      <button type="button" className="analysis-best-button" onClick={requestBestMove} disabled={thinking || game.isGameOver()}>
        {thinking ? <RefreshCw size={16} className="analysis-spin" /> : <TrendingUp size={16} />}
        {thinking ? 'Calculating best move…' : 'Find best move'}
        {!thinking && <ArrowRight size={16} />}
      </button>

      {bestMove && (
        <div className="analysis-recommendation">
          <div className="analysis-recommendation-mark"><BrainCircuit size={18} /></div>
          <div className="analysis-recommendation-copy">
            <span>ENGINE RECOMMENDATION</span>
            <strong>{bestMove.san}</strong>
            <small>{bestMove.from} → {bestMove.to} · highlighted on board</small>
          </div>
          <button className="analysis-clear-button" onClick={() => { setBestMove(null); onBestMove(null); }} aria-label="Clear best move">×</button>
        </div>
      )}

      {candidateRows.length > 0 && (
        <div className="analysis-candidates">
          <div className="analysis-subheading"><span>Candidate moves</span><small>Quick position estimates</small></div>
          {candidateRows.map((row, index) => {
            const barWidth = Math.max(5, Math.min(100, 50 + row.score / 12));
            return <div className="analysis-candidate" key={row.san}>
              <span className="analysis-candidate-rank">{index + 1}</span>
              <strong>{row.san}</strong>
              <div className="analysis-candidate-track"><span style={{ width: `${barWidth}%` }} /></div>
              <small>{row.score >= 0 ? '+' : ''}{(row.score / 100).toFixed(1)}</small>
            </div>;
          })}
        </div>
      )}
      {analysis?.lastMove && <p className="analysis-last-move">Last move played: <strong>{analysis.lastMove}</strong></p>}
      {analysis?.quality && <div className={`analysis-quality analysis-quality-${analysis.quality.toLowerCase()}`}><span>{analysis.quality}</span><small>Estimated loss: {analysis.qualityLoss ?? 0} cp · quick local review</small></div>}
      <p className="analysis-footnote">Evaluations are local estimates. Candidate bars are one-ply material/position scores; the recommended move uses deeper search.</p>
    </section>
  );
}
