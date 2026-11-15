import React, { useState } from 'react';
import { Calculator, Flame, Info, Satellite, Snowflake, Waves, X } from 'lucide-react';
import { getConceptById } from '../engine/concepts.js';
import { KID_CONCEPTS } from '../data/kidCopy';
import { getConceptMathBreakdown, type MathMetric } from '../data/mathBreakdown';
import type { ConceptState } from '../types/observatory';
import { GiovanniTrendsCard } from './GiovanniTrendsCard';

interface ConceptCardProps {
  conceptId: string;
  conceptState: ConceptState;
  onClose: () => void;
}

type LayerTab = 'look' | 'why' | 'math';

const METRIC_STYLES: Record<NonNullable<MathMetric['accent']>, string> = {
  sky: 'bg-sky-500/10 border-sky-400/25 text-sky-200',
  amber: 'bg-amber-500/10 border-amber-400/25 text-amber-200',
  emerald: 'bg-emerald-500/10 border-emerald-400/25 text-emerald-200',
  slate: 'bg-white/5 border-white/10 text-slate-200',
};

export const ConceptCard: React.FC<ConceptCardProps> = ({
  conceptId,
  conceptState,
  onClose,
}) => {
  const [tab, setTab] = useState<LayerTab>('look');
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

  return (
    <div
      role="dialog"
      aria-label={`${kid.title} — Touch to Understand`}
      className="fixed z-30 top-18 left-3 md:left-[295px] w-[calc(100vw-1.5rem)] sm:w-[430px] max-h-[calc(100vh-13rem)] flex flex-col obsidian-hud-strong rounded-2xl overflow-hidden text-slate-100 shadow-2xl"
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
        <button
          type="button"
          onClick={onClose}
          aria-label="Close card"
          className="p-2 -mr-1.5 -mt-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 3-Tab Switcher */}
      <div className="px-5 pt-3">
        <div
          role="tablist"
          aria-label="Explanation depth"
          className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-white/5 border border-white/10"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'look'}
            onClick={() => setTab('look')}
            className={`px-2 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              tab === 'look'
                ? 'bg-sky-400/25 text-white border border-sky-300/45'
                : 'text-slate-300 hover:text-white border border-transparent'
            }`}
          >
            Look!
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'why'}
            onClick={() => setTab('why')}
            className={`px-2 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              tab === 'why'
                ? 'bg-sky-400/25 text-white border border-sky-300/45'
                : 'text-slate-300 hover:text-white border border-transparent'
            }`}
          >
            Why?
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'math'}
            onClick={() => setTab('math')}
            className={`px-2 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              tab === 'math'
                ? 'bg-sky-400/25 text-white border border-sky-300/45'
                : 'text-slate-300 hover:text-white border border-transparent'
            }`}
          >
            Math & NASA Data
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 overflow-y-auto obs-scroll space-y-3.5">
        {tab === 'look' && (
          <div className="space-y-3.5">
            <div
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm font-semibold ${toneClasses}`}
            >
              <ToneIcon className="w-5 h-5 shrink-0" />
              <span>{badge.label}</span>
            </div>
            <p className="text-[15px] text-slate-100 leading-relaxed font-medium">
              {kid.look(conceptState)}
            </p>
          </div>
        )}

        {tab === 'why' && (
          <div className="space-y-3">
            <p className="text-[15px] text-slate-100 leading-relaxed">
              {kid.why(conceptState)}
            </p>
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
    </div>
  );
};

