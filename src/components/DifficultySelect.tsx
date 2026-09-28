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
            className="rounded-2xl border border-zinc-800 bg-white/[0.03] p-6 space-y-6"
          >
            <h2 className="text-xl font-semibold tracking-tight text-zinc-100 text-center">Select Difficulty</h2>
            
            <div className="space-y-3">
              {difficulties.map(diff => (
                <button
                  key={diff.value}
                  onClick={() => onSelect(diff.value)}
                  className="w-full py-3 px-4 rounded-lg border border-zinc-800 text-zinc-200 hover:bg-zinc-800/60 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{diff.emoji}</div>
                    <div>
                      <div className="font-medium text-[15px]">{diff.label}</div>
                      <div className="text-zinc-500 text-sm">{diff.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            <button
              onClick={onBack}
              className="w-full py-2.5 rounded-lg border border-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-800/60 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
