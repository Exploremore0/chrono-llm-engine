import {
  AttentionHeadId,
  AttentionHeadResult,
  CandidateToken,
  ChronoToken,
  PipelineTelemetry,
  PresetPrompt,
  SemanticAnchor,
  TokenizationMode,
  VocabEntry,
  WeaveStepRecord,
} from '../types/chrono';

export const PRESET_PROMPTS: PresetPrompt[] = [
  {
    id: 'traveler-portal',
    label: 'The traveler stepped into the portal because it was',
    prompt: 'The traveler stepped into the portal because it was',
    eraTag: 'Pronoun & Causal Link',
  },
  {
    id: 'year-3026',
    label: 'In the year 3026, machines learned to',
    prompt: 'In the year 3026, machines learned to',
    eraTag: 'Temporal Horizon',
  },
  {
    id: 'golden-chrono',
    label: 'A golden chronometer measured every quantum jump into the',
    prompt: 'A golden chronometer measured every quantum jump into the',
    eraTag: 'Quantum Telemetry',
  },
];

export const INITIAL_CORPUS: string[] = [
  'the cat sat on the mat near the warm floor',
  'the traveler stepped into the portal because it was glowing',
  'in the year 3026 machines learned to dream and remember time',
  'a golden chronometer measured every quantum jump across the cosmos',
  'the cat watched the bright tree from the wooden floor',
  'when the portal opened the traveler stepped into tomorrow',
];

export const DIMENSION_LABELS: string[] = [
  'Entity',
  'Action',
  'Spatial',
  'Temporal',
  'Grammar',
  'Luminance',
  'Morph',
  'Abstract',
];

// Ranked BPE vocabulary: rank 1..25 corresponds directly to the Vocabulary Capacity Dial (5..25)
interface RankedMergeEntry {
  word: string;
  rank: number; // 1 = highest frequency core, 25 = specialized merge
  pieces: string[]; // fallback subword split when rank > vocabCapacity
  microPieces: string[]; // deeper split when vocabCapacity <= 8
  baseFreq: number;
}

const RANKED_BPE_VOCAB: RankedMergeEntry[] = [
  { word: 'the', rank: 1, pieces: ['the'], microPieces: ['the'], baseFreq: 14 },
  { word: 'in', rank: 2, pieces: ['in'], microPieces: ['in'], baseFreq: 9 },
  { word: 'on', rank: 3, pieces: ['on'], microPieces: ['on'], baseFreq: 8 },
  { word: 'to', rank: 4, pieces: ['to'], microPieces: ['to'], baseFreq: 8 },
  { word: 'it', rank: 5, pieces: ['it'], microPieces: ['it'], baseFreq: 7 },

  { word: 'was', rank: 6, pieces: ['wa', '##s'], microPieces: ['w', '##a', '##s'], baseFreq: 6 },
  { word: 'a', rank: 7, pieces: ['a'], microPieces: ['a'], baseFreq: 6 },
  { word: 'into', rank: 8, pieces: ['in', '##to'], microPieces: ['in', '##to'], baseFreq: 6 },
  { word: 'cat', rank: 9, pieces: ['c', '##at'], microPieces: ['c', '##at'], baseFreq: 5 },
  { word: 'sat', rank: 10, pieces: ['s', '##at'], microPieces: ['s', '##at'], baseFreq: 5 },

  { word: 'mat', rank: 11, pieces: ['m', '##at'], microPieces: ['m', '##at'], baseFreq: 4 },
  { word: 'tree', rank: 12, pieces: ['tr', '##ee'], microPieces: ['tr', '##ee'], baseFreq: 4 },
  { word: 'floor', rank: 13, pieces: ['fl', '##oor'], microPieces: ['fl', '##o', '##or'], baseFreq: 4 },
  { word: 'year', rank: 14, pieces: ['ye', '##ar'], microPieces: ['y', '##ear'], baseFreq: 4 },
  { word: 'time', rank: 15, pieces: ['ti', '##me'], microPieces: ['t', '##ime'], baseFreq: 4 },

  { word: 'portal', rank: 16, pieces: ['port', '##al'], microPieces: ['po', '##rt', '##al'], baseFreq: 4 },
  { word: '3026', rank: 17, pieces: ['30', '##26'], microPieces: ['3', '##0', '##26'], baseFreq: 3 },
  { word: 'glowing', rank: 18, pieces: ['glow', '##ing'], microPieces: ['gl', '##ow', '##ing'], baseFreq: 3 },
  { word: 'golden', rank: 19, pieces: ['gold', '##en'], microPieces: ['go', '##ld', '##en'], baseFreq: 3 },
  { word: 'stepped', rank: 20, pieces: ['step', '##ped'], microPieces: ['st', '##ep', '##ped'], baseFreq: 3 },

  { word: 'learned', rank: 21, pieces: ['learn', '##ed'], microPieces: ['le', '##arn', '##ed'], baseFreq: 3 },
  { word: 'because', rank: 22, pieces: ['be', '##cause'], microPieces: ['be', '##ca', '##use'], baseFreq: 3 },
  { word: 'traveler', rank: 23, pieces: ['travel', '##er'], microPieces: ['tr', '##av', '##el', '##er'], baseFreq: 3 },
  { word: 'machines', rank: 24, pieces: ['mach', '##ines'], microPieces: ['ma', '##ch', '##ines'], baseFreq: 3 },
  { word: 'chronometer', rank: 25, pieces: ['chrono', '##meter'], microPieces: ['ch', '##ro', '##no', '##meter'], baseFreq: 2 },
];

// Curated semantic vectors in [-1, 1]^8 for crisp, meaningful clustering
// [Entity, Action, Spatial, Temporal, Grammar, Luminance, Morph, Abstract]
const CURATED_VECTORS: Record<string, { vec: number[]; cat: ChronoToken['category'] }> = {
  the: { vec: [-0.25, -0.35, 0.15, -0.10, 0.94, 0.05, -0.20, -0.15], cat: 'function' },
  a: { vec: [-0.22, -0.32, 0.12, -0.14, 0.90, 0.04, -0.22, -0.18], cat: 'function' },
  an: { vec: [-0.20, -0.30, 0.12, -0.14, 0.89, 0.04, -0.18, -0.18], cat: 'function' },
  in: { vec: [-0.30, -0.10, 0.72, 0.42, 0.68, -0.05, -0.15, 0.10], cat: 'spatial' },
  on: { vec: [-0.28, -0.08, 0.84, 0.08, 0.64, 0.02, -0.15, -0.08], cat: 'spatial' },
  into: { vec: [-0.18, 0.34, 0.86, 0.38, 0.52, 0.15, 0.10, 0.22], cat: 'spatial' },
  to: { vec: [-0.24, 0.28, 0.38, 0.18, 0.82, 0.00, -0.10, 0.15], cat: 'function' },
  it: { vec: [0.58, -0.15, 0.12, 0.14, 0.74, 0.10, -0.12, 0.30], cat: 'function' },
  was: { vec: [-0.15, 0.48, -0.05, 0.52, 0.72, 0.05, 0.18, 0.12], cat: 'function' },
  because: { vec: [-0.32, 0.12, -0.10, 0.44, 0.78, 0.02, 0.05, 0.68], cat: 'function' },
  and: { vec: [-0.20, -0.12, 0.05, 0.05, 0.92, 0.00, -0.10, 0.20], cat: 'function' },

  // Animals / Entities
  cat: { vec: [0.92, 0.12, 0.18, -0.35, -0.28, 0.15, -0.30, -0.45], cat: 'entity' },
  dog: { vec: [0.90, 0.18, 0.20, -0.32, -0.26, 0.10, -0.30, -0.42], cat: 'entity' },
  bird: { vec: [0.86, 0.28, 0.36, -0.28, -0.25, 0.24, -0.28, -0.35], cat: 'entity' },
  traveler: { vec: [0.88, 0.44, 0.38, 0.65, -0.22, 0.32, 0.24, 0.30], cat: 'entity' },
  machines: { vec: [0.78, 0.32, 0.10, 0.76, -0.20, 0.48, 0.28, 0.62], cat: 'entity' },
  chronometer: { vec: [0.46, 0.14, 0.18, 0.95, -0.18, 0.64, 0.36, 0.72], cat: 'temporal' },

  // Actions
  sat: { vec: [0.10, 0.88, 0.42, -0.18, -0.10, -0.08, 0.14, -0.30], cat: 'action' },
  stepped: { vec: [0.18, 0.92, 0.56, 0.24, -0.15, 0.12, 0.42, 0.08], cat: 'action' },
  jumped: { vec: [0.15, 0.94, 0.48, -0.10, -0.14, 0.10, 0.40, -0.15], cat: 'action' },
  jump: { vec: [0.14, 0.90, 0.50, 0.34, -0.12, 0.22, -0.10, 0.16], cat: 'action' },
  learned: { vec: [0.22, 0.82, -0.12, 0.48, -0.18, 0.28, 0.44, 0.68], cat: 'action' },
  dream: { vec: [0.10, 0.64, -0.22, 0.54, -0.20, 0.56, -0.15, 0.88], cat: 'action' },
  remember: { vec: [0.16, 0.68, -0.18, 0.78, -0.16, 0.30, -0.10, 0.82], cat: 'action' },
  measured: { vec: [0.05, 0.76, 0.24, 0.62, -0.12, 0.26, 0.40, 0.54], cat: 'action' },

  // Locations
  mat: { vec: [0.20, -0.26, 0.88, -0.36, -0.24, -0.10, -0.30, -0.52], cat: 'spatial' },
  floor: { vec: [0.16, -0.24, 0.92, -0.30, -0.22, -0.08, -0.24, -0.46], cat: 'spatial' },
  tree: { vec: [0.42, -0.12, 0.82, -0.20, -0.25, 0.22, -0.28, -0.24], cat: 'spatial' },
  portal: { vec: [0.26, 0.22, 0.84, 0.88, -0.20, 0.84, 0.12, 0.76], cat: 'spatial' },
  chamber: { vec: [0.22, -0.10, 0.88, 0.58, -0.20, 0.42, 0.08, 0.48], cat: 'spatial' },
  future: { vec: [0.08, 0.16, 0.24, 0.96, -0.18, 0.52, 0.10, 0.86], cat: 'temporal' },

  // Temporal & Descriptors
  year: { vec: [-0.08, -0.12, 0.08, 0.94, 0.10, 0.12, -0.14, 0.58], cat: 'temporal' },
  '3026': { vec: [-0.10, 0.04, 0.06, 0.98, -0.12, 0.48, 0.10, 0.74], cat: 'temporal' },
  time: { vec: [-0.05, 0.08, 0.12, 0.97, -0.06, 0.34, -0.12, 0.85], cat: 'temporal' },
  quantum: { vec: [0.06, 0.24, 0.22, 0.84, -0.18, 0.72, 0.20, 0.90], cat: 'temporal' },
  glowing: { vec: [0.08, 0.20, 0.18, 0.42, -0.16, 0.96, 0.48, 0.46], cat: 'descriptor' },
  golden: { vec: [0.12, -0.08, 0.14, 0.36, -0.18, 0.92, 0.34, 0.32], cat: 'descriptor' },
  every: { vec: [-0.10, -0.12, 0.14, 0.34, 0.68, 0.10, -0.10, 0.48], cat: 'function' },
  bright: { vec: [0.04, 0.05, 0.12, 0.22, -0.16, 0.94, -0.10, 0.36], cat: 'descriptor' },
  warm: { vec: [0.14, -0.06, 0.26, -0.12, -0.18, 0.68, -0.18, 0.12], cat: 'descriptor' },
  open: { vec: [0.05, 0.34, 0.54, 0.24, -0.10, 0.46, -0.10, 0.28], cat: 'descriptor' },
  silent: { vec: [0.04, -0.28, 0.16, 0.28, -0.14, -0.34, 0.12, 0.42], cat: 'descriptor' },
  ancient: { vec: [0.12, -0.14, 0.24, 0.86, -0.16, 0.18, 0.22, 0.56], cat: 'descriptor' },
};

// Orthonormal-like 8D -> 3D projection matrix for clear cluster separation in the 3D Star-Map
const PROJ_3D: [number[], number[], number[]] = [
  [0.64, -0.22, -0.45, 0.38, -0.32, 0.18, 0.12, 0.24], // X: Entity vs Grammar/Spatial
  [-0.18, 0.68, -0.46, 0.22, -0.24, 0.26, 0.28, 0.22], // Y: Action vs Spatial
  [-0.20, 0.12, 0.34, 0.74, -0.22, 0.36, 0.08, 0.32],  // Z: Temporal & Luminance depth
];

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getTokenId(normalizedToken: string): number {
  const rankIdx = RANKED_BPE_VOCAB.findIndex((e) => e.word === normalizedToken);
  if (rankIdx >= 0) {
    return 101 + rankIdx;
  }
  if (normalizedToken === '<UNK>') return 999;
  const h = hashString(normalizedToken);
  return 130 + (h % 760);
}

export function getTokenVectorAndCategory(normalizedToken: string): {
  vector8d: number[];
  category: ChronoToken['category'];
} {
  if (CURATED_VECTORS[normalizedToken]) {
    return {
      vector8d: [...CURATED_VECTORS[normalizedToken].vec],
      category: CURATED_VECTORS[normalizedToken].cat,
    };
  }

  // Subword suffixes (##ed, ##ped, ##er, ##ing, ##al, etc.)
  if (normalizedToken.startsWith('##')) {
    const stem = normalizedToken.slice(2);
    const h = hashString(stem);
    const isPast = stem === 'ed' || stem === 'ped';
    const isProg = stem === 'ing';
    const isAgent = stem === 'er' || stem === 'ines';
    const vec = [
      isAgent ? 0.42 : -0.12,
      isPast || isProg ? 0.56 : 0.14,
      ((h % 40) - 20) / 100,
      isPast ? 0.35 : 0.18,
      0.24,
      ((h >> 3) % 40) / 100,
      0.88, // high Morphology dimension!
      0.22,
    ];
    return { vector8d: vec.map((v) => Number(v.toFixed(2))), category: 'subword' };
  }

  if (normalizedToken === '<UNK>') {
    return {
      vector8d: [0, 0, 0, 0, 0, 0, 0, 0],
      category: 'function',
    };
  }

  // Deterministic pseudo-semantic embedding for arbitrary user-typed words
  const h = hashString(normalizedToken);
  const vec = Array.from({ length: 8 }, (_, dim) => {
    const subHash = hashString(`${normalizedToken}:${dim}`);
    const val = ((subHash % 180) - 90) / 100;
    return Number(val.toFixed(2));
  });

  // Heuristic morphological nudge for unknown English words
  if (normalizedToken.endsWith('ed') || normalizedToken.endsWith('ing')) {
    vec[1] = Number((Math.abs(vec[1]) * 0.6 + 0.35).toFixed(2));
    vec[6] = 0.52;
    return { vector8d: vec, category: 'action' };
  }
  if (/^\d+$/.test(normalizedToken)) {
    vec[3] = 0.85;
    return { vector8d: vec, category: 'temporal' };
  }
  const cats: ChronoToken['category'][] = ['entity', 'action', 'spatial', 'temporal', 'descriptor'];
  return { vector8d: vec, category: cats[h % cats.length] };
}

export function project8Dto3D(vec: number[]): [number, number, number] {
  const x = PROJ_3D[0].reduce((acc, w, i) => acc + w * (vec[i] ?? 0), 0);
  const y = PROJ_3D[1].reduce((acc, w, i) => acc + w * (vec[i] ?? 0), 0);
  const z = PROJ_3D[2].reduce((acc, w, i) => acc + w * (vec[i] ?? 0), 0);
  return [Number(x.toFixed(3)), Number(y.toFixed(3)), Number(z.toFixed(3))];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
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

function decomposeArbitraryWord(word: string, vocabCapacity: number): string[] {
  const lower = word.toLowerCase();
  if (lower.length <= 2 || /^[.,!?;:]$/.test(lower)) return [word];

  // Check common suffixes first
  const suffixes = ['ing', 'ped', 'ed', 'er', 'es', 'ly', 'al', 'en', 's'];
  if (vocabCapacity <= 18) {
    for (const suf of suffixes) {
      if (lower.length > suf.length + 2 && lower.endsWith(suf)) {
        const root = word.slice(0, word.length - suf.length);
        const tail = word.slice(word.length - suf.length);
        if (vocabCapacity <= 8 && root.length > 3) {
          const mid = Math.ceil(root.length / 2);
          return [root.slice(0, mid), `##${root.slice(mid)}`, `##${tail}`];
        }
        return [root, `##${tail}`];
      }
    }
  }

  if (vocabCapacity <= 12 && word.length >= 5) {
    const mid = Math.ceil(word.length / 2);
    return [word.slice(0, mid), `##${word.slice(mid)}`];
  }

  if (vocabCapacity <= 7 && word.length >= 3) {
    const mid = Math.ceil(word.length / 2);
    return [word.slice(0, mid), `##${word.slice(mid)}`];
  }

  return [word];
}

function preserveCasePieces(originalWord: string, pieces: string[]): string[] {
  if (!originalWord) return pieces;
  const startsUpper = /^[A-Z]/.test(originalWord);
  if (!startsUpper) return pieces;
  return pieces.map((p, idx) => {
    if (idx === 0 && !p.startsWith('##')) {
      return p.charAt(0).toUpperCase() + p.slice(1);
    }
    return p;
  });
}

export function buildVocabTable(vocabCapacity: number, customCorpus: string[]): VocabEntry[] {
  const allCorpus = [...INITIAL_CORPUS, ...customCorpus];
  const freqMap: Record<string, number> = {};
  for (const sentence of allCorpus) {
    for (const w of splitRawWords(sentence)) {
      const low = w.toLowerCase();
      if (/^[.,!?;:]$/.test(low)) continue;
      freqMap[low] = (freqMap[low] || 0) + 1;
    }
  }

  const entries: VocabEntry[] = RANKED_BPE_VOCAB.map((entry) => {
    const active = entry.rank <= vocabCapacity;
    const kind: VocabEntry['kind'] =
      entry.rank <= 5 ? 'core' : active ? 'merged' : 'subword';
    return {
      token: entry.word,
      id: getTokenId(entry.word),
      kind,
      frequency: (freqMap[entry.word] || 0) + entry.baseFreq,
      rank: entry.rank,
      active,
    };
  });

  // Add custom words from user-added sentences that aren't in the base ranked table
  const knownSet = new Set(RANKED_BPE_VOCAB.map((e) => e.word));
  let customIdx = 0;
  for (const sentence of customCorpus) {
    for (const w of splitRawWords(sentence)) {
      const low = w.toLowerCase();
      if (/^[.,!?;:]$/.test(low) || knownSet.has(low)) continue;
      knownSet.add(low);
      customIdx++;
      entries.push({
        token: low,
        id: getTokenId(low),
        kind: 'custom',
        frequency: freqMap[low] || 1,
        rank: 25 + customIdx,
        active: true,
      });
    }
  }

  return entries;
}

export function tokenizeInput(
  input: string,
  mode: TokenizationMode,
  vocabCapacity: number,
  customCorpus: string[]
): ChronoToken[] {
  const rawWords = splitRawWords(input);
  const customWordsSet = new Set<string>();
  for (const s of customCorpus) {
    for (const w of splitRawWords(s)) {
      customWordsSet.add(w.toLowerCase());
    }
  }

  const activeWordVocab = new Set(
    RANKED_BPE_VOCAB.filter((e) => e.rank <= vocabCapacity).map((e) => e.word)
  );
  for (const cw of customWordsSet) activeWordVocab.add(cw);

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
      if (isPunct || activeWordVocab.has(lower)) {
        rawPieces.push({ surface: word, wordIndex: wIdx, isUnknown: false });
      } else {
        rawPieces.push({ surface: '<UNK>', wordIndex: wIdx, isUnknown: true });
      }
      return;
    }

    // BPE Subword mode
    if (isPunct || customWordsSet.has(lower)) {
      rawPieces.push({ surface: word, wordIndex: wIdx, isUnknown: false });
      return;
    }

    const ranked = RANKED_BPE_VOCAB.find((e) => e.word === lower);
    if (ranked) {
      if (ranked.rank <= vocabCapacity) {
        rawPieces.push({ surface: word, wordIndex: wIdx, isUnknown: false });
      } else {
        const chosenPieces = vocabCapacity <= 8 ? ranked.microPieces : ranked.pieces;
        const cased = preserveCasePieces(word, chosenPieces);
        for (const p of cased) {
          rawPieces.push({ surface: p, wordIndex: wIdx, isUnknown: false });
        }
      }
      return;
    }

    const decomposed = decomposeArbitraryWord(word, vocabCapacity);
    for (const p of decomposed) {
      rawPieces.push({ surface: p, wordIndex: wIdx, isUnknown: false });
    }
  });

  // Count normalized occurrences so identical tokens ("The" and "the") highlight shared vectors
  const normCounts: Record<string, number> = {};
  for (const item of rawPieces) {
    const norm = item.isUnknown ? '<UNK>' : item.surface.toLowerCase();
    normCounts[norm] = (normCounts[norm] || 0) + 1;
  }

  return rawPieces.map((item, idx) => {
    const normalized = item.isUnknown ? '<UNK>' : item.surface.toLowerCase();
    const { vector8d, category } = getTokenVectorAndCategory(normalized);
    return {
      index: idx,
      surface: item.surface,
      normalized,
      id: getTokenId(normalized),
      isSubword: item.surface.startsWith('##'),
      isUnknown: item.isUnknown,
      wordIndex: item.wordIndex,
      category,
      vector8d,
      coords3d: project8Dto3D(vector8d),
      duplicateGroupCount: normCounts[normalized] || 1,
    };
  });
}

export function buildSemanticAnchors(): SemanticAnchor[] {
  const defs: { label: string; cluster: SemanticAnchor['cluster'] }[] = [
    { label: 'cat', cluster: 'Animals' },
    { label: 'dog', cluster: 'Animals' },
    { label: 'bird', cluster: 'Animals' },
    { label: 'sat', cluster: 'Actions' },
    { label: 'stepped', cluster: 'Actions' },
    { label: 'jumped', cluster: 'Actions' },
    { label: 'learned', cluster: 'Actions' },
    { label: 'mat', cluster: 'Locations' },
    { label: 'floor', cluster: 'Locations' },
    { label: 'tree', cluster: 'Locations' },
    { label: 'portal', cluster: 'Locations' },
    { label: 'year', cluster: 'Time Concepts' },
    { label: '3026', cluster: 'Time Concepts' },
    { label: 'time', cluster: 'Time Concepts' },
    { label: 'future', cluster: 'Time Concepts' },
  ];

  return defs.map((d) => {
    const { vector8d } = getTokenVectorAndCategory(d.label);
    return {
      label: d.label,
      cluster: d.cluster,
      vector8d,
      coords3d: project8Dto3D(vector8d),
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
  tokens: ChronoToken[]
): Record<AttentionHeadId, AttentionHeadResult> {
  const n = tokens.length;

  const buildHeadMatrix = (head: AttentionHeadId): number[][] => {
    const matrix: number[][] = [];
    for (let i = 0; i < n; i++) {
      const q = tokens[i];
      const rawScores: number[] = [];

      for (let j = 0; j <= i; j++) {
        const k = tokens[j];
        const dist = i - j;
        let score = 0;

        // Base vector dot product scaled by sqrt(8)
        let dot = 0;
        for (let d = 0; d < 8; d++) {
          dot += q.vector8d[d] * k.vector8d[d];
        }
        score = dot / Math.sqrt(8);

        if (head === 'syntax') {
          // Subword pieces attend strongly to their immediate root
          if (q.isSubword && dist === 1) score += 2.6;
          // Immediate predecessor syntactic link (determiner -> noun, preposition -> noun)
          if (dist === 1) score += 1.35;
          if (dist === 2) score += 0.55;
          if ((q.normalized === 'the' || q.normalized === 'a') && i === j) score += 0.6;
          if (
            (q.category === 'action' && k.category === 'entity') ||
            (q.category === 'spatial' && k.category === 'action')
          ) {
            score += 1.25;
          }
          if (k.normalized === 'the' && dist === 1) score += 0.95;
        } else if (head === 'entity') {
          // Pronouns ("it", "was", "because") link strongly back to concrete entities ("portal", "cat", "traveler")
          if ((q.normalized === 'it' || q.normalized === 'was') && k.category === 'entity') {
            score += 2.3;
          }
          if ((q.normalized === 'it' || q.normalized === 'was') && k.normalized === 'portal') {
            score += 2.8;
          }
          if (q.category === 'action' && k.category === 'entity') {
            score += 1.9;
          }
          if (q.normalized === 'to' && k.category === 'entity') {
            score += 1.6;
          }
          if (k.category === 'entity' || k.normalized === 'portal') {
            score += 1.1;
          }
          if (i === j && q.category === 'entity') score += 1.0;
        } else {
          // Temporal Context Head: amplifies temporal markers, causal connectors, and long-range scene anchors
          score += k.vector8d[3] * 2.2; // Temporal dimension!
          if (
            ['3026', 'year', 'time', 'portal', 'chronometer', 'quantum', 'because', 'into'].includes(
              k.normalized
            )
          ) {
            score += 1.9;
          }
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
      description: 'Links determiners, prepositions, adjacent words, and subword suffixes to their grammatical anchors.',
      matrix: buildHeadMatrix('syntax'),
    },
    entity: {
      id: 'entity',
      name: 'Head 2: Entity & Pronoun Link',
      shortLabel: 'Head 2 · Entity',
      description: 'Resolves pronouns ("it") and verbs back to concrete subjects ("portal", "cat", "traveler", "machines").',
      matrix: buildHeadMatrix('entity'),
    },
    temporal: {
      id: 'temporal',
      name: 'Head 3: Temporal Context',
      shortLabel: 'Head 3 · Temporal',
      description: 'Tracks era anchors ("3026", "year", "chronometer"), causal shifts ("because"), and scene tone.',
      matrix: buildHeadMatrix('temporal'),
    },
  };
}

// Candidate vocabulary pool for Stage 4 next-token prediction
const CANDIDATE_POOL: { token: string; baseLogit: number }[] = [
  { token: 'floor', baseLogit: 1.4 },
  { token: 'mat', baseLogit: 1.3 },
  { token: 'tree', baseLogit: 1.2 },
  { token: 'portal', baseLogit: 1.35 },
  { token: 'glowing', baseLogit: 1.25 },
  { token: 'dream', baseLogit: 1.25 },
  { token: 'remember', baseLogit: 1.15 },
  { token: 'time', baseLogit: 1.1 },
  { token: 'future', baseLogit: 1.1 },
  { token: 'open', baseLogit: 1.05 },
  { token: 'humming', baseLogit: 1.0 },
  { token: 'golden', baseLogit: 1.05 },
  { token: 'light', baseLogit: 1.0 },
  { token: 'void', baseLogit: 0.95 },
  { token: 'chamber', baseLogit: 1.0 },
  { token: 'quantum', baseLogit: 0.95 },
  { token: 'ancient', baseLogit: 0.95 },
  { token: 'think', baseLogit: 1.0 },
  { token: 'speak', baseLogit: 0.95 },
  { token: 'bridge', baseLogit: 0.9 },
  { token: 'horizon', baseLogit: 0.9 },
  { token: 'silent', baseLogit: 0.9 },
  { token: 'bright', baseLogit: 0.9 },
  { token: 'warm', baseLogit: 0.85 },
  { token: 'unstable', baseLogit: 0.85 },
  { token: 'shifting', baseLogit: 0.85 },
  { token: 'because', baseLogit: 0.7 },
  { token: 'into', baseLogit: 0.75 },
  { token: 'across', baseLogit: 0.75 },
  { token: 'beyond', baseLogit: 0.85 },
  { token: 'and', baseLogit: 0.8 },
  { token: 'the', baseLogit: 0.85 },
  { token: 'a', baseLogit: 0.7 },
  { token: 'was', baseLogit: 0.65 },
  { token: 'chronometer', baseLogit: 0.85 },
  { token: 'traveler', baseLogit: 0.85 },
  { token: 'cosmos', baseLogit: 0.85 },
  { token: 'tomorrow', baseLogit: 0.85 },
  { token: 'chair', baseLogit: 0.85 },
  { token: 'roof', baseLogit: 0.8 },
  { token: 'cold', baseLogit: 0.8 },
  { token: 'alive', baseLogit: 0.8 },
  { token: 'weave', baseLogit: 0.8 },
  { token: 'listen', baseLogit: 0.75 },
  { token: 'stars', baseLogit: 0.8 },
];

export function computeNextTokenCandidates(
  prompt: string,
  tokens: ChronoToken[],
  attentionHeads: Record<AttentionHeadId, AttentionHeadResult>,
  temperature: number,
  topK: number,
  topP: number,
  customCorpus: string[]
): { candidates: CandidateToken[]; entropyBits: number } {
  const words = splitRawWords(prompt).map((w) => w.toLowerCase());
  const last1 = words[words.length - 1] || '';
  const last2 = words.length >= 2 ? `${words[words.length - 2]} ${last1}` : '';
  const last3 =
    words.length >= 3 ? `${words[words.length - 3]} ${words[words.length - 2]} ${last1}` : '';

  // Compute attention-pooled context vector from the last token across all 3 heads
  const contextVec = new Array(8).fill(0);
  if (tokens.length > 0) {
    const lastIdx = tokens.length - 1;
    const heads: AttentionHeadId[] = ['syntax', 'entity', 'temporal'];
    for (const hId of heads) {
      const weights = attentionHeads[hId].matrix[lastIdx] || [];
      for (let j = 0; j < tokens.length; j++) {
        const w = weights[j] || 0;
        for (let d = 0; d < 8; d++) {
          contextVec[d] += (tokens[j].vector8d[d] * w) / 3;
        }
      }
    }
  }

  // Extract custom corpus bigram transitions
  const customNextCounts: Record<string, number> = {};
  const customVocabWords = new Set<string>();
  for (const sentence of customCorpus) {
    const sWords = splitRawWords(sentence).map((w) => w.toLowerCase());
    for (let i = 0; i < sWords.length; i++) {
      if (!/^[.,!?;:]$/.test(sWords[i])) customVocabWords.add(sWords[i]);
      if (i > 0 && sWords[i - 1] === last1) {
        customNextCounts[sWords[i]] = (customNextCounts[sWords[i]] || 0) + 1;
      }
      if (i > 1 && `${sWords[i - 2]} ${sWords[i - 1]}` === last2) {
        customNextCounts[sWords[i]] = (customNextCounts[sWords[i]] || 0) + 2;
      }
    }
  }

  // Merge CANDIDATE_POOL with any new words from customCorpus
  const poolMap = new Map<string, number>();
  for (const item of CANDIDATE_POOL) {
    poolMap.set(item.token, item.baseLogit);
  }
  for (const cw of customVocabWords) {
    if (!poolMap.has(cw) && cw.length > 1) {
      poolMap.set(cw, 0.9);
    }
  }

  const hasCat = words.includes('cat');
  const hasPortal = words.includes('portal') || words.includes('traveler');
  const hasFuture =
    words.includes('3026') || words.includes('machines') || words.includes('quantum') || words.includes('chronometer');

  const scored: {
    token: string;
    logit: number;
    isCustomCorpusBoosted: boolean;
    contextCue: string;
  }[] = [];

  for (const [cand, baseLogit] of poolMap.entries()) {
    let logit = baseLogit;
    let cue = 'Semantic vector resonance';
    let isCustom = false;

    // Semantic alignment with attention-pooled context vector
    const { vector8d: candVec, category: candCat } = getTokenVectorAndCategory(cand);
    const sim = cosineSimilarity(contextVec, candVec);
    logit += sim * 1.15;

    // Immediate trigram / bigram / syntactic slot rules
    if (!last1) {
      if (['the', 'a', 'traveler', 'quantum', 'golden', 'time', 'ancient', 'beyond', 'stars', 'future'].includes(cand)) {
        logit += cand === 'the' ? 2.1 : cand === 'a' ? 1.7 : 1.35;
        cue = 'Sentence starter';
      }
    } else if (last2 === 'on the' || last2 === 'near the' || last2 === 'from the') {
      if (['floor', 'mat', 'tree', 'chair', 'roof', 'bridge', 'portal', 'horizon'].includes(cand)) {
        logit += 2.3;
        cue = 'Spatial noun slot after "on the"';
      }
      if (hasCat && ['floor', 'mat', 'tree', 'chair', 'roof'].includes(cand)) {
        logit += 0.9;
        cue = 'Entity "cat" + spatial surface';
      }
      if (cand === 'floor') logit += 0.35;
      if (cand === 'mat') logit += 0.25;
      if (cand === 'tree') logit += 0.15;
    } else if (last2 === 'into the' || last2 === 'across the' || last2 === 'beyond the') {
      if (['portal', 'void', 'chamber', 'light', 'future', 'horizon', 'cosmos', 'time'].includes(cand)) {
        logit += 2.4;
        cue = 'Directional destination slot';
      }
      if (hasPortal && cand === 'portal') logit += 0.6;
      if (hasFuture && ['future', 'cosmos', 'horizon', 'chamber'].includes(cand)) logit += 0.55;
    } else if (last2 === 'it was' || last3 === 'because it was') {
      if (['glowing', 'open', 'humming', 'unstable', 'shifting', 'ancient', 'bright', 'silent', 'cold', 'alive'].includes(cand)) {
        logit += 2.5;
        cue = 'Predicate adjective after "it was"';
      }
      if (hasPortal && ['glowing', 'open', 'humming', 'unstable'].includes(cand)) {
        logit += 0.85;
        cue = 'Pronoun "it" → "portal" attribute';
      }
    } else if (last2 === 'learned to' || last1 === 'to') {
      if (['dream', 'remember', 'think', 'speak', 'weave', 'listen', 'time'].includes(cand)) {
        logit += 2.5;
        cue = 'Infinitive verb after "to"';
      }
      if (words.includes('machines') && ['dream', 'remember', 'think', 'speak'].includes(cand)) {
        logit += 0.85;
        cue = 'Agent "machines" + cognitive verb';
      }
    } else if (last1 === 'the' || last1 === 'a') {
      if (candCat === 'entity' || candCat === 'spatial' || candCat === 'descriptor') {
        logit += 1.65;
        cue = `Noun/modifier slot after "${last1}"`;
      }
      if (hasFuture && ['future', 'portal', 'chronometer', 'cosmos', 'horizon', 'chamber'].includes(cand)) {
        logit += 0.85;
        cue = 'Temporal scene context';
      }
    } else if (last1 === 'sat') {
      if (['on', 'into', 'beyond'].includes(cand)) {
        logit += 2.2;
        cue = 'Prepositional complement';
      }
    } else if (['glowing', 'golden', 'bright', 'ancient', 'silent', 'warm', 'cold', 'open', 'unstable'].includes(last1)) {
      if (['portal', 'light', 'chamber', 'horizon', 'future', 'chronometer', 'cosmos', 'and', 'beyond'].includes(cand)) {
        logit += 1.85;
        cue = `Continuation after "${last1}"`;
      }
    } else if (['dream', 'remember', 'think', 'speak', 'weave', 'listen'].includes(last1)) {
      if (['and', 'across', 'beyond', 'time', 'future', 'cosmos', 'stars', 'into'].includes(cand)) {
        logit += 1.8;
        cue = 'Clause extension after verb';
      }
    } else if (['floor', 'mat', 'tree', 'portal', 'chamber', 'void', 'cosmos', 'future', 'horizon'].includes(last1)) {
      if (['because', 'and', 'into', 'across', 'beyond', 'glowing', 'silent', 'was'].includes(cand)) {
        logit += 1.75;
        cue = `Clause bridge after "${last1}"`;
      }
    } else if (last1 === 'because') {
      if (['it', 'the', 'time', 'quantum', 'ancient'].includes(cand)) {
        logit += 2.0;
        cue = 'Causal clause opener';
      }
    } else if (last1 === 'and') {
      if (['remember', 'dream', 'weave', 'listen', 'the', 'golden', 'silent'].includes(cand)) {
        logit += 1.85;
        cue = 'Parallel conjunction';
      }
    }

    // Small anti-repetition penalty for immediate previous word
    if (cand === last1) logit -= 2.4;
    if (words.slice(-3).includes(cand) && !['the', 'and', 'into'].includes(cand)) {
      logit -= 0.7;
    }

    // Boost from user-added custom corpus
    if (customNextCounts[cand]) {
      logit += Math.min(3.5, customNextCounts[cand] * 1.45);
      isCustom = true;
      cue = 'Boosted by Custom Corpus';
    }

    scored.push({ token: cand, logit, isCustomCorpusBoosted: isCustom, contextCue: cue });
  }

  // Apply temperature scaling across candidate pool
  const safeTemp = Math.max(0.1, temperature);
  const scaled = scored.map((s) => s.logit / safeTemp);
  const probs = softmax(scaled);

  // Combine and sort descending by probability
  const combined = scored
    .map((s, idx) => ({
      ...s,
      probability: probs[idx],
    }))
    .sort((a, b) => b.probability - a.probability);

  // Shannon entropy in bits across the full candidate pool
  const entropyBits = combined.reduce((acc, item) => {
    if (item.probability > 1e-9) {
      return acc - item.probability * Math.log2(item.probability);
    }
    return acc;
  }, 0);

  // Take Top 10 for Stage 4 display & sampling
  const top10Raw = combined.slice(0, 10);
  let cumulative = 0;
  let nucleusClosed = false;

  const top10WithCutoffs = top10Raw.map((item, rankIdx) => {
    const prevCum = cumulative;
    cumulative += item.probability;
    const inTopK = rankIdx < topK;
    // Standard Top-P: include tokens until cumulative probability exceeds topP (always include rank 0)
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
  temperature: number;
  topK: number;
  topP: number;
  customCorpus: string[];
}): PipelineTelemetry {
  const { prompt, tokenMode, vocabCapacity, temperature, topK, topP, customCorpus } = params;

  const tokens = tokenizeInput(prompt, tokenMode, vocabCapacity, customCorpus);
  const wordComparisonTokens = tokenizeInput(prompt, 'word', vocabCapacity, customCorpus);
  const charComparisonTokens = tokenizeInput(prompt, 'char', vocabCapacity, customCorpus);

  const rawWordCount = splitRawWords(prompt).length;
  const tokensPerWord = rawWordCount > 0 ? Number((tokens.length / rawWordCount).toFixed(2)) : 0;

  const vocabTable = buildVocabTable(vocabCapacity, customCorpus);
  const activeVocabSize = vocabTable.filter((v) => v.active).length;

  const anchors = buildSemanticAnchors();
  const attentionHeads = computeCausalAttention(tokens);
  const { candidates, entropyBits } = computeNextTokenCandidates(
    prompt,
    tokens,
    attentionHeads,
    temperature,
    topK,
    topP,
    customCorpus
  );

  const timelineConfidence =
    candidates.length > 0 ? Number((candidates[0].probability * 100).toFixed(1)) : 0;

  return {
    prompt,
    tokens,
    wordComparisonTokens,
    charComparisonTokens,
    tokensPerWord,
    vocabTable,
    activeVocabSize,
    anchors,
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
}): WeaveStepRecord {
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
      reason: `User branched manually onto "${forcedToken}" (${(prob * 100).toFixed(1)}% raw probability) to explore an alternate timeline.`,
    };
  }

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
    reason: `Quantum roll ${roll.toFixed(3)} landed inside "${chosen.token}" [${intervalStart.toFixed(2)}–${intervalEnd.toFixed(2)}] under ${tempStyle} (T=${temperature.toFixed(1)}, Top-K=${topK}, Top-P=${topP.toFixed(2)}).`,
  };
}
