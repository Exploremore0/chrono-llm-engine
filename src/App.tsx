import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  AttentionHeadId,
  StageId,
  TokenizationMode,
  WeaveStepRecord,
} from './types/chrono';
import {
  runPipeline,
  sampleFromCandidates,
} from './engine/chronoEngine';
import { ChronometerHeader } from './components/ChronometerHeader';
import { Stage1Tokenizer } from './components/Stage1Tokenizer';
import { Stage2Embeddings } from './components/Stage2Embeddings';
import { Stage3Attention } from './components/Stage3Attention';
import { Stage4Probability } from './components/Stage4Probability';
import { Stage5Weaver } from './components/Stage5Weaver';
import { GuidedTourModal } from './components/GuidedTourModal';

const DEFAULT_PROMPT = '';

export default function App() {
  const [basePrompt, setBasePrompt] = useState<string>(DEFAULT_PROMPT);
  const [prompt, setPrompt] = useState<string>(DEFAULT_PROMPT);
  const [weaveHistory, setWeaveHistory] = useState<WeaveStepRecord[]>([]);

  // Pipeline parameters
  const [tokenMode, setTokenMode] = useState<TokenizationMode>('bpe');
  const [vocabCapacity, setVocabCapacity] = useState<number>(20);
  const [embeddingDimensions, setEmbeddingDimensions] = useState<number>(8);
  const [customCorpus, setCustomCorpus] = useState<string[]>([]);
  const [activeHead, setActiveHead] = useState<AttentionHeadId>('entity');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [topK, setTopK] = useState<number>(6);
  const [topP, setTopP] = useState<number>(0.9);

  // Navigation & interaction state
  const [activeStage, setActiveStage] = useState<StageId>('all');
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number | null>(null);
  const [tourOpen, setTourOpen] = useState<boolean>(false);

  // Ignite sweep animation state
  const [ignitingStage, setIgnitingStage] = useState<number | null>(null);
  const igniteTimersRef = useRef<number[]>([]);

  // Auto-weave 10 tokens loop state
  const [isAutoWeaving, setIsAutoWeaving] = useState<boolean>(false);
  const [autoWeaveRemaining, setAutoWeaveRemaining] = useState<number>(0);

  // Compute full 5-stage reactive pipeline telemetry
  const telemetry = useMemo(
    () =>
      runPipeline({
        prompt,
        tokenMode,
        vocabCapacity,
        embeddingDimensions,
        temperature,
        topK,
        topP,
        customCorpus,
      }),
    [prompt, tokenMode, vocabCapacity, embeddingDimensions, temperature, topK, topP, customCorpus]
  );

  // Keep selectedTokenIndex within bounds if prompt shrinks
  useEffect(() => {
    if (selectedTokenIndex !== null && selectedTokenIndex >= telemetry.tokens.length) {
      setSelectedTokenIndex(
        telemetry.tokens.length > 0 ? telemetry.tokens.length - 1 : null
      );
    }
  }, [telemetry.tokens.length, selectedTokenIndex]);

  // Clear ignite timers on unmount
  useEffect(() => {
    return () => {
      igniteTimersRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const handleManualPromptChange = (val: string) => {
    setIsAutoWeaving(false);
    setAutoWeaveRemaining(0);
    setBasePrompt(val);
    setPrompt(val);
    setWeaveHistory([]);
  };

  const handleIgnitePipeline = () => {
    igniteTimersRef.current.forEach((id) => window.clearTimeout(id));
    igniteTimersRef.current = [];
    setIgnitingStage(1);
    const stages = [2, 3, 4, 5];
    stages.forEach((st, idx) => {
      const tId = window.setTimeout(() => setIgnitingStage(st), (idx + 1) * 200);
      igniteTimersRef.current.push(tId);
    });
    const endId = window.setTimeout(() => setIgnitingStage(null), 1150);
    igniteTimersRef.current.push(endId);
  };

  const executeWeaveStep = useCallback(
    (forcedToken?: string) => {
      const currentTelemetry = runPipeline({
        prompt,
        tokenMode,
        vocabCapacity,
        embeddingDimensions,
        temperature,
        topK,
        topP,
        customCorpus,
      });

      const stepRecord = sampleFromCandidates({
        prompt,
        candidates: currentTelemetry.candidates,
        temperature,
        topK,
        topP,
        stepNumber: weaveHistory.length + 1,
        forcedToken,
      });

      if (!stepRecord) return;

      setPrompt(stepRecord.promptAfter);
      setWeaveHistory((prev) => [...prev, stepRecord]);
    },
    [
      prompt,
      tokenMode,
      vocabCapacity,
      embeddingDimensions,
      temperature,
      topK,
      topP,
      customCorpus,
      weaveHistory.length,
    ]
  );

  // Auto-weave 10 tokens loop
  useEffect(() => {
    if (!isAutoWeaving) return;
    if (autoWeaveRemaining <= 0 || telemetry.candidates.length === 0) {
      setIsAutoWeaving(false);
      return;
    }

    const timer = window.setTimeout(() => {
      executeWeaveStep();
      setAutoWeaveRemaining((rem) => rem - 1);
    }, 420);

    return () => window.clearTimeout(timer);
  }, [isAutoWeaving, autoWeaveRemaining, telemetry.candidates.length, executeWeaveStep]);

  const handleAutoWeave10 = () => {
    if (telemetry.candidates.length === 0) return;
    setAutoWeaveRemaining(10);
    setIsAutoWeaving(true);
  };

  const handleStopAutoWeave = () => {
    setIsAutoWeaving(false);
    setAutoWeaveRemaining(0);
  };

  const handleRewindStep = () => {
    if (weaveHistory.length === 0) return;
    const prevStep = weaveHistory[weaveHistory.length - 1];
    setPrompt(prevStep.promptBefore);
    setWeaveHistory((prev) => prev.slice(0, -1));
  };

  const handleAddCorpusSentence = (sentence: string) => {
    setCustomCorpus((prev) => [...prev, sentence]);
  };

  const handleResetAll = () => {
    setIsAutoWeaving(false);
    setAutoWeaveRemaining(0);
    setBasePrompt(DEFAULT_PROMPT);
    setPrompt(DEFAULT_PROMPT);
    setWeaveHistory([]);
    setTokenMode('bpe');
    setVocabCapacity(20);
    setEmbeddingDimensions(8);
    setCustomCorpus([]);
    setActiveHead('entity');
    setTemperature(0.7);
    setTopK(6);
    setTopP(0.9);
    setActiveStage('all');
    setSelectedTokenIndex(null);
  };

  const handleExportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      engine: 'Chrono-LLM: Temporal Neural Engine',
      parameters: {
        tokenMode,
        vocabCapacity,
        embeddingDimensions,
        activeHead,
        temperature,
        topK,
        topP,
      },
      telemetry,
      weaveHistory,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chrono-llm-telemetry-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const showStage = (id: StageId) => activeStage === 'all' || activeStage === id;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 relative overflow-x-hidden">
      {/* Subtle Concentric Chronometer Dial Grid Backdrop */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-60"
        aria-hidden="true"
      >
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="chrono-vignette-light" cx="50%" cy="22%" r="70%">
              <stop offset="0%" stopColor="rgba(217, 119, 6, 0.06)" />
              <stop offset="55%" stopColor="rgba(8, 145, 178, 0.03)" />
              <stop offset="100%" stopColor="rgba(248, 250, 252, 0)" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#chrono-vignette-light)" />
          <circle
            cx="50%"
            cy="240"
            r="340"
            fill="none"
            stroke="rgba(180, 83, 9, 0.08)"
            strokeDasharray="4 8"
          />
          <circle
            cx="50%"
            cy="240"
            r="580"
            fill="none"
            stroke="rgba(8, 145, 178, 0.06)"
          />
          <circle
            cx="50%"
            cy="240"
            r="840"
            fill="none"
            stroke="rgba(100, 116, 139, 0.06)"
            strokeDasharray="2 10"
          />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <ChronometerHeader
          prompt={prompt}
          onPromptChange={handleManualPromptChange}
          onIgnitePipeline={handleIgnitePipeline}
          isIgniting={ignitingStage !== null}
          activeStage={activeStage}
          onStageSelect={setActiveStage}
          onOpenTour={() => setTourOpen(true)}
          onExportJson={handleExportJson}
          onResetAll={handleResetAll}
          tokenCount={telemetry.tokens.length}
          activeVocabSize={telemetry.activeVocabSize}
          vocabCapacity={vocabCapacity}
          embeddingDimensions={embeddingDimensions}
          onEmbeddingDimensionsChange={setEmbeddingDimensions}
          activeHead={activeHead}
          temperature={temperature}
          onTemperatureChange={setTemperature}
          timelineConfidence={telemetry.timelineConfidence}
        />

        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {showStage('stage-1') && (
            <Stage1Tokenizer
              tokens={telemetry.tokens}
              wordComparisonTokens={telemetry.wordComparisonTokens}
              charComparisonTokens={telemetry.charComparisonTokens}
              tokensPerWord={telemetry.tokensPerWord}
              tokenMode={tokenMode}
              onTokenModeChange={setTokenMode}
              vocabCapacity={vocabCapacity}
              onVocabCapacityChange={setVocabCapacity}
              vocabTable={telemetry.vocabTable}
              customCorpus={customCorpus}
              onAddCorpusSentence={handleAddCorpusSentence}
              selectedTokenIndex={selectedTokenIndex}
              onSelectTokenIndex={setSelectedTokenIndex}
              isHighlighted={ignitingStage === 1}
            />
          )}

          {showStage('stage-2') && (
            <Stage2Embeddings
              tokens={telemetry.tokens}
              embeddingDimensions={embeddingDimensions}
              onEmbeddingDimensionsChange={setEmbeddingDimensions}
              selectedTokenIndex={selectedTokenIndex}
              onSelectTokenIndex={setSelectedTokenIndex}
              isHighlighted={ignitingStage === 2}
            />
          )}

          {showStage('stage-3') && (
            <Stage3Attention
              tokens={telemetry.tokens}
              attentionHeads={telemetry.attentionHeads}
              activeHead={activeHead}
              onSelectHead={setActiveHead}
              selectedTokenIndex={selectedTokenIndex}
              onSelectTokenIndex={setSelectedTokenIndex}
              isHighlighted={ignitingStage === 3}
            />
          )}

          {showStage('stage-4') && (
            <Stage4Probability
              candidates={telemetry.candidates}
              temperature={temperature}
              onTemperatureChange={setTemperature}
              topK={topK}
              onTopKChange={setTopK}
              topP={topP}
              onTopPChange={setTopP}
              entropyBits={telemetry.entropyBits}
              onForceBranch={(tok) => executeWeaveStep(tok)}
              isHighlighted={ignitingStage === 4}
            />
          )}

          {showStage('stage-5') && (
            <Stage5Weaver
              basePrompt={basePrompt}
              currentPrompt={prompt}
              weaveHistory={weaveHistory}
              candidates={telemetry.candidates}
              isAutoWeaving={isAutoWeaving}
              autoWeaveRemaining={autoWeaveRemaining}
              onStepOne={() => executeWeaveStep()}
              onAutoWeave10={handleAutoWeave10}
              onStopAutoWeave={handleStopAutoWeave}
              onRewindStep={handleRewindStep}
              onForceBranch={(tok) => executeWeaveStep(tok)}
              isHighlighted={ignitingStage === 5}
            />
          )}
        </main>

        <footer className="border-t border-slate-200 bg-white/70 py-5 px-4 sm:px-6 lg:px-8 text-xs text-slate-600">
          <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>Chrono-LLM: Temporal Neural Engine · Interactive Client-Side Transformer Lab</span>
            <span>All tokenization, vector projection, attention, and sampling run locally in your browser.</span>
          </div>
        </footer>
      </div>

      <GuidedTourModal
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
        onJumpToStage={(stage) => setActiveStage(stage)}
      />
    </div>
  );
}
