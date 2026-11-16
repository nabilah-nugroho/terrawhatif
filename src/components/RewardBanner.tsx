import React from 'react';
import { AlertTriangle, Award, ChevronRight, Lightbulb, Sparkles, X } from 'lucide-react';
import { HudCorners } from './HudReticleFrame';

export interface RewardEvent {
  id: number;
  kind: 'step' | 'mission' | 'wrong';
  title: string;
  subtitle: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface RewardBannerProps {
  reward: RewardEvent | null;
  onDismiss?: () => void;
}

export const RewardBanner: React.FC<RewardBannerProps> = ({ reward, onDismiss }) => {
  if (!reward) return null;

  const isMission = reward.kind === 'mission';
  const isWrong = reward.kind === 'wrong';

  const containerClasses = isWrong
    ? 'obs-panel-strong border-rose-400/55 text-rose-50'
    : isMission
      ? 'obs-panel-strong border-amber-300/60 text-white'
      : 'obs-panel-strong border-emerald-400/55 text-emerald-50';

  return (
    <div
      key={reward.id}
      role="status"
      aria-live="polite"
      className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-1.5rem)] max-w-md pointer-events-auto"
    >
      <div
        className={`relative flex items-start gap-3 px-4 py-3 rounded-[4px] border animate-[bannerIn_0.24s_ease-out_forwards] ${containerClasses}`}
      >
        <HudCorners tone={isWrong ? 'amber' : isMission ? 'amber' : 'mint'} />

        {/* Pure SVG vector starburst or alert accent */}
        {isWrong ? (
          <div className="w-8 h-8 rounded-[3px] bg-rose-400/15 border border-rose-300/40 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4 text-rose-200" />
          </div>
        ) : (
          <svg
            viewBox="0 0 36 36"
            className="w-8 h-8 shrink-0 mt-0.5"
            aria-hidden="true"
          >
            <circle
              cx="18"
              cy="18"
              r="14"
              fill={isMission ? 'rgba(251,191,36,0.16)' : 'rgba(52,211,153,0.16)'}
            />
            <path
              d="M18 4l2.2 8.2L28 14l-7.8 2.2L18 24l-2.2-7.8L8 14l7.8-1.8L18 4Z"
              fill={isMission ? '#fcd34d' : '#5ef2b6'}
            />
          </svg>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-1.5 text-sm font-bold tracking-wide pr-5">
            {isWrong ? (
              <Lightbulb className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            ) : isMission ? (
              <Award className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            )}
            <span className="font-display text-base leading-snug">{reward.title}</span>
          </div>

          <p className="text-xs text-slate-200 leading-relaxed">{reward.subtitle}</p>

          {reward.hint && (
            <p className="text-[11px] font-mono text-amber-200 pt-0.5">
              NEXT: {reward.hint}
            </p>
          )}

          {reward.actionLabel && reward.onAction && (
            <div className="pt-1.5">
              <button
                type="button"
                onClick={() => {
                  reward.onAction?.();
                  onDismiss?.();
                }}
                className="px-3.5 py-1.5 rounded-[3px] bg-amber-400 text-[#05080f] text-xs font-mono font-bold uppercase tracking-wider hover:bg-amber-300 transition-colors inline-flex items-center gap-1"
              >
                <span>{reward.actionLabel}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss explanation"
            className="p-1 -mr-1 -mt-0.5 rounded-[3px] text-slate-300 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
