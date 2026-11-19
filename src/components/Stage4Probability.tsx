import React from 'react';
import { Flame, Filter, GitBranch, Lock } from 'lucide-react';
import { CandidateToken } from '../types/chrono';
import { ChamberFooterNote } from './ChamberFooterNote';

interface Stage4ProbabilityProps {
  candidates: CandidateToken[];
  temperature: number;
  onTemperatureChange: (t: number) => void;
  topK: number;
  onTopKChange: (k: number) => void;
  topP: number;
  onTopPChange: (p: number) => void;
  entropyBits: number;
  onForceBranch: (token: string) => void;
  isHighlighted?: boolean;
}

export const Stage4Probability: React.FC<Stage4ProbabilityProps> = ({
  candidates,
  temperature,
  onTemperatureChange,
  topK,
  onTopKChange,
  topP,
  onTopPChange,
  entropyBits,
  onForceBranch,
  isHighlighted,
}) => {
  const tempRegime =
    temperature <= 0.45
      ? 'Deterministic · Sharp Peak'
      : temperature >= 1.25
        ? 'Exploratory · Flat Horizon'
        : 'Balanced · Natural Flow';

  const eligibleCount = candidates.filter((c) => c.isEligible).length;

  return (
    <section
      aria-labelledby="stage-4-heading"
      className={`rounded-2xl bg-white border transition-all duration-300 p-5 sm:p-6 shadow-xs ${
        isHighlighted
          ? 'border-amber-500 ring-2 ring-amber-400/30'
          : 'border-slate-200'
      }`}
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="text-xs font-mono font-medium text-amber-700 tracking-wide">
            Stage 4 · Next-Token Logits & Nucleus Sampling Filter
          </div>
          <h2 id="stage-4-heading" className="font-display text-xl sm:text-2xl font-semibold text-slate-900 mt-0.5">
            Quantum Probability Horizon
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="text-slate-700">
            Active Branches:{' '}
            <span className="font-semibold text-cyan-700">
              {eligibleCount} / {candidates.length}
            </span>
          </div>
          <div className="text-slate-700">
            Shannon Entropy:{' '}
            <span className="font-semibold text-amber-700">{entropyBits.toFixed(2)} bits</span>
          </div>
        </div>
      </div>

      {/* Live Sampling Controls */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Customizable Temperature */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <label
              htmlFor="temperature-slider"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800"
            >
              <Flame className="w-4 h-4 text-amber-600" aria-hidden="true" />
              Temperature
            </label>
            <div className="flex items-center gap-1.5">
              <label htmlFor="temperature-number-input" className="sr-only">
                Exact temperature value
              </label>
              <input
                id="temperature-number-input"
                type="number"
                min={0.05}
                max={3.0}
                step={0.05}
                value={temperature}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!Number.isNaN(val)) {
                    onTemperatureChange(Math.max(0.05, Math.min(3.0, val)));
                  }
                }}
                className="w-16 px-2 py-0.5 rounded border border-slate-300 bg-white font-mono text-xs font-bold text-amber-700 text-right focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
          <input
            id="temperature-slider"
            type="range"
            min={0.05}
            max={3.0}
            step={0.05}
            value={temperature}
            onChange={(e) => onTemperatureChange(Number(e.target.value))}
            className="w-full chrono-slider"
          />
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mt-1.5">
            <span>0.05</span>
            <span className="text-amber-700 font-sans font-medium">{tempRegime}</span>
            <span>3.00</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            {[0.2, 0.7, 1.2, 2.0].map((tVal) => (
              <button
                key={tVal}
                type="button"
                onClick={() => onTemperatureChange(tVal)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                  Math.abs(temperature - tVal) < 0.01
                    ? 'bg-amber-600 text-white border-amber-600 font-semibold'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-amber-400'
                }`}
              >
                {tVal.toFixed(2)}
              </button>
            ))}
          </div>
        </div>

        {/* Top-K */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label
                htmlFor="topk-slider"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800"
              >
                <Filter className="w-4 h-4 text-cyan-600" aria-hidden="true" />
                Top-K Cutoff
              </label>
              <span className="font-mono text-sm font-bold text-cyan-700">
                K = {topK}
              </span>
            </div>
            <input
              id="topk-slider"
              type="range"
              min={1}
              max={10}
              step={1}
              value={topK}
              onChange={(e) => onTopKChange(Number(e.target.value))}
              className="w-full chrono-slider cyan"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-500 mt-1.5">
              <span>1 (Greedy)</span>
              <span>5</span>
              <span>10 (All Top)</span>
            </div>
          </div>
        </div>

        {/* Top-P Nucleus */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label
                htmlFor="topp-slider"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800"
              >
                <Filter className="w-4 h-4 text-cyan-600" aria-hidden="true" />
                Top-P (Nucleus)
              </label>
              <span className="font-mono text-sm font-bold text-cyan-700">
                P = {topP.toFixed(2)}
              </span>
            </div>
            <input
              id="topp-slider"
              type="range"
              min={0.1}
              max={1.0}
              step={0.05}
              value={topP}
              onChange={(e) => onTopPChange(Number(e.target.value))}
              className="w-full chrono-slider cyan"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-500 mt-1.5">
              <span>0.10 (Tight)</span>
              <span>0.90</span>
              <span>1.00 (Full)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Timeline Branches */}
      <div className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 mb-3">
          <span>Candidate Next Tokens from Your Vocabulary (click any branch to continue in Stage 5)</span>
          <span className="font-mono">Raw Logit · Softmax % · Cumulative %</span>
        </div>

        {candidates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center text-sm text-slate-600">
            Enter words in the input console above (or add sentences in Stage 1’s corpus drawer) to compute next-token probabilities from your vocabulary.
          </div>
        ) : (
          <div className="space-y-2">
            {candidates.map((cand, idx) => {
              const pct = cand.probability * 100;
              const maxPct = Math.max(1, (candidates[0]?.probability || 0.25) * 100);
              const barWidth = Math.min(100, (pct / maxPct) * 100);
              const maskedReason = !cand.inTopK
                ? 'Masked (Top-K)'
                : !cand.inTopP
                  ? 'Masked (Top-P)'
                  : null;

              return (
                <button
                  key={cand.token}
                  type="button"
                  onClick={() => onForceBranch(cand.token)}
                  className={`w-full text-left rounded-xl border px-3.5 py-2.5 transition-all cursor-pointer group ${
                    cand.isEligible
                      ? idx === 0
                        ? 'bg-amber-50/80 border-amber-300 hover:border-amber-500'
                        : 'bg-slate-50 border-slate-200 hover:border-cyan-500 hover:bg-white'
                      : 'bg-slate-100/80 border-slate-200 opacity-60 hover:opacity-90'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-xs text-slate-400 w-5">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span
                        className={`font-mono text-sm font-semibold ${
                          cand.isEligible ? 'text-slate-900' : 'text-slate-500 line-through'
                        }`}
                      >
                        {cand.token}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">#{cand.id}</span>
                      <span className="text-xs text-slate-600 hidden sm:inline truncate">
                        · {cand.contextCue}
                      </span>
                      {cand.isCustomCorpusBoosted && (
                        <span className="text-[11px] font-mono text-cyan-700 font-medium">
                          · Corpus Boosted
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 font-mono text-xs shrink-0">
                      {maskedReason ? (
                        <span className="inline-flex items-center gap-1 text-slate-500 text-[11px]">
                          <Lock className="w-3 h-3" aria-hidden="true" />
                          {maskedReason}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-cyan-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity text-[11px]">
                          <GitBranch className="w-3 h-3" aria-hidden="true" />
                          Branch Here
                        </span>
                      )}
                      <span className="text-slate-500">z={cand.logit.toFixed(2)}</span>
                      <span
                        className={`font-bold w-14 text-right ${
                          idx === 0 && cand.isEligible
                            ? 'text-amber-700'
                            : cand.isEligible
                              ? 'text-cyan-700'
                              : 'text-slate-400'
                        }`}
                      >
                        {pct.toFixed(1)}%
                      </span>
                      <span className="text-slate-500 w-16 text-right hidden md:inline">
                        Σ {(cand.cumulativeProb * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Probability Energy Bar */}
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${
                        !cand.isEligible
                          ? 'bg-slate-400'
                          : idx === 0
                            ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                            : 'bg-gradient-to-r from-cyan-700 to-cyan-500'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <ChamberFooterNote
        explanation="After attention mixes context, the model scores candidate tokens from your vocabulary and converts them into probabilities via Softmax. Customize Temperature (0.05–3.00) to sharpen or flatten the curve, while Top-K and Top-P trim away tail candidates."
        realWorldScale="Real models score 50,000–128,000+ candidate tokens every step"
      />
    </section>
  );
};
