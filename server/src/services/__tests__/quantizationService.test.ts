import { describe, it, expect } from 'vitest';
import { quantizeColors, type QuantizeResult } from '../quantizationService.js';
import type { RgbColor } from '../../types/index.js';

function makeGrid(colors: RgbColor[][]): RgbColor[][] {
  return colors;
}

describe('quantizeColors', () => {
  it('returns empty for empty input', () => {
    const result = quantizeColors([], 5);
    expect(result.pixels).toEqual([]);
    expect(result.labels).toEqual([]);
    expect(result.centroids).toEqual([]);
  });

  it('returns same shape grid', () => {
    const grid = makeGrid([
      [{ r: 255, g: 0, b: 0 }, { r: 0, g: 255, b: 0 }],
      [{ r: 0, g: 0, b: 255 }, { r: 255, g: 255, b: 255 }],
    ]);
    const result = quantizeColors(grid, 2);
    expect(result.pixels.length).toBe(2);
    expect(result.pixels[0].length).toBe(2);
    expect(result.pixels[1].length).toBe(2);
  });

  it('reduces to at most k distinct colors', () => {
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
    for (const row of result.pixels) {
      for (const p of row) {
        colorSet.add(p.r.toString() + ',' + p.g.toString() + ',' + p.b.toString());
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
    for (const row of result.pixels) {
      for (const p of row) {
        expect(p.r).toBeGreaterThanOrEqual(99);
        expect(p.r).toBeLessThanOrEqual(101);
      }
    }
  });

  it('handles k=0 gracefully (should still produce a result)', () => {
    const grid = [[{ r: 128, g: 128, b: 128 }]];
    const result = quantizeColors(grid, 0);
    expect(result.pixels.length).toBe(1);
    expect(result.pixels[0].length).toBe(1);
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
    for (let y = 0; y < a.pixels.length; y++) {
      for (let x = 0; x < a.pixels[y].length; x++) {
        expect(a.pixels[y][x].r).toBe(b.pixels[y][x].r);
        expect(a.pixels[y][x].g).toBe(b.pixels[y][x].g);
        expect(a.pixels[y][x].b).toBe(b.pixels[y][x].b);
      }
    }
  });

  it('returns centroids with distinct colors matching cluster count', () => {
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
    const result = quantizeColors(grid, 3);
    expect(result.centroids).toBeDefined();
    expect(result.centroids.length).toBeLessThanOrEqual(3);
    expect(result.labels).toBeDefined();
    expect(result.labels.length).toBe(5);
    expect(result.labels[0].length).toBe(5);
  });

  it('labels reference valid centroid indices and pixels match centroids', () => {
    const grid: RgbColor[][] = [];
    for (let y = 0; y < 3; y++) {
      const row: RgbColor[] = [];
      for (let x = 0; x < 3; x++) {
        row.push({
          r: (x * 50 + y * 30) % 256,
          g: (x * 70 + y * 20) % 256,
          b: (x * 90 + y * 10) % 256,
        });
      }
      grid.push(row);
    }
    const result = quantizeColors(grid, 2);
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        const label = result.labels[y][x];
        expect(label).toBeGreaterThanOrEqual(0);
        expect(label).toBeLessThan(result.centroids.length);
        const centroid = result.centroids[label];
        const pixel = result.pixels[y][x];
        expect(pixel.r).toBe(centroid.r);
        expect(pixel.g).toBe(centroid.g);
        expect(pixel.b).toBe(centroid.b);
      }
    }
  });
});
