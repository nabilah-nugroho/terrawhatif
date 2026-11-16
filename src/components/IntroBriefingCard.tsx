import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { TerraAvatar, type TerraMood } from './TerraAvatar';
import { BrandMark } from './BrandMark';
import { HudCorners, SectionCodeTag } from './HudReticleFrame';

interface IntroBriefingCardProps {
  mood: TerraMood;
  onAcceptMission: () => void;
  onTypingTick?: (accent?: boolean) => void;
  onReplayBriefing?: () => void;
}

const HEADER_TEXT = 'ORBITAL TRANSMISSION · PRIORITY MISSION';
const BODY_TEXT =
  'Earth’s climate shield is shifting. Step onto the observatory deck, inspect the instruments, and test how our planet survives.';

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
    <main className="fixed inset-0 z-20 flex items-end justify-start p-4 pb-16 sm:p-7 sm:pb-20 pointer-events-none">
      <div
        onClick={skipTyping}
        className="relative pointer-events-auto w-full max-w-lg obs-panel-strong rounded-[4px] px-6 py-5 text-slate-100 space-y-4"
      >
        <HudCorners tone="amber" />

        <div className="flex items-start gap-4 pt-1">
          <div className="relative shrink-0 mt-0.5">
            <TerraAvatar size={54} mood={mood} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <SectionCodeTag label="00 / UPLINK" tone="amber" />
                <span className="text-[10.5px] font-mono tracking-wider uppercase text-emerald-300/90 truncate">
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
                  className="p-1 rounded-[3px] text-slate-400 hover:text-amber-300 hover:bg-amber-400/10 transition-colors shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 mt-2">
              <BrandMark size={28} />
              <h1 className="font-title-phosphor text-3xl sm:text-[36px] font-bold uppercase leading-none">
                TerraWhatIf
              </h1>
            </div>
            <p className="text-[11px] font-mono tracking-wide uppercase text-amber-200/80 mt-1.5">
              Coastal Climate Observatory · Navigator TERRA
            </p>
          </div>
        </div>

        {/* Clean Typewriter Transmission Block */}
        <div
          className="relative border-t border-b border-amber-400/22 py-3 cursor-pointer"
          title={isTypingDone ? undefined : 'Click to finish typing'}
        >
          <div className="grid">
            <p
              aria-hidden="true"
              className="col-start-1 row-start-1 text-[13px] sm:text-sm leading-relaxed invisible select-none"
            >
              {BODY_TEXT}
            </p>
            <p className="col-start-1 row-start-1 text-[13px] sm:text-sm text-slate-100 leading-relaxed">
              {typedBody}
              {!isTypingDone && (phase === 'body' || phase === 'uplink') && (
                <span
                  aria-hidden="true"
                  className="inline-block w-1.5 h-3.5 bg-emerald-300 align-middle ml-0.5 animate-pulse"
                />
              )}
            </p>
          </div>
        </div>

        {/* Hairline-divided 3-Step Overview */}
        <div
          className={`grid grid-cols-3 gap-3 divide-x divide-amber-400/20 transition-all duration-500 ${
            showSteps ? 'opacity-100 translate-y-0' : 'opacity-25 translate-y-1'
          }`}
        >
          <div className="space-y-0.5">
            <div className="text-[10px] font-mono text-amber-300 tabular-nums">01 / GUIDE</div>
            <div className="text-xs font-semibold text-white">Follow 3 Steps</div>
          </div>

          <div className="pl-3 space-y-0.5">
            <div className="text-[10px] font-mono text-emerald-300 tabular-nums">02 / INSPECT</div>
            <div className="text-xs font-semibold text-white">Scan Deck Gear</div>
          </div>

          <div className="pl-3 space-y-0.5">
            <div className="text-[10px] font-mono text-sky-300 tabular-nums">03 / MODEL</div>
            <div className="text-xs font-semibold text-white">Test “What If”</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-[10.5px] font-mono uppercase tracking-wider text-slate-400 truncate">
            NASA CERES · Giovanni · Exoplanet Archive
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAcceptMission();
            }}
            className="px-5 py-2.5 rounded-[3px] bg-amber-400 text-[#05080f] text-xs sm:text-sm font-mono font-bold uppercase tracking-wider hover:bg-amber-300 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
          >
            <span>Accept Mission</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </main>
  );
};
