import React, { useState } from 'react';
import { Sliders, Database, ChevronDown, Plus, SplitSquareVertical } from 'lucide-react';
import { ChronoToken, TokenizationMode, VocabEntry } from '../types/chrono';
import { ChamberFooterNote } from './ChamberFooterNote';

interface Stage1TokenizerProps {
  tokens: ChronoToken[];
  wordComparisonTokens: ChronoToken[];
  charComparisonTokens: ChronoToken[];
  tokensPerWord: number;
  tokenMode: TokenizationMode;
  onTokenModeChange: (mode: TokenizationMode) => void;
  vocabCapacity: number;
  onVocabCapacityChange: (cap: number) => void;
  vocabTable: VocabEntry[];
  customCorpus: string[];
  onAddCorpusSentence: (sentence: string) => void;
  selectedTokenIndex: number | null;
  onSelectTokenIndex: (idx: number | null) => void;
  isHighlighted?: boolean;
}

const TOKEN_CATEGORY_STYLES: Record<ChronoToken['category'], string> = {
  entity: 'border-amber-300 bg-amber-50 text-amber-950',
  action: 'border-cyan-300 bg-cyan-50 text-cyan-950',
  spatial: 'border-emerald-300 bg-emerald-50 text-emerald-950',
  temporal: 'border-sky-300 bg-sky-50 text-sky-950',
  descriptor: 'border-orange-300 bg-orange-50 text-orange-950',
  function: 'border-slate-300 bg-slate-100 text-slate-900',
  subword: 'border-amber-400 bg-amber-50/70 text-amber-950 border-dashed',
};

export const Stage1Tokenizer: React.FC<Stage1TokenizerProps> = ({
  tokens,
  wordComparisonTokens,
  charComparisonTokens,
  tokensPerWord,
  tokenMode,
  onTokenModeChange,
  vocabCapacity,
  onVocabCapacityChange,
  vocabTable,
  customCorpus,
  onAddCorpusSentence,
  selectedTokenIndex,
  onSelectTokenIndex,
  isHighlighted,
}) => {
  const [showComparison, setShowComparison] = useState(true);
  const [corpusDrawerOpen, setCorpusDrawerOpen] = useState(false);
  const [newSentence, setNewSentence] = useState('');

  const handleAddSentence = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSentence.trim();
    if (!trimmed) return;
    onAddCorpusSentence(trimmed);
    setNewSentence('');
  };

  const subwordCount = tokens.filter((t) => t.isSubword).length;
  const unknownCount = tokens.filter((t) => t.isUnknown).length;

  return (
    <section
      aria-labelledby="stage-1-heading"
      className={`rounded-2xl bg-white border transition-all duration-300 p-5 sm:p-6 shadow-xs ${
        isHighlighted
          ? 'border-amber-500 ring-2 ring-amber-400/30'
          : 'border-slate-200'
      }`}
    >
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="text-xs font-mono font-medium text-amber-700 tracking-wide">
            Stage 1 · Vocabulary & Subword Encoding
          </div>
          <h2 id="stage-1-heading" className="font-display text-xl sm:text-2xl font-semibold text-slate-900 mt-0.5">
            Temporal Tokenizer & Vocabulary Forge
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Tokenization Mode Segmented Control */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
            {(
              [
                { id: 'bpe', label: 'Subword (BPE)' },
                { id: 'word', label: 'Word-Level' },
                { id: 'char', label: 'Character-Level' },
              ] as { id: TokenizationMode; label: string }[]
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onTokenModeChange(m.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  tokenMode === m.id
                    ? 'bg-amber-600 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowComparison((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showComparison
                ? 'bg-cyan-50 text-cyan-900 border-cyan-300'
                : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5 text-cyan-600" aria-hidden="true" />
            Compare All 3 Modes
          </button>
        </div>
      </div>

      {/* Vocabulary Capacity Dial & Live Metrics */}
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between gap-4 mb-2">
            <label
              htmlFor="vocab-capacity-dial"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800"
            >
              <Sliders className="w-4 h-4 text-amber-600" aria-hidden="true" />
              Vocabulary Capacity Dial (BPE Merge Rank Limit)
            </label>
            <span className="font-mono text-sm font-bold text-amber-700">
              {vocabCapacity} <span className="text-xs font-normal text-slate-500">/ 25 merges</span>
            </span>
          </div>
          <input
            id="vocab-capacity-dial"
            type="range"
            min={1}
            max={25}
            step={1}
            value={vocabCapacity}
            onChange={(e) => onVocabCapacityChange(Number(e.target.value))}
            className="w-full chrono-slider"
          />
          <div className="flex justify-between text-[11px] font-mono text-slate-500 mt-1.5">
            <span>1 (Heavy Subword Split)</span>
            <span>12 (Balanced Roots)</span>
            <span>25 (Full Words Merged)</span>
          </div>
        </div>

        <div className="lg:col-span-5 grid grid-cols-3 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="text-[11px] text-slate-500">Token Count</div>
            <div className="font-mono text-xl font-bold text-slate-900 mt-0.5">{tokens.length}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="text-[11px] text-slate-500">Tokens / Word</div>
            <div className="font-mono text-xl font-bold text-cyan-700 mt-0.5">
              {tokensPerWord.toFixed(2)}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="text-[11px] text-slate-500">
              {tokenMode === 'word' ? 'Unknown <UNK>' : 'Subword Splits'}
            </div>
            <div className="font-mono text-xl font-bold text-amber-700 mt-0.5">
              {tokenMode === 'word' ? unknownCount : subwordCount}
            </div>
          </div>
        </div>
      </div>

      {/* Live Token Chips Strip */}
      <div className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 mb-2.5">
          <span>Active Token Sequence (showing only tokens from your input)</span>
          <span className="font-mono text-slate-500">
            Dashed border = Subword piece (`##`) · Solid = Root/Word token
          </span>
        </div>

        {tokens.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center text-sm text-slate-600">
            Type any custom phrase or sentence in the input console above to watch live tokenization.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5 p-4 rounded-xl bg-slate-50 border border-slate-200">
            {tokens.map((tok) => {
              const isSelected = selectedTokenIndex === tok.index;
              const styleClass = tok.isUnknown
                ? 'border-rose-300 bg-rose-50 text-rose-900'
                : tok.isSubword
                  ? TOKEN_CATEGORY_STYLES.subword
                  : TOKEN_CATEGORY_STYLES[tok.category];

              return (
                <button
                  key={`${tok.index}-${tok.surface}`}
                  type="button"
                  onClick={() =>
                    onSelectTokenIndex(isSelected ? null : tok.index)
                  }
                  className={`group flex flex-col items-start px-3 py-2 rounded-lg border text-left transition-all cursor-pointer ${styleClass} ${
                    isSelected
                      ? 'ring-2 ring-amber-500 scale-[1.03]'
                      : 'hover:border-amber-500'
                  }`}
                >
                  <span className="font-mono text-sm font-semibold leading-tight">
                    {tok.surface}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                    <span>#{tok.id}</span>
                    <span aria-hidden="true">·</span>
                    <span>t{tok.index}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Side-by-Side Comparison View */}
      {showComparison && tokens.length > 0 && (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-amber-800">Subword (BPE)</span>
              <span className="font-mono text-slate-500">
                {tokens.length} tokens (active)
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tokens.map((t) => (
                <span
                  key={`cmp-bpe-${t.index}`}
                  className={`px-2 py-0.5 rounded text-xs font-mono border ${
                    t.isSubword
                      ? 'border-amber-400 border-dashed text-amber-900 bg-amber-50'
                      : 'border-slate-300 text-slate-800 bg-white'
                  }`}
                >
                  {t.surface}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-rose-700">Word-Level</span>
              <span className="font-mono text-slate-500">
                {wordComparisonTokens.length} tokens · {wordComparisonTokens.filter((t) => t.isUnknown).length} &lt;UNK&gt;
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {wordComparisonTokens.map((t) => (
                <span
                  key={`cmp-word-${t.index}`}
                  className={`px-2 py-0.5 rounded text-xs font-mono border ${
                    t.isUnknown
                      ? 'border-rose-300 text-rose-800 bg-rose-50'
                      : 'border-slate-300 text-slate-800 bg-white'
                  }`}
                >
                  {t.surface}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-cyan-800">Character-Level</span>
              <span className="font-mono text-slate-500">
                {charComparisonTokens.length} tokens
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {charComparisonTokens.slice(0, 48).map((t) => (
                <span
                  key={`cmp-char-${t.index}`}
                  className="px-1.5 py-0.5 rounded text-[11px] font-mono border border-slate-300 text-slate-700 bg-white"
                >
                  {t.surface.replace('##', '')}
                </span>
              ))}
              {charComparisonTokens.length > 48 && (
                <span className="text-[11px] font-mono text-slate-500 px-1.5 py-0.5">
                  +{charComparisonTokens.length - 48} more
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expandable Mini Corpus Drawer */}
      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50">
        <button
          type="button"
          onClick={() => setCorpusDrawerOpen((prev) => !prev)}
          aria-expanded={corpusDrawerOpen}
          className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer hover:bg-slate-100/80 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-cyan-600" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-semibold text-slate-900">
              Active Input Vocabulary & Custom Corpus
            </span>
            <span className="text-xs font-mono text-slate-500">
              {vocabTable.length} unique words ({vocabTable.filter((v) => v.active).length} merged) · {customCorpus.length} custom sentences
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform ${corpusDrawerOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        {corpusDrawerOpen && (
          <div className="px-4 pb-4 pt-3 border-t border-slate-200 space-y-4 bg-white rounded-b-xl">
            <form onSubmit={handleAddSentence} className="flex flex-col sm:flex-row gap-2.5">
              <label htmlFor="custom-corpus-input" className="sr-only">
                Add custom training sentence
              </label>
              <input
                id="custom-corpus-input"
                type="text"
                value={newSentence}
                onChange={(e) => setNewSentence(e.target.value)}
                placeholder="Add your own training sentence to expand the vocabulary..."
                className="flex-1 bg-white border border-slate-300 focus:border-cyan-600 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 text-white hover:bg-cyan-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Add to Corpus
              </button>
            </form>

            {customCorpus.length > 0 && (
              <div className="text-xs text-slate-700 space-y-1">
                <div className="text-[11px] font-mono text-cyan-700 font-semibold">Custom Training Sentences Added:</div>
                <ul className="space-y-1">
                  {customCorpus.map((s, i) => (
                    <li key={i} className="font-mono text-xs text-slate-800 bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
                      “{s}”
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Vocabulary Table */}
            <div className="max-h-56 overflow-y-auto chrono-scroll rounded-lg border border-slate-200">
              {vocabTable.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No words yet. Type words in the input box above or add a custom sentence to populate your vocabulary.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-mono sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 font-medium">Rank</th>
                      <th className="px-3 py-2 font-medium">Token</th>
                      <th className="px-3 py-2 font-medium">ID</th>
                      <th className="px-3 py-2 font-medium">Category</th>
                      <th className="px-3 py-2 font-medium text-right">Freq</th>
                      <th className="px-3 py-2 font-medium text-right">Dictionary State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {vocabTable.map((entry) => (
                      <tr
                        key={`${entry.rank}-${entry.token}`}
                        className={entry.active ? 'text-slate-800 bg-white' : 'text-slate-400 bg-slate-50'}
                      >
                        <td className="px-3 py-1.5">#{entry.rank}</td>
                        <td className="px-3 py-1.5 font-semibold text-amber-800">{entry.token}</td>
                        <td className="px-3 py-1.5">#{entry.id}</td>
                        <td className="px-3 py-1.5 font-sans capitalize">{entry.kind}</td>
                        <td className="px-3 py-1.5 text-right">{entry.frequency}</td>
                        <td className="px-3 py-1.5 text-right font-sans">
                          {entry.active ? (
                            <span className="text-emerald-700 font-medium">● Active Merge</span>
                          ) : (
                            <span className="text-amber-700">▲ Split to Subwords</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      <ChamberFooterNote
        explanation="Language models cannot read raw English letters directly—they first slice text into frequent subword chunks (Byte-Pair Encoding). When vocabulary capacity shrinks, words split into reusable roots and suffixes instead of failing as unknown tokens."
        realWorldScale="GPT-4o / Llama-3 use 100,000–128,000 BPE tokens"
      />
    </section>
  );
};
