/**
 * Build a print-optimized Network diagram SVG string.
 * White background, dark text/strokes, for PDF embedding.
 */
import type { NetworkData, EdgeWeightMetric } from './networkData.ts';
import { layoutNetwork } from './networkData.ts';

const SET_COLORS: Record<string, string> = {
  A: '#FFF200', B: '#2E3192', C: '#ED1C24', D: '#808285',
  E: '#3C2415', F: '#9E1F63', G: '#CA4B9B', H: '#21AED1', I: '#F7941E',
};

function esc(s: string | number): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function truncName(name: string, max: number): string {
  return name.length > max ? name.slice(0, max) + '...' : name;
}

export function buildNetworkSvgString(
  data: NetworkData,
  metric: EdgeWeightMetric = 'intersection',
): string {
  const WIDTH = 600;
  const HEIGHT = 500;

  const nodes = data.nodes.map(n => ({ ...n }));
  const edges = data.edges.filter(e => e.intersection > 0);
  layoutNetwork(nodes, edges, WIDTH, HEIGHT);

  const maxWeight = Math.max(1, ...edges.map(e => e.weight));
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">`);
  parts.push(`<rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>`);

  // Edges
  for (const edge of edges) {
    const src = nodeMap.get(edge.source)!;
    const tgt = nodeMap.get(edge.target)!;
    const thickness = 1 + (edge.weight / maxWeight) * 8;
    const color = edge.significant ? '#2e7d32' : '#999';
    const mx = (src.x + tgt.x) / 2;
    const my = (src.y + tgt.y) / 2;

    parts.push(`<line x1="${src.x}" y1="${src.y}" x2="${tgt.x}" y2="${tgt.y}" stroke="${color}" stroke-width="${thickness}" stroke-opacity="0.6" stroke-linecap="round"/>`);
    // Edge label
    let label: string;
    switch (metric) {
      case 'jaccard': label = edge.jaccard.toFixed(3); break;
      case 'foldEnrichment': label = edge.foldEnrichment.toFixed(2); break;
      case 'overlapCoeff': label = edge.overlapCoeff.toFixed(3); break;
      default: label = String(edge.intersection);
    }
    parts.push(`<text x="${mx}" y="${my - 5}" fill="#555" font-size="8" font-family="Tahoma,sans-serif" text-anchor="middle">${label}</text>`);
  }

  // Nodes
  for (const node of nodes) {
    const color = SET_COLORS[node.id] ?? '#888';
    parts.push(`<circle cx="${node.x}" cy="${node.y}" r="${node.radius}" fill="${color}" fill-opacity="0.85" stroke="#333" stroke-width="1.5"/>`);
    parts.push(`<text x="${node.x}" y="${node.y}" fill="#fff" font-size="14" font-weight="bold" font-family="Tahoma,sans-serif" text-anchor="middle" dominant-baseline="central" style="text-shadow:0 1px 2px rgba(0,0,0,0.5)">${esc(node.id)}</text>`);
    parts.push(`<text x="${node.x}" y="${node.y + node.radius + 12}" fill="#333" font-size="9" font-family="Tahoma,sans-serif" text-anchor="middle">${esc(truncName(node.label, 18))}</text>`);
    parts.push(`<text x="${node.x}" y="${node.y + node.radius + 22}" fill="#888" font-size="8" font-family="Tahoma,sans-serif" text-anchor="middle">${node.size}</text>`);
  }

  parts.push('</svg>');
  return parts.join('\n');
}
