import React from 'react';
import { BookOpen, CheckCircle2, Circle, X } from 'lucide-react';
import { KID_CONCEPTS } from '../data/kidCopy';

interface NotebookDrawerProps {
  open: boolean;
  onClose: () => void;
  inspectedIds: Set<string>;
  onSelectConcept: (id: string) => void;
}

const GROUPS = [
  {
    chapter: 'Chapter 1 · Heat Blanket & Ice Mirror',
    ids: ['thermometer', 'ice', 'valve'],
  },
  {
    chapter: 'Chapter 2 · Distance & Water Vapor',
    ids: ['lever', 'vapor'],
  },
  {
    chapter: 'Chapter 3 · Red Sun & Day-Night Line',
    ids: ['starmap', 'sky', 'terminator'],
  },
];

export const NotebookDrawer: React.FC<NotebookDrawerProps> = ({
  open,
  onClose,
  inspectedIds,
  onSelectConcept,
}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Discovery Notebook"
      className="fixed inset-0 z-40 flex justify-end bg-black/50"
    >
      <div className="w-full max-w-md h-full obsidian-hud-strong border-l border-white/15 flex flex-col text-slate-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-sky-300" />
            <div>
              <h3 className="text-base font-bold text-white">Discovery Notebook</h3>
              <p className="text-xs font-mono text-slate-400 tabular-nums">
                {inspectedIds.size}/8 clues found
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Discovery Notebook"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto obs-scroll p-5 space-y-6">
          {GROUPS.map((group) => (
            <div key={group.chapter} className="space-y-2.5">
              <h4 className="text-xs font-mono text-sky-300 border-b border-white/10 pb-1.5">
                {group.chapter}
              </h4>
              <div className="space-y-2">
                {group.ids.map((id) => {
                  const item = KID_CONCEPTS[id];
                  if (!item) return null;
                  const found = inspectedIds.has(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        onSelectConcept(id);
                        onClose();
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border transition-colors ${
                        found
                          ? 'bg-white/5 border-emerald-400/35 hover:border-emerald-300/65'
                          : 'bg-black/25 border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-white">
                          {item.title}
                        </span>
                        {found ? (
                          <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Found</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                            <Circle className="w-3.5 h-3.5" />
                            <span>Tap to inspect</span>
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                        {found
                          ? item.discoveryNote
                          : 'Touch this landmark in the coastal observatory to unlock its clue.'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
