import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { StageId } from '../types/chrono';

interface GuidedTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJumpToStage: (stage: StageId) => void;
}

const TOUR_STEPS: {
  step: number;
  stageId: StageId;
  title: string;
  subtitle: string;
  body: string;
  tryThis: string;
}[] = [
  {
    step: 1,
    stageId: 'stage-1',
    title: 'Stage 1: Temporal Tokenizer & Vocabulary Forge',
    subtitle: 'Your Input → Subword Pieces → Numerical IDs',
    body: 'Neural networks cannot process raw text strings. They split your sentence into subword pieces using Byte-Pair Encoding (BPE) and assign each piece an integer ID. Subword splitting prevents unknown-word failures while keeping sequence lengths compact.',
    tryThis: 'Type any custom sentence, then drag the Vocabulary Capacity Dial down toward 1 to watch your own words split into reusable subword chunks live.',
  },
  {
    step: 2,
    stageId: 'stage-2',
    title: 'Stage 2: Semantic Embedding Chamber',
    subtitle: 'Token IDs → Custom N-D Vectors → 3D Projection',
    body: 'Every Token ID looks up a vector of floating-point coordinates across your chosen embedding dimensions. Identical tokens always share identical vectors, and rotating the 3D projection lets you inspect cosine similarity between your words.',
    tryThis: 'Adjust the Embedding Dimensions slider or exact input (3D to 16D), then drag the 3D projection to compare cosine similarity across the tokens you entered.',
  },
  {
    step: 3,
    stageId: 'stage-3',
    title: 'Stage 3: Causal Attention Web & Matrix',
    subtitle: 'Context Gathering & Lower-Triangular Mask',
    body: 'Self-attention lets each token inspect earlier tokens to resolve meaning—for example, linking pronouns or verbs back to their subjects. Future tokens are strictly masked out so the model never peeks ahead.',
    tryThis: 'Switch between the three Attention Heads and hover any token node in your sentence to see causal attention beams light up backward.',
  },
  {
    step: 4,
    stageId: 'stage-4',
    title: 'Stage 4: Quantum Probability Horizon',
    subtitle: 'Logits → Custom Temperature → Top-K / Top-P Cutoffs',
    body: 'The final hidden state scores candidate tokens from your active vocabulary. Temperature controls sharpness (low = focused, high = flat), while Top-K and Top-P trim away unlikely tail candidates.',
    tryThis: 'Slide or type a custom Temperature (0.05 to 3.00) to reshape the probability bars, or click any candidate branch directly to force an alternate continuation.',
  },
  {
    step: 5,
    stageId: 'stage-5',
    title: 'Stage 5: Autoregressive Timeline Weaver',
    subtitle: 'Sample Token → Append → Repeat Pipeline',
    body: 'One winning token is sampled from the active horizon, appended to your prompt, and fed right back into Stage 1. Repeating this loop weaves sequences one token at a time.',
    tryThis: 'Press "Step +1 Token" or "Auto-Weave 10 Tokens" after entering a few words or adding custom corpus sentences.',
  },
];

export const GuidedTourModal: React.FC<GuidedTourModalProps> = ({
  isOpen,
  onClose,
  onJumpToStage,
}) => {
  const [stepIdx, setStepIdx] = useState(0);

  if (!isOpen) return null;

  const current = TOUR_STEPS[stepIdx];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guided-tour-title"
    >
      <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-xs font-mono font-medium text-amber-700">
              Guided Time-Jump Tour · Step {current.step} of {TOUR_STEPS.length}
            </div>
            <h3 id="guided-tour-title" className="font-display text-lg font-semibold text-slate-900 mt-0.5">
              {current.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Guided Tour"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="text-xs font-mono font-semibold text-cyan-700">{current.subtitle}</div>
          <p className="text-sm text-slate-700 leading-relaxed">{current.body}</p>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs sm:text-sm text-amber-950 leading-relaxed">
            <span className="font-semibold text-amber-900 mr-1.5">Try this experiment:</span>
            {current.tryThis}
          </div>

          {/* Step Dots */}
          <div className="flex items-center justify-center gap-2 pt-1">
            {TOUR_STEPS.map((s, idx) => (
              <button
                key={s.step}
                type="button"
                onClick={() => setStepIdx(idx)}
                aria-label={`Go to tour step ${s.step}`}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === stepIdx ? 'w-7 bg-amber-600' : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              onJumpToStage(current.stageId);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 hover:text-cyan-800 cursor-pointer"
          >
            Inspect Chamber Now
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={stepIdx === 0}
              onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-white text-slate-700 border border-slate-300 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
              Back
            </button>
            {stepIdx < TOUR_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStepIdx((i) => Math.min(TOUR_STEPS.length - 1, i + 1))}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-500 cursor-pointer"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 text-white hover:bg-cyan-500 cursor-pointer"
              >
                Finish Tour
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
