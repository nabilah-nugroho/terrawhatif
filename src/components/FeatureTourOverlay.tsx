import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Crosshair,
  FlaskConical,
  Gauge,
  ListChecks,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react';

export interface TourStep {
  id: string;
  targetSelector?: string;
  title: string;
  description: string;
  hint?: string;
  preferredPlacement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  icon: React.ReactNode;
  accent: 'amber' | 'sky' | 'emerald';
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'mission-checklist',
    targetSelector: '[data-tour="mission-checklist"]',
    title: 'Mission Checklist',
    description:
      'Your 3 chapter goals live here. Click any step to automatically aim the 3D camera at its target instrument, or tap Story to replay the chapter briefing.',
    hint: 'Follow steps 1 → 3 to complete each chapter',
    preferredPlacement: 'right',
    icon: <ListChecks className="w-4 h-4 text-amber-300" />,
    accent: 'amber',
  },
  {
    id: 'temp-gauge',
    targetSelector: '[data-tour="temp-gauge"]',
    title: 'Live Climate Gauge',
    description:
      'Watch Earth’s surface temperature (°C and Kelvin) and ocean status react instantaneously whenever you adjust gases, orbit, or stars.',
    hint: 'Blue = Frozen · Green = Liquid Water · Amber = Too Hot',
    preferredPlacement: 'bottom',
    icon: <Gauge className="w-4 h-4 text-sky-300" />,
    accent: 'sky',
  },
  {
    id: 'camera-modes',
    targetSelector: '[data-tour="camera-modes"]',
    title: 'Walking (3P) & Overview Camera',
    description:
      'Walk the observatory deck in 3rd-person astronaut mode, or switch to Overview for a wide orbital angle anytime.',
    hint: 'Shortcut: press [V] to toggle camera mode · [H] to hide UI',
    preferredPlacement: 'bottom',
    icon: <Compass className="w-4 h-4 text-amber-300" />,
    accent: 'amber',
  },
  {
    id: 'deck-instruments',
    title: 'Scan 3D Deck Instruments',
    description:
      'Follow the glowing floor path to any instrument on the deck. Press [E] or click an instrument to fire your holographic scanner and open 3-tab lessons.',
    hint: 'Every instrument has Look!, Why?, and Math & NASA Data tabs',
    preferredPlacement: 'center',
    icon: <Crosshair className="w-4 h-4 text-sky-300" />,
    accent: 'sky',
  },
  {
    id: 'control-deck',
    targetSelector: '[data-tour="control-deck"]',
    title: 'What-If Sliders & Instant Presets',
    description:
      'Slide CO₂ or Orbit Distance to test hypotheses, compare live changes vs. Earth, try 1-click presets like Snowball Earth, or open the Prediction Quiz.',
    hint: 'Look for gold target markers along each slider rail',
    preferredPlacement: 'top',
    icon: <Sliders className="w-4 h-4 text-emerald-300" />,
    accent: 'emerald',
  },
  {
    id: 'terra-guide',
    targetSelector: '[data-tour="terra-guide"]',
    title: 'Planetary Navigator TERRA',
    description:
      'TERRA tracks your active step, reacts visually when the planet freezes or overheats, and opens Touch to Understand for the current experiment.',
    hint: 'Your live copilot throughout Chapters 1–3',
    preferredPlacement: 'top',
    icon: <Sparkles className="w-4 h-4 text-sky-300" />,
    accent: 'sky',
  },
  {
    id: 'lab-tools',
    targetSelector: '[data-tour="lab-tools"]',
    title: 'Badges, Notebook & NASA 3D Replay',
    description:
      'Earn 5 Detective Badges, review all 8 scanned instruments in your Notebook, and open Science Lab to replay real 2003–2025 NASA Giovanni satellite trends in 3D.',
    hint: 'Click ? anytime in the top bar to view shortcuts or replay this tour',
    preferredPlacement: 'bottom',
    icon: <FlaskConical className="w-4 h-4 text-amber-300" />,
    accent: 'amber',
  },
];

interface FeatureTourOverlayProps {
  open: boolean;
  onClose: (completed: boolean) => void;
  onStepChange?: () => void;
}

interface RectBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const FeatureTourOverlay: React.FC<FeatureTourOverlayProps> = ({
  open,
  onClose,
  onStepChange,
}) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<RectBox | null>(null);
  const [cardPos, setCardPos] = useState<{ left: number; top: number; width: number }>({
    left: 24,
    top: 120,
    width: 340,
  });
  const cardRef = useRef<HTMLDivElement | null>(null);
  const maskId = useId().replace(/:/g, '');

  const step = TOUR_STEPS[stepIdx] ?? TOUR_STEPS[0];
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === TOUR_STEPS.length - 1;

  useEffect(() => {
    if (open) {
      setStepIdx(0);
    }
  }, [open]);

  const measureAndPosition = () => {
    if (!open || typeof window === 'undefined') return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardW = Math.min(352, vw - 24);
    const cardH = cardRef.current?.offsetHeight || 228;
    const pad = 8;
    const gap = 16;

    let rect: RectBox | null = null;
    if (step.targetSelector) {
      const el = document.querySelector(step.targetSelector);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 4 && r.height > 4) {
          rect = {
            left: Math.max(4, r.left - pad),
            top: Math.max(4, r.top - pad),
            width: Math.min(vw - 8, r.width + pad * 2),
            height: Math.min(vh - 8, r.height + pad * 2),
          };
        }
      }
    }
    setTargetRect(rect);

    const clampLeft = (x: number) => Math.max(12, Math.min(vw - cardW - 12, x));
    const clampTop = (y: number) => Math.max(12, Math.min(vh - cardH - 12, y));

    if (!rect || step.preferredPlacement === 'center') {
      setCardPos({
        left: clampLeft((vw - cardW) / 2),
        top: clampTop((vh - cardH) / 2),
        width: cardW,
      });
      return;
    }

    const rRight = rect.left + rect.width;
    const rBottom = rect.top + rect.height;
    const rCenterX = rect.left + rect.width / 2;
    const rCenterY = rect.top + rect.height / 2;

    let left = clampLeft(rCenterX - cardW / 2);
    let top = clampTop(rBottom + gap);

    const fitsRight = rRight + gap + cardW <= vw - 12;
    const fitsLeft = rect.left - gap - cardW >= 12;
    const fitsBottom = rBottom + gap + cardH <= vh - 12;
    const fitsTop = rect.top - gap - cardH >= 12;

    if (step.preferredPlacement === 'right' && fitsRight) {
      left = rRight + gap;
      top = clampTop(rect.top);
    } else if (step.preferredPlacement === 'left' && fitsLeft) {
      left = rect.left - gap - cardW;
      top = clampTop(rect.top);
    } else if (step.preferredPlacement === 'top' && fitsTop) {
      left = clampLeft(rCenterX - cardW / 2);
      top = rect.top - gap - cardH;
    } else if (step.preferredPlacement === 'bottom' && fitsBottom) {
      left = clampLeft(rCenterX - cardW / 2);
      top = rBottom + gap;
    } else if (fitsBottom) {
      left = clampLeft(rCenterX - cardW / 2);
      top = rBottom + gap;
    } else if (fitsTop) {
      left = clampLeft(rCenterX - cardW / 2);
      top = rect.top - gap - cardH;
    } else if (fitsRight) {
      left = rRight + gap;
      top = clampTop(rCenterY - cardH / 2);
    } else if (fitsLeft) {
      left = rect.left - gap - cardW;
      top = clampTop(rCenterY - cardH / 2);
    } else {
      left = clampLeft((vw - cardW) / 2);
      top = clampTop((vh - cardH) / 2);
    }

    setCardPos({ left, top, width: cardW });
  };

  useLayoutEffect(() => {
    if (!open) return;
    measureAndPosition();
    const raf = window.requestAnimationFrame(measureAndPosition);
    const timer = window.setTimeout(measureAndPosition, 80);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stepIdx]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => measureAndPosition();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stepIdx]);

  const goNext = () => {
    if (isLast) {
      onClose(true);
      return;
    }
    onStepChange?.();
    setStepIdx((i) => Math.min(TOUR_STEPS.length - 1, i + 1));
  };

  const goPrev = () => {
    if (isFirst) return;
    onStepChange?.();
    setStepIdx((i) => Math.max(0, i - 1));
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose(false);
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stepIdx, isFirst, isLast]);

  if (!open) return null;

  const ringClass =
    step.accent === 'amber'
      ? 'border-amber-300 shadow-[0_0_28px_rgba(251,191,36,0.45)]'
      : step.accent === 'emerald'
        ? 'border-emerald-300 shadow-[0_0_28px_rgba(52,211,153,0.45)]'
        : 'border-sky-300 shadow-[0_0_28px_rgba(56,189,248,0.45)]';

  // Connector line from card center to target center
  const cardCenterX = cardPos.left + cardPos.width / 2;
  const cardCenterY = cardPos.top + (cardRef.current?.offsetHeight || 220) / 2;
  const targetCenterX = targetRect ? targetRect.left + targetRect.width / 2 : null;
  const targetCenterY = targetRect ? targetRect.top + targetRect.height / 2 : null;
  const pointerColor =
    step.accent === 'amber' ? '#fcd34d' : step.accent === 'emerald' ? '#6ee7b7' : '#7dd3fc';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Observatory Feature Tour: ${step.title}`}
      className="fixed inset-0 z-50"
    >
      {/* Dimming backdrop with rounded spotlight cutout */}
      <svg className="fixed inset-0 w-full h-full pointer-events-auto" aria-hidden="true">
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx="16"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(4, 7, 13, 0.72)"
          mask={`url(#${maskId})`}
          onClick={() => onClose(false)}
        />
        {targetRect && targetCenterX !== null && targetCenterY !== null && (
          <line
            x1={cardCenterX}
            y1={cardCenterY}
            x2={targetCenterX}
            y2={targetCenterY}
            stroke={pointerColor}
            strokeWidth="1.75"
            strokeDasharray="5 4"
            strokeOpacity="0.8"
          />
        )}
      </svg>

      {/* Glowing spotlight frame around the pointed-out UI feature */}
      {targetRect && (
        <div
          aria-hidden="true"
          className={`fixed rounded-2xl border-2 pointer-events-none transition-all duration-300 ${ringClass}`}
          style={{
            left: targetRect.left,
            top: targetRect.top,
            width: targetRect.width,
            height: targetRect.height,
          }}
        />
      )}

      {/* Center deck beacon ring for the 3D scene step */}
      {!targetRect && step.id === 'deck-instruments' && (
        <div
          aria-hidden="true"
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center"
        >
          <div className="w-36 h-36 rounded-full border-2 border-dashed border-sky-300/60 animate-pulse" />
        </div>
      )}

      {/* Point-out Tour Card */}
      <div
        ref={cardRef}
        className="fixed z-10 obsidian-hud-strong rounded-2xl p-4 text-slate-100 shadow-2xl border border-white/20 space-y-3 transition-all duration-200"
        style={{
          left: cardPos.left,
          top: cardPos.top,
          width: cardPos.width,
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              {step.icon}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                Quick Tour · Step {stepIdx + 1} of {TOUR_STEPS.length}
              </div>
              <h3 className="font-display text-sm sm:text-base font-bold text-white leading-tight truncate">
                {step.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onClose(false)}
            aria-label="Close feature tour"
            title="Skip tour (Esc)"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Explanation */}
        <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed">
          {step.description}
        </p>

        {step.hint && (
          <div className="text-[11px] font-mono text-amber-200/90 border-t border-white/10 pt-2">
            {step.hint}
          </div>
        )}

        {/* Step dots + Back / Next buttons */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1" aria-hidden="true">
            {TOUR_STEPS.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onStepChange?.();
                  setStepIdx(idx);
                }}
                aria-label={`Go to tour step ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  idx === stepIdx
                    ? 'w-5 bg-amber-300'
                    : idx < stepIdx
                      ? 'w-2 bg-sky-300/70'
                      : 'w-1.5 bg-white/20 hover:bg-white/40'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              Skip
            </button>

            {!isFirst && (
              <button
                type="button"
                onClick={goPrev}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/15 hover:bg-white/15 text-[11px] font-semibold text-slate-200 transition-colors flex items-center gap-0.5"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={goNext}
              className="px-3.5 py-1.5 rounded-lg bg-amber-400 text-[#06090f] text-xs font-bold hover:bg-amber-300 transition-colors flex items-center gap-1 whitespace-nowrap"
            >
              <span>{isLast ? 'Start Exploring' : 'Next'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
