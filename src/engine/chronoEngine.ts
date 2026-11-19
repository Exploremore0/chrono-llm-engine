import {
  AttentionHeadId,
  AttentionHeadResult,
  CandidateToken,
  ChronoToken,
  PipelineTelemetry,
  TokenizationMode,
  VocabEntry,
  WeaveStepRecord,
} from '../types/chrono';

export const DIMENSION_LABELS: string[] = [
  'Entity',
  'Action',
  'Spatial',
  'Temporal',
  'Grammar',
  'Luminance',
  'Morph',
  'Abstract',
  'Intensity',
  'Velocity',
  'Scale',
  'Causality',
  'Polarity',
  'Animate',
  'Structure',
  'Resonance',
];

export const MIN_EMBEDDING_DIMS = 3;
export const MAX_EMBEDDING_DIMS = 16;

// 16D -> 3D deterministic projection matrix rows (sliced dynamically to embeddingDimensions)
const PROJ_3D_16: [number[], number[], number[]] = [
  [0.54, -0.20, -0.38, 0.34, -0.28, 0.16, 0.10, 0.22, 0.18, -0.15, 0.24, -0.12, 0.14, 0.28, -0.18, 0.11],
  [-0.16, 0.58, -0.40, 0.20, -0.22, 0.24, 0.26, 0.18, -0.14, 0.32, -0.10, 0.22, -0.16, 0.12, 0.20, -0.15],
  [-0.18, 0.10, 0.30, 0.64, -0.20, 0.32, 0.08, 0.28, 0.22, 0.14, 0.26, 0.30, -0.10, -0.14, 0.12, 0.28],
];

const FUNCTION_WORDS = new Set([
  'the', 'a', 'an', 'in', 'on', 'into', 'to', 'of', 'for', 'with', 'by', 'at', 'from',
  'and', 'or', 'but', 'because', 'if', 'when', 'while', 'as', 'that', 'this', 'these',
  'those', 'it', 'they', 'we', 'you', 'i', 'he', 'she', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would',
  'can', 'could', 'should', 'may', 'might', 'not',
]);

const SPATIAL_PREPS = new Set([
  'in', 'on', 'into', 'onto', 'over', 'under', 'near', 'around', 'through', 'across',
  'beyond', 'inside', 'outside', 'above', 'below', 'beside', 'between', 'behind', 'from', 'to',
]);

const TEMPORAL_WORDS = new Set([
  'time', 'year', 'years', 'day', 'days', 'night', 'morning', 'future', 'past', 'present',
  'now', 'then', 'soon', 'later', 'before', 'after', 'always', 'never', 'forever', 'moment',
  'second', 'minute', 'hour', 'century', 'era', 'clock', 'tomorrow', 'yesterday', 'today',
]);

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getTokenId(normalizedToken: string): number {
  if (normalizedToken === '<UNK>') return 999;
  const h = hashString(normalizedToken);
  return 100 + (h % 890);
}

export function getTokenVectorAndCategory(
  normalizedToken: string,
  embeddingDimensions: number
): {
  vector: number[];
  category: ChronoToken['category'];
} {
  const dims = Math.max(MIN_EMBEDDING_DIMS, Math.min(MAX_EMBEDDING_DIMS, embeddingDimensions));

  if (normalizedToken === '<UNK>') {
    return {
      vector: new Array(dims).fill(0),
      category: 'function',
    };
  }

  // Deterministic base values across 16 possible dimensions
  const baseVec = Array.from({ length: MAX_EMBEDDING_DIMS }, (_, dim) => {
    const subHash = hashString(`${normalizedToken}:dim:${dim}`);
    const val = ((subHash % 160) - 80) / 100; // [-0.80, +0.79]
    return Number(val.toFixed(2));
  });

  let category: ChronoToken['category'] = 'entity';

  if (normalizedToken.startsWith('##')) {
    const stem = normalizedToken.slice(2);
    const isVerbMorph = ['ed', 'ped', 'ing', 'es', 'en'].includes(stem);
    baseVec[0] = -0.15;
    baseVec[1] = isVerbMorph ? 0.58 : 0.14;
    baseVec[4] = 0.25;
    baseVec[6] = 0.90; // Strong Morphology signal
    category = 'subword';
  } else if (SPATIAL_PREPS.has(normalizedToken)) {
    baseVec[0] = -0.25;
    baseVec[2] = 0.84; // Spatial
    baseVec[4] = 0.68; // Grammar
    baseVec[6] = -0.15;
    category = 'spatial';
  } else if (FUNCTION_WORDS.has(normalizedToken)) {
    baseVec[0] = ['it', 'he', 'she', 'they', 'we', 'you', 'i'].includes(normalizedToken) ? 0.56 : -0.24;
    baseVec[1] = ['is', 'are', 'was', 'were', 'be', 'do', 'does', 'did', 'will', 'can'].includes(normalizedToken)
      ? 0.48
      : -0.28;
    baseVec[4] = 0.92; // Grammar
    baseVec[6] = -0.18;
    category = 'function';
  } else if (TEMPORAL_WORDS.has(normalizedToken) || /^\d+$/.test(normalizedToken)) {
    baseVec[3] = 0.92; // Temporal
    baseVec[7] = 0.66; // Abstract
    category = 'temporal';
  } else if (
    normalizedToken.endsWith('ed') ||
    normalizedToken.endsWith('ing') ||
    normalizedToken.endsWith('ize') ||
    normalizedToken.endsWith('ate')
  ) {
    baseVec[1] = 0.88; // Action
    baseVec[6] = 0.46; // Morph
    category = 'action';
  } else if (
    normalizedToken.endsWith('ly') ||
    normalizedToken.endsWith('ful') ||
    normalizedToken.endsWith('ous') ||
    normalizedToken.endsWith('ive') ||
    normalizedToken.endsWith('bright') ||
    normalizedToken.endsWith('dark')
  ) {
    baseVec[5] = 0.72; // Luminance / Descriptor
    baseVec[6] = 0.34;
    category = 'descriptor';
  } else {
    // Content word (noun/entity/verb root)
    const h = hashString(normalizedToken);
    const bucket = h % 4;
    if (bucket === 0) {
      baseVec[0] = Number((0.62 + (h % 30) / 100).toFixed(2));
      category = 'entity';
    } else if (bucket === 1) {
      baseVec[1] = Number((0.58 + (h % 32) / 100).toFixed(2));
      category = 'action';
    } else if (bucket === 2) {
      baseVec[2] = Number((0.58 + (h % 32) / 100).toFixed(2));
      category = 'spatial';
    } else {
      baseVec[5] = Number((0.55 + (h % 35) / 100).toFixed(2));
      category = 'descriptor';
    }
  }

  return {
    vector: baseVec.slice(0, dims).map((v) => Number(v.toFixed(2))),
    category,
  };
}

export function projectNDto3D(vec: number[]): [number, number, number] {
  const dims = vec.length;
  let x = 0;
  let y = 0;
  let z = 0;
  for (let i = 0; i < dims; i++) {
    x += (PROJ_3D_16[0][i] ?? 0) * vec[i];
    y += (PROJ_3D_16[1][i] ?? 0) * vec[i];
    z += (PROJ_3D_16[2][i] ?? 0) * vec[i];
  }
  const normFactor = Math.sqrt(8 / Math.max(3, dims));
  return [
    Number((x * normFactor).toFixed(3)),
    Number((y * normFactor).toFixed(3)),
    Number((z * normFactor).toFixed(3)),
  ];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function splitRawWords(input: string): string[] {
  const matches = input.match(/[A-Za-z0-9]+|[.,!?;:]/g);
  return matches ? matches : [];
}

function decomposeWordByCapacity(word: string, forceAggressive: boolean): string[] {
  const lower = word.toLowerCase();
  if (lower.length <= 2 || /^[.,!?;:]$/.test(lower)) return [word];

  const suffixes = ['ing', 'ped', 'ed', 'er', 'es', 'ly', 'al', 'en', 'tion', 'ment', 's'];
  for (const suf of suffixes) {
    if (lower.length > suf.length + 2 && lower.endsWith(suf)) {
      const root = word.slice(0, word.length - suf.length);
      const tail = word.slice(word.length - suf.length);
      if (forceAggressive && root.length > 3) {
        const mid = Math.ceil(root.length / 2);
        return [root.slice(0, mid), `##${root.slice(mid)}`, `##${tail}`];
      }
      return [root, `##${tail}`];
    }
  }

  if (forceAggressive && word.length >= 4) {
    const mid = Math.ceil(word.length / 2);
    return [word.slice(0, mid), `##${word.slice(mid)}`];
  }

  if (word.length >= 5) {
    const mid = Math.ceil(word.length / 2);
    return [word.slice(0, mid), `##${word.slice(mid)}`];
  }

  return [word];
}

export function buildVocabTable(
  input: string,
  vocabCapacity: number,
  customCorpus: string[]
): VocabEntry[] {
  const freqMap = new Map<string, { freq: number; isCustom: boolean; firstSeen: number }>();
  let orderCounter = 0;

  const registerWords = (text: string, fromCustom: boolean) => {
    for (const w of splitRawWords(text)) {
      const low = w.toLowerCase();
      if (/^[.,!?;:]$/.test(low)) continue;
      const existing = freqMap.get(low);
      if (existing) {
        existing.freq += 1;
        if (fromCustom) existing.isCustom = true;
      } else {
        freqMap.set(low, { freq: 1, isCustom: fromCustom, firstSeen: orderCounter++ });
      }
    }
  };

  registerWords(input, false);
  for (const sentence of customCorpus) {
    registerWords(sentence, true);
  }

  // Sort by frequency descending, then shorter words (more common roots), then first-seen order
  const sorted = Array.from(freqMap.entries()).sort((a, b) => {
    if (b[1].freq !== a[1].freq) return b[1].freq - a[1].freq;
    if (a[0].length !== b[0].length) return a[0].length - b[0].length;
    return a[1].firstSeen - b[1].firstSeen;
  });

  return sorted.map(([word, meta], idx) => {
    const rank = idx + 1;
    const active = rank <= vocabCapacity;
    const kind: VocabEntry['kind'] = meta.isCustom
      ? 'custom'
      : !active
        ? 'subword'
        : rank <= 3
          ? 'core'
          : 'merged';
    return {
      token: word,
      id: getTokenId(word),
      kind,
      frequency: meta.freq,
      rank,
      active,
    };
  });
}

export function tokenizeInput(
  input: string,
  mode: TokenizationMode,
  vocabCapacity: number,
  vocabTable: VocabEntry[],
  embeddingDimensions: number
): ChronoToken[] {
  const rawWords = splitRawWords(input);
  const activeWordSet = new Set(vocabTable.filter((v) => v.active).map((v) => v.token));

  const rawPieces: { surface: string; wordIndex: number; isUnknown: boolean }[] = [];

  rawWords.forEach((word, wIdx) => {
    const lower = word.toLowerCase();
    const isPunct = /^[.,!?;:]$/.test(word);

    if (mode === 'char') {
      for (let c = 0; c < word.length; c++) {
        rawPieces.push({
          surface: c === 0 ? word[c] : `##${word[c]}`,
          wordIndex: wIdx,
          isUnknown: false,
        });
      }
      return;
    }

    if (mode === 'word') {
      if (isPunct || activeWordSet.has(lower)) {
        rawPieces.push({ surface: word, wordIndex: wIdx, isUnknown: false });
      } else {
        rawPieces.push({ surface: '<UNK>', wordIndex: wIdx, isUnknown: true });
      }
      return;
    }

    // BPE Subword mode: keep whole if within active vocabCapacity, else split into subword pieces
    if (isPunct || activeWordSet.has(lower)) {
      rawPieces.push({ surface: word, wordIndex: wIdx, isUnknown: false });
    } else {
      const pieces = decomposeWordByCapacity(word, vocabCapacity <= 8);
      for (const p of pieces) {
        rawPieces.push({ surface: p, wordIndex: wIdx, isUnknown: false });
      }
    }
  });

  const normCounts: Record<string, number> = {};
  for (const item of rawPieces) {
    const norm = item.isUnknown ? '<UNK>' : item.surface.toLowerCase();
    normCounts[norm] = (normCounts[norm] || 0) + 1;
  }

  return rawPieces.map((item, idx) => {
    const normalized = item.isUnknown ? '<UNK>' : item.surface.toLowerCase();
    const { vector, category } = getTokenVectorAndCategory(normalized, embeddingDimensions);
    return {
      index: idx,
      surface: item.surface,
      normalized,
      id: getTokenId(normalized),
      isSubword: item.surface.startsWith('##'),
      isUnknown: item.isUnknown,
      wordIndex: item.wordIndex,
      category,
      vector,
      coords3d: projectNDto3D(vector),
      duplicateGroupCount: normCounts[normalized] || 1,
    };
  });
}

function softmax(scores: number[]): number[] {
  if (scores.length === 0) return [];
  const maxS = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - maxS));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

export function computeCausalAttention(
  tokens: ChronoToken[],
  embeddingDimensions: number
): Record<AttentionHeadId, AttentionHeadResult> {
  const n = tokens.length;
  const scale = Math.sqrt(Math.max(1, embeddingDimensions));

  const buildHeadMatrix = (head: AttentionHeadId): number[][] => {
    const matrix: number[][] = [];
    for (let i = 0; i < n; i++) {
      const q = tokens[i];
      const rawScores: number[] = [];

      for (let j = 0; j <= i; j++) {
        const k = tokens[j];
        const dist = i - j;

        let dot = 0;
        for (let d = 0; d < q.vector.length; d++) {
          dot += q.vector[d] * k.vector[d];
        }
        let score = dot / scale;

        if (head === 'syntax') {
          if (q.isSubword && dist === 1) score += 2.6;
          if (dist === 1) score += 1.35;
          if (dist === 2) score += 0.55;
          if (
            (q.category === 'action' && k.category === 'entity') ||
            (q.category === 'spatial' && k.category === 'action')
          ) {
            score += 1.2;
          }
          if (k.category === 'function' && dist === 1) score += 0.85;
        } else if (head === 'entity') {
          if (q.category === 'function' && k.category === 'entity') score += 2.1;
          if (q.category === 'action' && k.category === 'entity') score += 1.85;
          if (k.category === 'entity') score += 1.1;
          if (i === j && q.category === 'entity') score += 0.9;
        } else {
          // Temporal Context Head
          const temporalSignal = k.vector[3] ?? 0;
          score += temporalSignal * 2.1;
          if (k.category === 'temporal') score += 1.75;
          if (q.isSubword && dist === 1) score += 1.2;
          score += Math.max(0, 0.7 - dist * 0.08);
        }

        rawScores.push(score);
      }

      const probs = softmax(rawScores);
      const row = new Array(n).fill(0);
      for (let j = 0; j <= i; j++) {
        row[j] = probs[j];
      }
      matrix.push(row);
    }
    return matrix;
  };

  return {
    syntax: {
      id: 'syntax',
      name: 'Head 1: Syntax & Grammar',
      shortLabel: 'Head 1 · Syntax',
      description: 'Links adjacent words, function words, and subword suffixes to their grammatical anchors.',
      matrix: buildHeadMatrix('syntax'),
    },
    entity: {
      id: 'entity',
      name: 'Head 2: Entity & Pronoun Link',
      shortLabel: 'Head 2 · Entity',
      description: 'Resolves pronouns and actions back to concrete entities in your input.',
      matrix: buildHeadMatrix('entity'),
    },
    temporal: {
      id: 'temporal',
      name: 'Head 3: Temporal Context',
      shortLabel: 'Head 3 · Temporal',
      description: 'Tracks time references, sequential momentum, and recency across your input.',
      matrix: buildHeadMatrix('temporal'),
    },
  };
}

export function computeNextTokenCandidates(
  prompt: string,
  tokens: ChronoToken[],
  attentionHeads: Record<AttentionHeadId, AttentionHeadResult>,
  temperature: number,
  topK: number,
  topP: number,
  customCorpus: string[],
  embeddingDimensions: number
): { candidates: CandidateToken[]; entropyBits: number } {
  const words = splitRawWords(prompt).map((w) => w.toLowerCase());
  const last1 = words[words.length - 1] || '';
  const last2 = words.length >= 2 ? `${words[words.length - 2]} ${last1}` : '';

  // Build candidate pool STRICTLY from user input words and user-added custom corpus words
  const candidateMap = new Map<string, { freq: number; fromCustom: boolean }>();
  const addPoolWords = (text: string, fromCustom: boolean) => {
    for (const w of splitRawWords(text)) {
      const low = w.toLowerCase();
      if (/^[.,!?;:]$/.test(low)) continue;
      const existing = candidateMap.get(low);
      if (existing) {
        existing.freq += 1;
        if (fromCustom) existing.fromCustom = true;
      } else {
        candidateMap.set(low, { freq: 1, fromCustom });
      }
    }
  };

  addPoolWords(prompt, false);
  for (const s of customCorpus) {
    addPoolWords(s, true);
  }

  if (candidateMap.size === 0) {
    return { candidates: [], entropyBits: 0 };
  }

  // Attention-pooled context vector across the 3 heads
  const contextVec = new Array(embeddingDimensions).fill(0);
  if (tokens.length > 0) {
    const lastIdx = tokens.length - 1;
    const heads: AttentionHeadId[] = ['syntax', 'entity', 'temporal'];
    for (const hId of heads) {
      const weights = attentionHeads[hId].matrix[lastIdx] || [];
      for (let j = 0; j < tokens.length; j++) {
        const w = weights[j] || 0;
        for (let d = 0; d < embeddingDimensions; d++) {
          contextVec[d] += ((tokens[j].vector[d] ?? 0) * w) / 3;
        }
      }
    }
  }

  // Observed bigram & trigram transitions from user's prompt + custom corpus
  const bigramBoosts: Record<string, { count: number; fromCustom: boolean }> = {};
  const recordTransitions = (text: string, fromCustom: boolean) => {
    const sWords = splitRawWords(text).map((w) => w.toLowerCase());
    for (let i = 1; i < sWords.length; i++) {
      const cand = sWords[i];
      if (/^[.,!?;:]$/.test(cand)) continue;
      if (sWords[i - 1] === last1) {
        bigramBoosts[cand] = {
          count: (bigramBoosts[cand]?.count || 0) + 1,
          fromCustom: bigramBoosts[cand]?.fromCustom || fromCustom,
        };
      }
      if (i > 1 && `${sWords[i - 2]} ${sWords[i - 1]}` === last2) {
        bigramBoosts[cand] = {
          count: (bigramBoosts[cand]?.count || 0) + 2,
          fromCustom: bigramBoosts[cand]?.fromCustom || fromCustom,
        };
      }
    }
  };

  recordTransitions(prompt, false);
  for (const s of customCorpus) {
    recordTransitions(s, true);
  }

  const lastCat = tokens.length > 0 ? tokens[tokens.length - 1].category : null;

  const scored: {
    token: string;
    logit: number;
    isCustomCorpusBoosted: boolean;
    contextCue: string;
  }[] = [];

  for (const [cand, meta] of candidateMap.entries()) {
    let logit = 0.8 + Math.log1p(meta.freq) * 0.45;
    let cue = 'User vocabulary resonance';
    let isCustom = meta.fromCustom;

    const { vector: candVec, category: candCat } = getTokenVectorAndCategory(
      cand,
      embeddingDimensions
    );
    const sim = cosineSimilarity(contextVec, candVec);
    logit += sim * 1.25;

    // Syntactic flow cues across the user's own tokens
    if (lastCat === 'function' || lastCat === 'spatial') {
      if (candCat === 'entity' || candCat === 'descriptor' || candCat === 'temporal') {
        logit += 0.95;
        cue = `Content continuation after "${last1}"`;
      }
    } else if (lastCat === 'entity') {
      if (candCat === 'action' || candCat === 'function' || candCat === 'spatial') {
        logit += 0.95;
        cue = `Predicate/connector after "${last1}"`;
      }
    } else if (lastCat === 'action') {
      if (candCat === 'spatial' || candCat === 'entity' || candCat === 'function') {
        logit += 0.9;
        cue = `Object/complement after "${last1}"`;
      }
    }

    if (bigramBoosts[cand]) {
      logit += Math.min(3.5, bigramBoosts[cand].count * 1.35);
      if (bigramBoosts[cand].fromCustom) {
        isCustom = true;
        cue = 'Observed transition in Custom Corpus';
      } else {
        cue = `Observed sequence after "${last1}"`;
      }
    }

    // Penalize immediate repetition when there are other words available
    if (cand === last1 && candidateMap.size > 1) {
      logit -= 2.2;
    }

    scored.push({
      token: cand,
      logit,
      isCustomCorpusBoosted: isCustom,
      contextCue: cue,
    });
  }

  const safeTemp = Math.max(0.05, temperature);
  const scaled = scored.map((s) => s.logit / safeTemp);
  const probs = softmax(scaled);

  const combined = scored
    .map((s, idx) => ({
      ...s,
      probability: probs[idx],
    }))
    .sort((a, b) => b.probability - a.probability);

  const entropyBits = combined.reduce((acc, item) => {
    if (item.probability > 1e-9) {
      return acc - item.probability * Math.log2(item.probability);
    }
    return acc;
  }, 0);

  const top10Raw = combined.slice(0, 10);
  let cumulative = 0;
  let nucleusClosed = false;

  const top10WithCutoffs = top10Raw.map((item, rankIdx) => {
    const prevCum = cumulative;
    cumulative += item.probability;
    const inTopK = rankIdx < topK;
    const inTopP = rankIdx === 0 || (!nucleusClosed && prevCum < topP);
    if (cumulative >= topP) {
      nucleusClosed = true;
    }
    const isEligible = inTopK && inTopP;
    return {
      token: item.token,
      id: getTokenId(item.token),
      logit: Number(item.logit.toFixed(2)),
      probability: item.probability,
      normalizedEligibleProb: 0,
      cumulativeProb: Math.min(1, cumulative),
      inTopK,
      inTopP,
      isEligible,
      isCustomCorpusBoosted: item.isCustomCorpusBoosted,
      contextCue: item.contextCue,
    };
  });

  const eligibleSum = top10WithCutoffs.reduce(
    (sum, c) => sum + (c.isEligible ? c.probability : 0),
    0
  );

  const candidates: CandidateToken[] = top10WithCutoffs.map((c) => ({
    ...c,
    normalizedEligibleProb:
      c.isEligible && eligibleSum > 0 ? c.probability / eligibleSum : 0,
  }));

  return { candidates, entropyBits: Number(entropyBits.toFixed(2)) };
}

export function runPipeline(params: {
  prompt: string;
  tokenMode: TokenizationMode;
  vocabCapacity: number;
  embeddingDimensions: number;
  temperature: number;
  topK: number;
  topP: number;
  customCorpus: string[];
}): PipelineTelemetry {
  const {
    prompt,
    tokenMode,
    vocabCapacity,
    embeddingDimensions,
    temperature,
    topK,
    topP,
    customCorpus,
  } = params;

  const vocabTable = buildVocabTable(prompt, vocabCapacity, customCorpus);
  const activeVocabSize = vocabTable.filter((v) => v.active).length;

  const tokens = tokenizeInput(prompt, tokenMode, vocabCapacity, vocabTable, embeddingDimensions);
  const wordComparisonTokens = tokenizeInput(prompt, 'word', vocabCapacity, vocabTable, embeddingDimensions);
  const charComparisonTokens = tokenizeInput(prompt, 'char', vocabCapacity, vocabTable, embeddingDimensions);

  const rawWordCount = splitRawWords(prompt).length;
  const tokensPerWord = rawWordCount > 0 ? Number((tokens.length / rawWordCount).toFixed(2)) : 0;

  const attentionHeads = computeCausalAttention(tokens, embeddingDimensions);
  const { candidates, entropyBits } = computeNextTokenCandidates(
    prompt,
    tokens,
    attentionHeads,
    temperature,
    topK,
    topP,
    customCorpus,
    embeddingDimensions
  );

  const timelineConfidence =
    candidates.length > 0 ? Number((candidates[0].probability * 100).toFixed(1)) : 0;

  return {
    prompt,
    embeddingDimensions,
    tokens,
    wordComparisonTokens,
    charComparisonTokens,
    tokensPerWord,
    vocabTable,
    activeVocabSize,
    attentionHeads,
    candidates,
    timelineConfidence,
    entropyBits,
  };
}

export function sampleFromCandidates(params: {
  prompt: string;
  candidates: CandidateToken[];
  temperature: number;
  topK: number;
  topP: number;
  stepNumber: number;
  forcedToken?: string;
}): WeaveStepRecord | null {
  const { prompt, candidates, temperature, topK, topP, stepNumber, forcedToken } = params;
  const trimmed = prompt.trimEnd();

  if (forcedToken) {
    const matched = candidates.find((c) => c.token === forcedToken);
    const prob = matched ? matched.probability : 0.05;
    return {
      stepNumber,
      token: forcedToken,
      promptBefore: prompt,
      promptAfter: trimmed ? `${trimmed} ${forcedToken}` : forcedToken,
      probability: prob,
      temperature,
      topK,
      topP,
      rollValue: 0,
      intervalStart: 0,
      intervalEnd: 1,
      mode: 'forced',
      reason: `User branched manually onto "${forcedToken}" (${(prob * 100).toFixed(1)}% raw probability).`,
    };
  }

  if (candidates.length === 0) return null;

  const eligible = candidates.filter((c) => c.isEligible);
  const pool = eligible.length > 0 ? eligible : candidates.slice(0, 1);

  const roll = Math.random();
  let cursor = 0;
  let chosen = pool[pool.length - 1];
  let intervalStart = 0;
  let intervalEnd = 1;

  for (const cand of pool) {
    const nextCursor = cursor + cand.normalizedEligibleProb;
    if (roll <= nextCursor || cand === pool[pool.length - 1]) {
      chosen = cand;
      intervalStart = cursor;
      intervalEnd = Math.min(1, nextCursor);
      break;
    }
    cursor = nextCursor;
  }

  const tempStyle =
    temperature <= 0.45
      ? 'low-temperature greedy focus'
      : temperature >= 1.25
        ? 'high-temperature exploratory curve'
        : 'balanced temperature curve';

  return {
    stepNumber,
    token: chosen.token,
    promptBefore: prompt,
    promptAfter: trimmed ? `${trimmed} ${chosen.token}` : chosen.token,
    probability: chosen.probability,
    temperature,
    topK,
    topP,
    rollValue: Number(roll.toFixed(3)),
    intervalStart: Number(intervalStart.toFixed(3)),
    intervalEnd: Number(intervalEnd.toFixed(3)),
    mode: 'sampled',
    reason: `Quantum roll ${roll.toFixed(3)} landed inside "${chosen.token}" [${intervalStart.toFixed(2)}–${intervalEnd.toFixed(2)}] under ${tempStyle} (T=${temperature.toFixed(2)}, Top-K=${topK}, Top-P=${topP.toFixed(2)}).`,
  };
}
