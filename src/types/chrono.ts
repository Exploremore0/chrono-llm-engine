export type TokenizationMode = 'bpe' | 'word' | 'char';

export type AttentionHeadId = 'syntax' | 'entity' | 'temporal';

export type StageId = 'all' | 'stage-1' | 'stage-2' | 'stage-3' | 'stage-4' | 'stage-5';

export interface VocabEntry {
  token: string;
  id: number;
  kind: 'core' | 'merged' | 'subword' | 'custom';
  frequency: number;
  rank: number;
  active: boolean;
}

export interface ChronoToken {
  index: number;
  surface: string;
  normalized: string;
  id: number;
  isSubword: boolean;
  isUnknown: boolean;
  wordIndex: number;
  category: 'entity' | 'action' | 'spatial' | 'temporal' | 'function' | 'descriptor' | 'subword';
  vector8d: number[];
  coords3d: [number, number, number];
  duplicateGroupCount: number;
}

export interface SemanticAnchor {
  label: string;
  cluster: 'Animals' | 'Actions' | 'Locations' | 'Time Concepts';
  vector8d: number[];
  coords3d: [number, number, number];
}

export interface AttentionHeadResult {
  id: AttentionHeadId;
  name: string;
  shortLabel: string;
  description: string;
  matrix: number[][]; // N x N lower-triangular weights (j > i are 0)
}

export interface CandidateToken {
  token: string;
  id: number;
  logit: number;
  probability: number; // post-temperature softmax probability across candidate pool
  normalizedEligibleProb: number; // re-normalized within active Top-K/Top-P mask
  cumulativeProb: number;
  inTopK: boolean;
  inTopP: boolean;
  isEligible: boolean;
  isCustomCorpusBoosted: boolean;
  contextCue: string;
}

export interface WeaveStepRecord {
  stepNumber: number;
  token: string;
  promptBefore: string;
  promptAfter: string;
  probability: number;
  temperature: number;
  topK: number;
  topP: number;
  rollValue: number;
  intervalStart: number;
  intervalEnd: number;
  mode: 'sampled' | 'forced';
  reason: string;
}

export interface PresetPrompt {
  id: string;
  label: string;
  prompt: string;
  eraTag: string;
}

export interface PipelineTelemetry {
  prompt: string;
  tokens: ChronoToken[];
  wordComparisonTokens: ChronoToken[];
  charComparisonTokens: ChronoToken[];
  tokensPerWord: number;
  vocabTable: VocabEntry[];
  activeVocabSize: number;
  anchors: SemanticAnchor[];
  attentionHeads: Record<AttentionHeadId, AttentionHeadResult>;
  candidates: CandidateToken[];
  timelineConfidence: number;
  entropyBits: number;
}
