import type { VennResult } from './csvParser.ts';
import { pairwiseStatistics } from './statistics.ts';
import type { PairwiseStat } from './statistics.ts';

export interface NetworkNode {
  id: string;
  label: string;
  size: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
  intersection: number;
  jaccard: number;
  foldEnrichment: number;
  overlapCoeff: number;
  dice: number;
  fdr: number;
  pValue: number;
  significant: boolean;
  nameA: string;
  nameB: string;
}

export type EdgeWeightMetric = 'intersection' | 'jaccard' | 'foldEnrichment' | 'overlapCoeff';

export interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

export function buildNetworkData(
  vennResult: VennResult,
  n: number,
  totalItems: number,
  setNames: string[],
  metric: EdgeWeightMetric = 'intersection',
): NetworkData {
  const letters = 'ABCDEFGHI'.slice(0, n).split('');
  const stats = pairwiseStatistics(vennResult, n, totalItems, setNames);
  const maxSize = Math.max(1, ...letters.map(l => vennResult.inclusive.get(l) ?? 0));

  const nodes: NetworkNode[] = letters.map(l => {
    const size = vennResult.inclusive.get(l) ?? 0;
    return {
      id: l,
      label: setNames[l.charCodeAt(0) - 65] ?? l,
      size,
      x: 0, y: 0, vx: 0, vy: 0,
      radius: 12 + Math.sqrt(size / maxSize) * 22,
    };
  });

  const edges: NetworkEdge[] = stats.map((s: PairwiseStat) => ({
    source: s.a,
    target: s.b,
    weight: getWeight(s, metric),
    intersection: s.intersection,
    jaccard: s.jaccard,
    foldEnrichment: s.foldEnrichment,
    overlapCoeff: s.overlapCoeff,
    dice: s.dice,
    fdr: s.fdr,
    pValue: s.pValue,
    significant: s.fdr < 0.05,
    nameA: s.nameA,
    nameB: s.nameB,
  }));

  return { nodes, edges };
}

function getWeight(s: PairwiseStat, metric: EdgeWeightMetric): number {
  switch (metric) {
    case 'intersection': return s.intersection;
    case 'jaccard': return s.jaccard;
    case 'foldEnrichment': return Math.min(s.foldEnrichment, 20);
    case 'overlapCoeff': return s.overlapCoeff;
  }
}

export function layoutNetwork(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  width: number,
  height: number,
): void {
  const cx = width / 2;
  const cy = height / 2;

  // Initialize: circular layout
  const angleStep = (2 * Math.PI) / nodes.length;
  const initRadius = Math.min(width, height) * 0.3;
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].x = cx + initRadius * Math.cos(angleStep * i - Math.PI / 2);
    nodes[i].y = cy + initRadius * Math.sin(angleStep * i - Math.PI / 2);
    nodes[i].vx = 0;
    nodes[i].vy = 0;
  }

  const ITERATIONS = 200;
  const REPULSION = 5000;
  const ATTRACTION = 0.01;
  const DAMPING = 0.9;
  const IDEAL_DIST = Math.min(width, height) * 0.25;

  // Normalize edge weights to [0, 1] for stable force calculation
  const maxWeight = Math.max(1, ...edges.map(e => e.weight));

  // Build fast index
  const nodeIdx = new Map<string, number>();
  nodes.forEach((n, i) => nodeIdx.set(n.id, i));

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Repulsion: all pairs push apart
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = REPULSION / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    // Attraction: connected edges pull together
    for (const edge of edges) {
      const si = nodeIdx.get(edge.source)!;
      const ti = nodeIdx.get(edge.target)!;
      const dx = nodes[ti].x - nodes[si].x;
      const dy = nodes[ti].y - nodes[si].y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const normWeight = edge.weight / maxWeight; // 0..1
      const strength = ATTRACTION * (1 + normWeight * 3);
      const displacement = dist - IDEAL_DIST;
      const fx = (dx / dist) * displacement * strength;
      const fy = (dy / dist) * displacement * strength;
      nodes[si].vx += fx;
      nodes[si].vy += fy;
      nodes[ti].vx -= fx;
      nodes[ti].vy -= fy;
    }

    // Center gravity
    for (const node of nodes) {
      node.vx += (cx - node.x) * 0.005;
      node.vy += (cy - node.y) * 0.005;
    }

    // Apply velocities with damping
    for (const node of nodes) {
      node.vx *= DAMPING;
      node.vy *= DAMPING;
      node.x += node.vx;
      node.y += node.vy;
    }
  }

  // Clamp nodes to stay within bounds (with padding for radius + label)
  const PAD = 40;
  for (const node of nodes) {
    const r = node.radius + PAD;
    node.x = Math.max(r, Math.min(width - r, node.x));
    node.y = Math.max(node.radius + 10, Math.min(height - r, node.y));
  }
}
