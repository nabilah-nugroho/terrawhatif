import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Volume2, X } from 'lucide-react';
import { CHAPTER_STORIES, type ChapterStory } from '../data/chapterStories';
import { TerraAvatar } from './TerraAvatar';

interface ChapterStoryModalProps {
  stage: 'CH1' | 'CH2' | 'CH3' | null;
  soundMuted: boolean;
  onBeatChange: () => void;
  onReplayTheme: (chapterNum: 1 | 2 | 3) => void;
  onTypingTick?: (accent?: boolean) => void;
  onComplete: () => void;
}

function StoryVisualization({
  chapterNum,
  beatIndex,
}: {
  chapterNum: 1 | 2 | 3;
  beatIndex: number;
}) {
  if (chapterNum === 1) {
    const highlightBlanket = beatIndex === 1;
    return (
      <svg
        viewBox="0 0 420 170"
        className="w-full h-40 sm:h-44 rounded-2xl bg-[#070c16] border border-white/10"
        role="img"
        aria-label="Comparison between an airless frozen Earth at -18 degrees Celsius and Earth with a greenhouse atmosphere at +15 degrees Celsius"
      >
        <defs>
          <radialGradient id="ch1-sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="55%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ch1-ice" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#f0f9ff" />
            <stop offset="65%" stopColor="#bae6fd" />
            <stop offset="100%" stopColor="#38bdf8" />
          </radialGradient>
          <radialGradient id="ch1-earth" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="60%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
        </defs>

        {/* Subtle space stars */}
        <circle cx="32" cy="24" r="1.2" fill="#e2e8f0" opacity="0.6" />
        <circle cx="195" cy="18" r="1" fill="#e2e8f0" opacity="0.5" />
        <circle cx="388" cy="28" r="1.4" fill="#e2e8f0" opacity="0.65" />

        {/* Left: Airless Frozen Earth */}
        <g opacity={highlightBlanket ? 0.58 : 1}>
          <text x="102" y="24" textAnchor="middle" fill="#7dd3fc" fontSize="11" fontWeight="700">
            AIRLESS EARTH
          </text>
          <circle cx="102" cy="88" r="32" fill="url(#ch1-ice)" stroke="#e0f2fe" strokeWidth="1.5" />
          {/* Escaping heat arrows */}
          <path d="M88 52 L82 32" stroke="#fb923c" strokeWidth="2" strokeDasharray="3 2" />
          <polygon points="82,28 78,35 86,35" fill="#fb923c" />
          <path d="M116 52 L122 32" stroke="#fb923c" strokeWidth="2" strokeDasharray="3 2" />
          <polygon points="122,28 118,35 126,35" fill="#fb923c" />
          <rect x="46" y="130" width="112" height="24" rx="8" fill="#0c192c" stroke="#38bdf8" strokeOpacity="0.45" />
          <text x="102" y="146" textAnchor="middle" fill="#bae6fd" fontSize="11" fontWeight="700" fontFamily="monospace">
            -18°C (255 K)
          </text>
        </g>

        {/* Center delta badge */}
        <g>
          <line x1="172" y1="88" x2="236" y2="88" stroke="#fbbf24" strokeWidth="1.8" strokeDasharray="4 3" />
          <polygon points="241,88 233,84 233,92" fill="#fbbf24" />
          <rect x="179" y="64" width="54" height="20" rx="10" fill="#451a03" stroke="#fbbf24" />
          <text x="206" y="78" textAnchor="middle" fill="#fde68a" fontSize="10.5" fontWeight="700" fontFamily="monospace">
            +33°C
          </text>
        </g>

        {/* Right: Earth with Greenhouse Blanket */}
        <g opacity={highlightBlanket ? 1 : 0.84}>
          <text x="315" y="24" textAnchor="middle" fill="#6ee7b7" fontSize="11" fontWeight="700">
            WITH ATMOSPHERE
          </text>
          {/* Shimmering amber CO2 blanket halo */}
          <circle
            cx="315"
            cy="88"
            r="44"
            fill="none"
            stroke="#fb923c"
            strokeWidth={highlightBlanket ? '4' : '2.5'}
            strokeDasharray="6 4"
            opacity={highlightBlanket ? 0.95 : 0.55}
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 315 88"
              to="360 315 88"
              dur="18s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="315" cy="88" r="32" fill="url(#ch1-earth)" stroke="#7dd3fc" strokeWidth="1.2" />
          {/* Stylized green continents */}
          <path d="M300 78 Q312 72 318 84 Q306 94 296 86 Z" fill="#34d399" opacity="0.85" />
          <path d="M320 90 Q332 88 334 100 Q322 106 316 98 Z" fill="#34d399" opacity="0.8" />
          {/* Trapped bouncing IR arrows */}
          <path d="M294 64 Q282 48 302 48" fill="none" stroke="#fb923c" strokeWidth="2.2" />
          <polygon points="306,49 299,45 300,53" fill="#fb923c" />
          <path d="M336 64 Q348 48 328 48" fill="none" stroke="#fb923c" strokeWidth="2.2" />
          <polygon points="324,49 331,45 330,53" fill="#fb923c" />
          <rect x="257" y="130" width="116" height="24" rx="8" fill="#06281e" stroke="#34d399" strokeOpacity="0.55" />
          <text x="315" y="146" textAnchor="middle" fill="#a7f3d0" fontSize="11" fontWeight="700" fontFamily="monospace">
            +15°C (288 K)
          </text>
        </g>
      </svg>
    );
  }

  if (chapterNum === 2) {
    const showFeedbacks = beatIndex === 1;
    return (
      <svg
        viewBox="0 0 420 170"
        className="w-full h-40 sm:h-44 rounded-2xl bg-[#070c16] border border-white/10"
        role="img"
        aria-label="Orbital diagram showing Earth moving from 1.00 AU to 0.85 AU with 38 percent more sunlight and water vapor feedback"
      >
        <defs>
          <radialGradient id="ch2-sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Sun + expanding flux cone */}
        <polygon points="56,85 215,34 215,136" fill="#fde047" opacity="0.11" />
        <polygon points="56,85 152,52 152,118" fill="#fb923c" opacity="0.16" />
        <circle cx="56" cy="85" r="38" fill="url(#ch2-sun)" />
        <circle cx="56" cy="85" r="18" fill="#fef08a" />
        <text x="56" y="146" textAnchor="middle" fill="#fde047" fontSize="10" fontFamily="monospace">
          SUN
        </text>

        {/* Orbit rings */}
        <path d="M 152 24 A 110 110 0 0 1 152 146" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="5 4" />
        <path d="M 218 18 A 170 170 0 0 1 218 152" fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 4" />

        {/* 1.00 AU ghost planet */}
        <circle cx="222" cy="85" r="11" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1.5" opacity="0.65" />
        <text x="222" y="114" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">
          1.00 AU
        </text>

        {/* Shift arrow */}
        <line x1="206" y1="85" x2="174" y2="85" stroke="#fbbf24" strokeWidth="2" />
        <polygon points="169,85 177,81 177,89" fill="#fbbf24" />

        {/* 0.85 AU heated planet */}
        <circle cx="152" cy="85" r="14" fill="#ea580c" stroke="#fed7aa" strokeWidth="2">
          <animate attributeName="r" values="13.5;15;13.5" dur="2.2s" repeatCount="indefinite" />
        </circle>
        <text x="152" y="138" textAnchor="middle" fill="#fcd34d" fontSize="10.5" fontWeight="700" fontFamily="monospace">
          0.85 AU · +38% Flux!
        </text>

        {/* Right panel: Feedback loop card */}
        <g opacity={showFeedbacks ? 1 : 0.65}>
          <rect x="268" y="24" width="136" height="122" rx="14" fill="#0f172a" stroke="#fb923c" strokeOpacity="0.55" />
          <text x="336" y="45" textAnchor="middle" fill="#fdba74" fontSize="10.5" fontWeight="700">
            FEEDBACK LOOP
          </text>
          <text x="336" y="68" textAnchor="middle" fill="#e2e8f0" fontSize="10.5">
            1. Higher Heat
          </text>
          <text x="336" y="88" textAnchor="middle" fill="#7dd3fc" fontSize="10.5">
            2. More Water Vapor
          </text>
          <text x="336" y="108" textAnchor="middle" fill="#bae6fd" fontSize="10.5">
            3. Melting Ice Mirror
          </text>
          <text x="336" y="132" textAnchor="middle" fill="#fb923c" fontSize="10.5" fontWeight="700">
            ↻ Extra Warming!
          </text>
        </g>
      </svg>
    );
  }

  // Chapter 3: Red Dwarf TRAPPIST-1 + Tidally Locked Day-Night Planet
  const showLock = beatIndex === 1;
  return (
    <svg
      viewBox="0 0 420 170"
      className="w-full h-40 sm:h-44 rounded-2xl bg-[#070c16] border border-white/10"
      role="img"
      aria-label="Comparison of TRAPPIST-1 red dwarf habitable zone and tidally locked planet with eternal day and night sides"
    >
      <defs>
        <radialGradient id="ch3-reddwarf" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fed7aa" />
          <stop offset="45%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#9a3412" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Stars background */}
      <circle cx="340" cy="24" r="1.3" fill="#f8fafc" opacity="0.7" />
      <circle cx="390" cy="48" r="1.1" fill="#f8fafc" opacity="0.5" />
      <circle cx="366" cy="144" r="1.4" fill="#f8fafc" opacity="0.65" />

      {/* Sun vs TRAPPIST-1 Top Strip */}
      <g>
        <circle cx="38" cy="36" r="11" fill="#fde047" />
        <text x="58" y="34" fill="#fef08a" fontSize="10" fontWeight="700">
          Sun (5,772 K)
        </text>
        <text x="58" y="46" fill="#94a3b8" fontSize="9.5" fontFamily="monospace">
          Green Zone ~1.00 AU
        </text>
      </g>

      {/* TRAPPIST-1 System */}
      <circle cx="72" cy="112" r="36" fill="url(#ch3-reddwarf)" />
      <circle cx="72" cy="112" r="14" fill="#fb923c" stroke="#ffedd5" strokeWidth="1.2" />
      <text x="72" y="156" textAnchor="middle" fill="#fdba74" fontSize="10" fontWeight="700" fontFamily="monospace">
        TRAPPIST-1 (2,566 K)
      </text>

      {/* Tight Green Habitable Zone Band */}
      <ellipse
        cx="72"
        cy="112"
        rx="116"
        ry="42"
        fill="none"
        stroke="#34d399"
        strokeWidth="8"
        strokeOpacity="0.28"
      />
      <ellipse
        cx="72"
        cy="112"
        rx="116"
        ry="42"
        fill="none"
        stroke="#34d399"
        strokeWidth="1.6"
        strokeDasharray="4 3"
      />
      <text x="150" y="64" fill="#6ee7b7" fontSize="9.5" fontFamily="monospace">
        HZ ~0.029 AU
      </text>

      {/* Tidally Locked Planet Zoom Callout */}
      <g opacity={showLock ? 1 : 0.78}>
        <circle cx="305" cy="88" r="36" fill="#0b1120" stroke="#fdba74" strokeWidth="1.5" />
        {/* Lit amber day side facing left toward red star */}
        <path d="M 305 52 A 36 36 0 0 0 305 124 Z" fill="#f59e0b" fillOpacity="0.82" />
        {/* Twilight terminator line */}
        <line x1="305" y1="48" x2="305" y2="128" stroke="#fb7185" strokeWidth="2.2" strokeDasharray="3 2" />
        <text x="285" y="91" textAnchor="middle" fill="#fffbeb" fontSize="9.5" fontWeight="700">
          DAY
        </text>
        <text x="325" y="91" textAnchor="middle" fill="#94a3b8" fontSize="9.5" fontWeight="700">
          NIGHT
        </text>
        <text x="305" y="144" textAnchor="middle" fill="#fed7aa" fontSize="10" fontWeight="700">
          Tidally Locked World · Amber Sky
        </text>
      </g>
    </svg>
  );
}

export const ChapterStoryModal: React.FC<ChapterStoryModalProps> = ({
  stage,
  soundMuted,
  onBeatChange,
  onReplayTheme,
  onTypingTick,
  onComplete,
}) => {
  const [beatIndex, setBeatIndex] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [headCount, setHeadCount] = useState(0);
  const [bodyCount, setBodyCount] = useState(0);
  const [typingPhase, setTypingPhase] = useState<'head' | 'body' | 'done'>('done');

  const tickRef = useRef(onTypingTick);
  useEffect(() => {
    tickRef.current = onTypingTick;
  }, [onTypingTick]);

  useEffect(() => {
    setBeatIndex(0);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, [stage]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const story: ChapterStory | null = stage ? CHAPTER_STORIES[stage] : null;
  const beat = story ? story.beats[beatIndex] : null;

  useEffect(() => {
    if (!story || !beat) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setHeadCount(beat.headline.length);
      setBodyCount(beat.body.length);
      setTypingPhase('done');
      return;
    }

    setHeadCount(0);
    setBodyCount(0);
    setTypingPhase('head');

    let timerId: number | undefined;
    let cancelled = false;
    let h = 0;
    let b = 0;

    const stepHead = () => {
      if (cancelled) return;
      h += 1;
      setHeadCount(h);
      const ch = beat.headline[h - 1] ?? '';
      if (ch !== ' ' && h % 3 === 0) {
        tickRef.current?.(false);
      }
      if (h >= beat.headline.length) {
        tickRef.current?.(true);
        setTypingPhase('body');
        timerId = window.setTimeout(stepBody, 110);
        return;
      }
      timerId = window.setTimeout(stepHead, 16);
    };

    const stepBody = () => {
      if (cancelled) return;
      b += 1;
      setBodyCount(b);
      const ch = beat.body[b - 1] ?? '';
      if (ch !== ' ' && b % 4 === 0) {
        tickRef.current?.(ch === '.' || ch === '!' || ch === '?');
      }
      if (b >= beat.body.length) {
        setTypingPhase('done');
        return;
      }
      const pause =
        ch === '.' || ch === '!' || ch === '?' ? 115 : ch === ',' ? 65 : 15;
      timerId = window.setTimeout(stepBody, pause);
    };

    timerId = window.setTimeout(stepHead, 140);

    return () => {
      cancelled = true;
      if (timerId !== undefined) window.clearTimeout(timerId);
    };
  }, [stage, beatIndex, story, beat]);

  if (!stage || !story || !beat) return null;

  const isLastBeat = beatIndex === story.beats.length - 1;
  const isTypingDone = typingPhase === 'done';

  const skipTyping = () => {
    if (isTypingDone) return;
    setHeadCount(beat.headline.length);
    setBodyCount(beat.body.length);
    setTypingPhase('done');
  };

  const stopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  };

  const handleReadAloud = () => {
    if (soundMuted) return;
    onReplayTheme(story.chapterNum);
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (speaking) {
      stopSpeech();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `${story.title}. ${beat.headline} ${beat.body}`
    );
    utterance.rate = 1.0;
    utterance.pitch = 1.03;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleNext = () => {
    stopSpeech();
    if (!isLastBeat) {
      onBeatChange();
      setBeatIndex((i) => i + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    stopSpeech();
    if (beatIndex > 0) {
      onBeatChange();
      setBeatIndex((i) => i - 1);
    }
  };

  const handleSkip = () => {
    stopSpeech();
    onComplete();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="chapter-story-title"
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/55"
    >
      <div className="w-full max-w-xl obsidian-hud-strong rounded-3xl p-5 sm:p-6 text-slate-100 shadow-2xl space-y-4">
        {/* Header with TERRA + Story Title + Sound Replay */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <TerraAvatar
              size={52}
              mood={story.chapterNum === 2 ? 'hot' : 'temperate'}
              className="shrink-0"
            />
            <div className="min-w-0">
              <div className="text-[11px] font-mono uppercase tracking-wider text-sky-300">
                {story.eyebrow}
              </div>
              <h2 id="chapter-story-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {story.title}
              </h2>
              <p className="text-xs text-slate-300">{story.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleReadAloud}
              disabled={soundMuted}
              title={soundMuted ? 'Unmute audio to play story narration & theme' : 'Play theme sound & read story'}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                soundMuted
                  ? 'bg-white/5 border-white/10 text-slate-500 cursor-not-allowed'
                  : speaking
                    ? 'bg-sky-400/25 border-sky-300 text-white'
                    : 'bg-white/5 border-white/15 hover:border-white/35 text-sky-200 hover:text-white'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{speaking ? 'Stop Voice' : 'Listen'}</span>
            </button>

            <button
              type="button"
              onClick={handleSkip}
              aria-label="Close story briefing"
              className="p-2 rounded-xl bg-white/5 border border-white/15 hover:border-white/35 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Interactive Chapter Story Visualization */}
        <StoryVisualization chapterNum={story.chapterNum} beatIndex={beatIndex} />

        {/* Narrative Beat Card (Typewriter Briefing) */}
        <div
          onClick={skipTyping}
          title={isTypingDone ? undefined : 'Click to finish typing'}
          className="rounded-2xl bg-white/5 border border-white/12 p-4 space-y-2 cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{beat.badge}</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              Part {beatIndex + 1} of {story.beats.length}
            </span>
          </div>

          <div className="grid">
            <h3
              aria-hidden="true"
              className="col-start-1 row-start-1 font-display text-base sm:text-lg font-bold leading-snug invisible select-none"
            >
              {beat.headline}
            </h3>
            <h3 className="col-start-1 row-start-1 font-display text-base sm:text-lg font-bold text-white leading-snug">
              {beat.headline.slice(0, headCount)}
              {typingPhase === 'head' && (
                <span
                  aria-hidden="true"
                  className="inline-block w-1.5 h-4 bg-amber-300 align-middle ml-0.5 animate-pulse"
                />
              )}
            </h3>
          </div>

          <div className="grid">
            <p
              aria-hidden="true"
              className="col-start-1 row-start-1 text-xs sm:text-sm leading-relaxed invisible select-none"
            >
              {beat.body}
            </p>
            <p className="col-start-1 row-start-1 text-xs sm:text-sm text-slate-200 leading-relaxed">
              {beat.body.slice(0, bodyCount)}
              {typingPhase === 'body' && (
                <span
                  aria-hidden="true"
                  className="inline-block w-1.5 h-3.5 bg-sky-300 align-middle ml-0.5 animate-pulse"
                />
              )}
            </p>
          </div>

          <div
            className={`pt-1 transition-all duration-300 ${
              isTypingDone || bodyCount > beat.body.length * 0.65
                ? 'opacity-100 translate-y-0'
                : 'opacity-25 translate-y-1'
            }`}
          >
            <div className="inline-flex items-center px-3 py-1 rounded-xl bg-sky-400/15 border border-sky-300/35 text-xs font-mono text-sky-200">
              {beat.callout}
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            {beatIndex > 0 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 hover:border-white/35 text-xs font-semibold text-slate-200 flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSkip}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Skip Briefing
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {story.beats.map((b, i) => (
              <span
                key={b.badge}
                className={`h-1.5 rounded-full transition-all ${
                  i === beatIndex ? 'w-5 bg-amber-300' : 'w-1.5 bg-white/25'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="px-4 py-2.5 rounded-xl bg-amber-400 text-[#06090f] text-xs sm:text-sm font-bold hover:bg-amber-300 transition-colors flex items-center gap-1.5"
          >
            <span>{isLastBeat ? story.ctaLabel : 'Next Clue'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
