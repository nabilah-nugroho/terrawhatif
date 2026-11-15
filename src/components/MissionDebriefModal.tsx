import React from 'react';
import { Award, CheckCircle2, FlaskConical, Play, Sparkles, X } from 'lucide-react';
import type { DetectiveStatus } from '../data/badges';

interface MissionDebriefModalProps {
  open: boolean;
  status: DetectiveStatus;
  inspectedCount: number;
  quizCount: number;
  completedChaptersCount: number;
  onClose: () => void;
  onPlayRealTrend: () => void;
  onOpenScienceLab: () => void;
  onOpenBadges: () => void;
}

const WORLDS_SUMMARY = [
  {
    name: 'Airless Earth',
    temp: '-18°C',
    note: 'No Heat Blanket → frozen oceans',
    tone: 'border-cyan-400/35 bg-cyan-500/10 text-cyan-200',
  },
  {
    name: 'Earth Today',
    temp: '+15°C',
    note: '+33°C blanket keeps water liquid',
    tone: 'border-emerald-400/35 bg-emerald-500/10 text-emerald-200',
  },
  {
    name: 'TRAPPIST-1 e',
    temp: '~+10°C',
    note: '0.029 AU orbit · amber sky & eternal day',
    tone: 'border-amber-400/35 bg-amber-500/10 text-amber-200',
  },
];

export const MissionDebriefModal: React.FC<MissionDebriefModalProps> = ({
  open,
  status,
  inspectedCount,
  quizCount,
  completedChaptersCount,
  onClose,
  onPlayRealTrend,
  onOpenScienceLab,
  onOpenBadges,
}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mission Debrief — Earth System Trend Detective Summary"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65"
    >
      <div className="w-full max-w-xl obsidian-hud-strong rounded-3xl p-6 text-slate-100 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto obs-scroll border border-amber-300/35">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400/25 to-amber-400/25 border border-amber-300/55 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-amber-300">
                All 3 Missions Accomplished
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug">
                Mission Debrief Complete!
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Current Rank: <strong className="text-amber-200">{status.rank}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close mission debrief"
            className="p-2 -mr-1 -mt-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Expedition Stats */}
        <div className="grid grid-cols-3 gap-2.5 text-center font-mono tabular-nums">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-[10px] text-slate-400 font-sans">Chapters Cleared</div>
            <div className="text-lg font-bold text-emerald-300 mt-0.5">
              {completedChaptersCount}/3
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-[10px] text-slate-400 font-sans">Gear Inspected</div>
            <div className="text-lg font-bold text-sky-300 mt-0.5">{inspectedCount}/8</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-[10px] text-slate-400 font-sans">Quizzes & Badges</div>
            <div className="text-lg font-bold text-amber-300 mt-0.5">
              {quizCount}/3 · {status.unlockedCount}/{status.totalCount}
            </div>
          </div>
        </div>

        {/* 3 Worlds Comparison */}
        <div className="space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-sky-300">
            Three Climates You Decoded
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {WORLDS_SUMMARY.map((w) => (
              <div key={w.name} className={`p-3 rounded-2xl border ${w.tone}`}>
                <div className="text-xs font-bold text-white">{w.name}</div>
                <div className="text-lg font-mono font-bold mt-0.5">{w.temp}</div>
                <p className="text-[11px] text-slate-200 mt-1 leading-snug">{w.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Next Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenBadges();
            }}
            className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/15 hover:border-amber-300/50 text-xs font-semibold text-amber-100 flex items-center gap-1.5 transition-colors"
          >
            <Award className="w-3.5 h-3.5 text-amber-300" />
            <span>View Badges ({status.unlockedCount}/{status.totalCount})</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onPlayRealTrend();
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-400/20 border border-amber-300/50 hover:bg-amber-400/30 text-xs font-semibold text-amber-100 flex items-center gap-1.5 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Play 2003→2025 in 3D</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenScienceLab();
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(56,189,248,0.45)] hover:brightness-110 transition-all flex items-center gap-1.5"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Open Free Science Lab</span>
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
