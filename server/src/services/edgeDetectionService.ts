/**
 * Sobel edge detection for pixel art conversion.
 *
 * Applies the 3x3 Sobel operator to detect intensity edges in a low-resolution
 * pixel grid. The output mask protects edge pixels from spatial smoothing.
 *
 * Threshold is computed adaptively: the Nth percentile of all gradient
 * magnitudes, where N = EDGE_PERCENTILE (default 85).
 */

import type { RgbColor } from '../types/index.js';
import { EDGE_PERCENTILE } from '../config.js';

/**
 * Sobel convolution kernels (3x3).
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

/** Convert RGB pixel to grayscale intensity (0-255). */
function toGray(p: RgbColor): number {
  return 0.299 * p.r + 0.587 * p.g + 0.114 * p.b;
}

/**
 * Compute the magnitude image from a 3x3 Sobel convolution.
 * Returns a 2D array of gradient magnitudes (non-negative floats).
 * Boundary pixels (where the 3x3 kernel can't be centered) get magnitude 0.
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
 * @param pixels       2D RGB pixel grid (row-major)
 * @param thresholdPct Percentile threshold for edge binarization (0-100).
 *                     Default from config: EDGE_PERCENTILE (85).
 * @returns            2D boolean mask where true = edge pixel.
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

  const allMags: number[] = [];
  for (const row of mag) for (const v of row) allMags.push(v);

  const threshold = percentile(allMags, thresholdPct);

  return mag.map((row) => row.map((v) => v > threshold));
}
