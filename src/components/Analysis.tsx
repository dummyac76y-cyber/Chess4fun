import { useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { evaluateBoard } from '../utils/chessBot';

interface AnalysisProps {
  game: Chess;
  analysis: { score: number; lastMove: string | null } | null;
  enabled: boolean;
}

function evalLabel(cp: number): { text: string; color: string } {
  if (cp >= 150) return { text: 'Winning', color: 'text-green-400' };
  if (cp >= 50) return { text: 'Slightly better', color: 'text-green-300' };
  if (cp > -50) return { text: 'Equal', color: 'text-white/70' };
  if (cp > -150) return { text: 'Slightly worse', color: 'text-orange-300' };
  return { text: 'Losing', color: 'text-red-400' };
}

export function Analysis({ game, analysis, enabled }: AnalysisProps) {
  const fen = game.fen();
  const [evalScore, setEvalScore] = useState<number>(0);

  // Debounced static evaluation of the current position.
  useEffect(() => {
    if (!enabled) return;
    const handle = window.setTimeout(() => {
      setEvalScore(evaluateBoard(new Chess(fen)));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [fen, enabled]);

  if (!enabled) {
    return (
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(25px)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <h3 className="text-white/70 text-sm font-semibold mb-3">Analysis</h3>
        <p className="text-white/40 text-sm italic">Move quality is disabled in settings.</p>
      </div>
    );
  }

  const whitePct = Math.max(5, Math.min(95, 100 * (1 / (1 + Math.pow(10, -evalScore / 400)))));
  const label = evalLabel(evalScore);
  const displayCp = Math.abs(evalScore / 100).toFixed(1);

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(25px)',
        border: '1px solid rgba(255,255,255,0.15)',
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-white/70 text-sm font-semibold">Evaluation</h3>
        <span className={`text-sm font-medium ${label.color}`}>{label.text}</span>
      </div>

      {/* White/black advantage bar */}
      <div className="h-3 w-full rounded-full overflow-hidden bg-[#2d2d2d] border border-white/10">
        <div
          className="h-full bg-white transition-all duration-500"
          style={{ width: `${whitePct}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-white/60">
        <span>White +{displayCp}</span>
        <span>{evalScore >= 0 ? '+' : ''}{(evalScore / 100).toFixed(1)}</span>
        <span>Black +{displayCp}</span>
      </div>

      {analysis?.lastMove && (
        <p className="text-white/50 text-xs">Last move: <span className="text-white/80 font-medium">{analysis.lastMove}</span></p>
      )}
    </div>
  );
}
