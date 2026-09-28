/**
 * Minimalist backdrop: a near-black canvas with one very soft, static radial
 * glow. Cheap to render (no blur-heavy animated layers) and lets the board and
 * panels be the visual focus.
 */
export function LiquidGlassBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none bg-[#0a0a0b]">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1200px 800px at 50% -10%, rgba(255,255,255,0.045) 0%, transparent 60%)',
        }}
      />
      {/* Subtle noise texture to keep large flat areas from banding */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
