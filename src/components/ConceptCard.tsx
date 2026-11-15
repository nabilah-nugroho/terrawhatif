import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Calculator,
  Check,
  Eye,
  Flame,
  HelpCircle,
  Info,
  Lightbulb,
  Satellite,
  Snowflake,
  Waves,
  X,
} from 'lucide-react';
import { getConceptById } from '../engine/concepts.js';
import { KID_CONCEPTS } from '../data/kidCopy';
import { getConceptMathBreakdown, type MathMetric } from '../data/mathBreakdown';
import type { ConceptState } from '../types/observatory';
import { GiovanniTrendsCard } from './GiovanniTrendsCard';
import {
  ConceptLookVisual,
  ConceptMathCurve,
  ConceptWhyLab,
} from './ConceptInteractiveVisual';

interface ConceptCardProps {
  conceptId: string;
  conceptState: ConceptState;
  onClose: () => void;
}

type LayerTab = 'look' | 'why' | 'math';

let hasDismissedLayerGuide = false;

const METRIC_STYLES: Record<NonNullable<MathMetric['accent']>, string> = {
  sky: 'bg-sky-500/10 border-sky-400/25 text-sky-200',
  amber: 'bg-amber-500/10 border-amber-400/25 text-amber-200',
  emerald: 'bg-emerald-500/10 border-emerald-400/25 text-emerald-200',
  slate: 'bg-white/5 border-white/10 text-slate-200',
};

const TAB_META: {
  id: LayerTab;
  stepNum: number;
  label: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'look',
    stepNum: 1,
    label: 'Look!',
    shortDesc: 'What changes in 3D',
    icon: Eye,
  },
  {
    id: 'why',
    stepNum: 2,
    label: 'Why?',
    shortDesc: 'Simple analogy',
    icon: Lightbulb,
  },
  {
    id: 'math',
    stepNum: 3,
    label: 'Math & NASA',
    shortDesc: 'Equations & satellite data',
    icon: Satellite,
  },
];

export const ConceptCard: React.FC<ConceptCardProps> = ({
  conceptId,
  conceptState,
  onClose,
}) => {
  const [tab, setTab] = useState<LayerTab>('look');
  const [visitedTabs, setVisitedTabs] = useState<Set<LayerTab>>(() => new Set(['look']));
  const [showLayerGuide, setShowLayerGuide] = useState(() => !hasDismissedLayerGuide);

  useEffect(() => {
    setTab('look');
    setVisitedTabs(new Set(['look']));
  }, [conceptId]);

  const selectTab = (next: LayerTab) => {
    setTab(next);
    setVisitedTabs((prev) => {
      if (prev.has(next)) return prev;
      const updated = new Set(prev);
      updated.add(next);
      if (updated.size === 3) {
        hasDismissedLayerGuide = true;
        setShowLayerGuide(false);
      }
      return updated;
    });
  };

  const dismissGuide = () => {
    hasDismissedLayerGuide = true;
    setShowLayerGuide(false);
  };

  const rawConcept = getConceptById(conceptId);
  const kid = KID_CONCEPTS[conceptId];
  const mathBreakdown = getConceptMathBreakdown(conceptId, conceptState);

  if (!rawConcept || !kid) return null;

  const badge = kid.badge(conceptState);
  const toneClasses =
    badge.tone === 'cold'
      ? 'bg-cyan-500/15 border-cyan-300/45 text-cyan-100'
      : badge.tone === 'hot'
        ? 'bg-amber-500/15 border-amber-300/45 text-amber-100'
        : 'bg-emerald-500/15 border-emerald-300/45 text-emerald-100';

  const ToneIcon =
    badge.tone === 'cold' ? Snowflake : badge.tone === 'hot' ? Flame : Waves;

  const nextUnvisitedTab: LayerTab | null = !visitedTabs.has('why')
    ? 'why'
    : !visitedTabs.has('math')
      ? 'math'
      : null;

  return (
    <div
      role="dialog"
      aria-label={`${kid.title} — Touch to Understand`}
      className="fixed z-30 top-18 left-3 md:left-[295px] w-[calc(100vw-1.5rem)] sm:w-[446px] max-h-[calc(100vh-11.5rem)] flex flex-col obsidian-hud-strong rounded-2xl overflow-hidden text-slate-100 shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-white/10">
        <div>
          <div className="text-[11px] font-mono text-sky-300">
            Chapter {kid.chapter} · Touch to Understand
          </div>
          <h3 className="font-display text-lg font-bold text-white mt-0.5 leading-snug">
            {kid.title}
          </h3>
        </div>
        <div className="flex items-center gap-1 -mr-1.5 -mt-1">
          <button
            type="button"
            onClick={() => setShowLayerGuide((v) => !v)}
            title="Show 3-layer guide (Look · Why · Math & NASA)"
            aria-label="Toggle 3-layer explanation guide"
            className={`p-2 rounded-lg transition-colors ${
              showLayerGuide
                ? 'text-amber-300 bg-amber-400/15'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close card"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3-Tab Switcher with step numbers, icons & visited checks */}
      <div className="px-5 pt-3 space-y-2">
        <div
          role="tablist"
          aria-label="Explanation depth"
          className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10"
        >
          {TAB_META.map((item) => {
            const Icon = item.icon;
            const isActive = tab === item.id;
            const isVisited = visitedTabs.has(item.id);
            const shouldNudge = showLayerGuide && !isActive && nextUnvisitedTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => selectTab(item.id)}
                className={`relative px-2 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? item.id === 'math'
                      ? 'bg-emerald-400/20 text-white border border-emerald-300/50 shadow-[0_0_14px_rgba(52,211,153,0.2)]'
                      : item.id === 'why'
                        ? 'bg-amber-400/20 text-white border border-amber-300/50 shadow-[0_0_14px_rgba(251,191,36,0.2)]'
                        : 'bg-sky-400/25 text-white border border-sky-300/50 shadow-[0_0_14px_rgba(56,189,248,0.2)]'
                    : shouldNudge
                      ? 'bg-amber-400/10 text-amber-100 border border-amber-300/55 hover:bg-amber-400/20'
                      : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${
                    item.id === 'look'
                      ? 'text-sky-300'
                      : item.id === 'why'
                        ? 'text-amber-300'
                        : 'text-emerald-300'
                  }`}
                />
                <span>
                  {item.stepNum}. {item.label}
                </span>
                {isVisited && !isActive && (
                  <Check className="w-3 h-3 text-emerald-300 shrink-0" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>

        {/* Point-Out Callout highlighting the 3-step depth */}
        {showLayerGuide && (
          <div className="relative rounded-xl bg-amber-400/10 border border-amber-300/40 px-3 py-2 text-[11.5px] text-amber-50 flex items-start justify-between gap-2.5">
            <div className="space-y-0.5 leading-snug">
              <div className="font-semibold text-amber-200 flex items-center gap-1.5">
                <span>▲ Tap all 3 tabs to see the full science:</span>
              </div>
              <div className="text-[11px] text-slate-200">
                <span className="text-sky-300 font-semibold">1. Look!</span> (3D cue) →{' '}
                <span className="text-amber-300 font-semibold">2. Why?</span> (analogy) →{' '}
                <span className="text-emerald-300 font-semibold">3. Math &amp; NASA</span> (equations + satellite proof)
              </div>
            </div>
            <button
              type="button"
              onClick={dismissGuide}
              className="text-[10.5px] font-mono text-amber-200/90 hover:text-white px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 shrink-0"
            >
              Got it
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4 overflow-y-auto obs-scroll space-y-3.5 flex-1">
        {tab === 'look' && (
          <div className="space-y-3.5">
            <div
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm font-semibold ${toneClasses}`}
            >
              <ToneIcon className="w-5 h-5 shrink-0" />
              <span>{badge.label}</span>
            </div>
            <ConceptLookVisual conceptId={conceptId} state={conceptState} />
            <p className="text-[14.5px] text-slate-100 leading-relaxed font-medium">
              {kid.look(conceptState)}
            </p>
          </div>
        )}

        {tab === 'why' && (
          <div className="space-y-3.5">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-amber-300">
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Everyday Analogy</span>
            </div>
            <p className="text-[14.5px] text-slate-100 leading-relaxed">
              {kid.why(conceptState)}
            </p>
            <ConceptWhyLab conceptId={conceptId} state={conceptState} />
          </div>
        )}

        {tab === 'math' && mathBreakdown && (
          <div className="space-y-4">
            {/* Section 1: Physics Equation */}
            <section className="rounded-xl bg-black/40 border border-white/12 p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-sky-300">
                <Calculator className="w-3.5 h-3.5" />
                <span>1. Physics Formula · {mathBreakdown.equationTitle}</span>
              </div>
              <div className="px-3 py-2 rounded-lg bg-sky-500/10 border border-sky-300/30 font-mono text-sm font-semibold text-white text-center tracking-tight">
                {mathBreakdown.formula}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {mathBreakdown.symbolKey}
              </p>
            </section>

            {/* Interactive Formula Curve Explorer */}
            <ConceptMathCurve conceptId={conceptId} state={conceptState} />

            {/* Section 2: Live Numbers Grid */}
            <section className="space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-wider text-amber-300 px-0.5">
                2. Live Numbers Right Now
              </div>
              <div className="grid grid-cols-2 gap-2">
                {mathBreakdown.metrics.map((m) => (
                  <div
                    key={m.label}
                    className={`rounded-xl border p-2.5 ${METRIC_STYLES[m.accent ?? 'slate']}`}
                  >
                    <div className="text-[10.5px] text-slate-300 font-medium">
                      {m.label}
                    </div>
                    <div className="font-mono text-sm font-bold text-white mt-0.5 tabular-nums">
                      {m.value}
                    </div>
                    {m.sub && (
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                        {m.sub}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/25 px-3 py-2 text-xs text-emerald-100 leading-relaxed">
                <strong className="text-emerald-300">What this means:</strong>{' '}
                {mathBreakdown.plainMeaning}
              </div>
              <div className="flex items-start gap-2 text-[11px] text-slate-400 leading-relaxed px-1">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                <span>
                  <strong className="text-slate-300">Model note:</strong>{' '}
                  {mathBreakdown.modelNote}
                </span>
              </div>
            </section>

            {/* Section 3: Real NASA Satellite Data */}
            <section className="rounded-xl bg-white/5 border border-white/12 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-sky-300">
                  <Satellite className="w-3.5 h-3.5" />
                  <span>3. Real NASA Data</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-sky-400/15 border border-sky-300/35 text-[10px] font-mono font-semibold text-sky-200">
                  {mathBreakdown.nasaDataset}
                </span>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed">
                {mathBreakdown.nasaRole}
              </p>

              <GiovanniTrendsCard mode="compact" defaultOpen={false} />
            </section>
          </div>
        )}

        {tab === 'math' && !mathBreakdown && (
          <div className="font-mono text-xs text-slate-200 leading-relaxed tabular-nums">
            {rawConcept.layers.math(conceptState)}
          </div>
        )}
      </div>

      {/* Guided Step-Through Footer */}
      <div className="px-5 py-2.5 border-t border-white/10 bg-black/25 flex items-center justify-between gap-3">
        <span className="text-[11px] font-mono text-slate-400 tabular-nums">
          Layer {tab === 'look' ? '1' : tab === 'why' ? '2' : '3'} of 3 · {visitedTabs.size}/3 explored
        </span>

        {tab === 'look' && (
          <button
            type="button"
            onClick={() => selectTab('why')}
            className="px-3 py-1.5 rounded-xl bg-amber-400/18 border border-amber-300/45 hover:bg-amber-400/28 text-xs font-semibold text-amber-100 transition-colors flex items-center gap-1.5"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
            <span>Next: Why?</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        {tab === 'why' && (
          <button
            type="button"
            onClick={() => selectTab('math')}
            className="px-3 py-1.5 rounded-xl bg-emerald-400/18 border border-emerald-300/45 hover:bg-emerald-400/28 text-xs font-semibold text-emerald-100 transition-colors flex items-center gap-1.5"
          >
            <Satellite className="w-3.5 h-3.5 text-emerald-300" />
            <span>Next: Math &amp; NASA</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        {tab === 'math' && (
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 text-xs font-semibold text-white transition-colors flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5 text-emerald-300" />
            <span>Done</span>
          </button>
        )}
      </div>
    </div>
  );
};
