import { memo, useId } from 'react';

interface ChessPieceProps {
  type: 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
  color: 'w' | 'b';
  size?: number;
}

/**
 * Redesigned chess pieces: hand-crafted SVG silhouettes on a 45x45 canvas
 * (classic Staunton-inspired proportions), rendered with per-color linear
 * gradients for a subtle 3D sheen plus a thin outline for contrast.
 */

// Shared palette for both armies.
const OUTLINE = { w: '#5a5f68', b: '#000000' };
const DETAIL = { w: '#5a5f68', b: '#e8e8e6' }; // eyes / carved accents
const GRADIENTS = {
  w: ['#ffffff', '#f1efe7', '#d3d0c3'],
  b: ['#6f7379', '#33373d', '#101215'],
};

type FillMode = 'grad' | 'detail' | 'cut';

// Each piece is an array of SVG primitives drawn in order.
type Shape =
  | ['circle', number, number, number, FillMode?] // cx, cy, r
  | ['ellipse', number, number, number, number, FillMode?] // cx, cy, rx, ry
  | ['rect', number, number, number, number, FillMode?] // x, y, w, h (rx=1)
  | ['path', string, FillMode?]
  | ['cross', number, number, number]; // center-x, top-y, scale (king's cross)

const PIECES: Record<ChessPieceProps['type'], Shape[]> = {
  p: [
    ['path', 'M 13 42 L 32 42 L 30.5 37.5 Q 30 36 28.5 36 L 16.5 36 Q 15 36 14.5 37.5 Z'], // flared base
    ['path', 'M 17 35 Q 17.5 29 20 25.5 Q 22.5 29 23 35 Z'], // collar
    ['path', 'M 20 25 Q 15.5 21 16.5 15.5 Q 17.5 10.5 22.5 10.5 Q 27.5 10.5 28.5 15.5 Q 29.5 21 25 25 Z'], // body + head
  ],
  r: [
    ['path', 'M 11 42 L 34 42 L 32.5 37.5 Q 32 36 30.5 36 L 14.5 36 Q 13 36 12.5 37.5 Z'], // base
    ['path', 'M 14.5 35.5 Q 14 24 15 18 L 29 18 Q 30 24 29.5 35.5 Z'], // tapered shaft
    ['rect', 13, 14.5, 19, 3.5], // band under crenellations
    ['path', 'M 12 15 L 12 6 L 16.5 6 L 16.5 9 L 19.75 9 L 19.75 6 L 24.25 6 L 24.25 9 L 27.5 9 L 27.5 6 L 32 6 L 32 15 Z'], // crenellated tower
  ],
  n: [
    ['path', 'M 11 42 L 34 42 L 32.5 37.5 Q 32 36 30.5 36 L 14.5 36 Q 13 36 12.5 37.5 Z'], // base
    ['path', 'M 13.5 36 Q 12.5 28.5 16 24.5 Q 18.5 21.5 18.5 18.5 L 15.5 15.5 L 13.5 16.5 L 11.5 13 L 15 9.5 Q 17.5 6.5 21.5 5.5 L 22.5 3 L 25 6 Q 31 7.5 32.5 15 Q 34 22.5 32 36 Z'], // horse head + neck
    ['path', 'M 18.5 18.5 Q 21.5 19.5 23.5 22.5', 'cut'], // jaw / mane divider
    ['circle', 20.5, 11.5, 1.3, 'detail'], // eye
  ],
  b: [
    ['path', 'M 12 42 L 33 42 L 31.5 37.5 Q 31 36 29.5 36 L 15.5 36 Q 14 36 13.5 37.5 Z'], // base
    ['ellipse', 22.5, 34, 8, 2.6], // collar
    ['path', 'M 15.5 33 Q 14.5 24.5 18 18.5 Q 20.5 14.5 22.5 11 Q 24.5 14.5 27 18.5 Q 30.5 24.5 29.5 33 Q 26 35 22.5 35 Q 19 35 15.5 33 Z'], // mitre
    ['circle', 22.5, 8, 2.6], // finial
    ['path', 'M 27 13 L 30.5 20', 'cut'], // classic diagonal slit
  ],
  q: [
    ['path', 'M 10.5 42 L 34.5 42 L 33 37.5 Q 32.5 36 31 36 L 14 36 Q 12.5 36 12 37.5 Z'], // base
    ['path', 'M 14 35.5 Q 13.5 27 16 21.5 L 29 21.5 Q 31.5 27 31 35.5 Z'], // tapered body
    ['rect', 13, 19, 19, 3], // crown band
    ['path', 'M 13.5 20 L 9.5 9.5 L 15.5 15.5 L 18.5 7.5 L 22.5 15 L 26.5 7.5 L 29.5 15.5 L 35.5 9.5 L 31.5 20 Z'], // five-point crown
    ['circle', 9.5, 8.3, 2.1], // pearl, left
    ['circle', 18.5, 6.3, 2.1], // pearl
    ['circle', 22.5, 5, 2.3], // pearl, center (largest)
    ['circle', 26.5, 6.3, 2.1], // pearl
    ['circle', 35.5, 8.3, 2.1], // pearl, right
  ],
  k: [
    ['path', 'M 10.5 42 L 34.5 42 L 33 37.5 Q 32.5 36 31 36 L 14 36 Q 12.5 36 12 37.5 Z'], // base
    ['path', 'M 14 35.5 Q 13.5 26 16.5 20.5 L 28.5 20.5 Q 31.5 26 31 35.5 Z'], // tapered body
    ['path', 'M 13 22 Q 14 16.5 18 13.5 Q 22.5 10.5 27 13.5 Q 31 16.5 32 22 Q 27 25 22.5 25 Q 18 25 13 22 Z'], // crown band
    ['path', 'M 13.5 21.5 L 11 11.5 L 16 16 L 19.5 10 L 22.5 15.5 L 25.5 10 L 29 16 L 34 11.5 L 31.5 21.5 Z'], // pointed crown
    ['cross', 22.5, 2, 1], // royal cross
  ],
};

export const ChessPiece = memo(function ChessPiece({ type, color, size = 60 }: ChessPieceProps) {
  const gradientId = `piece-grad-${useId().replace(/:/g, '')}`;
  const [light, mid, dark] = GRADIENTS[color];
  const outline = OUTLINE[color];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 45 45"
      className="select-none pointer-events-none"
      style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.45))' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="55%" stopColor={mid} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
      </defs>
      {PIECES[type].map((shape, i) => {
        const kind = shape[0];
        if (kind === 'circle') {
          const [, cx, cy, r, mode] = shape;
          if (mode === 'detail') {
            return <circle key={i} cx={cx} cy={cy} r={r} fill={DETAIL[color]} />;
          }
          return <circle key={i} cx={cx} cy={cy} r={r} fill={`url(#${gradientId})`} stroke={outline} strokeWidth="1.2" />;
        }
        if (kind === 'ellipse') {
          const [, cx, cy, rx, ry] = shape;
          return <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${gradientId})`} stroke={outline} strokeWidth="1.2" />;
        }
        if (kind === 'rect') {
          const [, x, y, w, h] = shape;
          return <rect key={i} x={x} y={y} width={w} height={h} rx="1" fill={`url(#${gradientId})`} stroke={outline} strokeWidth="1.2" />;
        }
        if (kind === 'cross') {
          const [, cx, topY, s] = shape;
          return (
            <path
              key={i}
              d={`M ${cx - 1.5 * s} ${topY} L ${cx + 1.5 * s} ${topY} L ${cx + 1.5 * s} ${topY + 3 * s} L ${cx + 4.5 * s} ${topY + 3 * s} L ${cx + 4.5 * s} ${topY + 6 * s} L ${cx + 1.5 * s} ${topY + 6 * s} L ${cx + 1.5 * s} ${topY + 9 * s} L ${cx - 1.5 * s} ${topY + 9 * s} L ${cx - 1.5 * s} ${topY + 6 * s} L ${cx - 4.5 * s} ${topY + 6 * s} L ${cx - 4.5 * s} ${topY + 3 * s} L ${cx - 1.5 * s} ${topY + 3 * s} Z`}
              fill={`url(#${gradientId})`}
              stroke={outline}
              strokeWidth="1.2"
            />
          );
        }
        // path
        const [, d, mode] = shape;
        if (mode === 'cut') {
          // Carved detail line (bishop slit, knight mane): knocked out of the
          // shapes beneath it via blend-mode, then faintly re-highlighted.
          return (
            <g key={i} style={{ isolation: 'isolate' }}>
              <path d={d} stroke={outline} strokeWidth="2" fill="none" strokeLinecap="round" style={{ mixBlendMode: 'destination-out' as unknown as React.CSSProperties['mixBlendMode'] }} />
              <path d={d} stroke={DETAIL[color]} strokeWidth="0.6" fill="none" strokeLinecap="round" opacity="0.5" />
            </g>
          );
        }
        return <path key={i} d={d} fill={`url(#${gradientId})`} stroke={outline} strokeWidth="1.2" strokeLinejoin="round" />;
      })}
    </svg>
  );
});
