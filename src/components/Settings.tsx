import { useEffect, useState } from 'react';
import { GameSettings } from '../App';

interface SettingsProps {
  settings: GameSettings;
  onSettingsChange: (settings: GameSettings) => void;
  onBack: () => void;
  playerName: string;
  onNameChange: (name: string) => void;
}


  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
        on ? 'bg-emerald-500' : 'bg-zinc-700'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
          on ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-zinc-200">{title}</p>
        {hint && <p className="text-xs text-zinc-500 mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function Settings({ settings, onSettingsChange, onBack }: SettingsProps) {
  // Draft state: nothing is persisted until "Save Changes" is pressed.
  const [draft, setDraft] = useState<GameSettings>(settings);
  const [saved, setSaved] = useState(false);



  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const nameInvalid = draft.playerName.trim().length === 0;

  const save = () => {
    if (nameInvalid) return;
    onSettingsChange({ ...draft, playerName: draft.playerName.trim().slice(0, 20) });
    setSaved(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <header className="px-1">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Settings</h1>
          <p className="text-sm text-zinc-500 mt-1">Personalize your board and profile.</p>
        </header>

        {/* Profile */}
        <section className={card}>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Profile</h2>
          <div>
            <label htmlFor="playerName" className={`${label} block mb-2`}>
              Display name
            </label>
            <input
              id="playerName"
              value={draft.playerName}
              onChange={(e) => setDraft({ ...draft, playerName: e.target.value.slice(0, 20) })}
              onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
              placeholder="Your name"
              maxLength={20}
              className={`${inputBase} ${nameInvalid ? 'border-red-500/60' : 'border-zinc-700'}`}
            />
            <p className="text-xs text-zinc-600 mt-1.5">
              {nameInvalid ? 'Name cannot be empty.' : 'Shown in the menu and game header · up to 20 characters.'}
            </p>
          </div>
        </section>

        {/* Gameplay */}
        <section className={card}>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Gameplay</h2>
          <div className="divide-y divide-zinc-800/70">
            <Row title="Sound effects" hint="Move, capture and check sounds">
              <Toggle on={draft.soundEnabled} onChange={(v) => setDraft({ ...draft, soundEnabled: v })} />
            </Row>
            <Row title="Show coordinates" hint="File and rank labels on the board">
              <Toggle on={draft.showCoordinates} onChange={(v) => setDraft({ ...draft, showCoordinates: v })} />
            </Row>
            <Row title="Auto-flip board" hint="Rotate the view for the side to move (local play)">
              <Toggle on={draft.autoFlipBoard} onChange={(v) => setDraft({ ...draft, autoFlipBoard: v })} />
            </Row>
            <Row title="Move quality" hint="Analysis panel after each move">
              <Toggle on={draft.showMoveQuality} onChange={(v) => setDraft({ ...draft, showMoveQuality: v })} />
            </Row>
          </div>
        </section>

        {/* Appearance */}
        <section className={card}>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Board theme</h2>
          <div className="grid grid-cols-2 gap-2">
            {(['classic', 'modern', 'wood', 'marble'] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => setDraft({ ...draft, boardTheme: theme })}
                className={`py-2 rounded-lg text-sm capitalize transition-colors border ${
                  draft.boardTheme === theme
                    ? 'border-zinc-400 bg-zinc-800 text-zinc-100'
                    : 'border-zinc-800 bg-transparent text-zinc-400 hover:bg-zinc-800/50'
                }`}
              >
                {theme}
              </button>
            ))}
          </div>
        </section>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            onClick={save}
            disabled={!dirty || nameInvalid}
            className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
              dirty && !nameInvalid
                ? 'bg-zinc-100 text-zinc-900 hover:bg-white'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            }`}
          >
            {saved ? 'Saved ✓' : 'Save Changes'}
          </button>
          <button
            onClick={onBack}
            className="w-full py-2.5 rounded-lg text-sm font-medium text-zinc-400 border border-zinc-800 hover:bg-zinc-800/50 transition-colors"
          >
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
}
