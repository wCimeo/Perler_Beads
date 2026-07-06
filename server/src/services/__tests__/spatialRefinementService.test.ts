import { describe, it, expect } from 'vitest';
import { spatialRefine } from '../spatialRefinementService.js';

describe('spatialRefine', () => {
  it('returns empty for empty input', () => {
    expect(spatialRefine([], [])).toEqual([]);
  });

  it('returns same dimensions', () => {
    const labels = [
      [0, 1, 0],
      [1, 0, 1],
      [0, 1, 0],
    ];
    const edgeMask = [
      [false, false, false],
      [false, false, false],
      [false, false, false],
    ];
    const result = spatialRefine(labels, edgeMask);
    expect(result.length).toBe(3);
    expect(result[0].length).toBe(3);
  });

  it('keeps uniform labels unchanged', () => {
    const labels = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const edgeMask = [
      [false, false, false],
      [false, false, false],
      [false, false, false],
    ];
    const result = spatialRefine(labels, edgeMask);
    for (const row of result) {
      for (const v of row) {
        expect(v).toBe(0);
      }
    }
  });

  it('majority label wins in neighborhood (no edge mask)', () => {
    const labels = Array.from({ length: 5 }, () => new Array(5).fill(0));
    labels[2][2] = 1;
    const edgeMask = Array.from({ length: 5 }, () => new Array(5).fill(false));

    const result = spatialRefine(labels, edgeMask, 5, 1.5);
    expect(result[2][2]).toBe(0);
    expect(result[1][1]).toBe(0);
  });

  it('edge pixels are preserved', () => {
    const labels = [
      [0, 0, 1],
      [0, 0, 1],
      [1, 1, 1],
    ];
    const edgeMask = [
      [false, false, true],
      [false, false, true],
      [true, true, true],
    ];
    const result = spatialRefine(labels, edgeMask);
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        if (edgeMask[y][x]) {
          expect(result[y][x]).toBe(labels[y][x]);
        }
      }
    }
  });

  it('handles single-row grid', () => {
    const labels = [[0, 1, 0]];
    const edgeMask = [[false, false, false]];
    const result = spatialRefine(labels, edgeMask);
    expect(result.length).toBe(1);
    expect(result[0].length).toBe(3);
  });
});
