import React, { useEffect, useState } from 'react';
import { Flame, RotateCcw, Snowflake, Sparkles, Sun, Waves } from 'lucide-react';
import type { ConceptState } from '../types/observatory';

interface VisualProps {
  conceptId: string;
  state: ConceptState;
}

const toC = (k: number) => `${(k - 273.15).toFixed(1)}°C`;

/* ============================================================================
 * 1. LOOK! — LIVE ANIMATED VISUALIZER MATCHING CURRENT 3D STATE
 * ========================================================================== */
export const ConceptLookVisual: React.FC<VisualProps> = ({ conceptId, state }) => {
  const renderVisual = () => {
    switch (conceptId) {
      case 'thermometer': {
        const fillAirless = Math.max(12, Math.min(90, ((state.T_eq - 190) / 170) * 100));
        const fillSurface = Math.max(12, Math.min(92, ((state.T_surface - 190) / 170) * 100));
        const boost = state.T_surface - state.T_eq;
        const surfColor =
          state.T_surface < 273.15 ? '#38bdf8' : state.T_surface < 315 ? '#34d399' : '#fb923c';
        return (
          <svg viewBox="0 0 360 132" className="w-full h-32">
            <rect x="0" y="0" width="360" height="132" rx="12" fill="rgba(6,11,20,0.65)" />
            {/* Airless column */}
            <text x="68" y="20" fill="#94a3b8" fontSize="9.5" textAnchor="middle" fontFamily="monospace">
              WITHOUT AIR
            </text>
            <rect x="58" y="28" width="20" height="70" rx="10" fill="rgba(255,255,255,0.08)" stroke="#475569" />
            <rect
              x="62"
              y={94 - fillAirless * 0.62}
              width="12"
              height={fillAirless * 0.62 + 4}
              rx="6"
              fill="#38bdf8"
            />
            <circle cx="68" cy="100" r="10" fill="#38bdf8" />
            <text x="68" y="122" fill="#7dd3fc" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              {toC(state.T_eq)}
            </text>

            {/* Animated boost arrow */}
            <path
              d="M 96 66 C 145 34, 215 34, 264 66"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2"
              strokeDasharray="5 4"
            >
              <animate attributeName="stroke-dashoffset" from="18" to="0" dur="1.4s" repeatCount="indefinite" />
            </path>
            <rect x="130" y="42" width="100" height="22" rx="11" fill="rgba(251,191,36,0.16)" stroke="#fbbf24" strokeOpacity="0.55" />
            <text x="180" y="56.5" fill="#fde68a" fontSize="10.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              +{boost.toFixed(0)}°C Blanket
            </text>

            {/* Surface column */}
            <text x="292" y="20" fill="#e2e8f0" fontSize="9.5" textAnchor="middle" fontFamily="monospace">
              WITH AIR
            </text>
            <rect x="282" y="28" width="20" height="70" rx="10" fill="rgba(255,255,255,0.08)" stroke="#64748b" />
            <rect
              x="286"
              y={94 - fillSurface * 0.62}
              width="12"
              height={fillSurface * 0.62 + 4}
              rx="6"
              fill={surfColor}
            />
            <circle cx="292" cy="100" r="10" fill={surfColor}>
              <animate attributeName="r" values="9.5;11;9.5" dur="2.2s" repeatCount="indefinite" />
            </circle>
            <text x="292" y="122" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              {toC(state.T_surface)}
            </text>
          </svg>
        );
      }

      case 'ice': {
        const reflPct = Math.round(state.albedo * 100);
        const iceWidth = Math.max(40, Math.min(260, state.albedo * 340));
        return (
          <svg viewBox="0 0 360 132" className="w-full h-32">
            <rect x="0" y="0" width="360" height="132" rx="12" fill="rgba(6,11,20,0.65)" />
            {/* Dark ocean base */}
            <rect x="20" y="88" width="320" height="28" rx="8" fill="#0f3b6e" />
            {/* Bright ice sheet scaled by albedo */}
            <rect x="20" y="84" width={iceWidth} height="20" rx="7" fill="#dbeafe" />
            <text x={20 + iceWidth / 2} y="97" fill="#0f172a" fontSize="9.5" fontWeight="bold" textAnchor="middle">
              ICE ({reflPct}% mirror)
            </text>

            {/* Incoming bouncing ray on ice */}
            <path d="M 65 14 L 92 82 L 132 16" fill="none" stroke="#fde047" strokeWidth="2.4" strokeDasharray="5 3">
              <animate attributeName="stroke-dashoffset" from="16" to="0" dur="1.1s" repeatCount="indefinite" />
            </path>
            <text x="128" y="34" fill="#fde68a" fontSize="9.5" fontFamily="monospace">
              BOUNCED ↗
            </text>

            {/* Absorbed ray in dark ocean */}
            <path d="M 248 14 L 272 95" fill="none" stroke="#fb923c" strokeWidth="2.4" strokeDasharray="5 3">
              <animate attributeName="stroke-dashoffset" from="16" to="0" dur="1.3s" repeatCount="indefinite" />
            </path>
            <circle cx="272" cy="96" r="6" fill="#fb923c" opacity="0.7">
              <animate attributeName="r" values="4;9;4" dur="1.6s" repeatCount="indefinite" />
            </circle>
            <text x="275" y="76" fill="#fdba74" fontSize="9.5" textAnchor="middle" fontFamily="monospace">
              SOAKED HEAT
            </text>
          </svg>
        );
      }

      case 'valve': {
        const layers = state.CO2ppm < 80 ? 0 : state.CO2ppm < 320 ? 1 : state.CO2ppm < 600 ? 2 : 3;
        return (
          <svg viewBox="0 0 360 132" className="w-full h-32">
            <rect x="0" y="0" width="360" height="132" rx="12" fill="rgba(6,11,20,0.65)" />
            {/* Ocean / Ground */}
            <rect x="20" y="96" width="320" height="24" rx="6" fill="#1e3a5f" />
            <text x="180" y="112" fill="#cbd5e1" fontSize="9.5" textAnchor="middle" fontFamily="monospace">
              WARM SURFACE ({toC(state.T_surface)})
            </text>
            {/* CO2 Blanket layers */}
            {[0, 1, 2].map((idx) => (
              <rect
                key={idx}
                x="28"
                y={64 - idx * 14}
                width="304"
                height="9"
                rx="4.5"
                fill={idx < layers ? '#fb923c' : '#334155'}
                opacity={idx < layers ? 0.55 - idx * 0.1 : 0.18}
              />
            ))}
            {/* Bouncing IR heat waves */}
            <path
              d="M 105 94 L 125 60 L 145 92"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2.2"
              strokeDasharray="4 3"
            >
              <animate attributeName="stroke-dashoffset" from="14" to="0" dur="1.2s" repeatCount="indefinite" />
            </path>
            <path
              d="M 215 94 L 235 56 L 255 92"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2.2"
              strokeDasharray="4 3"
            >
              <animate attributeName="stroke-dashoffset" from="14" to="0" dur="1.2s" repeatCount="indefinite" />
            </path>
            <text x="180" y="22" fill="#fcd34d" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              CO₂ = {state.CO2ppm.toFixed(0)} ppm · HEAT TRAPPED INSIDE
            </text>
          </svg>
        );
      }

      case 'lever': {
        const relPct = Math.round((state.stellarFlux / 1361) * 100);
        const normPos = state.star === 'TRAPPIST-1' ? 0.32 : Math.max(0.18, Math.min(0.92, (state.distanceAU - 0.65) / 0.85));
        const px = 85 + normPos * 235;
        return (
          <svg viewBox="0 0 360 132" className="w-full h-32">
            <rect x="0" y="0" width="360" height="132" rx="12" fill="rgba(6,11,20,0.65)" />
            {/* Star & diverging light cone */}
            <polygon points="48,66 335,16 335,116" fill="rgba(251,191,36,0.11)" />
            <circle cx="48" cy="66" r="20" fill={state.star === 'TRAPPIST-1' ? '#f97316' : '#fbbf24'}>
              <animate attributeName="r" values="19;22;19" dur="2.4s" repeatCount="indefinite" />
            </circle>
            {/* Orbit rail */}
            <line x1="78" y1="66" x2="336" y2="66" stroke="#475569" strokeDasharray="3 3" />
            {/* Animated wave rings */}
            <circle cx="48" cy="66" r="24" fill="none" stroke="#fde047" strokeOpacity="0.45">
              <animate attributeName="r" values="24;110" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="stroke-opacity" values="0.6;0" dur="1.8s" repeatCount="indefinite" />
            </circle>
            {/* Planet */}
            <circle cx={px} cy="66" r="12" fill="#38bdf8" stroke="#e0f2fe" strokeWidth="1.5" />
            <text x={px} y="96" fill="#fde68a" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              {state.distanceAU.toFixed(state.star === 'TRAPPIST-1' ? 3 : 2)} AU · {relPct}% light
            </text>
          </svg>
        );
      }

      case 'vapor': {
        const hot = state.waterPhase === 'vapor' || state.waterPhase === 'boiling' || state.T_surface > 310;
        const frozen = state.waterPhase === 'frozen' || state.T_surface < 273.15;
        return (
          <svg viewBox="0 0 360 132" className="w-full h-32">
            <rect x="0" y="0" width="360" height="132" rx="12" fill="rgba(6,11,20,0.65)" />
            <rect x="18" y="94" width="324" height="24" rx="7" fill={frozen ? '#bae6fd' : '#0284c7'} />
            <text x="180" y="110" fill={frozen ? '#0f172a' : '#e0f2fe'} fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              {frozen ? 'LOCKED AS ICE' : hot ? 'STEAM RISING FAST!' : 'GENTLE EVAPORATION'}
            </text>
            {!frozen &&
              [70, 125, 180, 235, 290].map((cx, i) => (
                <g key={cx}>
                  <circle cx={cx} cy="75" r={hot ? 7 : 4.5} fill="#bae6fd" opacity="0.65">
                    <animate
                      attributeName="cy"
                      values="88;26"
                      dur={`${hot ? 1.1 + i * 0.15 : 2.2 + i * 0.2}s`}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.85;0"
                      dur={`${hot ? 1.1 + i * 0.15 : 2.2 + i * 0.2}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              ))}
            <text x="180" y="20" fill="#7dd3fc" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              OCEAN STATE: {state.waterPhase.toUpperCase()} ({toC(state.T_surface)})
            </text>
          </svg>
        );
      }

      case 'starmap': {
        const isRed = state.star === 'TRAPPIST-1';
        return (
          <svg viewBox="0 0 360 132" className="w-full h-32">
            <rect x="0" y="0" width="360" height="132" rx="12" fill="rgba(6,11,20,0.65)" />
            {/* Cozy Habitable Zone Band */}
            <rect
              x={isRed ? 112 : 200}
              y="26"
              width={isRed ? 54 : 72}
              height="74"
              rx="10"
              fill="rgba(52,211,153,0.16)"
              stroke="#34d399"
              strokeDasharray="4 3"
            />
            <text
              x={isRed ? 139 : 236}
              y="20"
              fill="#6ee7b7"
              fontSize="9"
              fontWeight="bold"
              textAnchor="middle"
              fontFamily="monospace"
            >
              COZY ZONE
            </text>
            {/* Star */}
            <circle
              cx="52"
              cy="64"
              r={isRed ? 15 : 24}
              fill={isRed ? '#f97316' : '#fbbf24'}
            >
              <animate attributeName="opacity" values="0.88;1;0.88" dur="2s" repeatCount="indefinite" />
            </circle>
            <text x="52" y="106" fill="#fde68a" fontSize="9.5" textAnchor="middle" fontFamily="monospace">
              {state.star}
            </text>
            {/* Planet */}
            <circle
              cx={isRed ? (state.inHZ ? 139 : 196) : state.inHZ ? 236 : 165}
              cy="64"
              r="10"
              fill="#38bdf8"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            <text x="275" y="116" fill="#cbd5e1" fontSize="9.5" textAnchor="middle" fontFamily="monospace">
              Sky size: {state.angularSizeRatio.toFixed(1)}× Sun
            </text>
          </svg>
        );
      }

      case 'sky': {
        const isRed = state.star === 'TRAPPIST-1';
        return (
          <svg viewBox="0 0 360 132" className="w-full h-32">
            <defs>
              <linearGradient id="sky-look-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isRed ? '#7c2d12' : '#0369a1'} />
                <stop offset="100%" stopColor={isRed ? '#f97316' : '#38bdf8'} stopOpacity="0.45" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="360" height="132" rx="12" fill="url(#sky-look-grad)" />
            {/* Air molecules */}
            {[95, 165, 225, 275].map((x, idx) => (
              <circle key={x} cx={x} cy={52 + (idx % 2) * 26} r="5" fill="#ffffff" opacity="0.5" />
            ))}
            {/* Incoming wave */}
            <path
              d="M 24 64 Q 55 44, 86 64 T 148 64"
              fill="none"
              stroke={isRed ? '#fb923c' : '#93c5fd'}
              strokeWidth="2.8"
            />
            {/* Scattered wavelets */}
            <path
              d="M 165 52 L 210 24 M 165 52 L 215 84 M 225 78 L 285 44"
              fill="none"
              stroke={isRed ? '#fdba74' : '#e0f2fe'}
              strokeWidth="2"
              strokeDasharray="4 4"
            >
              <animate attributeName="stroke-dashoffset" from="16" to="0" dur="1.2s" repeatCount="indefinite" />
            </path>
            <text x="180" y="116" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              {isRed ? 'RED STAR → WARM AMBER SCATTER' : 'BLUE WAVES SCATTER EVERYWHERE'}
            </text>
          </svg>
        );
      }

      case 'terminator':
      default: {
        const locked = state.tidalLocked;
        return (
          <svg viewBox="0 0 360 132" className="w-full h-32">
            <rect x="0" y="0" width="360" height="132" rx="12" fill="rgba(6,11,20,0.65)" />
            {/* Star on left */}
            <circle cx="48" cy="64" r="20" fill={state.star === 'TRAPPIST-1' ? '#f97316' : '#fbbf24'} />
            {/* Planet */}
            <circle cx="215" cy="64" r="34" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
            <path d="M 215 30 A 34 34 0 0 0 215 98 Z" fill="#f59e0b" opacity="0.82" />
            {/* Twilight Ring */}
            <ellipse cx="215" cy="64" rx="5" ry="34" fill="#34d399" opacity="0.72">
              {!locked && (
                <animate attributeName="rx" values="5;28;5" dur="3.5s" repeatCount="indefinite" />
              )}
            </ellipse>
            <text x="164" y="68" fill="#fef3c7" fontSize="9" fontWeight="bold" textAnchor="end" fontFamily="monospace">
              DAY
            </text>
            <text x="268" y="68" fill="#93c5fd" fontSize="9" fontWeight="bold" fontFamily="monospace">
              NIGHT
            </text>
            <text x="215" y="118" fill="#6ee7b7" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              {locked ? 'LOCKED · ETERNAL TWILIGHT RING' : 'SPINNING · NORMAL SUNRISE & SUNSET'}
            </text>
          </svg>
        );
      }
    }
  };

  return (
    <div className="rounded-xl border border-sky-400/25 bg-black/30 p-2 space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-mono uppercase tracking-wider text-sky-300">
          Live Observatory View
        </span>
        <span className="text-[10px] font-mono text-slate-400">Synced to 3D scene</span>
      </div>
      {renderVisual()}
    </div>
  );
};

/* ============================================================================
 * 2. WHY? — TACTILE MINI-EXPERIMENT TO BUILD REAL INTUITION
 * ========================================================================== */
export const ConceptWhyLab: React.FC<VisualProps> = ({ conceptId, state }) => {
  const [blankets, setBlankets] = useState(() =>
    state.CO2ppm < 120 ? 0 : state.CO2ppm < 350 ? 1 : state.CO2ppm < 600 ? 2 : 3
  );
  const [icePct, setIcePct] = useState(() => Math.round(state.albedo * 100));
  const [torchDist, setTorchDist] = useState(() =>
    state.star === 'TRAPPIST-1' ? 1.0 : Math.max(0.7, Math.min(1.3, state.distanceAU))
  );
  const [spongeTempC, setSpongeTempC] = useState(() =>
    Math.round(Math.max(0, Math.min(45, state.T_surface - 273.15)))
  );
  const [campfireMode, setCampfireMode] = useState<'sun' | 'red'>(() =>
    state.star === 'TRAPPIST-1' ? 'red' : 'sun'
  );
  const [pinballStar, setPinballStar] = useState<'sun' | 'red'>(() =>
    state.star === 'TRAPPIST-1' ? 'red' : 'sun'
  );
  const [lockedDemo, setLockedDemo] = useState(() => state.tidalLocked);

  useEffect(() => {
    setBlankets(state.CO2ppm < 120 ? 0 : state.CO2ppm < 350 ? 1 : state.CO2ppm < 600 ? 2 : 3);
    setIcePct(Math.round(state.albedo * 100));
    setTorchDist(state.star === 'TRAPPIST-1' ? 1.0 : Math.max(0.7, Math.min(1.3, state.distanceAU)));
    setSpongeTempC(Math.round(Math.max(0, Math.min(45, state.T_surface - 273.15))));
    setCampfireMode(state.star === 'TRAPPIST-1' ? 'red' : 'sun');
    setPinballStar(state.star === 'TRAPPIST-1' ? 'red' : 'sun');
    setLockedDemo(state.tidalLocked);
  }, [conceptId, state.star]);

  if (conceptId === 'thermometer' || conceptId === 'valve') {
    const simTempC = -18 + blankets * 16;
    return (
      <div className="rounded-xl border border-amber-400/30 bg-amber-500/8 p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Try It: Winter Blanket Layers</span>
          </span>
          <span className="font-mono text-xs font-bold text-white px-2 py-0.5 rounded bg-black/40">
            {blankets} {blankets === 1 ? 'Layer' : 'Layers'} → {simTempC > 0 ? `+${simTempC}` : simTempC}°C
          </span>
        </div>

        <svg viewBox="0 0 320 96" className="w-full h-24 rounded-lg bg-black/45">
          <circle cx="160" cy="78" r="24" fill={simTempC < 0 ? '#93c5fd' : simTempC < 30 ? '#34d399' : '#fb923c'} />
          <text x="160" y="81" fill="#06090f" fontSize="10" fontWeight="bold" textAnchor="middle">
            {simTempC < 0 ? 'BRRR!' : simTempC < 30 ? 'COZY!' : 'HOT!'}
          </text>
          {Array.from({ length: blankets }).map((_, i) => (
            <path
              key={i}
              d={`M ${95 - i * 10} ${54 - i * 11} Q 160 ${28 - i * 13}, ${225 + i * 10} ${54 - i * 11}`}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="4.5"
              strokeLinecap="round"
              opacity={0.85 - i * 0.14}
            />
          ))}
          <path
            d={blankets === 0 ? 'M 160 52 L 160 8' : 'M 142 52 L 160 32 L 178 52'}
            fill="none"
            stroke="#fde047"
            strokeWidth="2"
            strokeDasharray="4 3"
          >
            <animate attributeName="stroke-dashoffset" from="14" to="0" dur="1.1s" repeatCount="indefinite" />
          </path>
          <text x="160" y="15" fill="#cbd5e1" fontSize="9" textAnchor="middle" fontFamily="monospace">
            {blankets === 0 ? 'HEAT ESCAPES STRAIGHT TO SPACE!' : 'BLANKET BOUNCES WARMTH BACK DOWN'}
          </text>
        </svg>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setBlankets((b) => Math.max(0, b - 1))}
            disabled={blankets === 0}
            className="flex-1 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 disabled:opacity-35 border border-white/15 text-xs font-semibold text-white transition-colors"
          >
            − Remove Blanket
          </button>
          <button
            type="button"
            onClick={() => setBlankets((b) => Math.min(4, b + 1))}
            disabled={blankets === 4}
            className="flex-1 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 disabled:opacity-35 border border-amber-300/45 text-xs font-semibold text-amber-100 transition-colors"
          >
            + Add Blanket
          </button>
        </div>
      </div>
    );
  }

  if (conceptId === 'ice') {
    const absorbedW = Math.round(340 * (1 - icePct / 100));
    return (
      <div className="rounded-xl border border-amber-400/30 bg-amber-500/8 p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-amber-300">
            Try It: White Shirt vs. Black Shirt
          </span>
          <span className="font-mono text-xs font-bold text-white">
            {icePct}% Reflected · {absorbedW} W/m² Absorbed
          </span>
        </div>

        <input
          type="range"
          min={10}
          max={75}
          value={icePct}
          onChange={(e) => setIcePct(Number(e.target.value))}
          aria-label="Reflectivity percentage"
          className="obs-slider"
        />

        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: 'Snowball (62%)', val: 62, icon: Snowflake },
            { label: 'Earth Avg (30%)', val: 30, icon: Waves },
            { label: 'Dark Ocean (12%)', val: 12, icon: Flame },
          ].map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => setIcePct(preset.val)}
                className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                  Math.abs(icePct - preset.val) <= 3
                    ? 'bg-sky-400/25 border-sky-300/60 text-white'
                    : 'bg-white/5 border-white/12 text-slate-300 hover:text-white'
                }`}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (conceptId === 'lever') {
    const pct = Math.round((1 / (torchDist * torchDist)) * 100);
    const planetX = 72 + ((torchDist - 0.7) / 0.6) * 210;
    return (
      <div className="rounded-xl border border-amber-400/30 bg-amber-500/8 p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-amber-300">
            Try It: Slide the Flashlight Distance
          </span>
          <span className="font-mono text-xs font-bold text-amber-200">
            {torchDist.toFixed(2)} AU → {pct}% Energy
          </span>
        </div>

        <svg viewBox="0 0 320 76" className="w-full h-20 rounded-lg bg-black/45">
          <polygon points="34,38 305,8 305,68" fill="rgba(253,224,71,0.14)" />
          <circle cx="34" cy="38" r="14" fill="#fbbf24" />
          <circle cx={planetX} cy="38" r="11" fill="#38bdf8" stroke="#fff" strokeWidth="1.5" />
          <text x={planetX} y="66" fill="#fde68a" fontSize="9.5" textAnchor="middle" fontFamily="monospace">
            {pct}% power/m²
          </text>
        </svg>

        <input
          type="range"
          min={0.7}
          max={1.3}
          step={0.01}
          value={torchDist}
          onChange={(e) => setTorchDist(Number(e.target.value))}
          aria-label="Flashlight distance in AU"
          className="obs-slider"
        />
      </div>
    );
  }

  if (conceptId === 'vapor') {
    const spongePct = Math.round(Math.pow(1.07, spongeTempC) * 18);
    const drops = Math.max(2, Math.min(12, Math.round(spongePct / 18)));
    return (
      <div className="rounded-xl border border-amber-400/30 bg-amber-500/8 p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-amber-300">
            Try It: Warm Air Sponge Capacity
          </span>
          <span className="font-mono text-xs font-bold text-sky-200">
            {spongeTempC}°C · Holds ~{(spongePct / 18).toFixed(1)}× Vapor
          </span>
        </div>

        <div className="rounded-lg bg-black/45 px-3 py-2.5 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5 flex-1">
            {Array.from({ length: drops }).map((_, i) => (
              <span
                key={i}
                className="w-3.5 h-3.5 rounded-full bg-sky-300/80 border border-sky-100/80 shadow-[0_0_8px_rgba(56,189,248,0.55)]"
              />
            ))}
          </div>
          <span className="text-[11px] font-mono text-amber-200 shrink-0">
            {drops} H₂O traps
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={45}
          value={spongeTempC}
          onChange={(e) => setSpongeTempC(Number(e.target.value))}
          aria-label="Air temperature in Celsius"
          className="obs-slider"
        />
      </div>
    );
  }

  if (conceptId === 'starmap') {
    return (
      <div className="rounded-xl border border-amber-400/30 bg-amber-500/8 p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-amber-300">
            Try It: Bonfire vs. Campfire
          </span>
          <span className="font-mono text-xs font-bold text-emerald-300">
            Cozy at {campfireMode === 'sun' ? '1.00 AU' : '0.029 AU'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setCampfireMode('sun')}
            className={`py-2 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 ${
              campfireMode === 'sun'
                ? 'bg-amber-400/20 border-amber-300/60 text-white'
                : 'bg-white/5 border-white/12 text-slate-300'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-300" />
            <span>Sun (Bonfire)</span>
          </button>
          <button
            type="button"
            onClick={() => setCampfireMode('red')}
            className={`py-2 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 ${
              campfireMode === 'red'
                ? 'bg-orange-500/25 border-orange-300/60 text-white'
                : 'bg-white/5 border-white/12 text-slate-300'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>TRAPPIST-1 (Campfire)</span>
          </button>
        </div>
        <p className="text-[11px] text-slate-200 leading-snug">
          {campfireMode === 'sun'
            ? 'Our bright bonfire keeps you warm from 1.00 AU (150 million km) away!'
            : 'TRAPPIST-1 is 1,800× dimmer, so you must scoot 34× closer (0.029 AU) to stay cozy.'}
        </p>
      </div>
    );
  }

  if (conceptId === 'sky') {
    return (
      <div className="rounded-xl border border-amber-400/30 bg-amber-500/8 p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-amber-300">
            Try It: Starlight Pinball Filter
          </span>
          <span className="font-mono text-xs font-bold text-white">
            {pinballStar === 'sun' ? 'Azure Sky' : 'Amber Sky'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPinballStar('sun')}
            className={`py-1.5 px-2.5 rounded-lg border text-xs font-semibold ${
              pinballStar === 'sun'
                ? 'bg-sky-400/25 border-sky-300/60 text-white'
                : 'bg-white/5 border-white/12 text-slate-300'
            }`}
          >
            White Sunlight
          </button>
          <button
            type="button"
            onClick={() => setPinballStar('red')}
            className={`py-1.5 px-2.5 rounded-lg border text-xs font-semibold ${
              pinballStar === 'red'
                ? 'bg-amber-500/25 border-amber-300/60 text-white'
                : 'bg-white/5 border-white/12 text-slate-300'
            }`}
          >
            Red Dwarf Light
          </button>
        </div>
        <div className="rounded-lg bg-black/45 p-2 text-[11px] text-slate-200 leading-snug">
          {pinballStar === 'sun'
            ? 'Blue waves scatter 4.3× stronger than red waves off air molecules → bright blue sky!'
            : 'Red stars emit almost zero blue waves—so only warm orange & red waves bounce around!'}
        </div>
      </div>
    );
  }

  // terminator
  return (
    <div className="rounded-xl border border-amber-400/30 bg-amber-500/8 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-amber-300">
          Try It: Spin vs. Gravity Lock
        </span>
        <button
          type="button"
          onClick={() => setLockedDemo((v) => !v)}
          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-[11px] font-semibold text-white flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{lockedDemo ? 'Locked' : 'Spinning'}</span>
        </button>
      </div>
      <p className="text-[11px] text-slate-200 leading-snug">
        {lockedDemo
          ? 'Locked: One side bakes in permanent noon, one freezes in starry night, and the ring between stays mild!'
          : 'Free Spin: Rotation shares starlight around the entire globe with normal sunrises and sunsets.'}
      </p>
    </div>
  );
};

/* ============================================================================
 * 3. MATH & NASA — INTERACTIVE EQUATION CURVE EXPLORER (CLEAR + PLAYFUL)
 * ========================================================================== */
interface CurveMeta {
  curveTitle: string;
  xAxisTitle: string;
  yAxisTitle: string;
  xMinLabel: string;
  xMaxLabel: string;
  earthFrac: number;
  earthLabel: string;
  whyShape: string;
}

const CURVE_METAS: Record<string, CurveMeta> = {
  valve: {
    curveTitle: 'CO₂ Blanket Curve (Logarithmic Bend)',
    xAxisTitle: 'CO₂ Concentration (ppm)',
    yAxisTitle: 'Extra Trapped Heat (ΔF)',
    xMinLabel: '100 ppm',
    xMaxLabel: '1200 ppm',
    earthFrac: (426 - 100) / 1100,
    earthLabel: 'Earth Today',
    whyShape:
      'Think of stacking blankets on a bed: the 1st blanket makes a huge difference, while each extra layer adds slightly less per sheet—that’s why the curve bends flatter!',
  },
  ice: {
    curveTitle: 'Ice-Mirror Slide (S-Curve Flip)',
    xAxisTitle: 'Surface Temperature (°C)',
    yAxisTitle: 'Reflected Sunlight (α)',
    xMinLabel: '−28°C',
    xMaxLabel: '+37°C',
    earthFrac: (288 - 245) / 65,
    earthLabel: 'Earth +15°C',
    whyShape:
      'Around 0°C, bright white ice melts into dark blue ocean! Between −15°C and +15°C reflectivity plunges down the slide—then flattens once all ice melts.',
  },
  lever: {
    curveTitle: 'Flashlight Spread Curve (1/d²)',
    xAxisTitle: 'Orbit Distance (AU)',
    yAxisTitle: 'Sunlight Strength',
    xMinLabel: '0.65 AU',
    xMaxLabel: '1.50 AU',
    earthFrac: (1.0 - 0.65) / 0.85,
    earthLabel: 'Earth 1.0 AU',
    whyShape:
      'Starlight spreads across a 2D circle (width × height) as it travels outward. Step 2× farther away and the same beam covers 4× the area—so brightness swoops down fast!',
  },
  vapor: {
    curveTitle: 'Air-Sponge Rocket Curve (Exponential)',
    xAxisTitle: 'Air Temperature (°C)',
    yAxisTitle: 'Max Water Vapor (kPa)',
    xMinLabel: '−18°C',
    xMaxLabel: '+57°C',
    earthFrac: (288.15 - 255) / 75,
    earthLabel: 'Earth +15°C',
    whyShape:
      'Every +1°C lets air hold ~7% MORE moisture than the degree before it—compounding like interest in a bank until the curve shoots upward like a rocket!',
  },
  sky: {
    curveTitle: 'Color-Bounce Curve (λ⁻⁴ Pinball)',
    xAxisTitle: 'Light Color Wavelength (nm)',
    yAxisTitle: 'Air Scatter Bounce',
    xMinLabel: '400 nm (Violet)',
    xMaxLabel: '700 nm (Red)',
    earthFrac: (450 - 400) / 300,
    earthLabel: 'Blue 450 nm',
    whyShape:
      'Air molecules act like tiny pinball bumpers that strongly swat short blue waves (450 nm) ~4.3× more than long lazy red waves (650 nm)—that’s why the curve drops steeply!',
  },
  starmap: {
    curveTitle: 'Cozy-Orbit Square-Root Curve (√L)',
    xAxisTitle: 'Star Brightness (L☉)',
    yAxisTitle: 'Cozy Zone Orbit (AU)',
    xMinLabel: '0.0005 L☉',
    xMaxLabel: '2.0 L☉',
    earthFrac: Math.pow((1.0 - 0.0005) / 2.0, 1 / 2.5),
    earthLabel: 'Our Sun',
    whyShape:
      'Because sunlight fades with distance², cozy orbit grows as √Brightness. Dim red stars pull their warm seat right up next to the campfire!',
  },
  terminator: {
    curveTitle: 'Year-Length Gravity Curve (a¹·⁵)',
    xAxisTitle: 'Orbit Radius (AU)',
    yAxisTitle: '1 Year Length (Days)',
    xMinLabel: '0.015 AU',
    xMaxLabel: '0.215 AU',
    earthFrac: (0.029 - 0.015) / 0.2,
    earthLabel: 'TRAPPIST-1 e',
    whyShape:
      'Farther planets travel a bigger circle AND move slower in weaker gravity—so year length curves upward faster than a straight line. Ultra-close planets zip around in days!',
  },
  thermometer: {
    curveTitle: 'Mirror-vs-Chill Slope (T_eq)',
    xAxisTitle: 'Planet Reflectivity (α)',
    yAxisTitle: 'Airless Temp (°C)',
    xMinLabel: '10% Dark',
    xMaxLabel: '70% Mirror',
    earthFrac: (0.3 - 0.1) / 0.6,
    earthLabel: 'Earth α=30%',
    whyShape:
      'The shinier the planet’s mirror, the less sunlight it absorbs—so an airless planet’s temperature slides steadily downhill as reflectivity increases!',
  },
};

export const ConceptMathCurve: React.FC<VisualProps> = ({ conceptId, state }) => {
  const [scrubFrac, setScrubFrac] = useState(0.5);

  const getLiveFrac = () => {
    if (conceptId === 'valve') return Math.max(0, Math.min(1, (state.CO2ppm - 100) / 1100));
    if (conceptId === 'ice') return Math.max(0, Math.min(1, (state.T_surface - 245) / 65));
    if (conceptId === 'lever') return Math.max(0, Math.min(1, (state.distanceAU - 0.65) / 0.85));
    if (conceptId === 'vapor') return Math.max(0, Math.min(1, (state.T_surface - 255) / 75));
    if (conceptId === 'sky') {
      return Math.max(0, Math.min(1, ((state.wavelengthNm || 480) - 400) / 300));
    }
    if (conceptId === 'starmap') {
      return Math.max(
        0,
        Math.min(1, Math.pow(Math.max(0, (state.stellarLuminosity - 0.0005) / 2.0), 1 / 2.5))
      );
    }
    if (conceptId === 'terminator') {
      return Math.max(0, Math.min(1, (state.distanceAU - 0.015) / 0.2));
    }
    return Math.max(0, Math.min(1, (state.albedo - 0.1) / 0.6));
  };

  useEffect(() => {
    setScrubFrac(getLiveFrac());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    conceptId,
    state.CO2ppm,
    state.T_surface,
    state.distanceAU,
    state.wavelengthNm,
    state.stellarLuminosity,
    state.albedo,
  ]);

  const meta = CURVE_METAS[conceptId] ?? CURVE_METAS.thermometer;
  const W = 320;
  const H = 104;
  const padX = 24;
  const padTop = 16;
  const padBot = 20;
  const plotW = W - padX * 2;
  const plotH = H - padTop - padBot;

  const evalCurve = (
    f: number
  ): { xLabel: string; yLabel: string; yNorm: number; moodNote: string } => {
    switch (conceptId) {
      case 'valve': {
        const co2 = 100 + f * 1100;
        const df = 5.35 * Math.log(co2 / 280);
        const moodNote =
          co2 < 220
            ? '🥶 Thin blanket alert! Oceans start shivering.'
            : co2 < 520
              ? '🌍 Cozy zone! Right around Earth’s natural to modern range.'
              : '🥵 Heavy puffer jacket! Every doubling still adds +3.7 W/m².';
        return {
          xLabel: `${co2.toFixed(0)} ppm`,
          yLabel: `${df >= 0 ? '+' : ''}${df.toFixed(1)} W/m²`,
          yNorm: Math.max(0.06, Math.min(0.95, (df + 5.5) / 14)),
          moodNote,
        };
      }
      case 'ice': {
        const tK = 245 + f * 65;
        const tC = tK - 273.15;
        const a = 0.25 + 0.37 * 0.5 * (1 - Math.tanh((tK - 273) / 10));
        const moodNote =
          tC < -6
            ? '🧊 Snowball Mirror Mode! ~60% of sunlight bounces right back.'
            : tC < 10
              ? '🎢 On the Melting Slide! Every degree melts ice into dark sea.'
              : '🌊 Open Blue Ocean! Only ~25% reflects now—heat soaks in.';
        return {
          xLabel: `${tC.toFixed(0)}°C`,
          yLabel: `${(a * 100).toFixed(0)}% reflected`,
          yNorm: Math.max(0.08, Math.min(0.95, (a - 0.22) / 0.44)),
          moodNote,
        };
      }
      case 'lever': {
        const d = 0.65 + f * 0.85;
        const rel = 1 / (d * d);
        const moodNote =
          d < 0.9
            ? '☀️ Sunlight tsunami! Stepping closer packs intense heat per m².'
            : d < 1.12
              ? '🌍 Goldilocks lane (~100% Earth sunlight).'
              : '❄️ Weak flashlight beam—ice creeps toward the equator!';
        return {
          xLabel: `${d.toFixed(2)} AU`,
          yLabel: `${Math.round(rel * 100)}% Sun`,
          yNorm: Math.max(0.06, Math.min(0.95, (rel - 0.4) / 2.0)),
          moodNote,
        };
      }
      case 'vapor': {
        const tK = 255 + f * 75;
        const tC = tK - 273.15;
        const e = 0.6112 * Math.exp((2.5e6 / 461.5) * (1 / 273.15 - 1 / tK));
        const moodNote =
          tC < 5
            ? '🧊 Crisp dry air—hardly any invisible water vapor.'
            : tC < 26
              ? '💧 Friendly water cycle (~7% more steam capacity per °C).'
              : '♨️ Steam Sauna Rocket! Vapor multiplies and traps massive heat!';
        return {
          xLabel: `${tC.toFixed(0)}°C`,
          yLabel: e >= 10 ? `${e.toFixed(0)} kPa` : `${e.toFixed(1)} kPa`,
          yNorm: Math.max(0.05, Math.min(0.95, e / 18)),
          moodNote,
        };
      }
      case 'sky': {
        const nm = 400 + f * 300;
        const sRel = Math.pow(450 / nm, 4);
        const moodNote =
          nm < 485
            ? '💙 Pinball Party! Short blue waves scatter everywhere → Blue Sky!'
            : nm < 585
              ? '💚 Mid-wavelength waves—moderate bouncing.'
              : '🧡 Cruise Mode! Long orange-red waves glide past air molecules.';
        return {
          xLabel: `${nm.toFixed(0)} nm`,
          yLabel: `${sRel.toFixed(2)}× scatter`,
          yNorm: Math.max(0.05, Math.min(0.95, sRel / 1.6)),
          moodNote,
        };
      }
      case 'starmap': {
        const lRel = 0.0005 + Math.pow(f, 2.5) * 2.0;
        const hzAu = Math.sqrt(lRel);
        const moodNote =
          lRel < 0.05
            ? '🔥 Tiny Campfire Star! Cozy orbit hugs super close (< 0.22 AU).'
            : lRel < 1.25
              ? '☀️ Sun-Class Bonfire! Cozy orbit sits right near 1.0 AU.'
              : '🌟 Giant Spotlight Star! Planets must back way up to stay cool.';
        return {
          xLabel: `${lRel < 0.02 ? lRel.toFixed(4) : lRel.toFixed(2)} L☉`,
          yLabel: `${hzAu.toFixed(3)} AU`,
          yNorm: Math.max(0.06, Math.min(0.95, hzAu / 1.45)),
          moodNote,
        };
      }
      case 'terminator': {
        const aAu = 0.015 + f * 0.2;
        const days = Math.sqrt(aAu * aAu * aAu) * 365.25;
        const moodNote =
          aAu < 0.05
            ? '⚡ Espresso Orbit! A whole “year” lasts days—gravity easily locks one face!'
            : aAu < 0.12
              ? '🪐 Speedy inner orbit—fast seasons!'
              : '🌀 Relaxed wide orbit—planet spins freely through sunrise & sunset.';
        return {
          xLabel: `${aAu.toFixed(3)} AU`,
          yLabel: `${days.toFixed(1)} days`,
          yNorm: Math.max(0.06, Math.min(0.95, days / 38)),
          moodNote,
        };
      }
      case 'thermometer':
      default: {
        const a = 0.1 + f * 0.6;
        const tEq = Math.pow((state.stellarFlux * (1 - a)) / (4 * 5.670374419e-8), 0.25);
        const tEqC = tEq - 273.15;
        const moodNote =
          a < 0.23
            ? '🕶️ Dark Sunglasses World—absorbs extra sunlight!'
            : a < 0.42
              ? '🌍 Earth-like mirror (~30% → −18°C without an air blanket).'
              : '🪩 Shiny Disco-Ice Ball—bounces light away and freezes deep!';
        return {
          xLabel: `${(a * 100).toFixed(0)}% mirror`,
          yLabel: `${tEqC.toFixed(0)}°C (airless)`,
          yNorm: Math.max(0.06, Math.min(0.95, (tEq - 190) / 110)),
          moodNote,
        };
      }
    }
  };

  const points: string[] = [];
  for (let i = 0; i <= 30; i++) {
    const f = i / 30;
    const { yNorm } = evalCurve(f);
    const x = padX + f * plotW;
    const y = padTop + (1 - yNorm) * plotH;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  const areaPoints = `${padX},${H - padBot} ${points.join(' ')} ${W - padX},${H - padBot}`;
  const probe = evalCurve(scrubFrac);
  const dotX = padX + scrubFrac * plotW;
  const dotY = padTop + (1 - probe.yNorm) * plotH;

  const earthClamped = Math.max(0.02, Math.min(0.98, meta.earthFrac));
  const earthVal = evalCurve(earthClamped);
  const earthX = padX + earthClamped * plotW;
  const earthY = padTop + (1 - earthVal.yNorm) * plotH;

  return (
    <div className="rounded-xl bg-black/45 border border-emerald-400/25 p-3 space-y-2">
      {/* Clear Curve Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10.5px] font-mono uppercase tracking-wider text-emerald-300">
            {meta.curveTitle}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Drag slider to test the formula · Y = {meta.yAxisTitle}
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-lg bg-emerald-400/15 border border-emerald-300/35 font-mono text-[11px] font-bold text-white shrink-0">
          {probe.xLabel} → {probe.yLabel}
        </span>
      </div>

      {/* Annotated Curve SVG */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-26">
        <defs>
          <linearGradient id={`curve-fill-${conceptId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Axes */}
        <line x1={padX} y1={H - padBot} x2={W - padX} y2={H - padBot} stroke="rgba(148,163,184,0.3)" />
        <line x1={padX} y1={padTop} x2={padX} y2={H - padBot} stroke="rgba(148,163,184,0.3)" />

        {/* Area & Curve */}
        <polygon fill={`url(#curve-fill-${conceptId})`} points={areaPoints} />
        <polyline
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points.join(' ')}
        />

        {/* Reference Earth Pin */}
        <line
          x1={earthX}
          y1={earthY}
          x2={earthX}
          y2={H - padBot}
          stroke="#fbbf24"
          strokeWidth="1"
          strokeDasharray="2 2"
          opacity="0.7"
        />
        <circle cx={earthX} cy={earthY} r="3.8" fill="#fbbf24" stroke="#06090f" strokeWidth="1.2" />
        <text
          x={Math.max(padX + 26, Math.min(W - padX - 26, earthX))}
          y={Math.max(10, earthY - 7)}
          fill="#fde68a"
          fontSize="8.5"
          fontFamily="monospace"
          textAnchor="middle"
        >
          {meta.earthLabel}
        </text>

        {/* Active Scrubber Marker */}
        <line
          x1={dotX}
          y1={dotY}
          x2={dotX}
          y2={H - padBot}
          stroke="#34d399"
          strokeWidth="1.3"
          strokeDasharray="3 3"
        />
        <circle cx={dotX} cy={dotY} r="5.5" fill="#34d399" stroke="#06090f" strokeWidth="1.8" />

        {/* X Axis Range Labels */}
        <text x={padX} y={H - 5} fill="#94a3b8" fontSize="8.5" fontFamily="monospace" textAnchor="start">
          {meta.xMinLabel}
        </text>
        <text x={W / 2} y={H - 5} fill="#64748b" fontSize="8.5" fontFamily="monospace" textAnchor="middle">
          {meta.xAxisTitle}
        </text>
        <text x={W - padX} y={H - 5} fill="#94a3b8" fontSize="8.5" fontFamily="monospace" textAnchor="end">
          {meta.xMaxLabel}
        </text>
      </svg>

      {/* Interactive Slider */}
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={scrubFrac}
        onChange={(e) => setScrubFrac(Number(e.target.value))}
        aria-label={`Test ${meta.xAxisTitle} along the curve`}
        className="obs-slider"
      />

      {/* Dynamic Fun Reaction + Why It Bends */}
      <div className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-2 space-y-1">
        <div className="text-[11.5px] font-semibold text-emerald-200 leading-snug">
          {probe.moodNote}
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          <strong className="text-sky-300">Why does the curve bend like this?</strong> {meta.whyShape}
        </p>
      </div>
    </div>
  );
};

