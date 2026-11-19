import React, { useEffect, useRef, useState, useMemo } from 'react';
import { RotateCcw, ZoomIn, ZoomOut, Compass, CopyCheck } from 'lucide-react';
import { ChronoToken, SemanticAnchor } from '../types/chrono';
import { DIMENSION_LABELS, cosineSimilarity } from '../engine/chronoEngine';
import { ChamberFooterNote } from './ChamberFooterNote';

interface Stage2EmbeddingsProps {
  tokens: ChronoToken[];
  anchors: SemanticAnchor[];
  selectedTokenIndex: number | null;
  onSelectTokenIndex: (idx: number | null) => void;
  isHighlighted?: boolean;
}

const CLUSTER_COLORS: Record<SemanticAnchor['cluster'], string> = {
  Animals: '#D97706',
  Actions: '#0891B2',
  Locations: '#059669',
  'Time Concepts': '#0284C7',
};

interface ProjectedPoint {
  key: string;
  label: string;
  isInputToken: boolean;
  tokenIndex?: number;
  cluster?: SemanticAnchor['cluster'];
  sx: number;
  sy: number;
  depth: number;
  coords3d: [number, number, number];
  vector8d: number[];
}

export const Stage2Embeddings: React.FC<Stage2EmbeddingsProps> = ({
  tokens,
  anchors,
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

  // Render interactive 3D Star-Map on Light Canvas
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

    // Clear light lab canvas
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
      { vec: [1.35, 0, 0], label: 'Entity Axis', color: 'rgba(180, 83, 9, 0.72)' },
      { vec: [0, 1.35, 0], label: 'Action Axis', color: 'rgba(8, 145, 178, 0.72)' },
      { vec: [0, 0, 1.35], label: 'Temporal Axis', color: 'rgba(2, 132, 199, 0.72)' },
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

    for (const anchor of anchors) {
      const p = projectPoint(anchor.coords3d);
      points.push({
        key: `anchor-${anchor.label}`,
        label: anchor.label,
        isInputToken: false,
        cluster: anchor.cluster,
        sx: p.sx,
        sy: p.sy,
        depth: p.depth,
        coords3d: anchor.coords3d,
        vector8d: anchor.vector8d,
      });
    }

    const seenInput = new Set<string>();
    for (const tok of tokens) {
      if (seenInput.has(tok.normalized)) continue;
      seenInput.add(tok.normalized);
      const p = projectPoint(tok.coords3d);
      points.push({
        key: `tok-${tok.index}`,
        label: tok.surface,
        isInputToken: true,
        tokenIndex: tok.index,
        sx: p.sx,
        sy: p.sy,
        depth: p.depth,
        coords3d: tok.coords3d,
        vector8d: tok.vector8d,
      });
    }

    points.sort((a, b) => a.depth - b.depth);
    projectedPointsRef.current = points;

    if (referenceToken) {
      const refProj = projectPoint(referenceToken.coords3d);
      const targetPoint =
        hoveredPoint ||
        points
          .filter((pt) => !pt.isInputToken)
          .sort(
            (a, b) =>
              cosineSimilarity(referenceToken.vector8d, b.vector8d) -
              cosineSimilarity(referenceToken.vector8d, a.vector8d)
          )[0];

      if (targetPoint) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(8, 145, 178, 0.7)';
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
        pt.isInputToken &&
        referenceToken &&
        pt.label.toLowerCase() === referenceToken.normalized;

      const radius = pt.isInputToken ? (isRef || isHovered ? 7 : 5.5) : isHovered ? 5.5 : 4;
      const color = pt.isInputToken
        ? '#D97706'
        : pt.cluster
          ? CLUSTER_COLORS[pt.cluster]
          : '#64748B';

      if (pt.isInputToken || isHovered || isRef) {
        ctx.beginPath();
        ctx.arc(pt.sx, pt.sy, radius + 5, 0, Math.PI * 2);
        ctx.fillStyle = pt.isInputToken
          ? 'rgba(217, 119, 6, 0.18)'
          : 'rgba(8, 145, 178, 0.16)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(pt.sx, pt.sy, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      ctx.font = pt.isInputToken
        ? '700 11px "JetBrains Mono", monospace'
        : '500 10px "JetBrains Mono", monospace';
      ctx.fillStyle = pt.isInputToken ? '#92400E' : '#334155';
      ctx.fillText(pt.label, pt.sx + radius + 5, pt.sy + 3.5);
    }
  }, [tokens, anchors, yaw, pitch, zoom, hoveredPoint, referenceToken]);

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

  const inspectedTarget =
    hoveredPoint ||
    (referenceToken
      ? {
          key: `ref-${referenceToken.index}`,
          label: referenceToken.surface,
          isInputToken: true,
          coords3d: referenceToken.coords3d,
          vector8d: referenceToken.vector8d,
          sx: 0,
          sy: 0,
          depth: 0,
        }
      : null);

  const liveCosineSim =
    referenceToken && inspectedTarget
      ? cosineSimilarity(referenceToken.vector8d, inspectedTarget.vector8d)
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

        {duplicateNormals.length > 0 && (
          <div className="inline-flex items-center gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-300 rounded-lg px-3 py-1.5">
            <CopyCheck className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
            <span>
              Identical Token Signature Detected:{' '}
              <span className="font-mono font-semibold">
                {duplicateNormals.map((d) => `"${d}"`).join(', ')}
              </span>{' '}
              share identical 8D vectors
            </span>
          </div>
        )}
      </div>

      {/* Main Split: 8D Vector Strips (Left) + Interactive 3D Star-Map (Right) */}
      <div className="mt-5 grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Left: 8D Token Vector Strips */}
        <div className="xl:col-span-7 flex flex-col">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
            <span>8-Dimensional Semantic Vectors (Positive: Cyan · Negative: Amber)</span>
            <span className="font-mono text-slate-500">Range [-1.00, +1.00]</span>
          </div>

          <div className="flex-1 rounded-xl bg-slate-50 border border-slate-200 p-3 sm:p-4 overflow-x-auto chrono-scroll">
            {tokens.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-600">
                Type a custom sentence above to inspect each token’s 8-dimensional embedding vector.
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-mono text-slate-500">
                    <th className="py-2 pr-3 font-medium">Token</th>
                    {DIMENSION_LABELS.map((dim) => (
                      <th key={dim} className="py-2 px-1.5 font-medium text-center">
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
                        <td className="py-2.5 pr-3 whitespace-nowrap">
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
                        {tok.vector8d.map((val, dIdx) => {
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

        {/* Right: Interactive 3D Semantic Cluster Projection */}
        <div className="xl:col-span-5 flex flex-col">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
            <span className="inline-flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-600" aria-hidden="true" />
              Interactive 3D Semantic Star-Map (drag to rotate)
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
              Input Tokens
            </span>
            {(Object.keys(CLUSTER_COLORS) as SemanticAnchor['cluster'][]).map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: CLUSTER_COLORS[c] }}
                />
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      <ChamberFooterNote
        explanation="Each token ID looks up a row of numbers called an embedding vector. Words with similar roles—like 'stepped' and 'jumped', or 'portal' and 'floor'—cluster into nearby neighborhoods in multi-dimensional space, while identical words always map to the exact same coordinates."
        realWorldScale="Real models use 4,096 to 12,288 embedding dimensions"
      />
    </section>
  );
};
