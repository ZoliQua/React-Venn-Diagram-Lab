/**
 * Area-proportional Venn diagram layout solver.
 * Computes circle positions from set sizes and intersection counts.
 */

export interface ProportionalCircle {
  letter: string;
  cx: number;
  cy: number;
  r: number;
}

export interface ProportionalAccuracy {
  pairwise: Map<string, number>;  // "AB" → 0.992
  triple?: number;
  overall: number;
}

export interface ProportionalLayout {
  circles: ProportionalCircle[];
  accuracy: ProportionalAccuracy;
}

/**
 * Area of intersection of two circles with radii r1, r2 and center distance d.
 */
export function circleIntersectionArea(r1: number, r2: number, d: number): number {
  if (d >= r1 + r2) return 0; // disjoint
  if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2; // containment

  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const area = r1 * r1 * Math.acos(a / r1) + r2 * r2 * Math.acos((d - a) / r2) - d * h;
  return area;
}

/**
 * Intersection points of two circles.
 */
export function circleIntersectionPoints(
  cx1: number, cy1: number, r1: number,
  cx2: number, cy2: number, r2: number,
): [number, number][] {
  const dx = cx2 - cx1;
  const dy = cy2 - cy1;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d > r1 + r2 || d < Math.abs(r1 - r2) || d === 0) return [];

  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const px = cx1 + a * dx / d;
  const py = cy1 + a * dy / d;
  return [
    [px + h * dy / d, py - h * dx / d],
    [px - h * dy / d, py + h * dx / d],
  ];
}

/**
 * Binary search for distance d that gives targetArea intersection.
 */
function solveDistance(r1: number, r2: number, targetArea: number): number {
  if (targetArea <= 0) return r1 + r2 + 1; // disjoint
  const fullSmall = Math.PI * Math.min(r1, r2) ** 2;
  if (targetArea >= fullSmall) return Math.abs(r1 - r2); // containment

  let lo = Math.abs(r1 - r2);
  let hi = r1 + r2;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const area = circleIntersectionArea(r1, r2, mid);
    if (area > targetArea) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Solve 2-set layout.
 */
export function solve2SetLayout(
  sizeA: number, sizeB: number, intersection: number,
  canvasSize: number,
): ProportionalLayout {
  const total = sizeA + sizeB - intersection;
  if (total === 0) {
    return {
      circles: [
        { letter: 'A', cx: canvasSize * 0.4, cy: canvasSize / 2, r: 50 },
        { letter: 'B', cx: canvasSize * 0.6, cy: canvasSize / 2, r: 50 },
      ],
      accuracy: { pairwise: new Map([['AB', 1]]), overall: 1 },
    };
  }

  // Radii proportional to sqrt(size) → area proportional to size
  const maxR = canvasSize * 0.18;
  const maxSize = Math.max(sizeA, sizeB);
  const rA = maxR * Math.sqrt(sizeA / maxSize);
  const rB = maxR * Math.sqrt(sizeB / maxSize);

  // Target intersection area proportional to intersection count
  const areaA = Math.PI * rA * rA;
  const targetIntArea = areaA * (intersection / sizeA);

  const d = solveDistance(rA, rB, targetIntArea);
  const cx = canvasSize / 2;
  const cy = canvasSize / 2;

  // Verify accuracy
  const actualArea = circleIntersectionArea(rA, rB, d);
  const accuracy = targetIntArea > 0 ? Math.min(actualArea, targetIntArea) / Math.max(actualArea, targetIntArea) : 1;

  return {
    circles: [
      { letter: 'A', cx: cx - d / 2, cy, r: rA },
      { letter: 'B', cx: cx + d / 2, cy, r: rB },
    ],
    accuracy: { pairwise: new Map([['AB', accuracy]]), overall: accuracy },
  };
}

/**
 * Solve 3-set layout.
 */
export function solve3SetLayout(
  sizes: [number, number, number],
  intersections: { AB: number; AC: number; BC: number },
  tripleIntersection: number,
  canvasSize: number,
): ProportionalLayout {
  const [sA, sB, sC] = sizes;
  const maxSize = Math.max(sA, sB, sC, 1);
  const maxR = canvasSize * 0.16;
  const rA = maxR * Math.sqrt(sA / maxSize);
  const rB = maxR * Math.sqrt(sB / maxSize);
  const rC = maxR * Math.sqrt(sC / maxSize);

  // Solve pairwise distances
  const areaA = Math.PI * rA * rA;
  const areaB = Math.PI * rB * rB;

  const targetAB = sA > 0 ? areaA * (intersections.AB / sA) : 0;
  const targetAC = sA > 0 ? areaA * (intersections.AC / sA) : 0;
  const targetBC = sB > 0 ? areaB * (intersections.BC / sB) : 0;

  const dAB = solveDistance(rA, rB, targetAB);
  const dAC = solveDistance(rA, rC, targetAC);
  const dBC = solveDistance(rB, rC, targetBC);

  // Position: A at origin, B along x-axis, C by triangle
  const xA = 0, yA = 0;
  const xB = dAB, yB = 0;

  let xC: number, yC: number;
  if (dAC + dBC <= dAB || dAB === 0) {
    // Degenerate: place C below midpoint
    xC = dAB / 2;
    yC = Math.max(dAC, dBC) * 0.8;
  } else {
    xC = (dAC * dAC + dAB * dAB - dBC * dBC) / (2 * dAB);
    const yCsq = dAC * dAC - xC * xC;
    yC = yCsq > 0 ? Math.sqrt(yCsq) : dAC * 0.5;
  }

  // Center and translate into canvas
  const allX = [xA, xB, xC];
  const allY = [yA, yB, yC];
  const allR = [rA, rB, rC];
  const minX = Math.min(...allX.map((x, i) => x - allR[i]));
  const maxX = Math.max(...allX.map((x, i) => x + allR[i]));
  const minY = Math.min(...allY.map((y, i) => y - allR[i]));
  const maxY = Math.max(...allY.map((y, i) => y + allR[i]));

  const bboxW = maxX - minX;
  const bboxH = maxY - minY;
  const scale = Math.min(canvasSize * 0.8 / bboxW, canvasSize * 0.8 / bboxH, 1);
  const offsetX = (canvasSize - bboxW * scale) / 2 - minX * scale;
  const offsetY = (canvasSize - bboxH * scale) / 2 - minY * scale;

  const circles: ProportionalCircle[] = [
    { letter: 'A', cx: xA * scale + offsetX, cy: yA * scale + offsetY, r: rA * scale },
    { letter: 'B', cx: xB * scale + offsetX, cy: yB * scale + offsetY, r: rB * scale },
    { letter: 'C', cx: xC * scale + offsetX, cy: yC * scale + offsetY, r: rC * scale },
  ];

  // Accuracy
  const accAB = targetAB > 0 ? (() => {
    const a = circleIntersectionArea(circles[0].r, circles[1].r,
      Math.sqrt((circles[1].cx - circles[0].cx) ** 2 + (circles[1].cy - circles[0].cy) ** 2));
    const t = targetAB * scale * scale;
    return Math.min(a, t) / Math.max(a, t);
  })() : 1;
  const accAC = targetAC > 0 ? (() => {
    const a = circleIntersectionArea(circles[0].r, circles[2].r,
      Math.sqrt((circles[2].cx - circles[0].cx) ** 2 + (circles[2].cy - circles[0].cy) ** 2));
    const t = targetAC * scale * scale;
    return Math.min(a, t) / Math.max(a, t);
  })() : 1;
  const accBC = targetBC > 0 ? (() => {
    const a = circleIntersectionArea(circles[1].r, circles[2].r,
      Math.sqrt((circles[2].cx - circles[1].cx) ** 2 + (circles[2].cy - circles[1].cy) ** 2));
    const t = targetBC * scale * scale;
    return Math.min(a, t) / Math.max(a, t);
  })() : 1;

  // Triple accuracy: sample grid to measure actual triple intersection area
  let tripleAcc: number | undefined;
  if (tripleIntersection > 0) {
    const totalArea = Math.PI * circles[0].r ** 2 + Math.PI * circles[1].r ** 2 + Math.PI * circles[2].r ** 2;
    const targetTripleArea = totalArea * (tripleIntersection / (sizes[0] + sizes[1] + sizes[2]));
    // Grid sample to estimate actual triple area
    const res = 200;
    const step = canvasSize / res;
    let tripleCount = 0, totalCount = 0;
    for (let gy = 0; gy < res; gy++) {
      for (let gx = 0; gx < res; gx++) {
        const px = gx * step + step / 2;
        const py = gy * step + step / 2;
        let inAll = true;
        for (const c of circles) {
          const dx = px - c.cx, dy = py - c.cy;
          if (dx * dx + dy * dy > c.r * c.r) { inAll = false; break; }
        }
        if (inAll) tripleCount++;
        totalCount++;
      }
    }
    const actualTripleArea = (tripleCount / totalCount) * canvasSize * canvasSize;
    tripleAcc = targetTripleArea > 0 && actualTripleArea > 0
      ? Math.min(actualTripleArea, targetTripleArea) / Math.max(actualTripleArea, targetTripleArea)
      : actualTripleArea === 0 && targetTripleArea === 0 ? 1 : 0;
  }

  const pairwise = new Map([['AB', accAB], ['AC', accAC], ['BC', accBC]]);
  const items = [accAB, accAC, accBC];
  if (tripleAcc !== undefined) items.push(tripleAcc);
  const overall = items.reduce((a, b) => a + b, 0) / items.length;

  return {
    circles,
    accuracy: { pairwise, triple: tripleAcc, overall },
  };
}
