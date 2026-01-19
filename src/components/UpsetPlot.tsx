import { useMemo, useState, useCallback, useRef } from 'react';
import type { UpsetData, UpsetIntersection } from '../utils/upsetData.ts';
import { sortBySize, sortByDegree, computeSetSizes } from '../utils/upsetData.ts';

export type UpsetColorMode = 'depth' | 'heatmap' | 'custom';
export type UpsetSortMode = 'size' | 'degree';

interface UpsetPlotProps {
  data: UpsetData;
  scale: number;
  colorMode?: UpsetColorMode;
  customColor?: string;
  heatmapColors?: { low: string; mid: string; high: string };
  sortMode?: UpsetSortMode;
  threshold?: number;
  pageSize?: number;
  onRegionHover?: (label: string | null) => void;
  onRegionClick?: (label: string) => void;
  lockedLabel?: string | null;
  plotBackground?: 'dark' | 'white';
}

// Standard Venn colors for sets
const SET_COLORS: Record<string, string> = {
  A: '#FFF200', B: '#2E3192', C: '#ED1C24', D: '#808285',
  E: '#3C2415', F: '#9E1F63', G: '#CA4B9B', H: '#21AED1', I: '#F7941E',
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function lerpRgb(a: [number, number, number], b: [number, number, number], t: number): string {
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}

function heatmapColor(t: number, low: string, mid: string, high: string): string {
  t = Math.max(0, Math.min(1, t));
  if (t <= 0.5) return lerpRgb(hexToRgb(low), hexToRgb(mid), t / 0.5);
  return lerpRgb(hexToRgb(mid), hexToRgb(high), (t - 0.5) / 0.5);
}

// Layout constants
const LEFT_LABEL_W = 28;       // space for set letter label on the left
const SET_NUM_W = 36;          // space for the numeric size value
const SET_BAR_W = 120;         // horizontal bar chart width (set sizes)
const GAP = 16;                // gap between set bars and matrix
const DOT_R = 5;               // dot radius
const COL_W = 18;              // column width in matrix
const ROW_H = 20;              // row height in matrix
const BAR_TOP_H = 140;         // height for intersection bars above matrix
const MARGIN = { top: 20, right: 20, bottom: 20, left: 10 };

export function UpsetPlot({
  data,
  scale,
  colorMode = 'depth',
  customColor = '#4a90d9',
  heatmapColors = { low: '#2166AC', mid: '#F7F7F7', high: '#B2182B' },
  sortMode = 'size',
  threshold = 0,
  pageSize = 50,
  onRegionHover,
  onRegionClick,
  lockedLabel,
  plotBackground = 'dark',
}: UpsetPlotProps) {
  const isWhite = plotBackground === 'white';
  const clr = {
    text: isWhite ? '#222' : '#aaa',
    textBright: isWhite ? '#000' : '#fff',
    textDim: isWhite ? '#555' : '#888',
    textFaint: isWhite ? '#777' : '#666',
    grid: isWhite ? '#e0e0e0' : '#2a2a3a',
    axis: isWhite ? '#bbb' : '#444',
    dot: isWhite ? '#333' : '#aaa',
    dotEmpty: isWhite ? '#ccc' : '#3a3a4a',
    dotEmptyStroke: isWhite ? '#bbb' : '#3a3a4a',
    line: isWhite ? '#555' : '#777',
    tooltipBg: isWhite ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.85)',
    tooltipBorder: isWhite ? '#ccc' : '#555',
    tooltipText: isWhite ? '#222' : '#fff',
  };
  const [page, setPage] = useState(0);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [tooltipInfo, setTooltipInfo] = useState<{ x: number; y: number; label: string; size: number; members: string[] } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Sort & filter intersections
  const sorted = useMemo(() => {
    const s = sortMode === 'size' ? sortBySize(data) : sortByDegree(data);
    return threshold > 0 ? s.filter(i => i.size >= threshold) : s;
  }, [data, sortMode, threshold]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageIntersections = useMemo(() => {
    const start = page * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const setSizes = useMemo(() => computeSetSizes(data), [data]);
  const maxSetSize = useMemo(() => Math.max(1, ...setSizes.values()), [setSizes]);
  const maxIntSize = useMemo(() => Math.max(1, ...pageIntersections.map(i => i.size)), [pageIntersections]);

  const activeLabel = lockedLabel ?? hoveredLabel;

  // Color for a bar based on mode
  const getBarColor = useCallback((int: UpsetIntersection): string => {
    if (colorMode === 'custom') return customColor;
    if (colorMode === 'heatmap') {
      const t = maxIntSize > 0 ? int.size / maxIntSize : 0;
      return heatmapColor(t, heatmapColors.low, heatmapColors.mid, heatmapColors.high);
    }
    // depth: color by number of members
    const depth = int.members.length;
    const maxDepth = data.sets.length;
    const t = maxDepth > 1 ? (depth - 1) / (maxDepth - 1) : 0;
    return lerpRgb([60, 80, 180], [220, 50, 50], t);
  }, [colorMode, customColor, heatmapColors, maxIntSize, data.sets.length]);

  // Dimensions
  const nSets = data.sets.length;
  const nCols = pageIntersections.length;
  const matrixW = nCols * COL_W;
  const matrixH = nSets * ROW_H;
  const totalW = MARGIN.left + LEFT_LABEL_W + SET_NUM_W + SET_BAR_W + GAP + matrixW + MARGIN.right;
  const totalH = MARGIN.top + BAR_TOP_H + matrixH + MARGIN.bottom;
  const matrixX = MARGIN.left + LEFT_LABEL_W + SET_NUM_W + SET_BAR_W + GAP;
  const matrixY = MARGIN.top + BAR_TOP_H;

  const handleBarEnter = useCallback((int: UpsetIntersection, colIdx: number) => {
    setHoveredLabel(int.label);
    onRegionHover?.(int.label);
    // Tooltip position in SVG coords
    const x = matrixX + colIdx * COL_W + COL_W / 2;
    const y = matrixY - 8;
    setTooltipInfo({ x, y, label: int.label, size: int.size, members: int.members });
  }, [matrixX, matrixY, onRegionHover]);

  const handleBarLeave = useCallback(() => {
    setHoveredLabel(null);
    onRegionHover?.(null);
    setTooltipInfo(null);
  }, [onRegionHover]);

  const handleBarClick = useCallback((int: UpsetIntersection) => {
    onRegionClick?.(int.label);
  }, [onRegionClick]);

  const displaySize = Math.max(totalW, 500) * scale;
  const aspectRatio = totalH / totalW;

  return (
    <div className="canvas-inner" style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${totalW} ${totalH}`}
        width={displaySize}
        height={displaySize * aspectRatio}
        xmlns="http://www.w3.org/2000/svg"
        className="canvas-svg upset-plot-svg"
        style={{ background: plotBackground === 'white' ? '#ffffff' : '#1a1a2e' }}
      >
        {/* ── Set size bars (horizontal, left side) ── */}
        {data.sets.map((set, i) => {
          const y = matrixY + i * ROW_H;
          const barAreaX = MARGIN.left + LEFT_LABEL_W + SET_NUM_W;
          const barW = maxSetSize > 0 ? (setSizes.get(set) ?? 0) / maxSetSize * SET_BAR_W : 0;
          const barX = barAreaX + SET_BAR_W - barW;
          const isActive = activeLabel ? activeLabel.includes(set) : false;

          return (
            <g key={`set-${set}`}>
              {/* Set label (left-aligned) */}
              <text
                x={MARGIN.left + 4}
                y={y + ROW_H / 2}
                fill={isActive ? clr.textBright : clr.text}
                fontSize={12}
                fontFamily="Tahoma, sans-serif"
                fontWeight={isActive ? 'bold' : 'normal'}
                textAnchor="start"
                dominantBaseline="central"
              >
                {set}
              </text>
              {/* Size value (after label, right-aligned within its column) */}
              <text
                x={MARGIN.left + LEFT_LABEL_W + SET_NUM_W - 6}
                y={y + ROW_H / 2}
                fill={clr.textDim}
                fontSize={10}
                fontFamily="Tahoma, sans-serif"
                textAnchor="end"
                dominantBaseline="central"
              >
                {setSizes.get(set) ?? 0}
              </text>
              {/* Horizontal bar (right-aligned in bar area) */}
              <rect
                x={barX}
                y={y + 3}
                width={barW}
                height={ROW_H - 6}
                rx={2}
                fill={SET_COLORS[set] ?? '#888'}
                opacity={activeLabel ? (isActive ? 0.9 : 0.25) : 0.7}
                style={{ transition: 'opacity 0.12s' }}
              />
            </g>
          );
        })}

        {/* ── Set size axis line ── */}
        <line
          x1={MARGIN.left + LEFT_LABEL_W + SET_NUM_W}
          y1={matrixY - 2}
          x2={MARGIN.left + LEFT_LABEL_W + SET_NUM_W + SET_BAR_W}
          y2={matrixY - 2}
          stroke={clr.axis}
          strokeWidth={1}
        />
        <text
          x={MARGIN.left + LEFT_LABEL_W + SET_NUM_W + SET_BAR_W / 2}
          y={matrixY - 6}
          fill={clr.textFaint}
          fontSize={9}
          fontFamily="Tahoma, sans-serif"
          textAnchor="middle"
        >
          Set Size
        </text>

        {/* ── Intersection bars (vertical, above matrix) ── */}
        {pageIntersections.map((int, ci) => {
          const x = matrixX + ci * COL_W;
          const barH = maxIntSize > 0 ? (int.size / maxIntSize) * (BAR_TOP_H - 30) : 0;
          const barY = matrixY - 6 - barH;
          const isActive = activeLabel === int.label;
          const hasActive = activeLabel !== null;

          return (
            <g key={`bar-${int.label}`}>
              <rect
                x={x + (COL_W - 10) / 2}
                y={barY}
                width={10}
                height={barH}
                rx={2}
                fill={getBarColor(int)}
                opacity={hasActive ? (isActive ? 1 : 0.25) : 0.85}
                style={{ cursor: 'pointer', transition: 'opacity 0.12s' }}
                onMouseEnter={() => handleBarEnter(int, ci)}
                onMouseLeave={handleBarLeave}
                onClick={() => handleBarClick(int)}
              />
              {/* Value above bar */}
              <text
                x={x + COL_W / 2}
                y={barY - 3}
                fill={hasActive ? (isActive ? clr.textBright : clr.textDim) : clr.text}
                fontSize={8}
                fontFamily="Tahoma, sans-serif"
                textAnchor="middle"
                style={{ transition: 'fill 0.12s' }}
              >
                {int.size}
              </text>
            </g>
          );
        })}

        {/* ── Intersection axis label ── */}
        <text
          x={matrixX + matrixW / 2}
          y={MARGIN.top + 6}
          fill={clr.textFaint}
          fontSize={9}
          fontFamily="Tahoma, sans-serif"
          textAnchor="middle"
        >
          Intersection Size
        </text>

        {/* ── Matrix grid lines ── */}
        {data.sets.map((_, i) => (
          <line
            key={`hline-${i}`}
            x1={matrixX - 4}
            x2={matrixX + matrixW}
            y1={matrixY + i * ROW_H + ROW_H / 2}
            y2={matrixY + i * ROW_H + ROW_H / 2}
            stroke={clr.grid}
            strokeWidth={1}
          />
        ))}

        {/* ── Matrix dots & connecting lines ── */}
        {pageIntersections.map((int, ci) => {
          const cx = matrixX + ci * COL_W + COL_W / 2;
          const isActive = activeLabel === int.label;
          const hasActive = activeLabel !== null;

          // Find filled dot positions for connecting line
          const filledRows = data.sets
            .map((set, ri) => ({ set, ri }))
            .filter(({ set }) => int.members.includes(set));
          const minRow = Math.min(...filledRows.map(f => f.ri));
          const maxRow = Math.max(...filledRows.map(f => f.ri));

          return (
            <g
              key={`col-${int.label}`}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => handleBarEnter(int, ci)}
              onMouseLeave={handleBarLeave}
              onClick={() => handleBarClick(int)}
            >
              {/* Connecting line between filled dots */}
              {filledRows.length > 1 && (
                <line
                  x1={cx}
                  y1={matrixY + minRow * ROW_H + ROW_H / 2}
                  x2={cx}
                  y2={matrixY + maxRow * ROW_H + ROW_H / 2}
                  stroke={hasActive ? (isActive ? clr.dot : clr.textDim) : clr.line}
                  strokeWidth={2}
                  style={{ transition: 'stroke 0.12s' }}
                />
              )}

              {/* Dots for each set */}
              {data.sets.map((set, ri) => {
                const cy = matrixY + ri * ROW_H + ROW_H / 2;
                const isMember = int.members.includes(set);
                return (
                  <circle
                    key={`dot-${int.label}-${set}`}
                    cx={cx}
                    cy={cy}
                    r={DOT_R}
                    fill={isMember
                      ? (hasActive ? (isActive ? clr.dot : clr.textDim) : clr.dot)
                      : 'transparent'
                    }
                    stroke={isMember ? 'none' : (hasActive ? (isActive ? clr.textFaint : clr.grid) : clr.dotEmptyStroke)}
                    strokeWidth={1.5}
                    style={{ transition: 'fill 0.12s, stroke 0.12s' }}
                  />
                );
              })}
            </g>
          );
        })}

        {/* ── Tooltip ── */}
        {tooltipInfo && (
          <g style={{ pointerEvents: 'none' }}>
            <rect
              x={tooltipInfo.x - 40}
              y={tooltipInfo.y - 32}
              width={80}
              height={24}
              rx={4}
              fill={clr.tooltipBg}
              stroke={clr.tooltipBorder}
              strokeWidth={0.5}
            />
            <text
              x={tooltipInfo.x}
              y={tooltipInfo.y - 24}
              fill={clr.tooltipText}
              fontSize={9}
              fontFamily="Tahoma, sans-serif"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {tooltipInfo.members.join(' \u2229 ')} = {tooltipInfo.size}
            </text>
          </g>
        )}

        {/* ── Pagination info ── */}
        {totalPages > 1 && (
          <text
            x={matrixX + matrixW / 2}
            y={totalH - 6}
            fill={clr.textFaint}
            fontSize={9}
            fontFamily="Tahoma, sans-serif"
            textAnchor="middle"
          >
            Page {page + 1} / {totalPages} ({sorted.length} intersections)
          </text>
        )}
      </svg>

      {/* ── Pagination controls (HTML overlay) ── */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 8, marginTop: 6,
        }}>
          <button
            className="btn btn-sm"
            disabled={page === 0}
            onClick={() => setPage(p => Math.max(0, p - 1))}
          >
            &larr; Prev
          </button>
          <button
            className="btn btn-sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
