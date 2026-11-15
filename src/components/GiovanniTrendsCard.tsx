import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Play, Square, TrendingUp } from 'lucide-react';
import { analyzeTrend } from '../engine/trends.js';
import trendsData from '../engine/trends.json';

type VarKey = keyof typeof trendsData.variables;

const VAR_LABELS: Record<VarKey, string> = {
  arctic_surface_temp: 'Arctic Temp',
  tropical_surface_temp: 'Tropical Temp',
  arctic_sea_ice_albedo: 'Arctic Albedo',
  tropical_water_vapor: 'Tropical Vapor',
};

const VAR_SHORT: Record<VarKey, { region: string; accent: string }> = {
  arctic_surface_temp: { region: 'Arctic 66–90°N', accent: '#38bdf8' },
  tropical_surface_temp: { region: 'Tropics 23°S–23°N', accent: '#fb923c' },
  arctic_sea_ice_albedo: { region: 'Arctic Sea Ice', accent: '#bae6fd' },
  tropical_water_vapor: { region: 'Tropical Humidity', accent: '#34d399' },
};

interface GiovanniTrendsCardProps {
  mode: 'compact' | 'expanded' | 'sparklines';
  defaultOpen?: boolean;
  onInspectFull?: () => void;
  onPlayRealTrend?: () => void;
  isPlayingTrend?: boolean;
}

export const GiovanniTrendsCard: React.FC<GiovanniTrendsCardProps> = ({
  mode,
  defaultOpen = false,
  onInspectFull,
  onPlayRealTrend,
  isPlayingTrend = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const [selectedVar, setSelectedVar] = useState<VarKey>('arctic_surface_temp');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const [growProgress, setGrowProgress] = useState(1);
  const rafRef = useRef<number>(0);
  const uid = useId().replace(/:/g, '');

  const variable = trendsData.variables[selectedVar];
  const stats = useMemo(() => analyzeTrend(variable.data, 2003), [variable.data]);

  const allSeries = useMemo(() => {
    return (Object.keys(VAR_LABELS) as VarKey[]).map((key) => {
      const v = trendsData.variables[key];
      const st = analyzeTrend(v.data, 2003);
      return { key, variable: v, stats: st };
    });
  }, []);

  const years = useMemo(
    () => Array.from({ length: variable.data.length }, (_, i) => 2003 + i),
    [variable.data.length]
  );

  // Trigger smooth left-to-right growth animation when hovering 'Regional Trends' card or changing variable
  const triggerGrowAnimation = () => {
    cancelAnimationFrame(rafRef.current);
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setGrowProgress(1);
      return;
    }

    const start = performance.now();
    const duration = 950;
    setGrowProgress(0.04);

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Smooth cubic ease-out for organic data sweep
      const eased = 1 - Math.pow(1 - t, 3);
      setGrowProgress(eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // SVG chart dimensions
  const W = mode === 'expanded' ? 460 : 320;
  const H = mode === 'expanded' ? 180 : 112;
  const padL = mode === 'expanded' ? 38 : 28;
  const padR = 12;
  const padT = 14;
  const padB = mode === 'expanded' ? 24 : 18;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const allVals = [...variable.data, ...stats.trendLine];
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const spanV = Math.max(1e-6, maxV - minV);
  const yMin = minV - spanV * 0.12;
  const yMax = maxV + spanV * 0.12;

  const toX = (idx: number) =>
    padL + (idx / Math.max(1, variable.data.length - 1)) * plotW;
  const toY = (val: number) =>
    padT + (1 - (val - yMin) / (yMax - yMin)) * plotH;

  const obsPoints = variable.data
    .map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`)
    .join(' ');
  const trendStart = `${toX(0).toFixed(1)},${toY(stats.trendLine[0]).toFixed(1)}`;
  const trendEnd = `${toX(variable.data.length - 1).toFixed(1)},${toY(
    stats.trendLine[stats.trendLine.length - 1]
  ).toFixed(1)}`;

  const activeIdx = hoverIdx !== null ? hoverIdx : variable.data.length - 1;
  const decDigits = selectedVar === 'arctic_sea_ice_albedo' ? 3 : 2;
  const slopeSign = stats.slopePerDecade >= 0 ? '+' : '';
  const pFormatted =
    stats.pValue < 0.0001 ? '< 0.0001' : stats.pValue.toFixed(4);

  // Leading-edge coordinates for growing trend line indicator
  const clipWidth = Math.max(2, plotW * growProgress + 4);
  const leadFloatIdx = Math.min(
    variable.data.length - 1,
    Math.max(0, growProgress * (variable.data.length - 1))
  );
  const leadLo = Math.floor(leadFloatIdx);
  const leadHi = Math.min(variable.data.length - 1, leadLo + 1);
  const leadFrac = leadFloatIdx - leadLo;
  const leadObsVal =
    variable.data[leadLo] * (1 - leadFrac) + variable.data[leadHi] * leadFrac;
  const leadTrendVal =
    stats.trendLine[leadLo] * (1 - leadFrac) + stats.trendLine[leadHi] * leadFrac;

  const mainClipId = `giovanni-clip-${uid}`;

  const renderMiniSparklineGrid = () => (
    <div className="grid grid-cols-2 gap-2">
      {allSeries.map(({ key, variable: v, stats: st }) => {
        const isSel = selectedVar === key;
        const meta = VAR_SHORT[key];
        const mW = 160;
        const mH = 44;
        const mPad = 5;
        const mPlotW = mW - mPad * 2;
        const mPlotH = mH - mPad * 2;
        const vals = [...v.data, ...st.trendLine];
        const lo = Math.min(...vals);
        const hi = Math.max(...vals);
        const sp = Math.max(1e-6, hi - lo);
        const mx = (i: number) => mPad + (i / (v.data.length - 1)) * mPlotW;
        const my = (val: number) => mPad + (1 - (val - lo) / sp) * mPlotH;
        const pts = v.data.map((d, i) => `${mx(i).toFixed(1)},${my(d).toFixed(1)}`).join(' ');
        const tY0 = my(st.trendLine[0]).toFixed(1);
        const tY1 = my(st.trendLine[st.trendLine.length - 1]).toFixed(1);
        const sDigits = key === 'arctic_sea_ice_albedo' ? 3 : 2;
        const sSign = st.slopePerDecade >= 0 ? '+' : '';
        const miniClipId = `mini-clip-${uid}-${key}`;

        return (
          <button
            key={key}
            type="button"
            onClick={() => {
              setSelectedVar(key);
              setHoverIdx(null);
              triggerGrowAnimation();
            }}
            className={`text-left p-2.5 rounded-xl border transition-all ${
              isSel
                ? 'bg-sky-400/15 border-sky-300/55 shadow-[0_0_16px_rgba(56,189,248,0.16)]'
                : 'bg-black/30 border-white/10 hover:border-white/25'
            }`}
          >
            <div className="flex items-center justify-between gap-1 text-[11px]">
              <span className="font-semibold text-white truncate">{VAR_LABELS[key]}</span>
              <span
                className="font-mono font-semibold tabular-nums shrink-0"
                style={{ color: meta.accent }}
              >
                {sSign}
                {st.slopePerDecade.toFixed(sDigits)}/dec
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 mb-1 truncate">
              {meta.region} · {v.mission}
            </div>
            <svg viewBox={`0 0 ${mW} ${mH}`} className="w-full h-11 overflow-visible">
              <defs>
                <clipPath id={miniClipId}>
                  <rect x={0} y={0} width={mPad + mPlotW * growProgress + 2} height={mH} />
                </clipPath>
              </defs>
              <g clipPath={`url(#${miniClipId})`}>
                <polyline
                  fill="none"
                  stroke={meta.accent}
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                  points={pts}
                />
                <line
                  x1={mPad}
                  y1={tY0}
                  x2={mW - mPad}
                  y2={tY1}
                  stroke="#fbbf24"
                  strokeWidth="1.4"
                  strokeDasharray="3 2"
                />
              </g>
              {growProgress < 0.99 && (
                <circle
                  cx={mPad + mPlotW * growProgress}
                  cy={my(
                    v.data[Math.min(v.data.length - 1, Math.round(growProgress * (v.data.length - 1)))]
                  )}
                  r="2.5"
                  fill="#ffffff"
                />
              )}
            </svg>
          </button>
        );
      })}
    </div>
  );

  const renderChartAndStats = () => (
    <div className="space-y-3">
      {mode === 'expanded' && renderMiniSparklineGrid()}

      {/* Variable selector (compact mode uses tabs; expanded mode can use mini-cards or tabs) */}
      {mode === 'compact' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
          {(Object.keys(VAR_LABELS) as VarKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSelectedVar(key);
                setHoverIdx(null);
                triggerGrowAnimation();
              }}
              className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap truncate ${
                selectedVar === key
                  ? 'bg-sky-400/20 text-sky-100 border border-sky-300/35'
                  : 'text-slate-300 hover:text-white border border-transparent'
              }`}
            >
              {VAR_LABELS[key]}
            </button>
          ))}
        </div>
      )}

      {/* Dataset context */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
        <span>
          {variable.mission} · {variable.spatial_bounding_box}
        </span>
        <span className="text-slate-300">{variable.units}</span>
      </div>

      {/* Interactive SVG Sparkline / Time-Series */}
      <div className="relative rounded-lg bg-black/35 border border-white/10 p-2">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto overflow-visible select-none"
          role="img"
          aria-label={`NASA Giovanni ${variable.description} 2003 to 2025 time series and OLS regression`}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <clipPath id={mainClipId}>
              <rect x={padL - 2} y={0} width={clipWidth} height={H} />
            </clipPath>
          </defs>

          {/* Horizontal gridlines */}
          {[0, 0.5, 1].map((f, i) => {
            const val = yMin + (1 - f) * (yMax - yMin);
            const gy = padT + f * plotH;
            return (
              <g key={i}>
                <line
                  x1={padL}
                  y1={gy}
                  x2={W - padR}
                  y2={gy}
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray="2 3"
                />
                <text
                  x={padL - 5}
                  y={gy + 3}
                  textAnchor="end"
                  fill="rgba(148,163,184,0.8)"
                  fontSize="9"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {val.toFixed(selectedVar === 'arctic_sea_ice_albedo' ? 2 : 1)}
                </text>
              </g>
            );
          })}

          {/* Year ticks */}
          {[0, 11, 22].map((idx) => (
            <text
              key={idx}
              x={toX(idx)}
              y={H - 4}
              textAnchor={idx === 0 ? 'start' : idx === 22 ? 'end' : 'middle'}
              fill="rgba(148,163,184,0.8)"
              fontSize="9"
              fontFamily="JetBrains Mono, monospace"
            >
              {years[idx]}
            </text>
          ))}

          {/* Growing Clipped Observed Series + OLS Fitted Regression Line */}
          <g clipPath={`url(#${mainClipId})`}>
            <polyline
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.9"
              strokeLinejoin="round"
              points={obsPoints}
            />
            <line
              x1={trendStart.split(',')[0]}
              y1={trendStart.split(',')[1]}
              x2={trendEnd.split(',')[0]}
              y2={trendEnd.split(',')[1]}
              stroke="#f59e0b"
              strokeWidth="1.8"
              strokeDasharray="4 3"
            />
          </g>

          {/* Dynamic growing tip tracers while animating */}
          {growProgress < 0.99 && (
            <g pointerEvents="none">
              <circle
                cx={padL + growProgress * plotW}
                cy={toY(leadObsVal)}
                r="4"
                fill="#7dd3fc"
                opacity="0.9"
              />
              <circle
                cx={padL + growProgress * plotW}
                cy={toY(leadTrendVal)}
                r="3.4"
                fill="#fbbf24"
                opacity="0.95"
              />
            </g>
          )}

          {/* Active crosshair */}
          <line
            x1={toX(activeIdx)}
            y1={padT}
            x2={toX(activeIdx)}
            y2={padT + plotH}
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="1"
          />
          <circle
            cx={toX(activeIdx)}
            cy={toY(variable.data[activeIdx])}
            r="3.2"
            fill="#38bdf8"
            stroke="#06090f"
            strokeWidth="1.2"
          />
          <circle
            cx={toX(activeIdx)}
            cy={toY(stats.trendLine[activeIdx])}
            r="2.6"
            fill="#f59e0b"
          />

          {/* Hover hit columns */}
          {variable.data.map((_, i) => {
            const colW = plotW / variable.data.length;
            return (
              <rect
                key={i}
                x={toX(i) - colW / 2}
                y={padT}
                width={colW}
                height={plotH}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoverIdx(i)}
                onFocus={() => setHoverIdx(i)}
              />
            );
          })}
        </svg>

        {/* Crosshair coordinate readout */}
        <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-300 border-t border-white/10 pt-1.5">
          <span>
            Year <strong className="text-white">{years[activeIdx]}</strong>
          </span>
          <span>
            Obs{' '}
            <strong className="text-sky-300">
              {variable.data[activeIdx].toFixed(decDigits)}
            </strong>{' '}
            · OLS{' '}
            <strong className="text-amber-300">
              {stats.trendLine[activeIdx].toFixed(decDigits)}
            </strong>
          </span>
        </div>
      </div>

      {/* t-Test & OLS Statistical Readout */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono tabular-nums">
        <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
          <div className="text-[10px] text-slate-400 font-sans">Trend / 10 yrs</div>
          <div className="text-slate-100 font-semibold mt-0.5">
            {slopeSign}
            {stats.slopePerDecade.toFixed(decDigits)}
          </div>
          <div className="text-[9.5px] text-slate-400 font-sans mt-0.5">Rate per decade</div>
        </div>
        <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
          <div className="text-[10px] text-slate-400 font-sans">p-Value</div>
          <div className="text-slate-100 font-semibold mt-0.5">{pFormatted}</div>
          <div className="text-[9.5px] text-emerald-300 font-sans mt-0.5">
            {stats.isSignificant ? 'Real trend (>95%)' : 'Not yet certain'}
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
          <div className="text-[10px] text-slate-400 font-sans">Fit (R²)</div>
          <div className="text-slate-100 font-semibold mt-0.5">
            {Math.round(stats.rSquared * 100)}%{' '}
            <span className="text-[10px] text-slate-400">({stats.rSquared.toFixed(2)})</span>
          </div>
          <div className="text-[9.5px] text-slate-400 font-sans mt-0.5">Line match</div>
        </div>
        <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
          <div className="text-[10px] text-slate-400 font-sans">t-Stat (df={stats.df})</div>
          <div className="text-slate-100 font-semibold mt-0.5">{stats.tStat.toFixed(2)}</div>
          <div className="text-[9.5px] text-slate-400 font-sans mt-0.5">Signal strength</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono pt-0.5">
        <span
          className={
            stats.isSignificant ? 'text-emerald-300' : 'text-amber-300'
          }
        >
          {stats.isSignificant ? '● ' : '▲ '}
          {stats.badgeText}
        </span>
        <span className="text-slate-400 tabular-nums">
          95% CI/yr: [{stats.ci95Low.toFixed(4)}, {stats.ci95High.toFixed(4)}]
        </span>
      </div>

      <div className="text-[11px] text-slate-300 leading-relaxed bg-white/5 border border-white/10 rounded-lg px-2.5 py-2">
        <span className="font-semibold text-sky-200">{variable.mission} Satellite:</span>{' '}
        {variable.trend_expected}.{' '}
        <span className="text-slate-400">({trendsData._metadata.temporal_coverage})</span>
      </div>
    </div>
  );

  if (mode === 'sparklines') {
    return (
      <section
        aria-label="Regional Trends"
        onMouseEnter={() => {
          setIsCardHovered(true);
          triggerGrowAnimation();
        }}
        onMouseLeave={() => setIsCardHovered(false)}
        className={`rounded-xl p-3.5 border transition-all space-y-2.5 ${
          isCardHovered
            ? 'bg-sky-500/10 border-sky-300/45 shadow-[0_0_20px_rgba(56,189,248,0.14)]'
            : 'bg-white/5 border-white/10'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-300" />
            <div>
              <h4 className="text-xs font-semibold text-white">Regional Trends</h4>
              <p className="text-[10px] font-mono text-slate-400">
                NASA Giovanni (2003–2025) · Hover card to animate lines
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {onPlayRealTrend && (
              <button
                type="button"
                onClick={onPlayRealTrend}
                className={`px-2 py-0.5 rounded-lg border text-[10px] font-semibold flex items-center gap-1 transition-colors ${
                  isPlayingTrend
                    ? 'bg-rose-500/25 border-rose-300/60 text-rose-100 hover:bg-rose-500/35'
                    : 'bg-amber-400/20 border-amber-300/45 text-amber-100 hover:bg-amber-400/30'
                }`}
              >
                {isPlayingTrend ? <Square className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                <span>{isPlayingTrend ? 'Stop 3D' : 'Play 2003→2025 in 3D'}</span>
              </button>
            )}
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono border transition-colors ${
                isCardHovered
                  ? 'bg-amber-400/20 border-amber-300/55 text-amber-200'
                  : 'bg-white/5 border-white/15 text-slate-400'
              }`}
            >
              {isCardHovered ? 'Growing 2003→2025' : 'Hover'}
            </span>
            {onInspectFull && (
              <button
                type="button"
                onClick={onInspectFull}
                className="px-2 py-0.5 rounded-lg bg-sky-400/15 border border-sky-300/35 hover:bg-sky-400/25 text-[10px] font-semibold text-sky-200 transition-colors"
              >
                Full t-Test
              </button>
            )}
          </div>
        </div>
        {renderMiniSparklineGrid()}
      </section>
    );
  }

  if (mode === 'expanded') {
    return (
      <section
        aria-label="Regional Trends"
        onMouseEnter={() => {
          setIsCardHovered(true);
          triggerGrowAnimation();
        }}
        onMouseLeave={() => setIsCardHovered(false)}
        className={`rounded-2xl p-4 border transition-colors space-y-3 ${
          isCardHovered
            ? 'bg-sky-500/10 border-sky-300/45 shadow-[0_0_24px_rgba(56,189,248,0.16)]'
            : 'bg-white/5 border-white/12'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-300" />
              <h4 className="text-sm font-semibold text-white">
                Regional Trends · NASA Giovanni Explorer
              </h4>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {variable.description} · Hover card to animate 2003–2025 trend growth
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onPlayRealTrend && (
              <button
                type="button"
                onClick={onPlayRealTrend}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                  isPlayingTrend
                    ? 'bg-rose-500/25 border-rose-300/60 text-rose-100 hover:bg-rose-500/35'
                    : 'bg-amber-400/20 border-amber-300/50 text-amber-100 hover:bg-amber-400/30'
                }`}
              >
                {isPlayingTrend ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isPlayingTrend ? 'Stop 3D Replay' : 'Play 2003→2025 in 3D'}</span>
              </button>
            )}
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono border shrink-0 transition-colors ${
                isCardHovered
                  ? 'bg-amber-400/20 border-amber-300/55 text-amber-200'
                  : 'bg-white/5 border-white/15 text-slate-400'
              }`}
            >
              {isCardHovered ? 'Growing 2003→2025' : 'Hover to animate'}
            </span>
          </div>
        </div>
        {renderChartAndStats()}
      </section>
    );
  }

  return (
    <div
      onMouseEnter={() => {
        setIsCardHovered(true);
        if (open) triggerGrowAnimation();
      }}
      onMouseLeave={() => setIsCardHovered(false)}
      className="border-t border-white/10 pt-2.5 mt-2.5"
    >
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) triggerGrowAnimation();
        }}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 text-left text-xs font-medium text-sky-200 hover:text-white transition-colors py-1"
      >
        <span className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-sky-300" />
          <span>Regional Trends (NASA Giovanni)</span>
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
          <span>
            {slopeSign}
            {stats.slopePerDecade.toFixed(decDigits)}/dec
          </span>
          {open ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </span>
      </button>

      {open && <div className="mt-2.5">{renderChartAndStats()}</div>}
    </div>
  );
};
