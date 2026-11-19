import React, { useState, useRef, useEffect } from 'react';
import {
  Clock,
  Compass,
  Download,
  RotateCcw,
  ChevronDown,
  Play,
  Layers,
} from 'lucide-react';
import { AttentionHeadId, PresetPrompt, StageId } from '../types/chrono';

interface ChronometerHeaderProps {
  prompt: string;
  onPromptChange: (val: string) => void;
  onIgnitePipeline: () => void;
  isIgniting: boolean;
  activeStage: StageId;
  onStageSelect: (stage: StageId) => void;
  presets: PresetPrompt[];
  onSelectPreset: (preset: PresetPrompt) => void;
  onOpenTour: () => void;
  onExportJson: () => void;
  onResetAll: () => void;
  // Telemetry values
  tokenCount: number;
  activeVocabSize: number;
  vocabCapacity: number;
  activeHead: AttentionHeadId;
  temperature: number;
  timelineConfidence: number;
}

const STAGE_TABS: { id: StageId; label: string; short: string }[] = [
  { id: 'all', label: 'All 5 Stages', short: 'All Stages' },
  { id: 'stage-1', label: '1. Tokenizer Forge', short: '1. Tokenizer' },
  { id: 'stage-2', label: '2. 8D/3D Embeddings', short: '2. Embeddings' },
  { id: 'stage-3', label: '3. Causal Attention', short: '3. Attention' },
  { id: 'stage-4', label: '4. Probability Horizon', short: '4. Horizon' },
  { id: 'stage-5', label: '5. Timeline Weaver', short: '5. Weaver' },
];

export const ChronometerHeader: React.FC<ChronometerHeaderProps> = ({
  prompt,
  onPromptChange,
  onIgnitePipeline,
  isIgniting,
  activeStage,
  onStageSelect,
  presets,
  onSelectPreset,
  onOpenTour,
  onExportJson,
  onResetAll,
  tokenCount,
  activeVocabSize,
  vocabCapacity,
  activeHead,
  temperature,
  timelineConfidence,
}) => {
  const [presetOpen, setPresetOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setPresetOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const headDisplay =
    activeHead === 'syntax'
      ? '3 Active · Syntax'
      : activeHead === 'entity'
        ? '3 Active · Entity'
        : '3 Active · Temporal';

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-xs">
      {/* Top Action Bar */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg border border-amber-300 bg-amber-50 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-600" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap truncate">
              Chrono-LLM: Temporal Neural Engine
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block truncate">
              Interactive AI Time-Machine Lab · Client-Side Transformer Telemetry
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenTour}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
          >
            <Compass className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
            Guided Time-Jump Tour
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setPresetOpen((prev) => !prev)}
              aria-expanded={presetOpen}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white text-slate-800 border border-slate-300 hover:border-cyan-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-600"
            >
              Timeline Presets
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 transition-transform ${presetOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>

            {presetOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white border border-slate-200 shadow-xl p-1.5 z-50">
                {presets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelectPreset(p);
                      setPresetOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 transition-colors flex flex-col gap-0.5 cursor-pointer"
                  >
                    <span className="text-xs font-medium text-slate-900 leading-snug">
                      “{p.prompt}”
                    </span>
                    <span className="text-[11px] font-mono text-amber-700">{p.eraTag}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onExportJson}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white text-slate-800 border border-slate-300 hover:border-cyan-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-600"
          >
            <Download className="w-3.5 h-3.5 text-cyan-600" aria-hidden="true" />
            Export Telemetry (JSON)
          </button>

          <button
            type="button"
            onClick={onResetAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white text-slate-700 border border-slate-300 hover:text-amber-700 hover:border-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Reset Chronometer
          </button>
        </div>
      </div>

      {/* Live Telemetry Gauges Strip */}
      <div className="border-t border-slate-200 bg-slate-50/90">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-500">Temporal Tokens</span>
            <span className="font-mono text-sm font-semibold text-amber-700">
              {tokenCount} <span className="text-xs font-normal text-slate-500">tokens</span>
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-500">Vocab Capacity</span>
            <span className="font-mono text-sm font-semibold text-cyan-700">
              {vocabCapacity} <span className="text-xs font-normal text-slate-500">BPE ({activeVocabSize} active)</span>
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-500">Embedding Dimensions</span>
            <span className="font-mono text-sm font-semibold text-slate-900">8D → 3D</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-500">Attention Heads</span>
            <span className="font-mono text-sm font-semibold text-cyan-700 truncate">{headDisplay}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-500">Temperature</span>
            <span className="font-mono text-sm font-semibold text-amber-700">
              {temperature.toFixed(2)} <span className="text-xs font-normal text-slate-500">/ 2.00</span>
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-500">Timeline Confidence</span>
            <span className="font-mono text-sm font-semibold text-emerald-700">
              {timelineConfidence.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Master Input Console & Timeline Stepper */}
      <div className="border-t border-slate-200 bg-[#F8FAFC]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <label htmlFor="master-prompt-input" className="sr-only">
              Temporal Input Sequence
            </label>
            <div className="relative flex-1">
              <input
                id="master-prompt-input"
                type="text"
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                placeholder="Write anything you like here to watch the neural engine tokenize, embed, attend, and predict..."
                className="w-full bg-white border border-slate-300 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 font-sans focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-colors shadow-2xs"
              />
            </div>
            <button
              type="button"
              onClick={onIgnitePipeline}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500 ${
                isIgniting
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'bg-amber-600 text-white hover:bg-amber-500 shadow-sm'
              }`}
            >
              <Play className="w-4 h-4 fill-current" aria-hidden="true" />
              {isIgniting ? 'Pipeline Ignited' : 'Ignite Pipeline'}
            </button>
          </div>

          {/* Timeline Scrubber / Stage Stepper */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 chrono-scroll" role="tablist" aria-label="Pipeline Stage Stepper">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 mr-1 whitespace-nowrap shrink-0">
              <Layers className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
              Chamber View:
            </span>
            {STAGE_TABS.map((tab) => {
              const active = activeStage === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onStageSelect(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-amber-100 text-amber-950 border border-amber-400 font-semibold'
                      : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <span className="hidden lg:inline">{tab.label}</span>
                  <span className="lg:hidden">{tab.short}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
};
