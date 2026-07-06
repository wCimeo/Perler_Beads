/**
 * K-Means++ color quantization.
 *
 * Clusters image pixels into k groups and replaces each pixel with its
 * cluster centroid, reducing the total color count while preserving the
 * dominant tones of the original image.
 */

import type { RgbColor } from '../types/index.js';

export interface QuantizeOptions {
  /** Maximum iterations (default 20) */
  maxIter?: number;
  /** Fraction of pixels to sample (0-1). Default 1.0 (all pixels).
   *  Lower values speed up clustering on large images. */
  sampleRate?: number;
}

export interface QuantizeResult {
  /** Quantized pixel grid where each pixel = its cluster centroid */
  pixels: RgbColor[][];
  /** Cluster label (0..k-1) for each pixel, same dimensions as pixels */
  labels: number[][];
  /** The k cluster centroids (RGB) */
  centroids: RgbColor[];
}

// helpers

function rgbDist(a: RgbColor, b: RgbColor): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

function centroid(points: RgbColor[]): RgbColor {
  if (points.length === 0) return { r: 0, g: 0, b: 0 };
  let sr = 0, sg = 0, sb = 0;
  for (const p of points) { sr += p.r; sg += p.g; sb += p.b; }
  const n = points.length;
  return { r: Math.round(sr / n), g: Math.round(sg / n), b: Math.round(sb / n) };
}

// K-Means++ initialization

/**
 * Select k initial centroids using K-Means++ seeding.
 * Returns indices into the data array.
 */
function kmeansPlusPlus(data: RgbColor[], k: number, random: () => number): number[] {
  const n = data.length;
  const centroids: number[] = [];

  // First centroid: random
  centroids.push(Math.floor(random() * n));

  // Distance to nearest centroid for each point
  const minDist = new Float64Array(n).fill(Infinity);

  for (let ci = 1; ci < k; ci++) {
    let totalDist = 0;

    for (let i = 0; i < n; i++) {
      const d = rgbDist(data[i], data[centroids[ci - 1]]);
      if (d < minDist[i]) minDist[i] = d;
      totalDist += minDist[i];
    }

    // Pick next centroid with probability proportional to squared distance
    let threshold = random() * totalDist;
    let idx = n - 1;
    for (let i = 0; i < n; i++) {
      threshold -= minDist[i];
      if (threshold <= 0) {
        idx = i;
        break;
      }
    }

    centroids.push(idx);
  }

  return centroids;
}

// Lloyd iteration

function assignClusters(data: RgbColor[], means: RgbColor[]): number[] {
  const n = data.length;
  const k = means.length;
  const labels = new Int32Array(n);

  for (let i = 0; i < n; i++) {
    let best = 0;
    let bestDist = rgbDist(data[i], means[0]);
    for (let j = 1; j < k; j++) {
      const d = rgbDist(data[i], means[j]);
      if (d < bestDist) { bestDist = d; best = j; }
    }
    labels[i] = best;
  }

  return Array.from(labels);
}

function recomputeMeans(data: RgbColor[], labels: number[], k: number): RgbColor[] {
  const groups: RgbColor[][] = Array.from({ length: k }, () => []);
  for (let i = 0; i < data.length; i++) {
    groups[labels[i]].push(data[i]);
  }
  return groups.map(centroid);
}

// public API

/**
 * Quantize a 2D pixel grid using K-Means++ clustering.
 *
 * @param pixels  2D pixel grid (row-major)
 * @param k       Number of color clusters (2-256 recommended)
 * @param options Optional tuning parameters
 * @returns       QuantizeResult with pixels, labels, and centroids
 */
export function quantizeColors(
  pixels: RgbColor[][],
  k: number,
  options: QuantizeOptions = {},
): QuantizeResult {
  const maxIter = options.maxIter ?? 20;
  const height = pixels.length;
  if (height === 0) return { pixels: [], labels: [], centroids: [] };
  const width = pixels[0].length;
  if (width === 0) return { pixels: pixels, labels: pixels.map(() => []), centroids: [] };

  // Clamp k to valid range (k=0 => default to 1)
  k = Math.max(1, Math.min(k, 256));

  // Flatten
  const flat: RgbColor[] = [];
  for (const row of pixels) for (const p of row) flat.push(p);

  // Optionally downsample for speed on large images
  const sampleRate = options.sampleRate ?? 1.0;
  let data = flat;
  if (sampleRate < 1.0) {
    const sampleSize = Math.max(k * 100, Math.ceil(flat.length * sampleRate));
    const step = Math.max(1, Math.floor(flat.length / sampleSize));
    data = [];
    for (let i = 0; i < flat.length; i += step) data.push(flat[i]);
  }

  // Seeded pseudo-random for reproducibility
  const random = mulberry32(42);

  // K-Means++ init
  const seedIndices = kmeansPlusPlus(data, k, random);
  let means = seedIndices.map((i) => ({ ...data[i] }));

  // Lloyd iteration
  let labels: number[] = [];
  for (let iter = 0; iter < maxIter; iter++) {
    labels = assignClusters(data, means);
    const newMeans = recomputeMeans(data, labels, k);

    // Check convergence
    let moved = false;
    for (let j = 0; j < k; j++) {
      if (rgbDist(means[j], newMeans[j]) > 0.1) { moved = true; break; }
    }
    means = newMeans;
    if (!moved) break;
  }

  // Map each pixel in the flat grid to its nearest centroid
  const finalLabels = assignClusters(flat, means);

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

// Seeded PRNG (mulberry32)

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
