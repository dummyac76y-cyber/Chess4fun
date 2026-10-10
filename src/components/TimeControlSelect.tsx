import { TimeControl } from '../App';
import { Timer, Gauge, Clock3, Hourglass, Infinity as InfinityIcon } from 'lucide-react';

interface TimeControlSelectProps {
  onSelect: (time: TimeControl) => void;
  onBack: () => void;
}

export function TimeControlSelect({ onSelect, onBack }: TimeControlSelectProps) {
  const timeControls = [
    { value: '5min' as TimeControl, label: 'Blitz', time: '5 minutes', description: 'Fast-paced game', Icon: Timer },
    { value: '10min' as TimeControl, label: 'Rapid', time: '10 minutes', description: 'Balanced speed', Icon: Gauge },
    { value: '15min' as TimeControl, label: 'Classical', time: '15 minutes', description: 'Standard pace', Icon: Clock3 },
    { value: '30min' as TimeControl, label: 'Long', time: '30 minutes', description: 'Extended game', Icon: Hourglass },
    { value: 'unlimited' as TimeControl, label: 'Unlimited', time: 'No limit', description: 'Take your time', Icon: InfinityIcon },
  ];

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div 
            className="rounded-2xl border border-zinc-800 bg-white/[0.03] p-6 space-y-6"
          >
            <h2 className="text-xl font-semibold tracking-tight text-zinc-100 text-center">Select Time Control</h2>
            
            <div className="space-y-3">
              {timeControls.map(tc => (
                <button
                  key={tc.value}
                  onClick={() => onSelect(tc.value)}
                  className="w-full py-3 px-4 rounded-lg border border-zinc-800 text-zinc-200 hover:bg-zinc-800/60 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-zinc-700 bg-zinc-900 text-lime-300"><tc.Icon size={20} strokeWidth={1.8} /></div>
                    <div className="min-w-0 flex-1">
                    <div>
                      <div className="font-medium text-[15px]">{tc.label}</div>
                      <div className="text-zinc-500 text-sm">{tc.description}</div>
                    </div>
                    <div className="text-zinc-300 font-medium whitespace-nowrap">{tc.time}</div>
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
