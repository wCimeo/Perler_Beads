import { describe, it, expect } from 'vitest';
import { sobelEdgeDetect } from '../edgeDetectionService.js';
import type { RgbColor } from '../../types/index.js';

function solidGrid(rows: number, cols: number, color: RgbColor): RgbColor[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ ...color })),
  );
}

function twoRegionGrid(
  rows: number,
  cols: number,
  left: RgbColor,
  right: RgbColor,
): RgbColor[][] {
  return Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => {
      if (x < Math.floor(cols / 2)) return { ...left };
      return { ...right };
    }),
  );
}

describe('sobelEdgeDetect', () => {
  it('returns empty array for empty input', () => {
    const result = sobelEdgeDetect([]);
    expect(result).toEqual([]);
  });

  it('returns same dimensions as input', () => {
    const grid = solidGrid(10, 10, { r: 128, g: 128, b: 128 });
    const mask = sobelEdgeDetect(grid);
    expect(mask.length).toBe(10);
    expect(mask[0].length).toBe(10);
  });

  it('solid color produces no edges (all false)', () => {
    const grid = solidGrid(8, 8, { r: 100, g: 150, b: 200 });
    const mask = sobelEdgeDetect(grid);
    for (const row of mask) {
      for (const v of row) {
        expect(v).toBe(false);
      }
    }
  });

  it('sharp vertical boundary produces edge pixels along the seam', () => {
    const grid = twoRegionGrid(6, 10, { r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 });
    const mask = sobelEdgeDetect(grid);
    let edgeCount = 0;
    for (let y = 0; y < 6; y++) {
      for (let x = 3; x <= 6; x++) {
        if (mask[y][x]) edgeCount++;
      }
    }
    expect(edgeCount).toBeGreaterThan(0);
  });

  it('handles single-row grid', () => {
    const grid = [[{ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }]];
    const mask = sobelEdgeDetect(grid);
    expect(mask.length).toBe(1);
    expect(mask[0].length).toBe(2);
  });

  it('handles single-column grid', () => {
    const grid = [[{ r: 0, g: 0, b: 0 }], [{ r: 255, g: 255, b: 255 }]];
    const mask = sobelEdgeDetect(grid);
    expect(mask.length).toBe(2);
    expect(mask[0].length).toBe(1);
  });
});
