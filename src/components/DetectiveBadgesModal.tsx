import React from 'react';
import { Award, CheckCircle2, FlaskConical, Lock, Play, Sparkles, X } from 'lucide-react';
import type { DetectiveStatus } from '../data/badges';

interface DetectiveBadgesModalProps {
  open: boolean;
  status: DetectiveStatus;
  inspectedCount: number;
  isPlayingTrend: boolean;
  onClose: () => void;
  onPlayRealTrend: () => void;
  onOpenScienceLab: () => void;
}

export const DetectiveBadgesModal: React.FC<DetectiveBadgesModalProps> = ({
  open,
  status,
  inspectedCount,
  isPlayingTrend,
  onClose,
  onPlayRealTrend,
  onOpenScienceLab,
}) => {
  if (!open) return null;

  const progressPct = Math.round((status.unlockedCount / status.totalCount) * 100);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Earth Detective Rank & Badges"
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60"
    >
      <div className="w-full max-w-xl obsidian-hud-strong rounded-3xl p-6 text-slate-100 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto obs-scroll">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/25 to-sky-400/20 border border-amber-300/50 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-amber-300">
                Earth System Trend Detective
              </div>
              <h2 className="text-xl font-bold text-white leading-snug">
                Rank: {status.rank}
              </h2>
              <p className="text-xs text-slate-300 font-mono tabular-nums mt-0.5">
                {status.unlockedCount}/{status.totalCount} Badges · {inspectedCount}/8 Instruments Inspected
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Detective Badges"
            className="p-2 -mr-1 -mt-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Rank Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-sky-200">Detective Progression</span>
            <span className="text-slate-300 tabular-nums">{progressPct}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-300 transition-all duration-500"
              style={{ width: `${Math.max(8, progressPct)}%` }}
            />
          </div>
          {status.nextRank && (
            <p className="text-[11px] text-slate-400">
              Next rank: <strong className="text-slate-200">{status.nextRank}</strong>
            </p>
          )}
        </div>

        {/* Badges Grid */}
        <div className="space-y-2.5">
          {status.badges.map((badge) => (
            <div
              key={badge.id}
              className={`rounded-2xl border p-3.5 flex items-start gap-3 transition-colors ${
                badge.unlocked
                  ? 'bg-gradient-to-r from-emerald-500/15 to-amber-500/10 border-emerald-400/45'
                  : 'bg-white/5 border-white/10 opacity-80'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  badge.unlocked
                    ? 'bg-emerald-400/25 border border-emerald-300/60 text-emerald-200'
                    : 'bg-black/40 border border-white/15 text-slate-500'
                }`}
              >
                {badge.unlocked ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white">{badge.title}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                      badge.unlocked
                        ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-300/40'
                        : 'bg-white/5 text-slate-400 border border-white/10'
                    }`}
                  >
                    {badge.unlocked ? 'Unlocked' : 'Locked'}
                  </span>
                </div>
                <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                  {badge.unlocked ? badge.subtitle : badge.howToUnlock}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Interactive Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => {
              onPlayRealTrend();
              onClose();
            }}
            className="px-3.5 py-2 rounded-xl bg-amber-400/20 border border-amber-300/50 hover:bg-amber-400/30 text-xs font-semibold text-amber-100 flex items-center gap-1.5 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>
              {isPlayingTrend ? 'Replay Running...' : 'Play NASA 2003→2025 Trend in 3D'}
            </span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenScienceLab();
              }}
              className="px-3.5 py-2 rounded-xl bg-sky-400/20 border border-sky-300/45 hover:bg-sky-400/30 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
            >
              <FlaskConical className="w-3.5 h-3.5 text-sky-200" />
              <span>Science Lab</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white flex items-center gap-1 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Keep Exploring</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
