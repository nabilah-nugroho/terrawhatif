import React, { useState } from 'react';
import { BookText, Check, ChevronDown, ChevronUp, Circle, Crosshair, MapPin, Target } from 'lucide-react';
import type { ChapterQuest, QuestStep } from '../data/quests';

interface NavigatorMissionCardProps {
  quest: ChapterQuest;
  onOpenStory?: () => void;
  onStartTour?: () => void;
  onSelectStep?: (step: QuestStep) => void;
}

export const NavigatorMissionCard: React.FC<NavigatorMissionCardProps> = ({
  quest,
  onOpenStory,
  onStartTour,
  onSelectStep,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      data-tour="mission-checklist"
      aria-label="Navigator Mission Checklist"
      className="fixed z-20 top-16 left-3 right-3 sm:right-auto sm:left-3 sm:max-w-[270px] sm:w-[270px] obsidian-hud-strong rounded-2xl p-3 text-slate-100"
    >
      <div
        className={`flex items-center justify-between gap-2 ${
          collapsed ? '' : 'pb-2 border-b border-white/10'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Target className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] font-mono tracking-wider uppercase text-slate-400 truncate">
              {quest.subtitle}
            </div>
            <h2 className="font-display text-[13px] font-bold text-white truncate tracking-tight">
              {quest.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onStartTour && !collapsed && (
            <button
              type="button"
              onClick={onStartTour}
              title="Start Interactive Feature Tour"
              className="text-[11px] font-medium text-amber-300 hover:text-amber-200 flex items-center gap-1 transition-colors"
            >
              <MapPin className="w-3 h-3" />
              <span>Tour</span>
            </button>
          )}

          {onOpenStory && !collapsed && (
            <button
              type="button"
              onClick={onOpenStory}
              title="Replay Chapter Story Briefing"
              className="text-[11px] font-medium text-sky-300 hover:text-sky-200 flex items-center gap-1 transition-colors"
            >
              <BookText className="w-3 h-3" />
              <span>Story</span>
            </button>
          )}

          <span
            className={`text-[11px] font-mono font-semibold tabular-nums shrink-0 ${
              quest.allDone ? 'text-emerald-300' : 'text-slate-300'
            }`}
          >
            {quest.completedCount}/3
          </span>

          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand mission checklist' : 'Collapse mission checklist'}
            title={collapsed ? 'Expand checklist' : 'Minimize checklist'}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            {collapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {!collapsed && (
        <ol className="mt-2 space-y-1">
          {quest.steps.map((step, idx) => {
            const isCurrent = idx === quest.activeStepIndex;
            const clickable = Boolean(onSelectStep);
            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => onSelectStep?.(step)}
                  title={clickable ? 'Click to focus on this step target' : undefined}
                  className={`w-full text-left flex items-start gap-2 px-2 py-1.5 rounded-xl border text-[11.5px] transition-colors ${
                    step.done
                      ? 'bg-emerald-500/8 border-emerald-400/20 text-emerald-100/90 hover:border-emerald-300/40'
                      : isCurrent
                        ? 'bg-white/8 border-amber-300/45 text-white hover:bg-white/12'
                        : 'bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <span className="mt-0.5 shrink-0" aria-hidden="true">
                    {step.done ? (
                      <span className="w-3.5 h-3.5 rounded-full bg-emerald-400/90 text-[#06090f] flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[2.8]" />
                      </span>
                    ) : isCurrent ? (
                      <span className="w-3.5 h-3.5 rounded-full bg-amber-300 text-[#06090f] font-mono text-[9px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </span>

                  <span
                    className={`flex-1 leading-snug ${
                      step.done ? 'line-through opacity-75' : 'font-medium'
                    }`}
                  >
                    {step.text}
                  </span>

                  {isCurrent && !step.done && clickable && (
                    <Crosshair className="w-3 h-3 text-amber-300/90 shrink-0 mt-0.5" />
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
};
