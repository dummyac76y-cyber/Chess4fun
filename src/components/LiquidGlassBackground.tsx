export function LiquidGlassBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Nature-inspired gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
        }}
      />
      
      {/* Dark overlay for text visibility */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.2) 100%)',
        }}
      />
      
      {/* Animated gradient orbs with soft glow */}
      <div
        className="absolute w-[800px] h-[800px] rounded-full blur-3xl opacity-30"
        style={{
          top: '-20%',
          right: '-15%',
          background: 'radial-gradient(circle, rgba(253, 164, 175, 0.6) 0%, rgba(251, 113, 133, 0.3) 30%, transparent 70%)',
          animation: 'float-slow 30s ease-in-out infinite',
        }}
      />
      <div
        className="absolute w-[900px] h-[900px] rounded-full blur-3xl opacity-25"
        style={{
          bottom: '-25%',
          left: '-20%',
          background: 'radial-gradient(circle, rgba(147, 197, 253, 0.5) 0%, rgba(96, 165, 250, 0.25) 30%, transparent 70%)',
          animation: 'float-slower 35s ease-in-out infinite',
        }}
      />
      
      {/* Subtle noise texture */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
