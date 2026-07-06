/**
 * Spatial coherence refinement via Gaussian-weighted neighborhood voting.
 *
 * After K-Means clustering, isolated pixels (those surrounded by a different
 * cluster label) are re-assigned to the dominant label in their neighborhood.
 * Edge pixels (as detected by Sobel) are preserved.
 */

import { SPATIAL_WINDOW, SPATIAL_SIGMA } from '../config.js';

/**
 * Apply Gaussian-weighted neighborhood voting to refine cluster labels.
 *
 * For each non-edge pixel, its new label is the one with the highest
 * weighted vote from its (windowSize x windowSize) neighborhood.
 * Votes are weighted by a Gaussian kernel: exp(-distSq / (2 * sigma^2)).
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
