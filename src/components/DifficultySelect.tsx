import { Difficulty } from '../App';

interface DifficultySelectProps {
  onSelect: (difficulty: Difficulty) => void;
  onBack: () => void;
}

export function DifficultySelect({ onSelect, onBack }: DifficultySelectProps) {
  const difficulties = [
    { value: 'easy' as Difficulty, label: 'Easy', description: 'Perfect for beginners', emoji: '🌱' },
    { value: 'medium' as Difficulty, label: 'Medium', description: 'Balanced challenge', emoji: '⚡' },
    { value: 'hard' as Difficulty, label: 'Hard', description: 'For experienced players', emoji: '🔥' },
  ];

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div 
            className="rounded-2xl p-6 space-y-6"
            style={{
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(25px)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <h2 className="text-3xl font-bold text-white text-center">Select Difficulty</h2>
            
            <div className="space-y-3">
              {difficulties.map(diff => (
                <button
                  key={diff.value}
                  onClick={() => onSelect(diff.value)}
                  className="w-full py-4 px-6 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{diff.emoji}</div>
                    <div>
                      <div className="font-semibold text-lg">{diff.label}</div>
                      <div className="text-white/60 text-sm">{diff.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            <button
              onClick={onBack}
              className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-medium transition-all"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
