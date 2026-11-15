import React from 'react';
import type { StarKey } from '../types/observatory';

interface StarSwitcherCardProps {
  starKey: StarKey;
  spotlight: boolean;
  onSwitchStar: (starKey: StarKey) => void;
}

export const StarSwitcherCard: React.FC<StarSwitcherCardProps> = ({
  starKey,
  spotlight,
  onSwitchStar,
}) => {
  const isTrappist = starKey === 'trappist1';

  return (
    <div
      aria-label="Host Star Selector"
      className="fixed z-20 top-16 right-3 sm:right-4 w-[240px] sm:w-[270px] obsidian-hud-strong rounded-2xl p-3 text-slate-100 shadow-2xl"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-sky-300">
          Host Star
        </span>
        <span className="text-[11px] font-mono text-slate-300">
          {isTrappist ? '2566 K · M-dwarf' : '5772 K · G-dwarf'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => onSwitchStar('sun')}
          className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${
            !isTrappist
              ? 'bg-sky-400/20 border-sky-300/65 text-white'
              : 'bg-white/5 border-white/15 text-slate-300 hover:border-white/35'
          }`}
        >
          <svg viewBox="0 0 28 28" className="w-6 h-6 shrink-0" aria-hidden="true">
            <circle cx="14" cy="14" r="11" fill="#fde047" fillOpacity="0.25" />
            <circle cx="14" cy="14" r="6.5" fill="#fef08a" />
          </svg>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate">Sun</div>
            <div className="text-[10px] font-mono text-slate-400">Yellow</div>
          </div>
        </button>

        <div className="relative">
          {spotlight && !isTrappist && (
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-300 text-[#06090f] text-[10px] font-bold whitespace-nowrap shadow-lg animate-bounce pointer-events-none z-10">
              Tap me! ↓
            </span>
          )}
          <button
            type="button"
            onClick={() => onSwitchStar('trappist1')}
            className={`w-full p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${
              isTrappist
                ? 'bg-amber-500/25 border-amber-300/75 text-amber-100'
                : spotlight
                  ? 'bg-amber-400/20 border-amber-300 text-white shadow-[0_0_20px_rgba(251,191,36,0.45)]'
                  : 'bg-white/5 border-white/15 text-slate-300 hover:border-white/35'
            }`}
          >
            <svg viewBox="0 0 28 28" className="w-6 h-6 shrink-0" aria-hidden="true">
              <circle cx="14" cy="14" r="11" fill="#fb923c" fillOpacity="0.28" />
              <circle cx="14" cy="14" r="5" fill="#fb923c" />
            </svg>
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">TRAPPIST-1</div>
              <div className="text-[10px] font-mono text-amber-200">Red Dwarf</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
