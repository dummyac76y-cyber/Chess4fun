interface ChessPieceProps {
  type: 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
  color: 'w' | 'b';
  size?: number;
}

export function ChessPiece({ type, color, size = 60 }: ChessPieceProps) {
  const isWhite = color === 'w';
  
  // Modern glassmorphism colors
  const fillColor = isWhite ? '#ffffff' : '#1a1a2e';
  const strokeColor = isWhite ? '#e0e0e0' : '#0a0a1a';
  const shadowColor = isWhite ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.5)';
  const glowColor = isWhite ? 'rgba(255,255,255,0.8)' : 'rgba(100,100,255,0.3)';
  
  const pieces: Record<string, JSX.Element> = {
    p: (
      <g>
        <circle cx="30" cy="20" r="8" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        <path d="M 22 45 Q 22 35 30 30 Q 38 35 38 45 Z" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        <rect x="18" y="45" width="24" height="8" rx="2" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
      </g>
    ),
    r: (
      <g>
        <rect x="18" y="15" width="24" height="10" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        <rect x="20" y="10" width="4" height="5" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
        <rect x="28" y="10" width="4" height="5" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
        <rect x="36" y="10" width="4" height="5" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
        <rect x="20" y="25" width="20" height="20" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        <rect x="16" y="45" width="28" height="8" rx="2" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
      </g>
    ),
    n: (
      <g>
        <path d="M 20 45 L 20 30 Q 20 20 25 15 L 30 10 L 35 15 Q 40 20 40 30 L 40 45 Z" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        <circle cx="28" cy="20" r="2" fill={strokeColor} />
        <path d="M 25 25 Q 28 28 32 25" fill="none" stroke={strokeColor} strokeWidth="1.5" />
        <rect x="16" y="45" width="28" height="8" rx="2" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
      </g>
    ),
    b: (
      <g>
        <circle cx="30" cy="15" r="6" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        <path d="M 22 45 Q 22 30 30 20 Q 38 30 38 45 Z" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        <line x1="30" y1="15" x2="30" y2="25" stroke={strokeColor} strokeWidth="1.5" />
        <rect x="18" y="45" width="24" height="8" rx="2" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
      </g>
    ),
    q: (
      <g>
        <circle cx="30" cy="12" r="4" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        <circle cx="20" cy="18" r="3" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
        <circle cx="40" cy="18" r="3" fill={fillColor} stroke={strokeColor} strokeWidth="1" />
        <path d="M 20 45 Q 20 30 25 25 L 30 20 L 35 25 Q 40 30 40 45 Z" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        <rect x="18" y="45" width="24" height="8" rx="2" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
      </g>
    ),
    k: (
      <g>
        <line x1="30" y1="8" x2="30" y2="18" stroke={strokeColor} strokeWidth="2" />
        <line x1="25" y1="13" x2="35" y2="13" stroke={strokeColor} strokeWidth="2" />
        <path d="M 22 45 Q 22 30 30 20 Q 38 30 38 45 Z" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        <rect x="18" y="45" width="24" height="8" rx="2" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
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
        filter: `drop-shadow(0 4px 8px ${shadowColor}) drop-shadow(0 0 10px ${glowColor})`,
      }}
    >
      <defs>
        <linearGradient id={`gradient-${type}-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={isWhite ? '#ffffff' : '#2a2a4e'} />
          <stop offset="100%" stopColor={isWhite ? '#e0e0e0' : '#0a0a1a'} />
        </linearGradient>
      </defs>
      {pieces[type]}
    </svg>
  );
}
