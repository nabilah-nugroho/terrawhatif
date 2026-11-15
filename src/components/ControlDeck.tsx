import React from 'react';
import { ArrowLeftRight, HelpCircle, Rocket, RotateCcw, Sparkles, Wind } from 'lucide-react';
import { WHAT_IF_PRESETS, type WhatIfPreset } from '../data/presets';
import type { SimParams, SimResult, StageId } from '../types/observatory';

interface ControlDeckProps {
  stage: StageId;
  params: SimParams;
  simResult: SimResult;
  spotlightControl: 'co2' | 'orbit' | 'star' | 'prediction' | null;
  onChangeParams: (patch: Partial<SimParams>) => void;
  onSelectPreset: (preset: WhatIfPreset) => void;
  onOpenMiniPrediction: () => void;
  onResetBaseline?: () => void;
}

export const ControlDeck: React.FC<ControlDeckProps> = ({
  stage,
  params,
  simResult,
  spotlightControl,
  onChangeParams,
  onSelectPreset,
  onOpenMiniPrediction,
  onResetBaseline,
}) => {
  if (stage === 'INTRO' || stage === 'EPILOG') return null;

  const isCh1 = stage === 'CH1';
  const isCh2 = stage === 'CH2';
  const isCh3 = stage === 'CH3';

  const isTrappist = params.starKey === 'trappist1';
  const orbitMin = isTrappist ? 0.015 : 0.85;
  const orbitMax = isTrappist ? 0.060 : 1.15;
  const orbitStep = isTrappist ? 0.0005 : 0.01;
  const orbitDigits = isTrappist ? 3 : 2;

  const co2Spotlight = spotlightControl === 'co2';
  const orbitSpotlight = spotlightControl === 'orbit';
  const predSpotlight = spotlightControl === 'prediction';

  // Before vs After Earth Today (288.0 K / +14.9°C, 30.0% albedo)
  const deltaTempK = simResult.T_surface - 288.0;
  const deltaIcePct = Math.round((simResult.albedo - 0.30) * 100);
  const nearBaseline = Math.abs(deltaTempK) < 0.6 && Math.abs(deltaIcePct) <= 1;

  // Habitable zone percentage bar for Chapter 3 Orbit slider
  const hzStartPct = Math.max(
    0,
    Math.min(100, ((simResult.hzBounds.inner - orbitMin) / (orbitMax - orbitMin)) * 100)
  );
  const hzEndPct = Math.max(
    0,
    Math.min(100, ((simResult.hzBounds.outer - orbitMin) / (orbitMax - orbitMin)) * 100)
  );

  const visiblePresets = isCh3
    ? WHAT_IF_PRESETS.filter((p) => p.id !== 'venus')
    : WHAT_IF_PRESETS.filter((p) => p.id !== 'trappist');

  return (
    <section
      aria-label="Chapter controls"
      className="pointer-events-auto w-full md:max-w-[520px] obsidian-hud-strong rounded-2xl px-4 py-3 text-slate-100 shadow-2xl space-y-2.5"
    >
      {/* Live Before vs. After Earth Baseline Strip + Quick Reset + Prediction Quiz */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
        <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums min-w-0">
          <ArrowLeftRight className="w-3.5 h-3.5 text-sky-300 shrink-0" />
          <span className="text-slate-400 shrink-0">vs. Earth:</span>
          {nearBaseline ? (
            <span className="text-emerald-300 font-semibold truncate">
              Baseline (+15°C · 30% Ice)
            </span>
          ) : (
            <span className="truncate">
              <strong className={deltaTempK >= 0 ? 'text-amber-300' : 'text-cyan-300'}>
                {deltaTempK >= 0 ? '+' : ''}
                {deltaTempK.toFixed(1)}°C {deltaTempK >= 0 ? 'warmer' : 'colder'}
              </strong>
              <span className="text-slate-400"> · Ice </span>
              <strong className="text-slate-200">
                {deltaIcePct >= 0 ? `+${deltaIcePct}%` : `${deltaIcePct}%`}
              </strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!nearBaseline && onResetBaseline && (
            <button
              type="button"
              onClick={onResetBaseline}
              title="Reset planet back to Earth Today (+15°C)"
              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/15 text-[11px] font-medium text-slate-200 hover:text-white transition-colors flex items-center gap-1 whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3 text-sky-300" />
              <span>Reset</span>
            </button>
          )}

          <div className="relative">
            {predSpotlight && (
              <span className="absolute -top-6 right-0 px-2 py-0.5 rounded-full bg-amber-300 text-[#06090f] text-[10px] font-bold whitespace-nowrap shadow animate-bounce pointer-events-none">
                Tap me! ↓
              </span>
            )}
            <button
              type="button"
              onClick={onOpenMiniPrediction}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors flex items-center gap-1 whitespace-nowrap ${
                predSpotlight
                  ? 'bg-amber-300 text-[#06090f] border-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.55)]'
                  : 'bg-amber-400/15 border-amber-300/40 text-amber-100 hover:bg-amber-400/25'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Prediction Quiz</span>
            </button>
          </div>
        </div>
      </div>

      {/* CHAPTER 1: CO2 Heat Blanket slider + Earth Without Air toggle */}
      {isCh1 && (
        <div
          className={`relative rounded-xl p-2 -mx-1 transition-all ${
            co2Spotlight
              ? 'ring-2 ring-amber-300 bg-amber-400/10 shadow-[0_0_24px_rgba(251,191,36,0.28)]'
              : ''
          }`}
        >
          {co2Spotlight && (
            <span className="absolute -top-4 left-4 px-2.5 py-0.5 rounded-full bg-amber-300 text-[#06090f] text-[10px] font-bold shadow animate-bounce pointer-events-none">
              Slide me past 560 ppm! ↓
            </span>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="ch1-co2-slider"
                className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-white"
              >
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <span>CO₂ Heat Blanket</span>
              </label>

              <div className="flex items-center gap-2">
                <span className="font-mono text-xs sm:text-sm font-semibold text-amber-200 tabular-nums">
                  {params.noGreenhouse ? '0 ppm' : `${params.co2_ppm.toFixed(0)} ppm`}
                </span>
                <button
                  type="button"
                  onClick={() => onChangeParams({ noGreenhouse: !params.noGreenhouse })}
                  aria-pressed={params.noGreenhouse}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors flex items-center gap-1 whitespace-nowrap ${
                    params.noGreenhouse
                      ? 'bg-cyan-400/25 border-cyan-300/60 text-cyan-100'
                      : 'bg-white/5 border-white/15 text-slate-200 hover:text-white hover:border-white/35'
                  }`}
                >
                  <Wind className="w-3 h-3" />
                  <span>{params.noGreenhouse ? 'No Air: ON' : 'Earth Without Air'}</span>
                </button>
              </div>
            </div>

            <div className={params.noGreenhouse ? 'opacity-40 pointer-events-none' : ''}>
              <div className="relative">
                {/* Target 560 ppm threshold marker */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-amber-300/90 z-10"
                  style={{ left: `${((560 - 50) / (2000 - 50)) * 100}%` }}
                />
                <input
                  id="ch1-co2-slider"
                  type="range"
                  min={50}
                  max={2000}
                  step={10}
                  disabled={params.noGreenhouse}
                  value={params.co2_ppm}
                  onChange={(e) => onChangeParams({ co2_ppm: parseFloat(e.target.value) })}
                  className="obs-slider"
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1 tabular-nums">
                <span>50 ppm</span>
                <span>280 Earth</span>
                <span className="text-amber-300 font-semibold">560 Goal ▲</span>
                <span>2000 ppm</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHAPTER 2: Orbit slider + CO2 Heat Blanket */}
      {isCh2 && (
        <div className="space-y-2">
          <div
            className={`relative rounded-xl p-2 -mx-1 transition-all ${
              orbitSpotlight
                ? 'ring-2 ring-amber-300 bg-amber-400/10 shadow-[0_0_24px_rgba(251,191,36,0.28)]'
                : ''
            }`}
          >
            {orbitSpotlight && (
              <span className="absolute -top-4 left-4 px-2.5 py-0.5 rounded-full bg-amber-300 text-[#06090f] text-[10px] font-bold shadow animate-bounce pointer-events-none">
                Slide to 0.85 AU! ↓
              </span>
            )}

            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="ch2-orbit-slider"
                className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-white"
              >
                <Rocket className="w-4 h-4 text-sky-300 shrink-0" />
                <span>Orbit Distance</span>
              </label>

              <span className="font-mono text-xs sm:text-sm font-semibold text-sky-200 tabular-nums">
                {params.a_AU.toFixed(2)} AU
              </span>
            </div>

            <div className="relative">
              {/* Target 0.85 AU & Earth 1.00 AU track markers */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-0 bottom-0 left-0 w-0.5 bg-amber-300 z-10"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-0 bottom-0 left-1/2 w-0.5 bg-sky-300/60 z-10"
              />
              <input
                id="ch2-orbit-slider"
                type="range"
                min={0.85}
                max={1.15}
                step={0.01}
                value={Math.min(1.15, Math.max(0.85, params.a_AU))}
                onChange={(e) => onChangeParams({ a_AU: parseFloat(e.target.value) })}
                className="obs-slider"
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-0.5 tabular-nums">
              <span className="text-amber-300 font-semibold">▲ 0.85 AU (Goal)</span>
              <span>1.00 AU (Earth)</span>
              <span>1.15 AU</span>
            </div>
          </div>

          <div
            className={`relative rounded-xl p-2 -mx-1 transition-all border-t border-white/10 ${
              co2Spotlight
                ? 'ring-2 ring-amber-300 bg-amber-400/10 shadow-[0_0_24px_rgba(251,191,36,0.28)]'
                : ''
            }`}
          >
            {co2Spotlight && (
              <span className="absolute -top-4 left-4 px-2.5 py-0.5 rounded-full bg-amber-300 text-[#06090f] text-[10px] font-bold shadow animate-bounce pointer-events-none">
                Slide down to cool Earth! ↓
              </span>
            )}
            <div className="flex items-center gap-3">
              <label
                htmlFor="ch2-co2-slider"
                className="text-xs font-semibold text-slate-100 whitespace-nowrap"
              >
                CO₂ Blanket
              </label>
              <input
                id="ch2-co2-slider"
                type="range"
                min={50}
                max={2000}
                step={10}
                value={params.co2_ppm}
                onChange={(e) =>
                  onChangeParams({ noGreenhouse: false, co2_ppm: parseFloat(e.target.value) })
                }
                className="obs-slider flex-1"
              />
              <span className="font-mono text-xs text-amber-200 tabular-nums w-16 text-right">
                {params.co2_ppm.toFixed(0)} ppm
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CHAPTER 3: Orbit Slider with Green Habitable Zone Band */}
      {isCh3 && (
        <div
          className={`relative rounded-xl p-2 -mx-1 transition-all ${
            orbitSpotlight
              ? 'ring-2 ring-amber-300 bg-amber-400/10 shadow-[0_0_24px_rgba(251,191,36,0.28)]'
              : ''
          }`}
        >
          {orbitSpotlight && (
            <span className="absolute -top-4 left-4 px-2.5 py-0.5 rounded-full bg-amber-300 text-[#06090f] text-[10px] font-bold shadow animate-bounce pointer-events-none">
              Slide into green zone! ↓
            </span>
          )}

          <div className="flex items-center justify-between text-xs mb-2">
            <label htmlFor="ch3-orbit-slider" className="flex items-center gap-1.5 font-semibold text-white">
              <Rocket className="w-4 h-4 text-sky-300" />
              <span>Orbit Around {isTrappist ? 'TRAPPIST-1' : 'Sun'}</span>
            </label>
            <span className="font-mono text-sky-200 tabular-nums">
              {params.a_AU.toFixed(orbitDigits)} AU ·{' '}
              <span className={simResult.inHZ ? 'text-emerald-300 font-semibold' : 'text-amber-300'}>
                {simResult.inHZ ? '● In Habitable Zone' : 'Outside Zone'}
              </span>
            </span>
          </div>

          <div className="relative pt-1">
            <div className="relative h-1.5 w-full rounded-full bg-white/10 mb-1.5 overflow-hidden">
              <div
                className="absolute top-0 bottom-0 bg-emerald-400/75 rounded-full"
                style={{
                  left: `${hzStartPct}%`,
                  width: `${Math.max(4, hzEndPct - hzStartPct)}%`,
                }}
              />
            </div>

            <input
              id="ch3-orbit-slider"
              type="range"
              min={orbitMin}
              max={orbitMax}
              step={orbitStep}
              value={Math.min(orbitMax, Math.max(orbitMin, params.a_AU))}
              onChange={(e) => onChangeParams({ a_AU: parseFloat(e.target.value) })}
              className="obs-slider"
            />
          </div>

          <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1 tabular-nums">
            <span>{orbitMin.toFixed(orbitDigits)} AU</span>
            <span className="text-emerald-300">
              Habitable Zone: {simResult.hzBounds.inner.toFixed(isTrappist ? 3 : 2)}–
              {simResult.hzBounds.outer.toFixed(isTrappist ? 3 : 2)} AU
            </span>
            <span>{orbitMax.toFixed(orbitDigits)} AU</span>
          </div>
        </div>
      )}

      {/* 1-Click What-If Scenario Presets */}
      <div className="pt-2 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto obs-scroll">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 shrink-0">
          What-If:
        </span>
        {visiblePresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelectPreset(preset)}
            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-sky-400/20 border border-white/15 hover:border-sky-300/45 text-[11px] font-medium text-slate-200 hover:text-white transition-colors whitespace-nowrap flex items-center gap-1 shrink-0"
          >
            <span>{preset.label}</span>
            <span className="text-[9.5px] font-mono text-sky-300">{preset.tag}</span>
          </button>
        ))}
      </div>
    </section>
  );
};

