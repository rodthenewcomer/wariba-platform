import { describe, expect, it } from 'vitest';
import { resolveLabelCollisions } from '../app/(trade)/trade/chart-overlay-geometry';

describe('resolveLabelCollisions', () => {
  it('leaves non-overlapping labels at their ideal position', () => {
    const result = resolveLabelCollisions([
      { id: 'a', y: 10, height: 20 },
      { id: 'b', y: 200, height: 20 },
    ]);
    expect(result.find((r) => r.id === 'a')?.y).toBe(10);
    expect(result.find((r) => r.id === 'b')?.y).toBe(200);
  });

  it('pushes an overlapping label down below the previous one, plus the gap', () => {
    const result = resolveLabelCollisions(
      [
        { id: 'a', y: 100, height: 20 },
        { id: 'b', y: 105, height: 20 },
      ],
      4,
    );
    const a = result.find((r) => r.id === 'a')!;
    const b = result.find((r) => r.id === 'b')!;
    // a's bottom edge is at 110; b's top edge (height 20) must land at >= 114.
    expect(a.y).toBe(100);
    expect(b.y - 10).toBeGreaterThanOrEqual(114);
  });

  it('cascades through three stacked, fully overlapping labels in order', () => {
    const result = resolveLabelCollisions([
      { id: 'a', y: 50, height: 20 },
      { id: 'b', y: 50, height: 20 },
      { id: 'c', y: 50, height: 20 },
    ]);
    const a = result.find((r) => r.id === 'a')!;
    const b = result.find((r) => r.id === 'b')!;
    const c = result.find((r) => r.id === 'c')!;
    expect(a.y).toBeLessThan(b.y);
    expect(b.y).toBeLessThan(c.y);
  });

  it('is stable — never reorders labels relative to their ideal y', () => {
    const result = resolveLabelCollisions([
      { id: 'low', y: 500, height: 10 },
      { id: 'high', y: 10, height: 10 },
    ]);
    const highIndex = result.findIndex((r) => r.id === 'high');
    const lowIndex = result.findIndex((r) => r.id === 'low');
    expect(result[highIndex]!.y).toBeLessThan(result[lowIndex]!.y);
  });
});
