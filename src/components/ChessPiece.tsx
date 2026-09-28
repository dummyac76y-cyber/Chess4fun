import { memo } from 'react';

interface ChessPieceProps {
  type: 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
  color: 'w' | 'b';
  size?: number;
}

// Pre-rendered path data per piece type (fill/stroke injected at render time).
const SHAPES: Record<ChessPieceProps['type'], string[]> = {
  p: [
    'circle:30:18:7',
    'path:M 22 45 Q 22 32 30 26 Q 38 32 38 45 Z',
    'rect:19:45:22:6',
  ],
  r: [
    'path:M 19 12 L 19 20 L 22 20 L 22 16 L 26 16 L 26 20 L 34 20 L 34 16 L 38 16 L 38 20 L 41 20 L 41 12 Z',
    'rect:21:20:18:18',
    'rect:18:38:24:7',
    'rect:16:45:28:6',
  ],
  n: [
    'path:M 22 45 L 22 28 Q 22 20 26 16 L 28 12 L 32 16 Q 38 20 38 28 L 38 45 Z',
    'path:M 26 16 L 24 14 L 26 12 L 28 14 Z',
    'dot:28:22',
    'line:24:28:32:28',
    'rect:18:45:24:6',
  ],
  b: [
    'circle:30:14:5',
    'path:M 24 45 Q 24 28 30 18 Q 36 28 36 45 Z',
    'line:30:14:30:24',
    'line:26:18:34:18',
    'rect:20:45:20:6',
  ],
  q: [
    'circle:30:10:3',
    'circle:22:16:2.5',
    'circle:38:16:2.5',
    'circle:18:22:2',
    'circle:42:22:2',
    'path:M 20 45 Q 20 28 24 24 L 30 20 L 36 24 Q 40 28 40 45 Z',
    'rect:19:45:22:6',
  ],
  k: [
    'line:30:6:30:16:2.5',
    'line:25:11:35:11:2.5',
    'path:M 24 45 Q 24 28 30 18 Q 36 28 36 45 Z',
    'rect:20:45:20:6',
  ],
};

export const ChessPiece = memo(function ChessPiece({ type, color, size = 60 }: ChessPieceProps) {
  const isWhite = color === 'w';
  const fillColor = isWhite ? '#ffffff' : '#2d2d2d';
  const strokeColor = isWhite ? '#666666' : '#000000';
  const shadowColor = isWhite ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.6)';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      className="select-none pointer-events-none"
      style={{ filter: `drop-shadow(0 3px 6px ${shadowColor})` }}
    >
      {SHAPES[type].map((shape, i) => {
        const parts = shape.split(':');
        switch (parts[0]) {
          case 'circle':
            return <circle key={i} cx={+parts[1]} cy={+parts[2]} r={+parts[3]} fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />;
          case 'rect':
            return <rect key={i} x={+parts[1]} y={+parts[2]} width={+parts[3]} height={+parts[4]} rx="1" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />;
          case 'path':
            return <path key={i} d={shape.slice(5)} fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />;
          case 'line':
            return <line key={i} x1={+parts[1]} y1={+parts[2]} x2={+parts[3]} y2={+parts[4]} stroke={strokeColor} strokeWidth={parts[5] ? +parts[5] : 1.5} />;
          case 'dot':
            return <circle key={i} cx={+parts[1]} cy={+parts[2]} r="1.5" fill={strokeColor} />;
          default:
            return null;
        }
      })}
    </svg>
  );
});
