import React, { useState } from 'react';
import {
  AlertTriangle,
  Compass,
  FlaskConical,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { EPILOG } from '../engine/chapters.js';
import type { SimParams, SimResult, StarKey } from '../types/observatory';
import { WHAT_IF_PRESETS, type WhatIfPreset } from '../data/presets';
import { GiovanniTrendsCard } from './GiovanniTrendsCard';

interface ScienceLabViewProps {
  open: boolean;
  onClose: () => void;
  params: SimParams;
  simResult: SimResult;
  onChangeParams: (patch: Partial<SimParams>) => void;
  onSwitchStar: (starKey: StarKey) => void;
  onResetBaseline: () => void;
  onPlayRealTrend?: () => void;
  isPlayingTrend?: boolean;
  onApplyPreset?: (preset: WhatIfPreset) => void;
}

type LabTab = 'sandbox' | 'giovanni' | 'notes';

export const ScienceLabView: React.FC<ScienceLabViewProps> = ({
  open,
  onClose,
  params,
  simResult,
  onChangeParams,
  onSwitchStar,
  onResetBaseline,
  onPlayRealTrend,
  isPlayingTrend = false,
  onApplyPreset,
}) => {
  const [tab, setTab] = useState<LabTab>('sandbox');

  if (!open) return null;

  const isTrappist = params.starKey === 'trappist1';
  const orbitMin = isTrappist ? 0.015 : 0.70;
  const orbitMax = isTrappist ? 0.060 : 1.50;
  const orbitStep = isTrappist ? 0.0005 : 0.01;
  const orbitDigits = isTrappist ? 4 : 2;

  const tCelsius = simResult.T_surface - 273.15;
  const teqCelsius = simResult.T_eq - 273.15;
  const deltaT = simResult.T_surface - simResult.T_eq;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Science Lab — Full Controls, Telemetry & NASA Giovanni Explorer"
      className="fixed inset-0 z-40 flex items-center justify-end bg-black/55 p-0 sm:p-4"
    >
      <div className="w-full sm:w-[540px] h-full sm:h-[calc(100vh-2rem)] obsidian-hud-strong sm:rounded-2xl flex flex-col text-slate-100 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <FlaskConical className="w-5 h-5 text-sky-300" />
            <div>
              <h2 className="text-base font-bold text-white">Science Lab</h2>
              <p className="text-xs font-mono text-slate-400">
                Full Calibration Sandbox · NASA Giovanni & CERES Telemetry
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onResetBaseline}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/15 text-slate-200 hover:text-white hover:border-white/35 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Earth Baseline</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Science Lab"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3">
          <div
            role="tablist"
            className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-white/5 border border-white/10"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'sandbox'}
              onClick={() => setTab('sandbox')}
              className={`px-2 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                tab === 'sandbox'
                  ? 'bg-sky-400/25 text-white border border-sky-300/45'
                  : 'text-slate-300 hover:text-white border border-transparent'
              }`}
            >
              Sandbox & Telemetry
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'giovanni'}
              onClick={() => setTab('giovanni')}
              className={`px-2 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                tab === 'giovanni'
                  ? 'bg-sky-400/25 text-white border border-sky-300/45'
                  : 'text-slate-300 hover:text-white border border-transparent'
              }`}
            >
              NASA Giovanni t-Test
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'notes'}
              onClick={() => setTab('notes')}
              className={`px-2 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                tab === 'notes'
                  ? 'bg-sky-400/25 text-white border border-sky-300/45'
                  : 'text-slate-300 hover:text-white border border-transparent'
              }`}
            >
              Limits & Credits
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto obs-scroll p-5 space-y-5">
          {tab === 'sandbox' && (
            <>
              {/* 1-Click What-If Scenario Presets */}
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>1-Click What-If Scenarios</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Instant climate jump</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {WHAT_IF_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        if (onApplyPreset) {
                          onApplyPreset(preset);
                        } else {
                          onChangeParams(preset.patch);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-black/35 border border-white/15 hover:border-sky-300/50 hover:bg-sky-400/15 text-[11px] font-semibold text-slate-100 transition-colors flex items-center gap-1.5"
                    >
                      <span>{preset.label}</span>
                      <span className="text-[10px] font-mono text-sky-300">{preset.tag}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Full Sandbox Sliders */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Host Star</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSwitchStar('sun')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        !isTrappist
                          ? 'bg-sky-400/25 border-sky-300/50 text-white'
                          : 'bg-black/25 border-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      Sun (G2V)
                    </button>
                    <button
                      type="button"
                      onClick={() => onSwitchStar('trappist1')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        isTrappist
                          ? 'bg-amber-500/25 border-amber-300/50 text-amber-100'
                          : 'bg-black/25 border-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      TRAPPIST-1 (M8V)
                    </button>
                  </div>
                </div>

                {/* Distance AU */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <label htmlFor="lab-orbit" className="text-slate-200">
                      Orbital Distance
                    </label>
                    <span className="font-mono text-sky-200 tabular-nums">
                      {params.a_AU.toFixed(orbitDigits)} AU
                    </span>
                  </div>
                  <input
                    id="lab-orbit"
                    type="range"
                    min={orbitMin}
                    max={orbitMax}
                    step={orbitStep}
                    value={Math.min(orbitMax, Math.max(orbitMin, params.a_AU))}
                    onChange={(e) => onChangeParams({ a_AU: parseFloat(e.target.value) })}
                    className="obs-slider"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-0.5 tabular-nums">
                    <span>{orbitMin.toFixed(orbitDigits)} AU</span>
                    <span>
                      HZ: {simResult.hzBounds.inner.toFixed(isTrappist ? 3 : 2)}–
                      {simResult.hzBounds.outer.toFixed(isTrappist ? 3 : 2)} AU
                    </span>
                    <span>{orbitMax.toFixed(orbitDigits)} AU</span>
                  </div>
                </div>

                {/* Airless toggle + CO2 + CH4 */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-xs font-semibold text-white">
                    Atmospheric Composition
                  </span>
                  <button
                    type="button"
                    onClick={() => onChangeParams({ noGreenhouse: !params.noGreenhouse })}
                    aria-pressed={params.noGreenhouse}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-colors ${
                      params.noGreenhouse
                        ? 'bg-cyan-400/25 border-cyan-300/50 text-cyan-100'
                        : 'bg-black/25 border-white/15 text-slate-300 hover:text-white'
                    }`}
                  >
                    {params.noGreenhouse ? 'Earth Without Air: ON' : 'Airless Test'}
                  </button>
                </div>

                <div className={params.noGreenhouse ? 'opacity-40 pointer-events-none' : ''}>
                  <div className="flex justify-between text-xs mb-1">
                    <label htmlFor="lab-co2" className="text-slate-200">
                      CO₂ Concentration
                    </label>
                    <span className="font-mono text-amber-200 tabular-nums">
                      {params.noGreenhouse ? '0 ppm' : `${params.co2_ppm.toFixed(0)} ppm`}
                    </span>
                  </div>
                  <input
                    id="lab-co2"
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

                <div className={params.noGreenhouse ? 'opacity-40 pointer-events-none' : ''}>
                  <div className="flex justify-between text-xs mb-1">
                    <label htmlFor="lab-ch4" className="text-slate-200">
                      CH₄ Concentration
                    </label>
                    <span className="font-mono text-amber-200 tabular-nums">
                      {params.noGreenhouse ? '0 ppb' : `${params.ch4_ppb.toFixed(0)} ppb`}
                    </span>
                  </div>
                  <input
                    id="lab-ch4"
                    type="range"
                    min={0}
                    max={3000}
                    step={50}
                    disabled={params.noGreenhouse}
                    value={params.ch4_ppb}
                    onChange={(e) => onChangeParams({ ch4_ppb: parseFloat(e.target.value) })}
                    className="obs-slider"
                  />
                </div>

                {/* Coupled Ice-Albedo meter */}
                <div className="pt-2 border-t border-white/10 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Coupled Ice-Albedo Feedback</span>
                    <span className="font-mono text-sky-200 tabular-nums">
                      α = {simResult.albedo.toFixed(3)} ({Math.round(simResult.albedo * 100)}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-sky-300 transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(8, (simResult.albedo / 0.65) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Radiative Telemetry Grid */}
              <div className="grid grid-cols-2 gap-2.5 font-mono tabular-nums">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[11px] text-slate-400">Surface Temp</div>
                  <div className="text-base font-bold text-white mt-0.5">
                    {tCelsius.toFixed(1)}°C{' '}
                    <span className="text-xs font-normal text-slate-400">
                      ({simResult.T_surface.toFixed(1)} K)
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[11px] text-slate-400">Airless Equilibrium</div>
                  <div className="text-base font-bold text-sky-200 mt-0.5">
                    {teqCelsius.toFixed(1)}°C{' '}
                    <span className="text-xs font-normal text-slate-400">
                      ({simResult.T_eq.toFixed(1)} K)
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[11px] text-slate-400">Greenhouse Boost (ΔT)</div>
                  <div className="text-base font-bold text-amber-200 mt-0.5">
                    +{deltaT.toFixed(1)}°C
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[11px] text-slate-400">Stellar / Absorbed Flux</div>
                  <div className="text-sm font-bold text-slate-100 mt-0.5">
                    {simResult.flux.toFixed(0)} / {simResult.F_abs.toFixed(1)} W/m²
                  </div>
                </div>
              </div>

              {/* Optical Depth Breakdown */}
              <div className="p-3.5 rounded-xl bg-black/35 border border-white/10 space-y-2 font-mono tabular-nums text-xs">
                <div className="flex items-center justify-between text-slate-200">
                  <span>Infrared Optical Depth (τ_total)</span>
                  <span className="text-white font-semibold">{simResult.tau.toFixed(3)}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-[11px] text-slate-400">
                  <div>Base: {simResult.tauBreakdown.base.toFixed(3)}</div>
                  <div>CO₂: {simResult.tauBreakdown.co2.toFixed(3)}</div>
                  <div>CH₄: {simResult.tauBreakdown.ch4.toFixed(3)}</div>
                  <div>H₂O: {simResult.tauBreakdown.h2o.toFixed(3)}</div>
                </div>
              </div>

              {/* Regime flags */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <span className="text-slate-400">Cozy Zone (HZ)</span>
                  <span className={simResult.inHZ ? 'text-emerald-300' : 'text-amber-300'}>
                    {simResult.inHZ ? '● Inside' : '▲ Outside'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <span className="text-slate-400">Day-Night Lock</span>
                  <span className={simResult.tidalLocked ? 'text-amber-300' : 'text-slate-200'}>
                    {simResult.tidalLocked ? '● Locked' : 'Spinning'}
                  </span>
                </div>
              </div>

              {/* Regional Trends Sparklines (Hover to dynamically grow 2003-2025 lines) */}
              <GiovanniTrendsCard
                mode="sparklines"
                onInspectFull={() => setTab('giovanni')}
                onPlayRealTrend={onPlayRealTrend}
                isPlayingTrend={isPlayingTrend}
              />

              {simResult.warnings.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/30 space-y-1.5 text-xs text-amber-200">
                  {simResult.warnings.map((w, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-300" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'giovanni' && (
            <GiovanniTrendsCard
              mode="expanded"
              defaultOpen
              onPlayRealTrend={onPlayRealTrend}
              isPlayingTrend={isPlayingTrend}
            />
          )}

          {tab === 'notes' && (
            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-white">Model Limitations</h4>
                <ul className="space-y-2 text-slate-300 leading-relaxed">
                  {EPILOG.modelLimitations.map((item, idx) => (
                    <li key={idx} className="p-3 rounded-xl bg-white/5 border border-white/10">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-sky-300" />
                  <span>Future Mission Roadmap</span>
                </h4>
                <div className="space-y-2">
                  {EPILOG.futureRoadmap.map((rm) => (
                    <div
                      key={rm.title}
                      className="p-3 rounded-xl bg-white/5 border border-white/10"
                    >
                      <div className="font-semibold text-sky-200">{rm.title}</div>
                      <p className="text-slate-300 mt-1 leading-relaxed">{rm.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-black/35 border border-white/10 space-y-2 text-[11px] text-slate-300 leading-relaxed">
                <div className="font-semibold text-white">
                  Official NASA Data & Methodology Credits
                </div>
                <p>
                  Calibrated to <strong className="text-white">NASA CERES EBAF</strong> (global
                  Bond albedo 0.30, TOA incoming flux 340 W/m², 288 K baseline),{' '}
                  <strong className="text-white">NASA Exoplanet Archive</strong> (TRAPPIST-1
                  stellar & orbital parameters), and{' '}
                  <strong className="text-white">NASA Giovanni (GES DISC)</strong> regional
                  time-series diagnostics (MERRA-2 & AIRS).
                </p>
                <p className="text-slate-400">
                  Built for NASA Space Apps Challenge 2026 ("Be An Earth System Trend Detective!").
                  Pure radiative physics, Rayleigh sky optics, and OLS t-test modules compiled
                  and verified with AI assistance (Claude).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer action */}
        <div className="px-5 py-3 border-t border-white/10 bg-black/30 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Changes update the coastal scene and orbital Earth live.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-sky-400/20 border border-sky-300/45 text-xs font-semibold text-white hover:bg-sky-400/30 transition-colors"
          >
            Back to Observatory
          </button>
        </div>
      </div>
    </div>
  );
};
