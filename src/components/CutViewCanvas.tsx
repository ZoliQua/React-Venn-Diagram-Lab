import { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import type { RegionData } from '../models.ts';

interface CutViewCanvasProps {
  regionData: RegionData;
  scale: number;
  onRegionHover: (label: string | null) => void;
  onRegionClick: (label: string) => void;
  countOverrides?: Map<string, string> | null;
  colorMode?: 'depth' | 'heatmap';
}

function indexToLabel(index: number, sets: string[]): string {
  let label = '';
  for (let i = 0; i < sets.length; i++) {
    if (index & (1 << i)) label += sets[i];
  }
  return label;
}

function bitCount(v: number): number {
  let c = 0;
  while (v) { c += v & 1; v >>= 1; }
  return c;
}

function interpolateColor(bg: [number, number, number], fg: [number, number, number], t: number): string {
  const h = bg[0] + (fg[0] - bg[0]) * t;
  const s = bg[1] + (fg[1] - bg[1]) * t;
  const l = bg[2] + (fg[2] - bg[2]) * t;
  return `hsl(${h}, ${s}%, ${l}%)`;
}

/** RdBu diverging color scale: blue (#2166AC) → white (#F7F7F7) → red (#B2182B) */
function heatmapColor(t: number): string {
  // Clamp t to 0..1
  t = Math.max(0, Math.min(1, t));
  // Interpolate in RGB
  let r: number, g: number, b: number;
  if (t <= 0.5) {
    const s = t / 0.5; // 0..1 within blue→white
    r = 0x21 + (0xF7 - 0x21) * s;
    g = 0x66 + (0xF7 - 0x66) * s;
    b = 0xAC + (0xF7 - 0xAC) * s;
  } else {
    const s = (t - 0.5) / 0.5; // 0..1 within white→red
    r = 0xF7 + (0xB2 - 0xF7) * s;
    g = 0xF7 + (0x18 - 0xF7) * s;
    b = 0xF7 + (0x2B - 0xF7) * s;
  }
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

export function CutViewCanvas({ regionData, scale, onRegionHover, onRegionClick, countOverrides, colorMode = 'depth' }: CutViewCanvasProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const onHoverRef = useRef(onRegionHover);
  const onClickRef = useRef(onRegionClick);
  useEffect(() => { onHoverRef.current = onRegionHover; }, [onRegionHover]);
  useEffect(() => { onClickRef.current = onRegionClick; }, [onRegionClick]);

  const { n, sets, regions, curves } = regionData;

  // Depth-based color scheme
  const bgColor: [number, number, number] = [220, 15, 12];
  const fgColor: [number, number, number] = [0, 45, 45];
  const depthColors = useMemo(() => {
    const colors: string[] = [];
    for (let i = 0; i <= n; i++) {
      colors.push(interpolateColor(bgColor, fgColor, i / n));
    }
    return colors;
  }, [n]);

  // Heatmap: compute min/max from countOverrides
  const heatmapRange = useMemo(() => {
    if (colorMode !== 'heatmap' || !countOverrides) return { min: 0, max: 1 };
    let min = Infinity, max = -Infinity;
    for (const [, val] of countOverrides) {
      const num = parseInt(val, 10);
      if (!isNaN(num)) {
        if (num < min) min = num;
        if (num > max) max = num;
      }
    }
    if (min === Infinity) return { min: 0, max: 1 };
    return { min, max: max === min ? min + 1 : max };
  }, [colorMode, countOverrides]);

  // Get fill color for a region index
  const getRegionFill = useCallback((index: number): string => {
    if (colorMode === 'heatmap' && countOverrides) {
      const label = indexToLabel(index, sets);
      const val = countOverrides.get(label);
      const num = val ? parseInt(val, 10) : 0;
      if (isNaN(num) || num === 0) return '#3a3a4a'; // grey for zero
      const t = (num - heatmapRange.min) / (heatmapRange.max - heatmapRange.min);
      return heatmapColor(t);
    }
    return depthColors[bitCount(index)];
  }, [colorMode, countOverrides, sets, heatmapRange, depthColors]);

  const viewBox = useMemo(() => {
    const margin = 5;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const path of regions) {
      if (!path) continue;
      const nums = path.match(/-?\d+\.?\d*/g);
      if (!nums) continue;
      for (let i = 0; i < nums.length - 1; i += 2) {
        const x = parseFloat(nums[i]);
        const y = parseFloat(nums[i + 1]);
        if (x < minX) minX = x; if (y < minY) minY = y;
        if (x > maxX) maxX = x; if (y > maxY) maxY = y;
      }
    }
    return { x: minX - margin, y: minY - margin, w: (maxX - minX) + margin * 2, h: (maxY - minY) + margin * 2 };
  }, [regions]);

  const displaySize = 700 * scale;

  const handleEnter = useCallback((index: number) => {
    setHoveredIndex(index);
    onHoverRef.current(indexToLabel(index, sets));
  }, [sets]);

  const handleLeave = useCallback(() => {
    setHoveredIndex(null);
    onHoverRef.current(null);
  }, []);

  const handleClick = useCallback((index: number) => {
    onClickRef.current(indexToLabel(index, sets));
  }, [sets]);

  const sortedIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 1; i < regions.length; i++) {
      if (regions[i]) indices.push(i);
    }
    indices.sort((a, b) => bitCount(a) - bitCount(b) || a - b);
    return indices;
  }, [regions]);

  // Legend position (bottom-left of viewBox)
  const legendX = viewBox.x + 3;
  const legendY = viewBox.y + viewBox.h - 8;
  const legendW = viewBox.w * 0.2;

  return (
    <div className="canvas-inner">
      <svg
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        width={displaySize}
        height={displaySize}
        xmlns="http://www.w3.org/2000/svg"
        className="canvas-svg cut-view-svg"
        style={{ background: '#1a1a2e' }}
        onMouseLeave={handleLeave}
      >
        {sortedIndices.map(index => {
          const d = regions[index];
          if (!d) return null;
          const color = getRegionFill(index);
          const isHovered = hoveredIndex === index;
          const hasHover = hoveredIndex !== null;

          return (
            <path
              key={index}
              d={d}
              fill={color}
              stroke={color}
              strokeWidth={0.15}
              strokeLinejoin="round"
              opacity={hasHover ? (isHovered ? 1 : 0.25) : 1}
              style={{ cursor: 'pointer', transition: 'opacity 0.12s' }}
              onMouseEnter={() => handleEnter(index)}
              onClick={() => handleClick(index)}
            />
          );
        })}

        {hoveredIndex !== null && regions[hoveredIndex] && (
          <path
            d={regions[hoveredIndex]}
            fill="none"
            stroke="#ffffff"
            strokeWidth={0.5}
            strokeLinejoin="round"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {curves.map((curve, i) => (
          <path
            key={`curve-${i}`}
            d={curve}
            fill="none"
            stroke={hoveredIndex !== null
              ? (hoveredIndex & (1 << i) ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.05)')
              : 'rgba(255,255,255,0.15)'}
            strokeWidth={hoveredIndex !== null && (hoveredIndex & (1 << i)) ? 0.4 : 0.2}
            strokeLinejoin="round"
            style={{ pointerEvents: 'none', transition: 'opacity 0.12s' }}
          />
        ))}

        {hoveredIndex !== null && regions[hoveredIndex] && (() => {
          const d = regions[hoveredIndex];
          const nums = d.match(/-?\d+\.?\d*/g);
          if (!nums || nums.length < 2) return null;
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (let i = 0; i < nums.length - 1; i += 2) {
            const x = parseFloat(nums[i]), y = parseFloat(nums[i + 1]);
            if (x < minX) minX = x; if (y < minY) minY = y;
            if (x > maxX) maxX = x; if (y > maxY) maxY = y;
          }
          const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
          const label = indexToLabel(hoveredIndex, sets);
          const displayText = countOverrides?.get(label) ?? label;
          const fontSize = label.length <= 2 ? 5 : label.length <= 4 ? 3.5 : 2.5;
          return (
            <text
              x={cx} y={cy}
              fill="#ffffff"
              fontSize={fontSize}
              fontWeight="bold"
              fontFamily="Tahoma, sans-serif"
              textAnchor="middle"
              dominantBaseline="central"
              style={{ pointerEvents: 'none' }}
            >
              {displayText}
            </text>
          );
        })()}

        {/* Heatmap legend bar */}
        {colorMode === 'heatmap' && countOverrides && (
          <>
            <defs>
              <linearGradient id="heatmap-legend-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#2166AC" />
                <stop offset="50%" stopColor="#F7F7F7" />
                <stop offset="100%" stopColor="#B2182B" />
              </linearGradient>
            </defs>
            <rect x={legendX} y={legendY} width={legendW} height={2.5} rx={0.5}
              fill="url(#heatmap-legend-grad)" stroke="rgba(255,255,255,0.3)" strokeWidth={0.15} />
            <text x={legendX} y={legendY - 0.8} fill="#aaa" fontSize={2} fontFamily="Tahoma, sans-serif">
              {heatmapRange.min}
            </text>
            <text x={legendX + legendW} y={legendY - 0.8} fill="#aaa" fontSize={2} fontFamily="Tahoma, sans-serif" textAnchor="end">
              {heatmapRange.max}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
