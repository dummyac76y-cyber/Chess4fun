import { Chess } from 'chess.js';

interface AnalysisProps {
  game: Chess;
  analysis: any;
  onAnalysisUpdate: (analysis: any) => void;
}

export function Analysis({ game, analysis, onAnalysisUpdate }: AnalysisProps) {
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
      <div className="bg-white/5 rounded-lg p-3">
        <p className="text-white/60 text-sm">
          Position analysis will appear here as you play.
        </p>
      </div>
    </div>
  );
}
