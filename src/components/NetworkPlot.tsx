import { useMemo, useState, useCallback, useRef } from 'react';
import type { NetworkData, NetworkEdge, NetworkNode, EdgeWeightMetric } from '../utils/networkData.ts';
import { layoutNetwork } from '../utils/networkData.ts';

const SET_COLORS: Record<string, string> = {
  A: '#FFF200', B: '#2E3192', C: '#ED1C24', D: '#808285',
  E: '#3C2415', F: '#9E1F63', G: '#CA4B9B', H: '#21AED1', I: '#F7941E',
};

interface NetworkPlotProps {
  data: NetworkData;
  scale: number;
  edgeMetric: EdgeWeightMetric;
  showSigOnly: boolean;
  showEdgeLabels: boolean;
  showNodeSizes: boolean;
  minEdgeWeight: number;
  moveNodes: boolean;
  plotBackground?: 'dark' | 'white';
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (sourceId: string, targetId: string) => void;
  onBackgroundClick?: () => void;
}

function truncName(name: string, max: number): string {
  return name.length > max ? name.slice(0, max) + '...' : name;
}

function edgeColorDark(edge: NetworkEdge): string {
  if (!edge.significant) return '#888888';
  if (edge.foldEnrichment < 1) return '#e05050';
  return '#4caf50';
}

function edgeColorWhite(edge: NetworkEdge): string {
  if (!edge.significant) return '#999999';
  if (edge.foldEnrichment < 1) return '#c62828';
  return '#2e7d32';
}

function formatWeight(edge: NetworkEdge, metric: EdgeWeightMetric): string {
  switch (metric) {
    case 'intersection': return String(edge.intersection);
    case 'jaccard': return edge.jaccard.toFixed(3);
    case 'foldEnrichment': return edge.foldEnrichment.toFixed(2);
    case 'overlapCoeff': return edge.overlapCoeff.toFixed(3);
  }
}

export function NetworkPlot({
  data, scale, edgeMetric, showSigOnly, showEdgeLabels, showNodeSizes, minEdgeWeight, moveNodes,
  plotBackground = 'dark',
  onNodeClick, onEdgeClick, onBackgroundClick,
}: NetworkPlotProps) {
  const isWhite = plotBackground === 'white';
  const clr = {
    bg: isWhite ? '#ffffff' : '#1a1a2e',
    nodeStroke: isWhite ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.4)',
    nodeStrokeHover: isWhite ? '#333' : '#fff',
    nodeLabel: isWhite ? '#000' : '#fff',
    nodeLabelShadow: isWhite ? '0 1px 2px rgba(255,255,255,0.6)' : '0 1px 3px rgba(0,0,0,0.6)',
    textSecondary: isWhite ? '#555' : '#999999',
    textMuted: isWhite ? '#777' : '#666666',
    tooltipBg: isWhite ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.88)',
    tooltipBorder: isWhite ? '#ccc' : '#3c3c3c',
    tooltipText: isWhite ? '#222' : '#eee',
  };
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  // Drag state: overrides for node positions
  const [nodeOverrides, setNodeOverrides] = useState<Record<string, { x: number; y: number }>>({});
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const WIDTH = 600;
  const HEIGHT = 500;

  const layoutData = useMemo(() => {
    const nodes = data.nodes.map(n => ({ ...n }));
    const visibleEdges = data.edges.filter(e => {
      if (showSigOnly && !e.significant) return false;
      if (e.weight < minEdgeWeight) return false;
      return true;
    });
    layoutNetwork(nodes, visibleEdges, WIDTH, HEIGHT);
    return { nodes, edges: visibleEdges };
  }, [data, showSigOnly, minEdgeWeight]);

  // Apply drag overrides to node positions
  const displayNodes = useMemo(() =>
    layoutData.nodes.map(n => nodeOverrides[n.id]
      ? { ...n, x: nodeOverrides[n.id].x, y: nodeOverrides[n.id].y }
      : n
    ),
  [layoutData.nodes, nodeOverrides]);

  const maxWeight = useMemo(() =>
    Math.max(1, ...layoutData.edges.map(e => e.weight)),
  [layoutData.edges]);

  const getNode = useCallback((id: string) =>
    displayNodes.find(n => n.id === id)!,
  [displayNodes]);

  // Convert screen coords to SVG coords
  const screenToSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const svgPt = pt.matrixTransform(ctm.inverse());
    return { x: svgPt.x, y: svgPt.y };
  }, []);

  const handleDragStart = useCallback((e: React.PointerEvent, nodeId: string) => {
    if (!moveNodes) return;
    const node = getNode(nodeId);
    const svgPt = screenToSvg(e.clientX, e.clientY);
    dragRef.current = { id: nodeId, startX: svgPt.x, startY: svgPt.y, origX: node.x, origY: node.y };
    setDraggingNodeId(nodeId);
    (e.target as Element).setPointerCapture(e.pointerId);
    e.stopPropagation();
  }, [moveNodes, getNode, screenToSvg]);

  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const svgPt = screenToSvg(e.clientX, e.clientY);
    const dx = svgPt.x - dragRef.current.startX;
    const dy = svgPt.y - dragRef.current.startY;
    const newX = dragRef.current.origX + dx;
    const newY = dragRef.current.origY + dy;
    setNodeOverrides(prev => ({ ...prev, [dragRef.current!.id]: { x: newX, y: newY } }));
  }, [screenToSvg]);

  const handleDragEnd = useCallback(() => {
    dragRef.current = null;
    setDraggingNodeId(null);
  }, []);

  const handleEdgeEnter = useCallback((edge: NetworkEdge) => {
    const src = getNode(edge.source);
    const tgt = getNode(edge.target);
    const mx = (src.x + tgt.x) / 2;
    const my = (src.y + tgt.y) / 2;
    setHoveredEdge(`${edge.source}-${edge.target}`);
    setTooltip({
      x: mx, y: my,
      content: `${edge.nameA} \u2229 ${edge.nameB}\nInter: ${edge.intersection} | Jaccard: ${edge.jaccard.toFixed(4)}\nFE: ${edge.foldEnrichment.toFixed(2)} | FDR: ${edge.fdr < 0.001 ? edge.fdr.toExponential(1) : edge.fdr.toFixed(4)}`,
    });
  }, [getNode]);

  const handleNodeEnter = useCallback((node: NetworkNode) => {
    setHoveredNode(node.id);
    setTooltip({
      x: node.x, y: node.y - node.radius - 12,
      content: `${node.label} (${node.id})\nSize: ${node.size}`,
    });
  }, []);

  const handleLeave = useCallback(() => {
    setHoveredEdge(null);
    setHoveredNode(null);
    setTooltip(null);
  }, []);

  const displaySize = Math.max(WIDTH, 500) * scale;
  const aspectRatio = HEIGHT / WIDTH;

  return (
    <div className="canvas-inner" style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width={displaySize}
        height={displaySize * aspectRatio}
        xmlns="http://www.w3.org/2000/svg"
        className="canvas-svg network-plot-svg"
        style={{ background: clr.bg }}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onClick={(e) => { if (e.target === e.currentTarget) onBackgroundClick?.(); }}
      >
        {/* Edges */}
        {layoutData.edges.map(edge => {
          const src = getNode(edge.source);
          const tgt = getNode(edge.target);
          const key = `${edge.source}-${edge.target}`;
          const isHovered = hoveredEdge === key;
          const thickness = Math.max(0.5, 1 + (edge.weight / maxWeight) * 8);
          const mx = (src.x + tgt.x) / 2;
          const my = (src.y + tgt.y) / 2;
          const hasActive = hoveredEdge !== null || hoveredNode !== null;
          const isConnectedToHoveredNode = hoveredNode === edge.source || hoveredNode === edge.target;
          const dimmed = hasActive && !isHovered && !isConnectedToHoveredNode;

          return (
            <g key={key}>
              <line
                x1={src.x} y1={src.y}
                x2={tgt.x} y2={tgt.y}
                stroke={isWhite ? edgeColorWhite(edge) : edgeColorDark(edge)}
                strokeWidth={isHovered ? thickness + 2 : thickness}
                strokeOpacity={dimmed ? 0.15 : 0.7}
                strokeLinecap="round"
                style={{ cursor: 'pointer', transition: 'stroke-opacity 0.12s' }}
                onMouseEnter={() => handleEdgeEnter(edge)}
                onMouseLeave={handleLeave}
                onClick={(e) => { e.stopPropagation(); onEdgeClick?.(edge.source, edge.target); }}
              />
              {showEdgeLabels && !dimmed && (
                <text
                  x={mx} y={my - 6}
                  fill={clr.textSecondary}
                  fontSize={9}
                  fontFamily="Tahoma, sans-serif"
                  textAnchor="middle"
                  style={{ pointerEvents: 'none' }}
                >
                  {formatWeight(edge, edgeMetric)}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {displayNodes.map(node => {
          const hasActive = hoveredEdge !== null || hoveredNode !== null;
          const isHovered = hoveredNode === node.id;
          const isConnectedToHoveredEdge = hoveredEdge !== null && hoveredEdge.includes(node.id);
          const dimmed = hasActive && !isHovered && !isConnectedToHoveredEdge;
          const isDragging = draggingNodeId === node.id;

          return (
            <g
              key={node.id}
              style={{ cursor: moveNodes ? (isDragging ? 'grabbing' : 'grab') : 'pointer', transition: isDragging ? 'none' : 'opacity 0.12s' }}
              opacity={dimmed ? 0.3 : 1}
              onMouseEnter={() => { if (draggingNodeId === null) handleNodeEnter(node); }}
              onMouseLeave={handleLeave}
              onPointerDown={(e) => handleDragStart(e, node.id)}
              onClick={(e) => { if (draggingNodeId === null) { e.stopPropagation(); onNodeClick?.(node.id); } }}
            >
              <circle
                cx={node.x} cy={node.y}
                r={node.radius}
                fill={SET_COLORS[node.id] ?? '#888'}
                fillOpacity={0.85}
                stroke={isHovered ? clr.nodeStrokeHover : clr.nodeStroke}
                strokeWidth={isHovered ? 2.5 : 1.5}
              />
              {/* Letter label */}
              <text
                x={node.x} y={node.y}
                fill={clr.nodeLabel}
                fontSize={14}
                fontWeight="bold"
                fontFamily="Tahoma, sans-serif"
                textAnchor="middle"
                dominantBaseline="central"
                style={{ pointerEvents: 'none', textShadow: clr.nodeLabelShadow }}
              >
                {node.id}
              </text>
              {/* Name below */}
              <text
                x={node.x} y={node.y + node.radius + 12}
                fill={clr.textSecondary}
                fontSize={10}
                fontFamily="Tahoma, sans-serif"
                textAnchor="middle"
                style={{ pointerEvents: 'none' }}
              >
                {truncName(node.label, 18)}
              </text>
              {/* Size below name */}
              {showNodeSizes && (
                <text
                  x={node.x} y={node.y + node.radius + 23}
                  fill={clr.textMuted}
                  fontSize={9}
                  fontFamily="Tahoma, sans-serif"
                  textAnchor="middle"
                  style={{ pointerEvents: 'none' }}
                >
                  {node.size}
                </text>
              )}
            </g>
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <g style={{ pointerEvents: 'none' }}>
            {tooltip.content.split('\n').map((line, i) => {
              const tw = line.length * 5 + 16;
              const th = tooltip.content.split('\n').length * 13 + 8;
              return i === 0 ? (
                <g key="bg">
                  <rect
                    x={tooltip.x - tw / 2}
                    y={tooltip.y - th - 4}
                    width={tw}
                    height={th}
                    rx={4}
                    fill={clr.tooltipBg}
                    stroke={clr.tooltipBorder}
                    strokeWidth={0.5}
                  />
                  {tooltip.content.split('\n').map((l, j) => (
                    <text
                      key={j}
                      x={tooltip.x}
                      y={tooltip.y - th + 8 + j * 13}
                      fill={clr.tooltipText}
                      fontSize={10}
                      fontFamily="Tahoma, sans-serif"
                      textAnchor="middle"
                    >
                      {l}
                    </text>
                  ))}
                </g>
              ) : null;
            })}
          </g>
        )}
      </svg>
    </div>
  );
}
