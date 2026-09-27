interface ChessPieceProps {
  type: 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
  color: 'w' | 'b';
  size?: number;
}

export function ChessPiece({ type, color, size = 60 }: ChessPieceProps) {
  const isWhite = color === 'w';
  
  // Professional chess piece colors
  const fillColor = isWhite ? '#ffffff' : '#2d2d2d';
  const strokeColor = isWhite ? '#666666' : '#000000';
  const shadowColor = isWhite ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.6)';
  
  const pieces: Record<string, JSX.Element> = {
    p: (
      <g>
        <circle cx="30" cy="18" r="7" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        <path d="M 22 45 Q 22 32 30 26 Q 38 32 38 45 Z" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        <rect x="19" y="45" width="22" height="6" rx="1" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
      </g>
    ),
    r: (
      <g>
        <path d="M 19 12 L 19 20 L 22 20 L 22 16 L 26 16 L 26 20 L 34 20 L 34 16 L 38 16 L 38 20 L 41 20 L 41 12 Z" 
              fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        <rect x="21" y="20" width="18" height="18" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        <rect x="18" y="38" width="24" height="7" rx="1" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        <rect x="16" y="45" width="28" height="6" rx="1" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
      </g>
    ),
    n: (
      <g>
        <path d="M 22 45 L 22 28 Q 22 20 26 16 L 28 12 L 32 16 Q 38 20 38 28 L 38 45 Z" 
              fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        <path d="M 26 16 L 24 14 L 26 12 L 28 14 Z" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
        <circle cx="28" cy="22" r="1.5" fill={strokeColor} />
        <path d="M 24 28 Q 28 30 32 28" fill="none" stroke={strokeColor} strokeWidth="1.5" />
        <rect x="18" y="45" width="24" height="6" rx="1" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
      </g>
    ),
    b: (
      <g>
        <circle cx="30" cy="14" r="5" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        <path d="M 24 45 Q 24 28 30 18 Q 36 28 36 45 Z" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        <line x1="30" y1="14" x2="30" y2="24" stroke={strokeColor} strokeWidth="1.5" />
        <line x1="26" y1="18" x2="34" y2="18" stroke={strokeColor} strokeWidth="1.5" />
        <rect x="20" y="45" width="20" height="6" rx="1" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
      </g>
    ),
    q: (
      <g>
        <circle cx="30" cy="10" r="3" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        <circle cx="22" cy="16" r="2.5" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
        <circle cx="38" cy="16" r="2.5" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
        <circle cx="18" cy="22" r="2" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
        <circle cx="42" cy="22" r="2" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
        <path d="M 20 45 Q 20 28 24 24 L 30 20 L 36 24 Q 40 28 40 45 Z" 
              fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        <rect x="19" y="45" width="22" height="6" rx="1" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
      </g>
    ),
    k: (
      <g>
        <line x1="30" y1="6" x2="30" y2="16" stroke={strokeColor} strokeWidth="2.5" />
        <line x1="25" y1="11" x2="35" y2="11" stroke={strokeColor} strokeWidth="2.5" />
        <path d="M 24 45 Q 24 28 30 18 Q 36 28 36 45 Z" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        <rect x="20" y="45" width="20" height="6" rx="1" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
      </g>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      className="select-none pointer-events-none"
      style={{
        filter: `drop-shadow(0 3px 6px ${shadowColor})`,
      }}
    >
      {pieces[type]}
    </svg>
  );
}
