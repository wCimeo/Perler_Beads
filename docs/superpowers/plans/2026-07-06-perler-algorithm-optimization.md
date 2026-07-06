# Perler Beads Algorithm Optimization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing ΔE-based color matching pipeline with a unified optimization that combines Sobel edge detection, spatial coherence smoothing, and weighted-Lab palette mapping into a single pass.

**Architecture:** Three new services (edgeDetectionService, spatialRefinementService) plus one new function (weightedLabDistance in colorSpaceService) are inserted into the existing convert.ts pipeline. The quantizationService is extended to export labels and centroids. All existing APIs and client code remain unchanged.

**Tech Stack:** TypeScript (ESM), Vitest for testing, same dependencies as existing server code.

## Global Constraints

- Must not break existing client API contract (ConvertResponse shape unchanged)
- All existing 21 tests must continue to pass
- TypeScript strict mode, no `any` usage
- Follow existing file conventions: JSDoc comments on exports, `import type` for type-only imports
- TDD: write failing test → run to confirm failure → implement → run to confirm pass → commit

---

## Task 1: Add config constants for algorithm parameters

**Files:**
- Modify: `server/src/config.ts`

**Steps:**

- [ ] 1.1 Open `server/src/config.ts`. After the `MAX_SIZE_LIMIT = 300` line, add:

```typescript
/** 加权 Lab 距离 — L* 通道权重（强调亮度一致性） */
export const LAB_WEIGHT_L = 1.5;

/** 加权 Lab 距离 — a* 通道权重 */
export const LAB_WEIGHT_A = 1.0;

/** 加权 Lab 距离 — b* 通道权重 */
export const LAB_WEIGHT_B = 1.0;

/** 空间平滑邻域窗口半径（5 = 5×5 窗口） */
export const SPATIAL_WINDOW = 5;

/** 空间平滑高斯核 σ */
export const SPATIAL_SIGMA = 1.5;

/** Sobel 边缘检测分位数阈值（百分比，0-100） */
export const EDGE_PERCENTILE = 85;
```

- [ ] 1.2 Verify TypeScript compiles: `cd server && npx tsc --noEmit`

---

## Task 2: Add weightedLabDistance to colorSpaceService

**Files:**
- Modify: `server/src/services/colorSpaceService.ts`
- Modify: `server/src/services/__tests__/colorSpaceService.test.ts`

**Interfaces:**
- Consumes: existing `LabColor` interface
- Produces: new `weightedLabDistance(c1, c2, weights?)` function

**Steps:**

- [ ] 2.1 **Write the failing test.** In `server/src/services/__tests__/colorSpaceService.test.ts`, add after the existing Delta E tests (before `Round-trip consistency`):

```typescript
describe('weightedLabDistance', () => {
  // Import will be added in step 2.2
  it('returns 0 for identical colors with default weights', () => {
    const d = weightedLabDistance({ L: 50, A: 10, B: -20 }, { L: 50, A: 10, B: -20 });
    expect(d).toBe(0);
  });

  it('L difference is scaled by wL=1.5 by default', () => {
    // Pure L difference of 10 → expected distance = 10 * 1.5 = 15
    const d = weightedLabDistance({ L: 60, A: 0, B: 0 }, { L: 50, A: 0, B: 0 });
    expect(d).toBeCloseTo(15, 5);
  });

  it('A/B differences use weight 1.0 by default', () => {
    // Pure a difference of 10 → expected distance = 10 * 1.0 = 10
    const d = weightedLabDistance({ L: 50, A: 10, B: 0 }, { L: 50, A: 0, B: 0 });
    expect(d).toBeCloseTo(10, 5);
  });

  it('accepts custom weights', () => {
    const d = weightedLabDistance(
      { L: 100, A: 0, B: 0 }, { L: 0, A: 0, B: 0 },
      { wL: 2.0, wA: 1.0, wB: 1.0 },
    );
    expect(d).toBeCloseTo(200, 5);
  });

  it('is symmetric', () => {
    const c1 = { L: 60, A: 15, B: -30 };
    const c2 = { L: 45, A: -20, B: 10 };
    expect(weightedLabDistance(c1, c2)).toBeCloseTo(weightedLabDistance(c2, c1), 10);
  });
});
```

Update the import line at the top of the test file:
```typescript
import {
  srgbToLinearRgb, linearRgbToXyz, xyzToLab, rgbToLab, deltaE, weightedLabDistance,
} from '../colorSpaceService.js';
```

- [ ] 2.2 Run tests to confirm failure: `cd server && npx vitest run src/services/__tests__/colorSpaceService.test.ts`. Expected: test file import error (weightedLabDistance not exported).

- [ ] 2.3 **Implement.** In `server/src/services/colorSpaceService.ts`, add after the `deltaE` function (after line 137, before end of file):

```typescript
// ── Weighted Lab Distance ────────────────────────────────────────────

export interface WeightedLabWeights {
  wL: number;
  wA: number;
  wB: number;
}

/**
 * Weighted Euclidean distance in CIE L*a*b* space.
 *
 * Allows per-channel weighting:
 *   - Higher wL emphasizes luminance consistency (fewer brightness shifts)
 *   - Default weights: wL=1.5, wA=1.0, wB=1.0
 *
 * Default weights are imported from config but can be overridden.
 */
export function weightedLabDistance(
  c1: LabColor,
  c2: LabColor,
  weights?: Partial<WeightedLabWeights>,
): number {
  const wL = weights?.wL ?? 1.5;
  const wA = weights?.wA ?? 1.0;
  const wB = weights?.wB ?? 1.0;
  const dL = (c1.L - c2.L) * wL;
  const dA = (c1.A - c2.A) * wA;
  const dB = (c1.B - c2.B) * wB;
  return Math.sqrt(dL * dL + dA * dA + dB * dB);
}
```

- [ ] 2.4 Run tests: `cd server && npx vitest run src/services/__tests__/colorSpaceService.test.ts`. Expected: all tests pass (15 existing + 5 new = 20 tests).

- [ ] 2.5 Run full test suite: `cd server && npx vitest run`. Expected: 26 tests pass (all). Commit.

---

## Task 3: Create edgeDetectionService

**Files:**
- Create: `server/src/services/edgeDetectionService.ts`
- Create: `server/src/services/__tests__/edgeDetectionService.test.ts`

**Interfaces:**
- Consumes: `RgbColor[][]` (2D pixel grid)
- Produces: `boolean[][]` (edge mask, same dimensions)

**Steps:**

- [ ] 3.1 **Write the failing test.** Create `server/src/services/__tests__/edgeDetectionService.test.ts`:

```typescript
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
    // The boundary is at column 5 (halfway). Expect edges at columns 4 and 5.
    let edgeCount = 0;
    for (let y = 0; y < 6; y++) {
      for (let x = 3; x <= 6; x++) {
        if (mask[y][x]) edgeCount++;
      }
    }
    // At least some pixels at the boundary should be flagged
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
```

- [ ] 3.2 Run test to confirm failure: `cd server && npx vitest run src/services/__tests__/edgeDetectionService.test.ts`. Expected: import error.

- [ ] 3.3 **Implement.** Create `server/src/services/edgeDetectionService.ts`:

```typescript
/**
 * Sobel edge detection for pixel art conversion.
 *
 * Applies the 3×3 Sobel operator to detect intensity edges in a low-resolution
 * pixel grid. The output mask protects edge pixels from spatial smoothing.
 *
 * Threshold is computed adaptively: the Nth percentile of all gradient
 * magnitudes, where N = EDGE_PERCENTILE (default 85).
 */

import type { RgbColor } from '../types/index.js';
import { EDGE_PERCENTILE } from '../config.js';

/**
 * Sobel convolution kernels (3×3).
 * Gx detects vertical edges, Gy detects horizontal edges.
 */
const SOBEL_KX: number[][] = [
  [-1, 0, 1],
  [-2, 0, 2],
  [-1, 0, 1],
];
const SOBEL_KY: number[][] = [
  [-1, -2, -1],
  [0, 0, 0],
  [1, 2, 1],
];

/** Convert RGB pixel to grayscale intensity (0–255). */
function toGray(p: RgbColor): number {
  // Standard luminance weights (Rec. 601)
  return 0.299 * p.r + 0.587 * p.g + 0.114 * p.b;
}

/**
 * Compute the magnitude image from a 3×3 Sobel convolution.
 * Returns a 2D array of gradient magnitudes (non-negative floats).
 * Boundary pixels (where the 3×3 kernel can't be centered) get magnitude 0.
 */
export function sobelMagnitude(pixels: RgbColor[][]): number[][] {
  const height = pixels.length;
  if (height === 0) return [];
  const width = pixels[0].length;
  if (width === 0) return pixels.map(() => []);

  const gray: number[][] = pixels.map((row) => row.map(toGray));
  const mag: number[][] = Array.from({ length: height }, () => new Array(width).fill(0));

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixelVal = gray[y + ky][x + kx];
          gx += pixelVal * SOBEL_KX[ky + 1][kx + 1];
          gy += pixelVal * SOBEL_KY[ky + 1][kx + 1];
        }
      }
      mag[y][x] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  return mag;
}

/**
 * Compute the Nth percentile of an array of numbers.
 * Uses linear interpolation between sorted values.
 */
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const frac = idx - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

/**
 * Detect edges in a 2D pixel grid using the Sobel operator.
 *
 * @param pixels    2D RGB pixel grid (row-major)
 * @param thresholdPct  Percentile threshold for edge binarization (0–100).
 *                      Default from config: EDGE_PERCENTILE (85).
 * @returns          2D boolean mask where true = edge pixel.
 */
export function sobelEdgeDetect(
  pixels: RgbColor[][],
  thresholdPct: number = EDGE_PERCENTILE,
): boolean[][] {
  if (pixels.length === 0) return [];

  const mag = sobelMagnitude(pixels);
  const height = mag.length;
  const width = mag[0].length;
  if (width === 0) return mag.map(() => []);

  // Collect all magnitudes for threshold computation
  const allMags: number[] = [];
  for (const row of mag) for (const v of row) allMags.push(v);

  const threshold = percentile(allMags, thresholdPct);

  // Binarize: magnitude > threshold → edge
  return mag.map((row) => row.map((v) => v > threshold));
}
```

- [ ] 3.4 Run test: `cd server && npx vitest run src/services/__tests__/edgeDetectionService.test.ts`. Expected: all 6 tests pass.

- [ ] 3.5 Run full suite: `cd server && npx vitest run`. Expected: 27 tests pass. Commit.

---

## Task 4: Extend quantizationService to export labels and centroids

**Files:**
- Modify: `server/src/services/quantizationService.ts`
- Modify: `server/src/services/__tests__/quantizationService.test.ts`

**Rationale:** The existing `quantizeColors()` returns only the quantized pixel grid. The new pipeline needs cluster labels (for spatial smoothing) and centroids (for palette mapping). We extend the return type rather than adding a separate function.

**Steps:**

- [ ] 4.1 **Write the failing test.** In `server/src/services/__tests__/quantizationService.test.ts`, import at the top:

```typescript
import { quantizeColors, type QuantizeResult } from '../quantizationService.js';
```

Add a new describe block before the last `})`:

```typescript
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
  // New fields
  expect(result.centroids).toBeDefined();
  expect(result.centroids.length).toBeLessThanOrEqual(3);
  expect(result.labels).toBeDefined();
  expect(result.labels.length).toBe(5);
  expect(result.labels[0].length).toBe(5);
});

it('labels reference valid centroid indices', () => {
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
      // The pixel at result.pixels should match the centroid for that label
      const centroid = result.centroids[label];
      const pixel = result.pixels[y][x];
      expect(pixel.r).toBe(centroid.r);
      expect(pixel.g).toBe(centroid.g);
      expect(pixel.b).toBe(centroid.b);
    }
  });
});

it('pixels field returns same shape as before (backward compat)', () => {
  const grid = [[{ r: 128, g: 128, b: 128 }]];
  const result = quantizeColors(grid, 1);
  expect(result.pixels.length).toBe(1);
  expect(result.pixels[0].length).toBe(1);
});
```

Update existing test assertions to use `.pixels`. In the test file, find all `result` references in `quantizeColors` tests and change:
- `const result = quantizeColors(...)` stays the same
- `result.length` → `result.pixels.length`
- `result[0].length` → `result.pixels[0].length`
- `result[y][x]` → `result.pixels[y][x]`

Specifically:
- "returns same shape grid": `result.length` → `result.pixels.length`, etc.
- "reduces to at most k distinct colors": iterate `result.pixels` for colorSet
- "preserves uniform grid unchanged": iterate `result.pixels`
- "handles k=0": `result.length` → `result.pixels.length`
- "produces deterministic output": `a[y][x]` → `a.pixels[y][x]`, `b[y][x]` → `b.pixels[y][x]`

- [ ] 4.2 Run test to confirm failure: `cd server && npx vitest run src/services/__tests__/quantizationService.test.ts`. Expected: type errors.

- [ ] 4.3 **Implement.** In `server/src/services/quantizationService.ts`, add the new interface after `QuantizeOptions`:

```typescript
export interface QuantizeResult {
  /** Quantized pixel grid where each pixel = its cluster centroid */
  pixels: RgbColor[][];
  /** Cluster label (0..k-1) for each pixel, same dimensions as pixels */
  labels: number[][];
  /** The k cluster centroids (RGB) */
  centroids: RgbColor[];
}
```

Change the `quantizeColors` function signature and body:

```typescript
export function quantizeColors(
  pixels: RgbColor[][],
  k: number,
  options: QuantizeOptions = {},
): QuantizeResult {
```

In the function body, after the final Lloyd iteration and `finalLabels` assignment is done (after the convergence loop, before the reconstruct block), restructure:

```typescript
  // Reconstruct 2D grid AND build 2D labels
  const resultPixels: RgbColor[][] = [];
  const resultLabels: number[][] = [];
  let idx = 0;
  for (let y = 0; y < height; y++) {
    const pixelRow: RgbColor[] = [];
    const labelRow: number[] = [];
    for (let x = 0; x < width; x++) {
      pixelRow.push({ ...means[finalLabels[idx]] });
      labelRow.push(finalLabels[idx]);
      idx++;
    }
    resultPixels.push(pixelRow);
    resultLabels.push(labelRow);
  }

  return { pixels: resultPixels, labels: resultLabels, centroids: means };
}
```

- [ ] 4.4 Run test: `cd server && npx vitest run src/services/__tests__/quantizationService.test.ts`. Expected: all tests pass.

- [ ] 4.5 Run full suite: `cd server && npx vitest run`. Expected: 30 tests pass. Commit.

---

## Task 5: Create spatialRefinementService

**Files:**
- Create: `server/src/services/spatialRefinementService.ts`
- Create: `server/src/services/__tests__/spatialRefinementService.test.ts`

**Interfaces:**
- Consumes: `labels: number[][]`, `edgeMask: boolean[][]`, `windowSize: number`, `sigma: number`
- Produces: `number[][]` (refined labels, same dimensions)

**Steps:**

- [ ] 5.1 **Write the failing test.** Create `server/src/services/__tests__/spatialRefinementService.test.ts`:

```typescript
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
    // Label 0 everywhere except one isolated label-1 pixel at center
    const labels = Array.from({ length: 5 }, () => new Array(5).fill(0));
    labels[2][2] = 1;
    const edgeMask = Array.from({ length: 5 }, () => new Array(5).fill(false));

    const result = spatialRefine(labels, edgeMask, 5, 1.5);
    // The isolated pixel at [2][2] should be flipped to 0 by neighborhood vote
    expect(result[2][2]).toBe(0);
    // Other pixels should remain 0
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
    // Edge pixels should keep their original labels
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
```

- [ ] 5.2 Run to confirm failure: `cd server && npx vitest run src/services/__tests__/spatialRefinementService.test.ts`.

- [ ] 5.3 **Implement.** Create `server/src/services/spatialRefinementService.ts`:

```typescript
/**
 * Spatial coherence refinement via Gaussian-weighted neighborhood voting.
 *
 * After K-Means clustering, isolated pixels (those surrounded by a different
 * cluster label) are re-assigned to the dominant label in their 5×5
 * neighborhood. Edge pixels (as detected by Sobel) are preserved.
 */

import { SPATIAL_WINDOW, SPATIAL_SIGMA } from '../config.js';

/**
 * Apply Gaussian-weighted neighborhood voting to refine cluster labels.
 *
 * For each non-edge pixel, its new label is the one with the highest
 * weighted vote from its (windowSize × windowSize) neighborhood.
 * Votes are weighted by a Gaussian kernel: exp(-dist² / (2 * sigma²)).
 *
 * Edge pixels retain their original label.
 *
 * @param labels     2D array of cluster labels (0..k-1)
 * @param edgeMask   2D boolean mask (true = edge pixel, skip)
 * @param windowSize Neighborhood window size (odd, default from config: 5)
 * @param sigma      Gaussian kernel sigma (default from config: 1.5)
 * @returns          Refined 2D label array (same dimensions)
 */
export function spatialRefine(
  labels: number[][],
  edgeMask: boolean[][],
  windowSize: number = SPATIAL_WINDOW,
  sigma: number = SPATIAL_SIGMA,
): number[][] {
  const height = labels.length;
  if (height === 0) return [];
  const width = labels[0].length;
  if (width === 0) return labels.map(() => []);

  const halfWindow = Math.floor(windowSize / 2);
  const result: number[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => labels[y][x]),
  );

  // Precompute Gaussian weight table: keyed by squared distance
  const weightCache = new Map<number, number>();
  const getWeight = (dx: number, dy: number): number => {
    const distSq = dx * dx + dy * dy;
    const cached = weightCache.get(distSq);
    if (cached !== undefined) return cached;
    const w = Math.exp(-distSq / (2 * sigma * sigma));
    weightCache.set(distSq, w);
    return w;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Preserve edge pixels
      if (edgeMask[y]?.[x]) continue;

      const votes = new Map<number, number>();
      let totalWeight = 0;

      for (let dy = -halfWindow; dy <= halfWindow; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -halfWindow; dx <= halfWindow; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          const label = labels[ny][nx];
          const weight = getWeight(dx, dy);
          votes.set(label, (votes.get(label) ?? 0) + weight);
          totalWeight += weight;
        }
      }

      // Pick the label with the highest weighted vote
      let bestLabel = labels[y][x];
      let bestVote = 0;
      for (const [label, vote] of votes) {
        if (vote > bestVote) {
          bestVote = vote;
          bestLabel = label;
        }
      }

      result[y][x] = bestLabel;
    }
  }

  return result;
}
```

- [ ] 5.4 Run test: `cd server && npx vitest run src/services/__tests__/spatialRefinementService.test.ts`. Expected: all 6 tests pass.

- [ ] 5.5 Run full suite: `cd server && npx vitest run`. Expected: 36 tests pass. Commit.

---

## Task 6: Update matchingService to use weightedLabDistance

**Files:**
- Modify: `server/src/services/matchingService.ts`

**Interfaces:**
- Internal change only: `labDistance()` uses `weightedLabDistance` instead of `deltaE`
- All exported function signatures unchanged

**Steps:**

- [ ] 6.1 Update the import in `server/src/services/matchingService.ts`:

```typescript
import { deltaE, rgbToLab, weightedLabDistance } from './colorSpaceService.js';
```

- [ ] 6.2 Replace the `labDistance` function body:

```typescript
export function labDistance(
  pixel: { r: number; g: number; b: number },
  color: PaletteColor,
): number {
  const lab = rgbToLab(pixel.r, pixel.g, pixel.b);
  return weightedLabDistance(lab, color.lab);
}
```

- [ ] 6.3 Run full suite: `cd server && npx vitest run`. Expected: all 36 tests pass (no tests directly test labDistance — it's indirectly tested through integration. But existing tests should still pass since weightedLabDistance with default weights behaves correctly).

- [ ] 6.4 Verify TypeScript: `cd server && npx tsc --noEmit`. Commit.

---

## Task 7: Wire new pipeline into convert.ts

**Files:**
- Modify: `server/src/routes/convert.ts`

**Interfaces:**
- Consumes: Same API parameters as before (backward compatible)
- Produces: Same `ConvertResponse` shape

**Steps:**

- [ ] 7.1 Add imports at the top of `server/src/routes/convert.ts`:

```typescript
import { sobelEdgeDetect } from '../services/edgeDetectionService.js';
import { spatialRefine } from '../services/spatialRefinementService.js';
```

- [ ] 7.2 Replace the conversion pipeline in `convert.ts`. The current pipeline block (starting from `let { pixels } = await processImage(...)` through `const materials = buildMaterials(grid);`) becomes:

```typescript
      let { pixels } = await processImage(req.file.buffer, targetWidth, targetHeight);

      // === Stage 1: Sobel edge detection ===
      const edgeMask = sobelEdgeDetect(pixels);

      // === Stage 2: K-Means++ color quantization (optional) ===
      let labels: number[][] = [];
      let centroids: RgbColor[] = [];

      if (numColors > 0) {
        const quantResult = quantizeColors(pixels, numColors);
        pixels = quantResult.pixels;
        labels = quantResult.labels;
        centroids = quantResult.centroids;
      }

      // === Stage 3: Spatial coherence smoothing (skip edges) ===
      if (numColors > 0 && labels.length > 0) {
        labels = spatialRefine(labels, edgeMask);
        // Reconstruct pixel grid from refined labels and centroids
        const height = labels.length;
        const width = labels[0]?.length ?? 0;
        const refinedPixels: RgbColor[][] = [];
        for (let y = 0; y < height; y++) {
          const row: RgbColor[] = [];
          for (let x = 0; x < width; x++) {
            row.push({ ...centroids[labels[y][x]] });
          }
          refinedPixels.push(row);
        }
        pixels = refinedPixels;
      }

      // === Stage 4: Match all pixels to real palette using weighted Lab ===
      let grid = matchPixels(pixels, palette);

      // === Stage 5: Optional legacy color merge (tolerance) ===
      const tolerance = toleranceRaw ? parseFloat(toleranceRaw) : 0;
      if (tolerance > 0) {
        grid = mergeSimilarColors(grid, Math.min(tolerance, 100));
      }
```

- [ ] 7.3 Need to add `RgbColor` import:

```typescript
import type { ConvertResponse, RgbColor } from '../types/index.js';
```

(currently the import is `import type { ConvertResponse } from '../types/index.js';`)

- [ ] 7.4 Run TypeScript check: `cd server && npx tsc --noEmit`. Fix any type errors.

- [ ] 7.5 Run full test suite: `cd server && npx vitest run`. Expected: all 36 tests pass.

- [ ] 7.6 **Manual smoke test:** Start the dev server (`npm run dev` from root), upload a test image via the frontend at http://localhost:5174, verify the conversion completes successfully with parameters: numColors=8, tolerance=0. Check that:
  - The grid renders without JavaScript errors
  - Materials list shows colors from the palette
  - Export PNG works
  - Edge cases: numColors=0 (no clustering), small images (25×25), large images (208×208)

- [ ] 7.7 Commit.

---

## Task 8: Build and validate client

**Files:**
- None modified (client unchanged)

**Steps:**

- [ ] 8.1 Build client: `cd client && npx vite build`. Expected: success.

- [ ] 8.2 Start production server: `cd server && npx tsx src/index.ts`. Expected: logs show palette loaded, server starts on port 3001. Access http://localhost:3001 and verify it serves the built SPA.

- [ ] 8.3 Commit.

---

## Task 9: Final verification and cleanup

**Steps:**

- [ ] 9.1 Run full test suite: `cd server && npx vitest run`. Expected: all 36 tests pass.

- [ ] 9.2 Run TypeScript check for both workspaces:
  - `cd server && npx tsc --noEmit`
  - `cd client && npx tsc --noEmit`

- [ ] 9.3 Verify git status shows only intended changed files:
  ```
  M  server/src/config.ts
  M  server/src/services/colorSpaceService.ts
  M  server/src/services/matchingService.ts
  M  server/src/services/quantizationService.ts
  M  server/src/routes/convert.ts
  M  server/src/services/__tests__/colorSpaceService.test.ts
  M  server/src/services/__tests__/quantizationService.test.ts
  ?? server/src/services/edgeDetectionService.ts
  ?? server/src/services/spatialRefinementService.ts
  ?? server/src/services/__tests__/edgeDetectionService.test.ts
  ?? server/src/services/__tests__/spatialRefinementService.test.ts
  ```

- [ ] 9.4 Commit all changes with a message like: `feat: unified color optimization pipeline (Sobel + spatial coherence + weighted Lab)`

---

## Summary: Test Count Progression

| After Task | New Tests | Total Tests |
|------------|-----------|-------------|
| Task 2 | 5 | 26 |
| Task 3 | 6 | 27 |
| Task 4 | 3 | 30 |
| Task 5 | 6 | 36 |

No existing tests are removed; all existing behavior is preserved.
