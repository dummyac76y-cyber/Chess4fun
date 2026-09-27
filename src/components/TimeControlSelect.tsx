import { TimeControl } from '../App';

interface TimeControlSelectProps {
  onSelect: (time: TimeControl) => void;
  onBack: () => void;
}

export function TimeControlSelect({ onSelect, onBack }: TimeControlSelectProps) {
  const timeControls = [
    { value: '5min' as TimeControl, label: 'Blitz', time: '5 minutes', description: 'Fast-paced game' },
    { value: '10min' as TimeControl, label: 'Rapid', time: '10 minutes', description: 'Balanced speed' },
    { value: '15min' as TimeControl, label: 'Classical', time: '15 minutes', description: 'Standard pace' },
    { value: '30min' as TimeControl, label: 'Long', time: '30 minutes', description: 'Extended game' },
    { value: 'unlimited' as TimeControl, label: 'Unlimited', time: 'No limit', description: 'Take your time' },
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
            <h2 className="text-3xl font-bold text-white text-center">Select Time Control</h2>
            
            <div className="space-y-3">
              {timeControls.map(tc => (
                <button
                  key={tc.value}
                  onClick={() => onSelect(tc.value)}
                  className="w-full py-4 px-6 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white transition-all text-left"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-lg">{tc.label}</div>
                      <div className="text-white/60 text-sm">{tc.description}</div>
                    </div>
                    <div className="text-white/80 font-medium">{tc.time}</div>
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
