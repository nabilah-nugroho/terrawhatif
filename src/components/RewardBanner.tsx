import React from 'react';
import { AlertTriangle, Award, ChevronRight, Lightbulb, Sparkles, X } from 'lucide-react';

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
    ? 'bg-gradient-to-r from-rose-950/95 via-slate-900/95 to-amber-950/95 border-rose-300/70 text-rose-50 shadow-[0_0_28px_rgba(244,63,94,0.38)]'
    : isMission
      ? 'bg-gradient-to-r from-emerald-950/95 via-slate-900/95 to-amber-950/95 border-amber-300/75 text-white shadow-[0_0_32px_rgba(251,191,36,0.45)]'
      : 'bg-emerald-950/95 border-emerald-300/70 text-emerald-50 shadow-[0_0_24px_rgba(52,211,153,0.4)]';

  return (
    <div
      key={reward.id}
      role="status"
      aria-live="polite"
      className="fixed top-18 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-1.5rem)] max-w-md pointer-events-auto"
    >
      <div
        className={`relative flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-2xl animate-[bannerIn_0.28s_ease-out_forwards] ${containerClasses}`}
      >
        {/* Pure SVG vector starburst or alert accent */}
        {isWrong ? (
          <div className="w-8 h-8 rounded-xl bg-rose-400/20 border border-rose-300/45 flex items-center justify-center shrink-0 mt-0.5">
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
              fill={isMission ? 'rgba(251,191,36,0.22)' : 'rgba(52,211,153,0.22)'}
            />
            <path
              d="M18 4l2.2 8.2L28 14l-7.8 2.2L18 24l-2.2-7.8L8 14l7.8-1.8L18 4Z"
              fill={isMission ? '#fcd34d' : '#6ee7b7'}
            />
            <circle cx="8" cy="8" r="1.4" fill="#fde68a" />
            <circle cx="29" cy="9" r="1.2" fill="#a7f3d0" />
            <circle cx="28" cy="27" r="1.5" fill="#fde68a" />
          </svg>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-wide pr-5">
            {isWrong ? (
              <Lightbulb className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            ) : isMission ? (
              <Award className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            )}
            <span className="leading-snug">{reward.title}</span>
          </div>

          <p className="text-xs text-slate-100 leading-relaxed">{reward.subtitle}</p>

          {reward.hint && (
            <p className="text-[11px] font-semibold text-amber-200 pt-0.5">
              Try next: {reward.hint}
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
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold shadow-[0_0_16px_rgba(249,115,22,0.5)] hover:brightness-110 transition-all inline-flex items-center gap-1"
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
            className="p-1 -mr-1 -mt-0.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

