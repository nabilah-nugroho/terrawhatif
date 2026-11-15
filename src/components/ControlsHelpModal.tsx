import React from 'react';
import { Compass, Eye, Footprints, HelpCircle, Keyboard, MapPin, Sparkles, X } from 'lucide-react';

interface ControlsHelpModalProps {
  open: boolean;
  onClose: () => void;
  onStartTour?: () => void;
}

const SHORTCUTS = [
  { keys: 'W A S D / Arrows', desc: 'Walk around the 3D observatory deck (or use on-screen D-Pad on mobile)' },
  { keys: 'E', desc: 'Inspect the nearest glowing instrument with your wrist scanner' },
  { keys: 'V', desc: 'Switch between Walking (3P) astronaut and Overview camera' },
  { keys: 'H', desc: 'Hide or show all HUD panels for a clean 3D view' },
  { keys: 'Drag / Scroll', desc: 'Orbit camera angle and zoom in/out anytime' },
];

export const ControlsHelpModal: React.FC<ControlsHelpModalProps> = ({
  open,
  onClose,
  onStartTour,
}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Observatory Controls & Quick Tips"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
    >
      <div className="w-full max-w-md obsidian-hud-strong rounded-3xl p-6 text-slate-100 space-y-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-400/20 border border-sky-300/45 flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Controls & Quick Tips</h2>
              <p className="text-xs text-slate-400">Navigate the 3D Climate Observatory</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close controls help"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-sky-300">
            <Keyboard className="w-3.5 h-3.5" />
            <span>Keyboard & Camera</span>
          </div>
          <div className="space-y-1.5">
            {SHORTCUTS.map((item) => (
              <div
                key={item.keys}
                className="flex items-start justify-between gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs"
              >
                <kbd className="px-2 py-0.5 rounded-md bg-black/50 border border-white/20 font-mono text-[11px] font-semibold text-amber-200 shrink-0">
                  {item.keys}
                </kbd>
                <span className="text-slate-200 text-right leading-snug">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <Footprints className="w-4 h-4 text-amber-300" />
            <div className="font-semibold text-white">Follow Floor Path</div>
            <p className="text-slate-400 leading-snug">Glowing dots guide you to your next target.</p>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <Sparkles className="w-4 h-4 text-sky-300" />
            <div className="font-semibold text-white">Tap Any Step</div>
            <p className="text-slate-400 leading-snug">Click a mission step to point right at it.</p>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <Compass className="w-4 h-4 text-emerald-300" />
            <div className="font-semibold text-white">What-If Presets</div>
            <p className="text-slate-400 leading-snug">Jump worlds in 1 click or hit Reset anytime.</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          {onStartTour ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartTour();
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-400/15 border border-amber-300/45 text-xs font-semibold text-amber-100 hover:bg-amber-400/25 transition-colors flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-300" />
              <span>Replay Feature Tour</span>
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-sky-400/25 border border-sky-300/45 text-xs font-semibold text-white hover:bg-sky-400/35 transition-colors flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Back to Observatory</span>
          </button>
        </div>
      </div>
    </div>
  );
};
