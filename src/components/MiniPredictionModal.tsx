import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, HelpCircle, Lightbulb, Sparkles, X } from 'lucide-react';
import { CH2 } from '../engine/chapters.js';

interface MiniPredictionModalProps {
  open: boolean;
  stage: 'CH1' | 'CH2' | 'CH3';
  onClose: () => void;
  onAnswered?: (stage: 'CH1' | 'CH2' | 'CH3') => void;
  onCorrect?: () => void;
  onWrong?: () => void;
}

interface QuizOption {
  id: string;
  label: string;
  correct: boolean;
  headline: string;
  explanation: string;
  tip?: string;
}

interface ChapterQuiz {
  eyebrow: string;
  question: string;
  prompt: string;
  unlockedTitle: string;
  unlockedAction: string;
  ctaLabel: string;
  options: QuizOption[];
}

const QUIZZES: Record<'CH1' | 'CH2' | 'CH3', ChapterQuiz> = {
  CH1: {
    eyebrow: 'Chapter 1 · Quick Prediction',
    question: 'What happens if Earth loses ALL its greenhouse gases?',
    prompt: 'Sunlight keeps shining at 1.00 AU, but we remove the Heat Blanket completely:',
    unlockedTitle: 'Heat Blanket Rule Unlocked!',
    unlockedAction:
      'Try toggling "Earth Without Air" or sliding CO₂ past 560 ppm to watch the +33°C difference in 3D!',
    ctaLabel: 'Test CO₂ in 3D!',
    options: [
      {
        id: 'stay',
        label: 'It stays cozy at +15°C because sunlight warms the ground.',
        correct: false,
        headline: 'Sunlight alone isn’t enough!',
        explanation:
          'Without greenhouse gases, warmth absorbed by the oceans leaks straight back out into cold space. Sunlight at 1.00 AU can only keep a bare rock around -18°C!',
        tip: 'Hint: Earth’s atmosphere adds roughly +33°C of extra warmth.',
      },
      {
        id: 'freeze',
        label: 'It plunges ~33°C colder to -18°C, freezing Earth’s oceans!',
        correct: true,
        headline: 'Spot on! The Heat Blanket keeps oceans liquid!',
        explanation:
          'Greenhouse gases act like a winter blanket—slowing outgoing infrared heat without blocking sunlight. Losing them drops Earth by 33°C into a frozen ice world!',
      },
      {
        id: 'hotter',
        label: 'It gets hotter because sunlight enters faster without air.',
        correct: false,
        headline: 'Greenhouse gases don’t block incoming sunlight!',
        explanation:
          'Visible sunlight passes right through clear air either way. What greenhouse gases actually catch is invisible infrared heat trying to escape upward!',
        tip: 'Pick what happens when Earth loses its heat-trapping blanket.',
      },
    ],
  },
  CH2: {
    eyebrow: 'Chapter 2 · Quick Prediction',
    question: 'What happens if we scoot 15% closer to the Sun?',
    prompt: 'If we push Earth from 1.00 AU to 0.85 AU, take a guess before you pull the rocket lever:',
    unlockedTitle: 'Ready to Test It in 3D!',
    unlockedAction:
      'Now slide the Orbit rocket down to 0.85 AU and watch the ocean mist & temperature gauge climb in real time!',
    ctaLabel: 'Try 0.85 AU Now!',
    options: [
      {
        id: 'linear',
        label: CH2.miniPrediction.options[0].label,
        correct: false,
        headline: 'Why 15% closer does NOT mean 15% warmer:',
        explanation:
          'Imagine shining a flashlight on a wall: step closer and the light circle shrinks, squeezing 38% more brightness into each spot (1 ÷ 0.85² = 1.38×!). On top of that, warming air traps extra steam, so temperature and distance don’t move 1-for-1.',
        tip: 'Look for the option mentioning 38% more sunlight!',
      },
      {
        id: 'flux',
        label: CH2.miniPrediction.options[1].label,
        correct: true,
        headline: 'Why this is right (The Flashlight Rule):',
        explanation:
          'Moving 15% closer packs 38% more sunlight onto every meter of ocean (1 ÷ 0.85²). Temperature rises more gently at first, then warmer air scoops up extra water vapor—multiplying the warming!',
      },
      {
        id: 'same',
        label: CH2.miniPrediction.options[2].label,
        correct: false,
        headline: 'Why Earth’s air can’t block a 38% sunlight jump:',
        explanation:
          'Think of stepping closer to a campfire—you immediately feel more heat hitting your jacket! Earth’s atmosphere controls how fast heat escapes, so a huge jump in incoming sunlight still heats the surface dramatically.',
        tip: 'Pick the answer that pairs 38% stronger sunlight with a gentler initial rise!',
      },
    ],
  },
  CH3: {
    eyebrow: 'Chapter 3 · Quick Prediction',
    question: 'Where must a planet orbit dim red star TRAPPIST-1 for liquid oceans?',
    prompt: 'TRAPPIST-1 shines nearly 2,000× dimmer than our Sun. Where is its Habitable Zone?',
    unlockedTitle: 'Campfire Star Rule Unlocked!',
    unlockedAction:
      'Switch Host Star to TRAPPIST-1 and watch the tiny star pull its green Habitable Zone way inward!',
    ctaLabel: 'Explore TRAPPIST-1!',
    options: [
      {
        id: 'oneau',
        label: 'At 1.00 AU, the exact same distance as Earth.',
        correct: false,
        headline: 'Way too cold at 1.00 AU!',
        explanation:
          'Trading our Sun for a tiny red dwarf is like swapping a giant bonfire for a small campfire. Standing at the same 1.00 AU distance leaves the planet frozen in deep dark!',
        tip: 'To stay warm around a dim campfire, should the planet scoot closer or farther?',
      },
      {
        id: 'close',
        label: 'About 34× closer (~0.029 AU), hugging tight to the dim star.',
        correct: true,
        headline: 'Exactly right! Dim stars pull the Cozy Zone inward!',
        explanation:
          'Because TRAPPIST-1 gives off far less light, a planet must orbit ~0.029 AU—so close that a whole year lasts just 6 days, and gravity locks one side in permanent day!',
      },
      {
        id: 'far',
        label: 'Much farther out (2.0 AU) to avoid red light.',
        correct: false,
        headline: 'Moving farther out cuts starlight even more!',
        explanation:
          'Starlight weakens with distance squared (1/d²). Moving out to 2.0 AU around an already dim red star freezes every drop of water rock-solid.',
        tip: 'Try the closer orbit option!',
      },
    ],
  },
};

export const MiniPredictionModal: React.FC<MiniPredictionModalProps> = ({
  open,
  stage,
  onClose,
  onAnswered,
  onCorrect,
  onWrong,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shakeId, setShakeId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedId(null);
    setShakeId(null);
  }, [stage, open]);

  if (!open) return null;

  const quiz = QUIZZES[stage];
  const chosen = quiz.options.find((o) => o.id === selectedId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={quiz.question}
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60"
    >
      <div className="w-full max-w-lg obsidian-hud-strong rounded-2xl p-6 text-slate-100 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto obs-scroll">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-amber-300">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{quiz.eyebrow}</span>
            </div>
            <h3 className="text-xl font-bold text-white mt-1">{quiz.question}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close prediction modal"
            className="p-2 -mr-2 -mt-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-slate-200 leading-relaxed">{quiz.prompt}</p>

        <div className="space-y-2.5">
          {quiz.options.map((opt) => {
            const isPicked = selectedId === opt.id;
            const isShaking = shakeId === opt.id;
            let borderClass = 'border-white/15 hover:border-white/35 bg-white/5';
            if (isPicked) {
              borderClass = opt.correct
                ? 'border-emerald-300 bg-emerald-500/20 shadow-[0_0_24px_rgba(52,211,153,0.35)]'
                : 'border-rose-400/80 bg-rose-500/15';
            }

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setSelectedId(opt.id);
                  if (opt.correct) {
                    setShakeId(null);
                    onCorrect?.();
                    onAnswered?.(stage);
                  } else {
                    setShakeId(null);
                    requestAnimationFrame(() => setShakeId(opt.id));
                    onWrong?.();
                  }
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition-all text-sm ${borderClass} ${
                  isShaking ? 'animate-[shake_0.36s_ease-in-out]' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-white">{opt.label}</span>
                  {isPicked && opt.correct && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/25 border border-emerald-300/50 text-[11px] font-bold text-emerald-100 shrink-0">
                      <Sparkles className="w-3 h-3" />
                      <span>Correct!</span>
                    </span>
                  )}
                  {isPicked && !opt.correct && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-400/20 border border-rose-300/45 text-[11px] font-bold text-rose-200 shrink-0">
                      <AlertCircle className="w-3 h-3" />
                      <span>Not quite</span>
                    </span>
                  )}
                </div>

                {isPicked && (
                  <div
                    className={`mt-2.5 pt-2 border-t text-xs leading-relaxed space-y-1 ${
                      opt.correct
                        ? 'border-emerald-300/25 text-emerald-100'
                        : 'border-rose-300/25 text-rose-100'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                      <span>{opt.headline}</span>
                    </div>
                    <p>{opt.explanation}</p>
                    {opt.tip && (
                      <p className="text-amber-200 font-semibold pt-0.5">{opt.tip}</p>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {chosen?.correct && (
          <div className="p-3.5 rounded-xl bg-emerald-950/55 border border-emerald-400/40 text-xs text-emerald-100 leading-relaxed space-y-1.5">
            <div className="flex items-center gap-1.5 font-mono text-emerald-300 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{quiz.unlockedTitle}</span>
            </div>
            <p>{quiz.unlockedAction}</p>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-colors ${
              chosen?.correct
                ? 'bg-emerald-500/30 border-emerald-300/60 text-white hover:bg-emerald-500/40'
                : 'bg-sky-400/25 text-white border-sky-300/45 hover:bg-sky-400/35'
            }`}
          >
            {chosen?.correct ? quiz.ctaLabel : 'Back to Observatory'}
          </button>
        </div>
      </div>
    </div>
  );
};


