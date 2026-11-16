import React from 'react';
import type { StarKey } from '../types/observatory';
import { HudCorners, SectionCodeTag } from './HudReticleFrame';

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
      className="fixed z-20 top-14 right-3 w-[256px] sm:w-[278px] obs-panel-strong rounded-[4px] px-3.5 py-3 text-slate-100"
    >
      <HudCorners tone="amber" />

      <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-amber-400/20 pt-0.5">
        <SectionCodeTag label="04 / STAR CLASS" tone="amber" />
        <span className="text-[10.5px] font-mono text-emerald-300 tabular-nums">
          {isTrappist ? '2,566 K · M-DWARF' : '5,772 K · G-DWARF'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => onSwitchStar('sun')}
          className={`p-2 rounded-[3px] border text-left transition-colors flex items-center gap-2 ${
            !isTrappist
              ? 'bg-emerald-400/12 border-emerald-400/55 text-white'
              : 'bg-transparent border-amber-400/18 text-slate-400 hover:text-white hover:border-amber-400/40'
          }`}
        >
          <svg viewBox="0 0 28 28" className="w-5 h-5 shrink-0" aria-hidden="true">
            <circle cx="14" cy="14" r="10" fill="#fde047" fillOpacity="0.2" />
            <circle cx="14" cy="14" r="6" fill="#fef08a" />
          </svg>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate">Sun</div>
            <div className="text-[10px] font-mono text-emerald-300/85">G-Class</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSwitchStar('trappist1')}
          className={`w-full p-2 rounded-[3px] border text-left transition-colors flex items-center gap-2 ${
            isTrappist
              ? 'bg-amber-400/15 border-amber-400/65 text-amber-100'
              : spotlight
                ? 'bg-amber-400/12 border-amber-300/85 text-white'
                : 'bg-transparent border-amber-400/18 text-slate-400 hover:text-white hover:border-amber-400/40'
          }`}
        >
          <svg viewBox="0 0 28 28" className="w-5 h-5 shrink-0" aria-hidden="true">
            <circle cx="14" cy="14" r="10" fill="#fb923c" fillOpacity="0.24" />
            <circle cx="14" cy="14" r="4.8" fill="#fb923c" />
          </svg>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate">TRAPPIST-1</div>
            <div className="text-[10px] font-mono text-amber-300/90">
              {spotlight && !isTrappist ? 'Select Target' : 'M-Dwarf'}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
