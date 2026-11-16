import React, { useState } from 'react';
import { BookText, Check, ChevronDown, ChevronUp, Circle, Crosshair, MapPin } from 'lucide-react';
import type { ChapterQuest, QuestStep } from '../data/quests';
import { HudCorners, SectionCodeTag } from './HudReticleFrame';

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
      className="fixed z-20 top-14 left-3 right-3 sm:right-auto sm:left-3 sm:max-w-[278px] sm:w-[278px] obs-panel-strong rounded-[4px] px-3.5 py-3 text-slate-100"
    >
      <HudCorners tone="amber" />

      <div
        className={`flex items-start justify-between gap-2 pt-0.5 ${
          collapsed ? '' : 'pb-2 border-b border-amber-400/20'
        }`}
      >
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <SectionCodeTag label="01 / MISSION" tone="amber" />
            <span
              className={`text-[10.5px] font-mono font-semibold tabular-nums shrink-0 ${
                quest.allDone ? 'text-emerald-300' : 'text-amber-200/90'
              }`}
            >
              {quest.completedCount}/3 DONE
            </span>
          </div>
          <h2 className="font-display text-[17px] font-bold text-white truncate leading-tight">
            {quest.title}
          </h2>
          <div className="text-[10px] font-mono tracking-wider uppercase text-slate-400 truncate">
            {quest.subtitle}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand mission checklist' : 'Collapse mission checklist'}
            title={collapsed ? 'Expand checklist' : 'Minimize checklist'}
            className="p-1 rounded-[3px] text-slate-400 hover:text-amber-300 hover:bg-amber-400/10 transition-colors"
          >
            {collapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>

          {!collapsed && (
            <div className="flex items-center gap-2">
              {onStartTour && (
                <button
                  type="button"
                  onClick={onStartTour}
                  title="Start Interactive Feature Tour"
                  className="text-[10.5px] font-mono uppercase tracking-wider text-amber-300 hover:text-amber-200 flex items-center gap-0.5 transition-colors"
                >
                  <MapPin className="w-2.5 h-2.5" />
                  <span>Tour</span>
                </button>
              )}

              {onOpenStory && (
                <button
                  type="button"
                  onClick={onOpenStory}
                  title="Replay Chapter Story Briefing"
                  className="text-[10.5px] font-mono uppercase tracking-wider text-emerald-300 hover:text-emerald-200 flex items-center gap-0.5 transition-colors"
                >
                  <BookText className="w-2.5 h-2.5" />
                  <span>Story</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {!collapsed && (
        <ol className="mt-2 divide-y divide-amber-400/12">
          {quest.steps.map((step, idx) => {
            const isCurrent = idx === quest.activeStepIndex;
            const clickable = Boolean(onSelectStep);
            return (
              <li key={step.id} className="py-1 first:pt-0 last:pb-0">
                <button
                  type="button"
                  onClick={() => onSelectStep?.(step)}
                  title={clickable ? 'Click to focus on this step target' : undefined}
                  className={`w-full text-left flex items-start gap-2 px-1.5 py-1.5 rounded-[3px] border text-[11.5px] transition-colors ${
                    step.done
                      ? 'bg-emerald-500/8 border-emerald-400/25 text-emerald-100/90 hover:border-emerald-300/45'
                      : isCurrent
                        ? 'bg-amber-400/10 border-amber-400/45 text-white hover:bg-amber-400/15'
                        : 'bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <span className="mt-0.5 shrink-0" aria-hidden="true">
                    {step.done ? (
                      <span className="w-4 h-4 rounded-[2px] bg-emerald-400/90 text-[#05080f] flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[2.8]" />
                      </span>
                    ) : isCurrent ? (
                      <span className="w-4 h-4 rounded-[2px] bg-amber-400 text-[#05080f] font-mono text-[9.5px] font-bold flex items-center justify-center">
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
                    <Crosshair className="w-3 h-3 text-amber-300 shrink-0 mt-0.5" />
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
