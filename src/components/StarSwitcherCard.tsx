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
      className="fixed z-20 top-16 right-3 sm:right-4 w-[240px] sm:w-[270px] obsidian-hud-strong rounded-2xl p-3 text-slate-100"
    >
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/10">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
          Host Star
        </span>
        <span className="text-[11px] font-mono text-sky-300 tabular-nums">
          {isTrappist ? '2566 K · M-dwarf' : '5772 K · G-dwarf'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => onSwitchStar('sun')}
          className={`p-2 rounded-xl border text-left transition-colors flex items-center gap-2 ${
            !isTrappist
              ? 'bg-white/10 border-sky-300/50 text-white'
              : 'bg-transparent border-white/10 text-slate-400 hover:text-white hover:border-white/25'
          }`}
        >
          <svg viewBox="0 0 28 28" className="w-5 h-5 shrink-0" aria-hidden="true">
            <circle cx="14" cy="14" r="10" fill="#fde047" fillOpacity="0.2" />
            <circle cx="14" cy="14" r="6" fill="#fef08a" />
          </svg>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate">Sun</div>
            <div className="text-[10px] font-mono text-slate-400">Yellow</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSwitchStar('trappist1')}
          className={`w-full p-2 rounded-xl border text-left transition-colors flex items-center gap-2 ${
            isTrappist
              ? 'bg-amber-400/15 border-amber-300/60 text-amber-100'
              : spotlight
                ? 'bg-amber-400/10 border-amber-300/80 text-white'
                : 'bg-transparent border-white/10 text-slate-400 hover:text-white hover:border-white/25'
          }`}
        >
          <svg viewBox="0 0 28 28" className="w-5 h-5 shrink-0" aria-hidden="true">
            <circle cx="14" cy="14" r="10" fill="#fb923c" fillOpacity="0.24" />
            <circle cx="14" cy="14" r="4.8" fill="#fb923c" />
          </svg>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate">TRAPPIST-1</div>
            <div className="text-[10px] font-mono text-amber-300/90">
              {spotlight && !isTrappist ? 'Select Target' : 'Red Dwarf'}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
