import { describe, it, expect } from 'vitest';
import { circleIntersectionArea, solve2SetLayout, solve3SetLayout } from '../utils/proportionalLayout.ts';

describe('circleIntersectionArea', () => {
  it('returns 0 for disjoint circles', () => {
    expect(circleIntersectionArea(10, 10, 25)).toBe(0);
  });

  it('returns full smaller circle area for containment', () => {
    const area = circleIntersectionArea(20, 5, 3);
    expect(area).toBeCloseTo(Math.PI * 25, 1); // pi * 5^2
  });

  it('returns correct area for identical overlapping circles', () => {
    const area = circleIntersectionArea(10, 10, 0);
    expect(area).toBeCloseTo(Math.PI * 100, 1); // full overlap
  });

  it('returns positive area for partial overlap', () => {
    const area = circleIntersectionArea(10, 10, 10);
    expect(area).toBeGreaterThan(0);
    expect(area).toBeLessThan(Math.PI * 100);
  });

  it('symmetric: order of radii does not matter', () => {
    const a1 = circleIntersectionArea(15, 10, 12);
    const a2 = circleIntersectionArea(10, 15, 12);
    expect(a1).toBeCloseTo(a2, 6);
  });
});

describe('solve2SetLayout', () => {
  it('returns 2 circles with valid positions', () => {
    const layout = solve2SetLayout(200, 100, 50, 700);
    expect(layout.circles).toHaveLength(2);
    expect(layout.circles[0].letter).toBe('A');
    expect(layout.circles[1].letter).toBe('B');
    expect(layout.circles[0].r).toBeGreaterThan(0);
    expect(layout.circles[1].r).toBeGreaterThan(0);
  });

  it('larger set has larger radius', () => {
    const layout = solve2SetLayout(200, 100, 50, 700);
    expect(layout.circles[0].r).toBeGreaterThan(layout.circles[1].r);
  });

  it('accuracy is high (>0.95) for normal case', () => {
    const layout = solve2SetLayout(200, 161, 21, 700);
    expect(layout.accuracy.overall).toBeGreaterThan(0.95);
  });

  it('handles disjoint sets (intersection=0)', () => {
    const layout = solve2SetLayout(100, 100, 0, 700);
    expect(layout.circles).toHaveLength(2);
    // circles should be far apart
    const dx = layout.circles[1].cx - layout.circles[0].cx;
    expect(Math.abs(dx)).toBeGreaterThan(layout.circles[0].r);
  });

  it('handles complete containment', () => {
    const layout = solve2SetLayout(200, 50, 50, 700);
    expect(layout.circles).toHaveLength(2);
    expect(layout.accuracy.overall).toBeGreaterThan(0.9);
  });

  it('handles zero-size sets', () => {
    const layout = solve2SetLayout(0, 0, 0, 700);
    expect(layout.circles).toHaveLength(2);
  });
});

describe('solve3SetLayout', () => {
  it('returns 3 circles with valid positions', () => {
    const layout = solve3SetLayout(
      [200, 161, 200],
      { AB: 73, AC: 37, BC: 17 },
      4,
      700,
    );
    expect(layout.circles).toHaveLength(3);
    expect(layout.circles[0].letter).toBe('A');
    expect(layout.circles[1].letter).toBe('B');
    expect(layout.circles[2].letter).toBe('C');
  });

  it('pairwise accuracy is high (>0.9)', () => {
    const layout = solve3SetLayout(
      [200, 161, 200],
      { AB: 73, AC: 37, BC: 17 },
      4,
      700,
    );
    for (const [, acc] of layout.accuracy.pairwise) {
      expect(acc).toBeGreaterThan(0.9);
    }
  });

  it('computes triple accuracy when tripleIntersection > 0', () => {
    const layout = solve3SetLayout(
      [200, 161, 200],
      { AB: 73, AC: 37, BC: 17 },
      4,
      700,
    );
    expect(layout.accuracy.triple).toBeDefined();
    expect(layout.accuracy.triple).toBeGreaterThanOrEqual(0);
    expect(layout.accuracy.triple).toBeLessThanOrEqual(1);
  });

  it('triple accuracy is undefined when tripleIntersection=0', () => {
    const layout = solve3SetLayout(
      [200, 100, 150],
      { AB: 30, AC: 20, BC: 10 },
      0,
      700,
    );
    expect(layout.accuracy.triple).toBeUndefined();
  });

  it('all circles fit within canvas bounds', () => {
    const cs = 700;
    const layout = solve3SetLayout([200, 161, 200], { AB: 73, AC: 37, BC: 17 }, 4, cs);
    for (const c of layout.circles) {
      expect(c.cx - c.r).toBeGreaterThanOrEqual(-5);
      expect(c.cx + c.r).toBeLessThanOrEqual(cs + 5);
      expect(c.cy - c.r).toBeGreaterThanOrEqual(-5);
      expect(c.cy + c.r).toBeLessThanOrEqual(cs + 5);
    }
  });
});
