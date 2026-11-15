import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, Info, ListChecks, RotateCcw, Sliders } from 'lucide-react';
import { TerraAvatar, type TerraMood } from './TerraAvatar';

interface IntroBriefingCardProps {
  mood: TerraMood;
  onAcceptMission: () => void;
  onTypingTick?: (accent?: boolean) => void;
  onReplayBriefing?: () => void;
}

const HEADER_TEXT = 'INCOMING TRANSMISSION // PRIORITY MISSION';
const BODY_TEXT =
  'Earth’s climate shield is shifting. Step onto the deck, inspect the instruments, and test how our planet survives!';

export const IntroBriefingCard: React.FC<IntroBriefingCardProps> = ({
  mood,
  onAcceptMission,
  onTypingTick,
  onReplayBriefing,
}) => {
  const [headerCount, setHeaderCount] = useState(0);
  const [bodyCount, setBodyCount] = useState(0);
  const [phase, setPhase] = useState<'uplink' | 'header' | 'body' | 'done'>('uplink');
  const [runNonce, setRunNonce] = useState(0);

  const tickCallbackRef = useRef(onTypingTick);
  useEffect(() => {
    tickCallbackRef.current = onTypingTick;
  }, [onTypingTick]);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setHeaderCount(HEADER_TEXT.length);
      setBodyCount(BODY_TEXT.length);
      setPhase('done');
      return;
    }

    setHeaderCount(0);
    setBodyCount(0);
    setPhase('uplink');

    let timerId: number | undefined;
    let cancelled = false;

    const uplinkTimer = window.setTimeout(() => {
      if (cancelled) return;
      setPhase('header');

      let h = 0;
      let b = 0;

      const stepHeader = () => {
        if (cancelled) return;
        h += 2;
        if (h >= HEADER_TEXT.length) {
          setHeaderCount(HEADER_TEXT.length);
          tickCallbackRef.current?.(true);
          setPhase('body');
          timerId = window.setTimeout(stepBody, 180);
          return;
        }
        setHeaderCount(h);
        if (h % 4 === 0) {
          tickCallbackRef.current?.(false);
        }
        timerId = window.setTimeout(stepHeader, 24);
      };

      const stepBody = () => {
        if (cancelled) return;
        b += 1;
        setBodyCount(b);
        const ch = BODY_TEXT[b - 1] ?? '';
        if (ch !== ' ' && b % 3 === 0) {
          tickCallbackRef.current?.(ch === '.' || ch === '!');
        }
        if (b >= BODY_TEXT.length) {
          setPhase('done');
          return;
        }
        const pause = ch === '.' || ch === '!' ? 160 : ch === ',' ? 95 : 22;
        timerId = window.setTimeout(stepBody, pause);
      };

      timerId = window.setTimeout(stepHeader, 30);
    }, 380);

    return () => {
      cancelled = true;
      window.clearTimeout(uplinkTimer);
      if (timerId !== undefined) window.clearTimeout(timerId);
    };
  }, [runNonce]);

  const skipTyping = () => {
    if (phase === 'done') return;
    setHeaderCount(HEADER_TEXT.length);
    setBodyCount(BODY_TEXT.length);
    setPhase('done');
  };

  const replayTyping = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRunNonce((n) => n + 1);
    onReplayBriefing?.();
  };

  const isTypingDone = phase === 'done';
  const showSteps = phase === 'done' || bodyCount > BODY_TEXT.length * 0.45;
  const typedHeader =
    phase === 'uplink' ? 'ESTABLISHING ORBITAL UPLINK...' : HEADER_TEXT.slice(0, headerCount);
  const typedBody = BODY_TEXT.slice(0, bodyCount);

  return (
    <main className="fixed inset-0 z-20 flex items-end justify-start p-4 pb-16 sm:p-6 sm:pb-20 pointer-events-none">
      <div
        onClick={skipTyping}
        className="pointer-events-auto w-full max-w-lg obsidian-hud-strong rounded-3xl p-5 sm:p-6 text-slate-100 space-y-4 shadow-2xl border border-sky-400/25"
      >
        <div className="flex items-center gap-3.5">
          <TerraAvatar size={58} mood={mood} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-mono tracking-wider uppercase text-amber-300 flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <span className="truncate">
                  {typedHeader}
                  {phase === 'header' && (
                    <span className="inline-block w-1.5 h-3 bg-amber-300 align-middle ml-0.5 animate-pulse" />
                  )}
                </span>
              </div>

              {isTypingDone && (
                <button
                  type="button"
                  onClick={replayTyping}
                  title="Replay mission briefing"
                  aria-label="Replay mission briefing"
                  className="p-1 rounded-lg text-slate-400 hover:text-sky-200 hover:bg-white/10 transition-colors shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-0.5">
              TerraWhatIf
            </h1>
            <p className="text-xs text-slate-300">
              NASA Space Apps 2026 · Planetary Navigator TERRA
            </p>
          </div>
        </div>

        {/* Cinematic Typewriter Transmission Box (grid overlay prevents height jitter) */}
        <div
          className="relative rounded-2xl bg-sky-500/10 border border-sky-300/25 px-3.5 py-2.5 cursor-pointer"
          title={isTypingDone ? undefined : 'Click to finish typing'}
        >
          <div className="grid">
            <p
              aria-hidden="true"
              className="col-start-1 row-start-1 text-xs sm:text-sm leading-relaxed invisible select-none"
            >
              {BODY_TEXT}
            </p>
            <p className="col-start-1 row-start-1 text-xs sm:text-sm text-slate-100 leading-relaxed">
              {typedBody}
              {!isTypingDone && (phase === 'body' || phase === 'uplink') && (
                <span
                  aria-hidden="true"
                  className="inline-block w-1.5 h-3.5 bg-sky-300 align-middle ml-0.5 animate-pulse"
                />
              )}
            </p>
          </div>
        </div>

        {/* Compact 3-Step Mission Overview (smoothly staggers in during briefing) */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-3 gap-2 transition-all duration-500 ${
            showSteps ? 'opacity-100 translate-y-0' : 'opacity-25 translate-y-1'
          }`}
        >
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10">
            <span className="w-7 h-7 rounded-lg bg-amber-400/20 border border-amber-300/45 text-amber-200 flex items-center justify-center shrink-0">
              <ListChecks className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-semibold text-white leading-tight">
              1. Follow 3 Steps
            </span>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10">
            <span className="w-7 h-7 rounded-lg bg-sky-400/20 border border-sky-300/45 text-sky-200 flex items-center justify-center shrink-0">
              <Info className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-semibold text-white leading-tight">
              2. Inspect (i) Gear
            </span>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10">
            <span className="w-7 h-7 rounded-lg bg-emerald-400/20 border border-emerald-300/45 text-emerald-200 flex items-center justify-center shrink-0">
              <Sliders className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-semibold text-white leading-tight">
              3. Test “What If”
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-[11px] font-mono text-slate-400">
            NASA CERES · Giovanni · Exoplanet Archive
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAcceptMission();
            }}
            className={`px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold hover:brightness-110 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              isTypingDone
                ? 'shadow-[0_0_26px_rgba(249,115,22,0.65)] scale-[1.02]'
                : 'shadow-[0_0_16px_rgba(249,115,22,0.4)]'
            }`}
          >
            <span>Accept Mission</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </main>
  );
};
