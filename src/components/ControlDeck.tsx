import React from 'react';
import { ArrowLeftRight, HelpCircle, Rocket, RotateCcw, Sparkles, Wind } from 'lucide-react';
import { WHAT_IF_PRESETS, type WhatIfPreset } from '../data/presets';
import type { SimParams, SimResult, StageId } from '../types/observatory';
import { HudCorners, SectionCodeTag } from './HudReticleFrame';

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

  const deltaTempK = simResult.T_surface - 288.0;
  const deltaIcePct = Math.round((simResult.albedo - 0.30) * 100);
  const nearBaseline = Math.abs(deltaTempK) < 0.6 && Math.abs(deltaIcePct) <= 1;

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
      data-tour="control-deck"
      aria-label="Chapter controls"
      className="relative pointer-events-auto w-full md:max-w-[530px] obs-panel-strong rounded-[4px] px-4 py-3 text-slate-100 space-y-2.5"
    >
      <HudCorners tone="amber" />

      {/* Live Before vs. After Earth Baseline Strip + Quick Reset + Prediction Quiz */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-amber-400/20 pt-0.5">
        <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums min-w-0">
          <SectionCodeTag label="02 / DRIVE" tone="amber" />
          <ArrowLeftRight className="w-3 h-3 text-emerald-300 shrink-0 hidden sm:inline" />
          {nearBaseline ? (
            <span className="text-emerald-300 font-medium truncate">
              EARTH BASELINE (+15°C · 30% ICE)
            </span>
          ) : (
            <span className="truncate">
              <strong className={deltaTempK >= 0 ? 'text-amber-300' : 'text-cyan-300'}>
                {deltaTempK >= 0 ? '+' : ''}
                {deltaTempK.toFixed(1)}°C {deltaTempK >= 0 ? 'WARMER' : 'COLDER'}
              </strong>
              <span className="text-slate-400"> · ICE </span>
              <strong className="text-emerald-200">
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
              className="px-2 py-1 rounded-[3px] bg-white/5 hover:bg-amber-400/10 border border-amber-400/25 text-[10.5px] font-mono uppercase tracking-wider text-slate-200 hover:text-amber-200 transition-colors flex items-center gap-1 whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3 text-emerald-300" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenMiniPrediction}
            className={`px-2.5 py-1 rounded-[3px] border text-[10.5px] font-mono uppercase tracking-wider font-semibold transition-colors flex items-center gap-1 whitespace-nowrap ${
              predSpotlight
                ? 'bg-amber-400 text-[#05080f] border-amber-300'
                : 'bg-amber-500/10 border-amber-400/45 text-amber-200 hover:bg-amber-400/20'
            }`}
          >
            <HelpCircle className="w-3 h-3" />
            <span>{predSpotlight ? 'Answer Quiz' : 'Quiz'}</span>
          </button>
        </div>
      </div>

      {/* CHAPTER 1: CO2 Heat Blanket slider + Earth Without Air toggle */}
      {isCh1 && (
        <div
          className={`rounded-[3px] p-2 -mx-1 transition-colors border ${
            co2Spotlight
              ? 'border-amber-400/60 bg-amber-400/8'
              : 'border-transparent'
          }`}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="ch1-co2-slider"
                className="flex items-center gap-2 text-xs sm:text-[13px] font-semibold text-white min-w-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="truncate">CO₂ Heat Blanket</span>
                {co2Spotlight && (
                  <span className="text-[10px] font-mono text-amber-300 shrink-0">
                    · TARGET &gt; 560 PPM
                  </span>
                )}
              </label>

              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-xs sm:text-sm font-semibold text-emerald-300 tabular-nums">
                  {params.noGreenhouse ? '0 PPM' : `${params.co2_ppm.toFixed(0)} PPM`}
                </span>
                <button
                  type="button"
                  onClick={() => onChangeParams({ noGreenhouse: !params.noGreenhouse })}
                  aria-pressed={params.noGreenhouse}
                  className={`px-2.5 py-1 rounded-[3px] text-[10.5px] font-mono uppercase tracking-wider border transition-colors flex items-center gap-1 whitespace-nowrap ${
                    params.noGreenhouse
                      ? 'bg-cyan-400/18 border-cyan-300/60 text-cyan-100'
                      : 'bg-white/5 border-amber-400/25 text-slate-300 hover:text-white hover:border-amber-400/50'
                  }`}
                >
                  <Wind className="w-3 h-3" />
                  <span>{params.noGreenhouse ? 'No Air: ON' : 'No Air'}</span>
                </button>
              </div>
            </div>

            <div className={params.noGreenhouse ? 'opacity-40 pointer-events-none' : ''}>
              <div className="relative py-1">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0.5 bottom-0.5 w-0.5 bg-amber-300 z-10"
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
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-0.5 tabular-nums">
                <span>50 PPM</span>
                <span>280 EARTH</span>
                <span className="text-amber-300 font-semibold">560 GOAL</span>
                <span>2000 PPM</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHAPTER 2: Orbit slider + CO2 Heat Blanket */}
      {isCh2 && (
        <div className="space-y-2">
          <div
            className={`rounded-[3px] p-2 -mx-1 transition-colors border ${
              orbitSpotlight
                ? 'border-amber-400/60 bg-amber-400/8'
                : 'border-transparent'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="ch2-orbit-slider"
                className="flex items-center gap-2 text-xs sm:text-[13px] font-semibold text-white min-w-0"
              >
                <Rocket className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span className="truncate">Orbit Distance</span>
                {orbitSpotlight && (
                  <span className="text-[10px] font-mono text-amber-300 shrink-0">
                    · TARGET 0.85 AU
                  </span>
                )}
              </label>

              <span className="font-mono text-xs sm:text-sm font-semibold text-emerald-300 tabular-nums shrink-0">
                {params.a_AU.toFixed(2)} AU
              </span>
            </div>

            <div className="relative py-1">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-0.5 bottom-0.5 left-0 w-0.5 bg-amber-300 z-10"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-0.5 bottom-0.5 left-1/2 w-0.5 bg-emerald-300/60 z-10"
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
              <span className="text-amber-300 font-semibold">0.85 AU GOAL</span>
              <span>1.00 AU EARTH</span>
              <span>1.15 AU</span>
            </div>
          </div>

          <div
            className={`rounded-[3px] p-2 -mx-1 transition-colors border-t border-amber-400/18 ${
              co2Spotlight
                ? 'ring-1 ring-amber-400/70 bg-amber-400/8'
                : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <label
                htmlFor="ch2-co2-slider"
                className="text-xs font-semibold text-slate-100 whitespace-nowrap"
              >
                CO₂ Blanket
                {co2Spotlight && (
                  <span className="ml-1.5 text-[10px] font-mono text-amber-300 font-normal">
                    (SLIDE DOWN)
                  </span>
                )}
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
              <span className="font-mono text-xs text-emerald-300 tabular-nums w-20 text-right">
                {params.co2_ppm.toFixed(0)} PPM
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CHAPTER 3: Orbit Slider with Green Habitable Zone Band */}
      {isCh3 && (
        <div
          className={`rounded-[3px] p-2 -mx-1 transition-colors border ${
            orbitSpotlight
              ? 'border-amber-400/60 bg-amber-400/8'
              : 'border-transparent'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-2 gap-2">
            <label htmlFor="ch3-orbit-slider" className="flex items-center gap-1.5 font-semibold text-white min-w-0">
              <Rocket className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span className="truncate">Orbit · {isTrappist ? 'TRAPPIST-1' : 'Sun'}</span>
              {orbitSpotlight && (
                <span className="text-[10px] font-mono text-amber-300 shrink-0">
                  · FIND GREEN ZONE
                </span>
              )}
            </label>
            <span className="font-mono text-emerald-300 tabular-nums shrink-0">
              {params.a_AU.toFixed(orbitDigits)} AU ·{' '}
              <span className={simResult.inHZ ? 'text-emerald-300 font-semibold' : 'text-amber-300'}>
                {simResult.inHZ ? 'IN ZONE' : 'OUTSIDE'}
              </span>
            </span>
          </div>

          <div className="relative pt-1">
            <div className="relative h-1.5 w-full rounded-[2px] bg-amber-500/15 mb-1.5 overflow-hidden">
              <div
                className="absolute top-0 bottom-0 bg-emerald-400/80"
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
              HZ {simResult.hzBounds.inner.toFixed(isTrappist ? 3 : 2)}–
              {simResult.hzBounds.outer.toFixed(isTrappist ? 3 : 2)} AU
            </span>
            <span>{orbitMax.toFixed(orbitDigits)} AU</span>
          </div>
        </div>
      )}

      {/* 1-Click What-If Scenario Presets */}
      <div className="pt-2 border-t border-amber-400/20 flex items-center gap-1.5 overflow-x-auto obs-scroll">
        <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300/85 shrink-0 mr-0.5">
          PRESETS
        </span>
        {visiblePresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelectPreset(preset)}
            className="px-2.5 py-1 rounded-[3px] bg-white/[0.03] hover:bg-emerald-400/12 border border-amber-400/20 hover:border-emerald-300/50 text-[11px] font-mono text-slate-200 hover:text-emerald-200 transition-colors whitespace-nowrap shrink-0"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </section>
  );
};
