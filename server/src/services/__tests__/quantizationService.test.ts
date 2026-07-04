import { describe, it, expect } from 'vitest';
import { quantizeColors } from '../quantizationService.js';
import type { RgbColor } from '../../types/index.js';

function makeGrid(colors: RgbColor[][]): RgbColor[][] {
  return colors;
}

describe('quantizeColors', () => {
  it('returns empty for empty input', () => {
    expect(quantizeColors([], 5)).toEqual([]);
  });

  it('returns same shape grid', () => {
    const grid = makeGrid([
      [{ r: 255, g: 0, b: 0 }, { r: 0, g: 255, b: 0 }],
      [{ r: 0, g: 0, b: 255 }, { r: 255, g: 255, b: 255 }],
    ]);
    const result = quantizeColors(grid, 2);
    expect(result.length).toBe(2);
    expect(result[0].length).toBe(2);
    expect(result[1].length).toBe(2);
  });

  it('reduces to at most k distinct colors', () => {
    // 10x10 grid with random-like colors
    const grid: RgbColor[][] = [];
    for (let y = 0; y < 10; y++) {
      const row: RgbColor[] = [];
      for (let x = 0; x < 10; x++) {
        row.push({
          r: (x * 25 + y * 7) % 256,
          g: (x * 13 + y * 31) % 256,
          b: (x * 47 + y * 17) % 256,
        });
      }
      grid.push(row);
    }
    const result = quantizeColors(grid, 3);
    const colorSet = new Set<string>();
    for (const row of result) {
      for (const p of row) {
        colorSet.add(`${p.r},${p.g},${p.b}`);
      }
    }
    expect(colorSet.size).toBeLessThanOrEqual(3);
  });

  it('preserves uniform grid unchanged', () => {
    const grid: RgbColor[][] = [];
    for (let y = 0; y < 5; y++) {
      const row: RgbColor[] = [];
      for (let x = 0; x < 5; x++) {
        row.push({ r: 100, g: 150, b: 200 });
      }
      grid.push(row);
    }
    const result = quantizeColors(grid, 1);
    for (const row of result) {
      for (const p of row) {
        // With only one cluster, all pixels should be the same
        expect(p.r).toBeGreaterThanOrEqual(99);
        expect(p.r).toBeLessThanOrEqual(101);
      }
    }
  });

  it('handles k=0 gracefully (should still produce a result)', () => {
    const grid = [[{ r: 128, g: 128, b: 128 }]];
    const result = quantizeColors(grid, 0);
    expect(result.length).toBe(1);
    expect(result[0].length).toBe(1);
  });

  it('produces deterministic output (seeded PRNG)', () => {
    const grid: RgbColor[][] = [];
    for (let y = 0; y < 5; y++) {
      const row: RgbColor[] = [];
      for (let x = 0; x < 5; x++) {
        row.push({
          r: (x * 37 + y * 11) % 256,
          g: (x * 53 + y * 23) % 256,
          b: (x * 71 + y * 29) % 256,
        });
      }
      grid.push(row);
    }
    const a = quantizeColors(grid, 3);
    const b = quantizeColors(grid, 3);
    // Should produce identical results
    for (let y = 0; y < a.length; y++) {
      for (let x = 0; x < a[y].length; x++) {
        expect(a[y][x].r).toBe(b[y][x].r);
        expect(a[y][x].g).toBe(b[y][x].g);
        expect(a[y][x].b).toBe(b[y][x].b);
      }
    }
  });
});
