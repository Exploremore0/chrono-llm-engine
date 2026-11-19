import React from 'react';
import { StepForward, FastForward, Square, Undo2, Sparkles } from 'lucide-react';
import { CandidateToken, WeaveStepRecord } from '../types/chrono';
import { ChamberFooterNote } from './ChamberFooterNote';

interface Stage5WeaverProps {
  basePrompt: string;
  currentPrompt: string;
  weaveHistory: WeaveStepRecord[];
  candidates: CandidateToken[];
  isAutoWeaving: boolean;
  autoWeaveRemaining: number;
  onStepOne: () => void;
  onAutoWeave10: () => void;
  onStopAutoWeave: () => void;
  onRewindStep: () => void;
  onForceBranch: (token: string) => void;
  isHighlighted?: boolean;
}

export const Stage5Weaver: React.FC<Stage5WeaverProps> = ({
  basePrompt,
  currentPrompt,
  weaveHistory,
  candidates,
  isAutoWeaving,
  autoWeaveRemaining,
  onStepOne,
  onAutoWeave10,
  onStopAutoWeave,
  onRewindStep,
  onForceBranch,
  isHighlighted,
}) => {
  const latestStep = weaveHistory.length > 0 ? weaveHistory[weaveHistory.length - 1] : null;
  const quickBranches = candidates.slice(0, 5);
  const canGenerate = candidates.length > 0;

  return (
    <section
      aria-labelledby="stage-5-heading"
      className={`rounded-2xl bg-white border transition-all duration-300 p-5 sm:p-6 shadow-xs ${
        isHighlighted
          ? 'border-amber-500 ring-2 ring-amber-400/30'
          : 'border-slate-200'
      }`}
    >
      {/* Header & Time-Jump Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="text-xs font-mono font-medium text-amber-700 tracking-wide">
            Stage 5 · Autoregressive Feedback Loop
          </div>
          <h2 id="stage-5-heading" className="font-display text-xl sm:text-2xl font-semibold text-slate-900 mt-0.5">
            Autoregressive Timeline Weaver
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onStepOne}
            disabled={isAutoWeaving || !canGenerate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-45 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <StepForward className="w-3.5 h-3.5" aria-hidden="true" />
            Step +1 Token
          </button>

          {!isAutoWeaving ? (
            <button
              type="button"
              onClick={onAutoWeave10}
              disabled={!canGenerate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-45 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FastForward className="w-3.5 h-3.5" aria-hidden="true" />
              Auto-Weave 10 Tokens
            </button>
          ) : (
            <button
              type="button"
              onClick={onStopAutoWeave}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              Stop Weaving ({10 - autoWeaveRemaining}/10)
            </button>
          )}

          <button
            type="button"
            onClick={onRewindStep}
            disabled={weaveHistory.length === 0 || isAutoWeaving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white text-slate-700 border border-slate-300 hover:border-amber-400 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
            Rewind -1
          </button>
        </div>
      </div>

      {/* Live Sentence Weaver Display */}
      <div className="mt-5 rounded-xl bg-slate-50 border border-slate-200 p-5">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
          <span>Woven Output Timeline (gold tokens were generated and fed back into Stage 1)</span>
          <span className="font-mono font-semibold text-amber-700">
            {weaveHistory.length} generated {weaveHistory.length === 1 ? 'token' : 'tokens'}
          </span>
        </div>

        <p className="text-lg sm:text-xl leading-relaxed font-sans text-slate-900 break-words">
          {weaveHistory.length === 0 && !currentPrompt.trim() ? (
            <span className="text-slate-400 text-base">
              Enter your own words above to start weaving...
            </span>
          ) : (
            <span>{weaveHistory.length === 0 ? currentPrompt : basePrompt.trimEnd()}</span>
          )}
          {weaveHistory.map((step, idx) => {
            const isLatest = idx === weaveHistory.length - 1;
            return (
              <span
                key={`woven-${step.stepNumber}-${step.token}`}
                className={`inline-block ml-1.5 px-2 py-0.5 rounded-md font-semibold transition-all ${
                  isLatest
                    ? 'bg-amber-200 text-amber-950 border border-amber-500 shadow-xs'
                    : 'bg-amber-100/80 text-amber-900 border border-amber-300'
                }`}
              >
                {step.token}
              </span>
            );
          })}
          {!isAutoWeaving && weaveHistory.length === 0 && canGenerate && (
            <span className="inline-block ml-2 px-2 py-0.5 rounded-md border border-dashed border-cyan-500/60 text-cyan-700 text-sm font-mono">
              [next token]
            </span>
          )}
        </p>

        {/* Explanation of Why Winning Token Won */}
        <div className="mt-4 pt-4 border-t border-slate-200 flex items-start gap-2.5 text-xs sm:text-sm">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          {latestStep ? (
            <div className="text-slate-700">
              <span className="font-semibold text-amber-800 mr-1.5">Why "{latestStep.token}" won:</span>
              <span>{latestStep.reason}</span>
            </div>
          ) : canGenerate ? (
            <div className="text-slate-600">
              Click <span className="text-amber-700 font-semibold">Step +1 Token</span>,{' '}
              <span className="text-cyan-700 font-semibold">Auto-Weave 10 Tokens</span>, or click any
              candidate branch below or in Stage 4 to advance the timeline.
            </div>
          ) : (
            <div className="text-slate-500">
              Write a few words in the input box above (or add sentences in Stage 1’s corpus drawer) to enable autoregressive weaving.
            </div>
          )}
        </div>
      </div>

      {/* Quick Click-to-Branch Bar */}
      {quickBranches.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-600 mr-1">Click-to-Branch Alternate Timeline:</span>
          {quickBranches.map((cand) => (
            <button
              key={`quick-branch-${cand.token}`}
              type="button"
              disabled={isAutoWeaving}
              onClick={() => onForceBranch(cand.token)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-slate-50 border border-slate-200 text-slate-800 hover:border-cyan-500 hover:text-cyan-800 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <span>{cand.token}</span>
              <span className="text-slate-500">{(cand.probability * 100).toFixed(1)}%</span>
            </button>
          ))}
        </div>
      )}

      {/* Autoregressive Step History Table */}
      {weaveHistory.length > 0 && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 flex items-center justify-between">
            <span>Autoregressive Generation Trail</span>
            <span className="font-mono font-normal text-slate-500">Latest token feeds back into Stage 1</span>
          </div>
          <div className="max-h-48 overflow-y-auto chrono-scroll">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-mono sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 font-medium">Step</th>
                  <th className="px-3 py-2 font-medium">Chosen Token</th>
                  <th className="px-3 py-2 font-medium text-right">Raw Prob</th>
                  <th className="px-3 py-2 font-medium text-right">Temp</th>
                  <th className="px-3 py-2 font-medium text-right">Roll</th>
                  <th className="px-3 py-2 font-medium text-right">Branch Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {[...weaveHistory].reverse().map((step) => (
                  <tr key={step.stepNumber} className="text-slate-800">
                    <td className="px-3 py-2 text-slate-500">#{step.stepNumber}</td>
                    <td className="px-3 py-2 font-semibold text-amber-800">{step.token}</td>
                    <td className="px-3 py-2 text-right text-cyan-700 font-medium">
                      {(step.probability * 100).toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-right">{step.temperature.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {step.mode === 'forced' ? 'manual' : step.rollValue.toFixed(3)}
                    </td>
                    <td className="px-3 py-2 text-right font-sans">
                      {step.mode === 'forced' ? (
                        <span className="text-cyan-700 font-medium">Forced Branch</span>
                      ) : (
                        <span className="text-emerald-700 font-medium">Quantum Sample</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ChamberFooterNote
        explanation="LLMs generate entire paragraphs one token at a time. Once a single token is sampled from the probability horizon, it is glued onto the end of the prompt and the entire sequence runs back through Stages 1 → 4 again—a loop called autoregressive generation."
        realWorldScale="Real models repeat this full forward pass for every single token generated"
      />
    </section>
  );
};
