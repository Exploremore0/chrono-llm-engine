import React, { useState, useMemo } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { AttentionHeadId, AttentionHeadResult, ChronoToken } from '../types/chrono';
import { ChamberFooterNote } from './ChamberFooterNote';

interface Stage3AttentionProps {
  tokens: ChronoToken[];
  attentionHeads: Record<AttentionHeadId, AttentionHeadResult>;
  activeHead: AttentionHeadId;
  onSelectHead: (head: AttentionHeadId) => void;
  selectedTokenIndex: number | null;
  onSelectTokenIndex: (idx: number | null) => void;
  isHighlighted?: boolean;
}

export const Stage3Attention: React.FC<Stage3AttentionProps> = ({
  tokens,
  attentionHeads,
  activeHead,
  onSelectHead,
  selectedTokenIndex,
  onSelectTokenIndex,
  isHighlighted,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const headData = attentionHeads[activeHead];

  const activeQueryIdx = useMemo(() => {
    if (tokens.length === 0) return -1;
    if (hoveredIndex !== null && hoveredIndex < tokens.length) return hoveredIndex;
    if (selectedTokenIndex !== null && selectedTokenIndex < tokens.length) return selectedTokenIndex;
    return tokens.length - 1;
  }, [tokens, hoveredIndex, selectedTokenIndex]);

  const activeWeights = useMemo(() => {
    if (activeQueryIdx < 0 || !headData.matrix[activeQueryIdx]) return [];
    return headData.matrix[activeQueryIdx];
  }, [activeQueryIdx, headData]);

  const nodeSpacing = tokens.length > 10 ? 78 : Math.max(82, Math.floor(680 / Math.max(1, tokens.length)));
  const svgWidth = Math.max(540, tokens.length * nodeSpacing + 60);
  const svgHeight = 250;
  const trackY = 198;

  const getNodeX = (idx: number) => {
    if (tokens.length <= 1) return svgWidth / 2;
    const totalSpan = (tokens.length - 1) * nodeSpacing;
    const startX = (svgWidth - totalSpan) / 2;
    return startX + idx * nodeSpacing;
  };

  return (
    <section
      aria-labelledby="stage-3-heading"
      className={`rounded-2xl bg-white border transition-all duration-300 p-5 sm:p-6 shadow-xs ${
        isHighlighted
          ? 'border-cyan-500 ring-2 ring-cyan-400/30'
          : 'border-slate-200'
      }`}
    >
      {/* Header & Attention Head Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="text-xs font-mono font-medium text-cyan-700 tracking-wide">
            Stage 3 · Causal Self-Attention & Lower-Triangular Mask
          </div>
          <h2 id="stage-3-heading" className="font-display text-xl sm:text-2xl font-semibold text-slate-900 mt-0.5">
            Causal Attention Web & Matrix
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200">
          {(['syntax', 'entity', 'temporal'] as AttentionHeadId[]).map((hId) => {
            const head = attentionHeads[hId];
            const active = activeHead === hId;
            return (
              <button
                key={hId}
                type="button"
                onClick={() => onSelectHead(hId)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-cyan-600 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {head.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Head Description */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-600 shrink-0" aria-hidden="true" />
          <span>{headData.description}</span>
        </div>
        {activeQueryIdx >= 0 && tokens[activeQueryIdx] && (
          <div className="font-mono text-amber-800">
            Query Focus: <span className="font-semibold">"{tokens[activeQueryIdx].surface}"</span> (t{activeQueryIdx})
          </div>
        )}
      </div>

      {/* Main Split: SVG Chronometer Arcs (Left) + Causal Attention Matrix Table (Right) */}
      <div className="mt-4 grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Interactive SVG Chronometer Arcs */}
        <div className="xl:col-span-7 flex flex-col">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Hover or click any token node to fire causal attention beams backward</span>
            <span className="font-mono text-slate-500">Future tokens masked</span>
          </div>

          <div className="flex-1 rounded-xl bg-slate-50 border border-slate-200 p-3 overflow-x-auto chrono-scroll flex items-center">
            {tokens.length === 0 ? (
              <div className="w-full py-12 text-center text-sm text-slate-600">
                Type a custom sentence above to visualize causal attention arcs.
              </div>
            ) : (
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full min-w-[540px] h-[250px]"
                role="img"
                aria-label="Causal attention Bezier arc diagram"
              >
                <defs>
                  <linearGradient id="beam-grad-cyan-light" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0891B2" />
                    <stop offset="100%" stopColor="#D97706" />
                  </linearGradient>
                </defs>

                {/* Subtle chronometer concentric dial arc */}
                <path
                  d={`M 20 ${trackY} Q ${svgWidth / 2} 28 ${svgWidth - 20} ${trackY}`}
                  fill="none"
                  stroke="rgba(15,23,42,0.08)"
                  strokeDasharray="4 6"
                />
                <line
                  x1={24}
                  y1={trackY}
                  x2={svgWidth - 24}
                  y2={trackY}
                  stroke="rgba(15,23,42,0.18)"
                  strokeWidth={1}
                />

                {/* Causal Attention Bezier Beams */}
                {activeQueryIdx >= 0 &&
                  tokens.map((_, j) => {
                    if (j > activeQueryIdx) return null;
                    const weight = activeWeights[j] || 0;
                    const x1 = getNodeX(activeQueryIdx);
                    const x2 = getNodeX(j);
                    const dist = activeQueryIdx - j;

                    if (j === activeQueryIdx) {
                      const loopH = 44 + weight * 40;
                      const d = `M ${x1 - 7} ${trackY - 14} C ${x1 - 24} ${trackY - loopH}, ${x1 + 24} ${trackY - loopH}, ${x1 + 7} ${trackY - 14}`;
                      return (
                        <g key={`arc-self-${j}`}>
                          <path
                            d={d}
                            fill="none"
                            stroke="#D97706"
                            strokeWidth={1.5 + weight * 5.5}
                            strokeOpacity={0.3 + weight * 0.7}
                          />
                          {weight >= 0.08 && (
                            <text
                              x={x1}
                              y={trackY - loopH * 0.78}
                              textAnchor="middle"
                              fill="#92400E"
                              fontSize="10"
                              fontWeight="600"
                              fontFamily="JetBrains Mono, monospace"
                            >
                              {(weight * 100).toFixed(0)}%
                            </text>
                          )}
                        </g>
                      );
                    }

                    const arcPeak = Math.min(165, 36 + dist * 22);
                    const midX = (x1 + x2) / 2;
                    const ctrlY = trackY - arcPeak;
                    const d = `M ${x1} ${trackY - 14} Q ${midX} ${ctrlY} ${x2} ${trackY - 14}`;

                    return (
                      <g key={`arc-${activeQueryIdx}-${j}`}>
                        <path
                          d={d}
                          fill="none"
                          stroke="url(#beam-grad-cyan-light)"
                          strokeWidth={Math.max(1.2, weight * 8.5)}
                          strokeOpacity={Math.max(0.18, Math.min(1, weight * 1.45))}
                        />
                        {weight >= 0.1 && (
                          <g transform={`translate(${midX}, ${(trackY - 14 + ctrlY) / 2})`}>
                            <rect
                              x={-16}
                              y={-9}
                              width={32}
                              height={16}
                              rx={4}
                              fill="#FFFFFF"
                              stroke="rgba(8,145,178,0.55)"
                              strokeWidth={1}
                            />
                            <text
                              x={0}
                              y={2.5}
                              textAnchor="middle"
                              fill="#0E7490"
                              fontSize="9.5"
                              fontWeight="700"
                              fontFamily="JetBrains Mono, monospace"
                            >
                              {(weight * 100).toFixed(0)}%
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}

                {/* Token Nodes along Timeline */}
                {tokens.map((tok, idx) => {
                  const x = getNodeX(idx);
                  const isQuery = idx === activeQueryIdx;
                  const isFuture = idx > activeQueryIdx;
                  const weight = !isFuture ? activeWeights[idx] || 0 : 0;

                  return (
                    <g
                      key={`node-${tok.index}`}
                      transform={`translate(${x}, ${trackY})`}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onClick={() => onSelectTokenIndex(idx)}
                      className="cursor-pointer"
                    >
                      <circle
                        r={isQuery ? 13 : 10}
                        fill={
                          isQuery
                            ? '#D97706'
                            : isFuture
                              ? '#E2E8F0'
                              : weight >= 0.18
                                ? '#0891B2'
                                : '#FFFFFF'
                        }
                        stroke={
                          isQuery
                            ? '#92400E'
                            : isFuture
                              ? '#94A3B8'
                              : '#0891B2'
                        }
                        strokeWidth={isQuery ? 2 : 1.5}
                        opacity={isFuture ? 0.65 : 1}
                      />
                      <text
                        y={3.5}
                        textAnchor="middle"
                        fill={
                          isQuery
                            ? '#FFFFFF'
                            : isFuture
                              ? '#64748B'
                              : weight >= 0.18
                                ? '#FFFFFF'
                                : '#0F172A'
                        }
                        fontSize="9.5"
                        fontWeight="700"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        t{idx}
                      </text>
                      <text
                        y={28}
                        textAnchor="middle"
                        fill={isQuery ? '#92400E' : isFuture ? '#94A3B8' : '#0F172A'}
                        fontSize="11"
                        fontWeight={isQuery ? '700' : '600'}
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {tok.surface.length > 9 ? `${tok.surface.slice(0, 8)}…` : tok.surface}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>

        {/* Lower-Triangular Causal Attention Matrix Table */}
        <div className="xl:col-span-5 flex flex-col">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Causal Attention Matrix (Rows = Query · Cols = Past Keys)</span>
            <span className="inline-flex items-center gap-1 font-mono text-slate-500">
              <Lock className="w-3 h-3 text-slate-400" aria-hidden="true" />
              Future Masked
            </span>
          </div>

          <div className="flex-1 rounded-xl bg-slate-50 border border-slate-200 p-3 overflow-auto chrono-scroll max-h-[290px]">
            {tokens.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-600">
                Matrix empty.
              </div>
            ) : (
              <table className="w-full text-center border-collapse font-mono text-[11px]">
                <thead>
                  <tr>
                    <th className="p-1.5 text-left text-slate-500 font-medium sticky left-0 bg-slate-50">
                      Q \ K
                    </th>
                    {tokens.map((kTok, j) => (
                      <th
                        key={`col-${j}`}
                        className={`p-1.5 font-medium whitespace-nowrap ${
                          j <= activeQueryIdx ? 'text-cyan-800' : 'text-slate-400'
                        }`}
                      >
                        {kTok.surface.slice(0, 6)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((qTok, i) => {
                    const isActiveRow = i === activeQueryIdx;
                    return (
                      <tr
                        key={`row-${i}`}
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        onClick={() => onSelectTokenIndex(i)}
                        className={`cursor-pointer transition-colors ${
                          isActiveRow ? 'bg-amber-100/70' : 'hover:bg-white'
                        }`}
                      >
                        <th
                          className={`p-1.5 text-left font-semibold whitespace-nowrap sticky left-0 ${
                            isActiveRow
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-slate-50 text-slate-800'
                          }`}
                        >
                          {qTok.surface.slice(0, 7)}
                        </th>
                        {tokens.map((_, j) => {
                          if (j > i) {
                            return (
                              <td
                                key={`cell-${i}-${j}`}
                                title="Locked Future Timeline (Causal Mask = -∞)"
                                className="p-1.5 text-slate-400 bg-slate-100 border border-slate-200 select-none"
                              >
                                —
                              </td>
                            );
                          }
                          const w = headData.matrix[i]?.[j] || 0;
                          const pct = Math.round(w * 100);
                          const alpha = Math.min(0.88, Math.max(0.06, w * 1.45));
                          return (
                            <td
                              key={`cell-${i}-${j}`}
                              style={{
                                backgroundColor: `rgba(8, 145, 178, ${alpha})`,
                              }}
                              className={`p-1.5 border border-slate-200 ${
                                w >= 0.35 ? 'text-white font-bold' : 'text-slate-900'
                              }`}
                            >
                              {pct}%
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <ChamberFooterNote
        explanation="Self-attention lets every token look backward at earlier tokens to gather context—for example, linking 'it' back to 'portal'. Because text is generated left-to-right, the lower-triangular causal mask strictly blocks future tokens so the model cannot cheat."
        realWorldScale="Real models use 32 to 96 parallel attention heads per layer"
      />
    </section>
  );
};
