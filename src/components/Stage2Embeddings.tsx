import React, { useEffect, useRef, useState, useMemo } from 'react';
import { RotateCcw, ZoomIn, ZoomOut, Compass, CopyCheck, SlidersHorizontal } from 'lucide-react';
import { ChronoToken } from '../types/chrono';
import {
  DIMENSION_LABELS,
  MAX_EMBEDDING_DIMS,
  MIN_EMBEDDING_DIMS,
  cosineSimilarity,
} from '../engine/chronoEngine';
import { ChamberFooterNote } from './ChamberFooterNote';

interface Stage2EmbeddingsProps {
  tokens: ChronoToken[];
  embeddingDimensions: number;
  onEmbeddingDimensionsChange: (dims: number) => void;
  selectedTokenIndex: number | null;
  onSelectTokenIndex: (idx: number | null) => void;
  isHighlighted?: boolean;
}

interface ProjectedPoint {
  key: string;
  label: string;
  tokenIndex: number;
  sx: number;
  sy: number;
  depth: number;
  coords3d: [number, number, number];
  vector: number[];
}

export const Stage2Embeddings: React.FC<Stage2EmbeddingsProps> = ({
  tokens,
  embeddingDimensions,
  onEmbeddingDimensionsChange,
  selectedTokenIndex,
  onSelectTokenIndex,
  isHighlighted,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [yaw, setYaw] = useState(0.55);
  const [pitch, setPitch] = useState(0.32);
  const [zoom, setZoom] = useState(1.05);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<ProjectedPoint | null>(null);
  const projectedPointsRef = useRef<ProjectedPoint[]>([]);

  const activeDimLabels = useMemo(
    () => DIMENSION_LABELS.slice(0, embeddingDimensions),
    [embeddingDimensions]
  );

  // Active reference token for Cosine Similarity inspection
  const referenceToken: ChronoToken | null = useMemo(() => {
    if (tokens.length === 0) return null;
    if (selectedTokenIndex !== null && tokens[selectedTokenIndex]) {
      return tokens[selectedTokenIndex];
    }
    return tokens[tokens.length - 1];
  }, [tokens, selectedTokenIndex]);

  // Identify duplicate token groups (e.g. "The" and "the")
  const duplicateNormals = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tokens) {
      map.set(t.normalized, (map.get(t.normalized) || 0) + 1);
    }
    return Array.from(map.entries())
      .filter(([, count]) => count > 1)
      .map(([norm]) => norm);
  }, [tokens]);

  // Render interactive 3D Star-Map strictly for user input tokens
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(300, rect.width);
    const height = Math.max(280, rect.height);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const scale = Math.min(width, height) * 0.34 * zoom;

    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);

    const projectPoint = (coords: [number, number, number]) => {
      const [x, y, z] = coords;
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;
      const y2 = y * cosP - z1 * sinP;
      const z2 = y * sinP + z1 * cosP;
      const persp = 3.2 / (3.2 - z2 * 0.55);
      return {
        sx: cx + x1 * scale * persp,
        sy: cy - y2 * scale * persp,
        depth: z2,
      };
    };

    // Draw subtle concentric chronometer orbital rings & 3D axes
    ctx.save();
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
    ctx.lineWidth = 1;
    for (const r of [0.55, 0.95, 1.3]) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * scale * 0.85, 0, Math.PI * 2);
      ctx.stroke();
    }

    const origin = projectPoint([0, 0, 0]);
    const axes: { vec: [number, number, number]; label: string; color: string }[] = [
      { vec: [1.35, 0, 0], label: 'Axis X', color: 'rgba(180, 83, 9, 0.72)' },
      { vec: [0, 1.35, 0], label: 'Axis Y', color: 'rgba(8, 145, 178, 0.72)' },
      { vec: [0, 0, 1.35], label: 'Axis Z', color: 'rgba(2, 132, 199, 0.72)' },
    ];
    for (const ax of axes) {
      const end = projectPoint(ax.vec);
      ctx.strokeStyle = ax.color;
      ctx.beginPath();
      ctx.moveTo(origin.sx, origin.sy);
      ctx.lineTo(end.sx, end.sy);
      ctx.stroke();

      ctx.fillStyle = ax.color;
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.fillText(ax.label, end.sx + 4, end.sy + 3);
    }
    ctx.restore();

    const points: ProjectedPoint[] = [];
    const seenInput = new Set<string>();
    for (const tok of tokens) {
      if (seenInput.has(tok.normalized)) continue;
      seenInput.add(tok.normalized);
      const p = projectPoint(tok.coords3d);
      points.push({
        key: `tok-${tok.index}`,
        label: tok.surface,
        tokenIndex: tok.index,
        sx: p.sx,
        sy: p.sy,
        depth: p.depth,
        coords3d: tok.coords3d,
        vector: tok.vector,
      });
    }

    points.sort((a, b) => a.depth - b.depth);
    projectedPointsRef.current = points;

    if (points.length === 0) {
      ctx.fillStyle = '#64748B';
      ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Enter words above to plot your input tokens in 3D space', cx, cy - 6);
      return;
    }

    // Draw similarity vector line between referenceToken and hoveredPoint (or nearest other user token)
    if (referenceToken && points.length > 1) {
      const refProj = projectPoint(referenceToken.coords3d);
      const targetPoint =
        (hoveredPoint && hoveredPoint.label.toLowerCase() !== referenceToken.normalized
          ? hoveredPoint
          : null) ||
        points
          .filter((pt) => pt.label.toLowerCase() !== referenceToken.normalized)
          .sort(
            (a, b) =>
              cosineSimilarity(referenceToken.vector, b.vector) -
              cosineSimilarity(referenceToken.vector, a.vector)
          )[0];

      if (targetPoint) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(8, 145, 178, 0.72)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(refProj.sx, refProj.sy);
        ctx.lineTo(targetPoint.sx, targetPoint.sy);
        ctx.stroke();
        ctx.restore();
      }
    }

    for (const pt of points) {
      const isHovered = hoveredPoint?.key === pt.key;
      const isRef =
        referenceToken && pt.label.toLowerCase() === referenceToken.normalized;

      const radius = isRef || isHovered ? 7.5 : 5.5;
      const color = isRef ? '#D97706' : '#0891B2';

      if (isHovered || isRef) {
        ctx.beginPath();
        ctx.arc(pt.sx, pt.sy, radius + 5, 0, Math.PI * 2);
        ctx.fillStyle = isRef ? 'rgba(217, 119, 6, 0.20)' : 'rgba(8, 145, 178, 0.18)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(pt.sx, pt.sy, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.fillStyle = isRef ? '#92400E' : '#0F172A';
      ctx.fillText(pt.label, pt.sx + radius + 5, pt.sy + 3.5);
    }
  }, [tokens, yaw, pitch, zoom, hoveredPoint, referenceToken, embeddingDimensions]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, yaw, pitch };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDragging && dragStartRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setYaw(dragStartRef.current.yaw + dx * 0.008);
      setPitch(Math.max(-1.3, Math.min(1.3, dragStartRef.current.pitch + dy * 0.008)));
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let closest: ProjectedPoint | null = null;
    let bestDist = 18;
    for (const pt of projectedPointsRef.current) {
      const d = Math.hypot(pt.sx - mx, pt.sy - my);
      if (d < bestDist) {
        bestDist = d;
        closest = pt;
      }
    }
    setHoveredPoint(closest);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleCanvasClick = () => {
    if (hoveredPoint) {
      onSelectTokenIndex(hoveredPoint.tokenIndex);
    }
  };

  const inspectedTarget =
    hoveredPoint ||
    (referenceToken
      ? {
          key: `ref-${referenceToken.index}`,
          label: referenceToken.surface,
          tokenIndex: referenceToken.index,
          coords3d: referenceToken.coords3d,
          vector: referenceToken.vector,
          sx: 0,
          sy: 0,
          depth: 0,
        }
      : null);

  const liveCosineSim =
    referenceToken && inspectedTarget
      ? cosineSimilarity(referenceToken.vector, inspectedTarget.vector)
      : 1;

  return (
    <section
      aria-labelledby="stage-2-heading"
      className={`rounded-2xl bg-white border transition-all duration-300 p-5 sm:p-6 shadow-xs ${
        isHighlighted
          ? 'border-cyan-500 ring-2 ring-cyan-400/30'
          : 'border-slate-200'
      }`}
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="text-xs font-mono font-medium text-cyan-700 tracking-wide">
            Stage 2 · Vector Space & Semantic Geometry
          </div>
          <h2 id="stage-2-heading" className="font-display text-xl sm:text-2xl font-semibold text-slate-900 mt-0.5">
            Semantic Embedding Chamber
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {duplicateNormals.length > 0 && (
            <div className="inline-flex items-center gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-300 rounded-lg px-3 py-1.5">
              <CopyCheck className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
              <span>
                Shared Signature:{' '}
                <span className="font-mono font-semibold">
                  {duplicateNormals.map((d) => `"${d}"`).join(', ')}
                </span>
              </span>
            </div>
          )}

          {/* Quick Dimension Presets */}
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
            {[4, 8, 12, 16].map((dim) => (
              <button
                key={dim}
                type="button"
                onClick={() => onEmbeddingDimensionsChange(dim)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                  embeddingDimensions === dim
                    ? 'bg-cyan-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {dim}D
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Customizable Embedding Dimensions Bar */}
      <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3 mb-2">
            <label
              htmlFor="embedding-dims-slider"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800"
            >
              <SlidersHorizontal className="w-4 h-4 text-cyan-600" aria-hidden="true" />
              Custom Embedding Dimensions
            </label>
            <span className="font-mono text-xs text-slate-500">
              Range: {MIN_EMBEDDING_DIMS}D – {MAX_EMBEDDING_DIMS}D (projected to 3D)
            </span>
          </div>
          <input
            id="embedding-dims-slider"
            type="range"
            min={MIN_EMBEDDING_DIMS}
            max={MAX_EMBEDDING_DIMS}
            step={1}
            value={embeddingDimensions}
            onChange={(e) => onEmbeddingDimensionsChange(Number(e.target.value))}
            className="w-full chrono-slider cyan"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="embedding-dims-number" className="text-xs font-medium text-slate-600">
            Exact Dims:
          </label>
          <input
            id="embedding-dims-number"
            type="number"
            min={MIN_EMBEDDING_DIMS}
            max={MAX_EMBEDDING_DIMS}
            step={1}
            value={embeddingDimensions}
            onChange={(e) => {
              const val = Math.round(Number(e.target.value));
              if (!Number.isNaN(val)) {
                onEmbeddingDimensionsChange(
                  Math.max(MIN_EMBEDDING_DIMS, Math.min(MAX_EMBEDDING_DIMS, val))
                );
              }
            }}
            className="w-16 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-sm font-bold text-cyan-700 text-center focus:outline-none focus:border-cyan-600"
          />
        </div>
      </div>

      {/* Main Split: N-D Vector Strips (Left) + Interactive 3D Star-Map (Right) */}
      <div className="mt-5 grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Left: N-D Token Vector Strips */}
        <div className="xl:col-span-7 flex flex-col">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
            <span>{embeddingDimensions}-Dimensional Semantic Vectors (Positive: Cyan · Negative: Amber)</span>
            <span className="font-mono text-slate-500">Range [-1.00, +1.00]</span>
          </div>

          <div className="flex-1 rounded-xl bg-slate-50 border border-slate-200 p-3 sm:p-4 overflow-x-auto chrono-scroll">
            {tokens.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-600">
                Type a custom sentence above to inspect each input token’s {embeddingDimensions}-dimensional vector.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-mono text-slate-500">
                    <th className="py-2 pr-3 font-medium sticky left-0 bg-slate-50">Token</th>
                    {activeDimLabels.map((dim) => (
                      <th key={dim} className="py-2 px-2 font-medium text-center min-w-[62px]">
                        {dim}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70">
                  {tokens.map((tok) => {
                    const isSelected = referenceToken?.index === tok.index;
                    const isShared = tok.duplicateGroupCount > 1;
                    const matchesRef =
                      referenceToken && tok.normalized === referenceToken.normalized;

                    return (
                      <tr
                        key={`vec-${tok.index}`}
                        onClick={() => onSelectTokenIndex(tok.index)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-amber-100/70'
                            : matchesRef
                              ? 'bg-amber-50'
                              : 'hover:bg-white'
                        }`}
                      >
                        <td className="py-2.5 pr-3 whitespace-nowrap sticky left-0 bg-inherit">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono text-xs font-semibold ${
                                isSelected || matchesRef ? 'text-amber-800' : 'text-slate-900'
                              }`}
                            >
                              {tok.surface}
                            </span>
                            <span className="font-mono text-[11px] text-slate-400">
                              #{tok.id}
                            </span>
                            {isShared && (
                              <span className="text-[10px] font-mono text-cyan-700 font-medium">
                                ≡ identical
                              </span>
                            )}
                          </div>
                        </td>
                        {tok.vector.map((val, dIdx) => {
                          const pct = Math.min(100, Math.abs(val) * 100);
                          const isPos = val >= 0;
                          return (
                            <td key={dIdx} className="py-2 px-1.5">
                              <div className="flex flex-col items-center gap-1">
                                <div className="w-full h-2 bg-slate-200 rounded-sm overflow-hidden flex items-center relative">
                                  <div className="w-1/2 h-full flex justify-end">
                                    {!isPos && (
                                      <div
                                        className="h-full bg-amber-500 rounded-l-sm"
                                        style={{ width: `${pct}%` }}
                                      />
                                    )}
                                  </div>
                                  <div className="w-px h-full bg-slate-400" />
                                  <div className="w-1/2 h-full flex justify-start">
                                    {isPos && (
                                      <div
                                        className="h-full bg-cyan-600 rounded-r-sm"
                                        style={{ width: `${pct}%` }}
                                      />
                                    )}
                                  </div>
                                </div>
                                <span
                                  className={`font-mono text-[10px] font-medium ${
                                    isPos ? 'text-cyan-800' : 'text-amber-800'
                                  }`}
                                >
                                  {val >= 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
                                </span>
                              </div>
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

        {/* Right: Interactive 3D Semantic Projection (User Input Tokens Only) */}
        <div className="xl:col-span-5 flex flex-col">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
            <span className="inline-flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-600" aria-hidden="true" />
              3D Input Token Projection ({embeddingDimensions}D → 3D, drag to rotate)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
                aria-label="Zoom in 3D projection"
                className="p-1.5 rounded-md bg-white border border-slate-300 text-slate-700 hover:text-cyan-700 cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.65, z - 0.15))}
                aria-label="Zoom out 3D projection"
                className="p-1.5 rounded-md bg-white border border-slate-300 text-slate-700 hover:text-cyan-700 cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setYaw(0.55);
                  setPitch(0.32);
                  setZoom(1.05);
                }}
                aria-label="Reset 3D camera"
                className="p-1.5 rounded-md bg-white border border-slate-300 text-slate-700 hover:text-amber-700 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="relative flex-1 min-h-[310px] rounded-xl overflow-hidden border border-slate-200 bg-[#F8FAFC]">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onClick={handleCanvasClick}
              onMouseLeave={() => {
                handleMouseUp();
                setHoveredPoint(null);
              }}
              className={`w-full h-full min-h-[310px] block ${
                isDragging ? 'cursor-grabbing' : 'cursor-crosshair'
              }`}
            />

            {/* Floating Cosine Similarity Telemetry Readout */}
            {referenceToken && inspectedTarget && (
              <div className="absolute bottom-3 left-3 right-3 rounded-lg bg-white/95 backdrop-blur border border-slate-300 shadow-sm px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs pointer-events-none">
                <div className="font-mono text-slate-900">
                  <span className="text-amber-700 font-semibold">{referenceToken.surface}</span>
                  <span className="text-slate-400 mx-1.5">↔</span>
                  <span className="text-cyan-700 font-semibold">{inspectedTarget.label}</span>
                </div>
                <div className="font-mono text-slate-700">
                  Cosine Sim:{' '}
                  <span className="font-semibold text-cyan-700">
                    {liveCosineSim.toFixed(3)}
                  </span>
                  <span className="text-slate-500 ml-2">
                    ({inspectedTarget.coords3d.map((v) => v.toFixed(2)).join(', ')})
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
              Selected Token
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 inline-block" />
              Other Input Tokens (hover or click to compare)
            </span>
          </div>
        </div>
      </div>

      <ChamberFooterNote
        explanation="Each token ID maps to a vector of numbers across your chosen embedding dimensions. Identical words always share the exact same vector coordinates, while rotating the 3D projection lets you inspect cosine similarity between the tokens you entered."
        realWorldScale="Real models use 4,096 to 12,288 embedding dimensions"
      />
    </section>
  );
};
