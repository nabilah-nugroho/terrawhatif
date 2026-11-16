import React from 'react';

interface HudCornersProps {
  tone?: 'amber' | 'mint' | 'sky';
  className?: string;
}

const CORNER_TONE: Record<NonNullable<HudCornersProps['tone']>, string> = {
  amber: 'text-amber-400/80',
  mint: 'text-emerald-300/80',
  sky: 'text-sky-300/80',
};

export const HudCorners: React.FC<HudCornersProps> = ({ tone = 'amber', className = '' }) => {
  const color = CORNER_TONE[tone];
  const base = `pointer-events-none select-none absolute font-mono text-[11px] leading-none ${color} ${className}`;
  return (
    <>
      <span aria-hidden="true" className={`${base} top-1 left-1.5`}>+</span>
      <span aria-hidden="true" className={`${base} top-1 right-1.5`}>+</span>
      <span aria-hidden="true" className={`${base} bottom-1 left-1.5`}>+</span>
      <span aria-hidden="true" className={`${base} bottom-1 right-1.5`}>+</span>
    </>
  );
};

interface SectionCodeTagProps {
  label: string;
  tone?: 'amber' | 'mint' | 'sky';
}

const TAG_TONE: Record<NonNullable<SectionCodeTagProps['tone']>, string> = {
  amber: 'border-amber-400/60 text-amber-300 bg-amber-500/8',
  mint: 'border-emerald-400/60 text-emerald-300 bg-emerald-500/8',
  sky: 'border-sky-400/55 text-sky-200 bg-sky-500/8',
};

export const SectionCodeTag: React.FC<SectionCodeTagProps> = ({ label, tone = 'amber' }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-[3px] border text-[10px] font-mono font-semibold uppercase tracking-[0.12em] whitespace-nowrap ${TAG_TONE[tone]}`}
  >
    {label}
  </span>
);

interface SegmentedGaugeProps {
  valuePct: number;
  segments?: number;
  tone?: 'cyan' | 'emerald' | 'amber' | 'rose';
  className?: string;
}

const LIT_CELL_CLASS: Record<NonNullable<SegmentedGaugeProps['tone']>, string> = {
  cyan: 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.5)]',
  emerald: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]',
  amber: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]',
  rose: 'bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.5)]',
};

export const SegmentedGauge: React.FC<SegmentedGaugeProps> = ({
  valuePct,
  segments = 16,
  tone = 'emerald',
  className = '',
}) => {
  const clamped = Math.max(0, Math.min(100, valuePct));
  const activeCount = Math.max(1, Math.round((clamped / 100) * segments));

  return (
    <div
      aria-hidden="true"
      className={`flex items-center gap-[2px] ${className}`}
    >
      {Array.from({ length: segments }).map((_, idx) => {
        const isLit = idx < activeCount;
        return (
          <span
            key={idx}
            className={`w-[4px] h-[10px] rounded-[1px] transition-colors duration-200 ${
              isLit ? LIT_CELL_CLASS[tone] : 'bg-amber-500/15'
            }`}
          />
        );
      })}
    </div>
  );
};
