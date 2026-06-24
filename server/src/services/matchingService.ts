import type { PaletteColor, MatchedPixel, MaterialItem } from '../types/index.js';

/** Equal-weight Euclidean RGB distance for faithful color matching */
export function weightedRgbDistance(
  p: { r: number; g: number; b: number },
  c: { r: number; g: number; b: number },
): number {
  const dR = p.r - c.r; const dG = p.g - c.g; const dB = p.b - c.b;
  return Math.sqrt(dR * dR + dG * dG + dB * dB);
}

export function findBestMatch(
  pixel: { r: number; g: number; b: number }, palette: PaletteColor[],
): MatchedPixel {
  let best = palette[0]; let bestDist = weightedRgbDistance(pixel, best);
  for (let i = 1; i < palette.length; i++) {
    const dist = weightedRgbDistance(pixel, palette[i]);
    if (dist < bestDist) { bestDist = dist; best = palette[i]; }
  }
  return { hex: best.hex, mark: best.name, distance: Math.round(bestDist * 100) / 100 };
}

export function matchPixels(
  pixelGrid: { r: number; g: number; b: number }[][], palette: PaletteColor[],
): MatchedPixel[][] {
  return pixelGrid.map((row) => row.map((pixel) => findBestMatch(pixel, palette)));
}

/** Merge similar colors to reduce final color count (frequency-based, not spatial) */
export function mergeSimilarColors(
  grid: MatchedPixel[][], tolerance: number,
): MatchedPixel[][] {
  if (tolerance <= 0) return grid;
  const threshold = tolerance * 2;
  const colorMap = new Map<string, { mark: string; hex: string; count: number }>();
  for (const row of grid) for (const pixel of row) {
    const e = colorMap.get(pixel.mark);
    if (e) e.count++; else colorMap.set(pixel.mark, { mark: pixel.mark, hex: pixel.hex, count: 1 });
  }
  const colors = Array.from(colorMap.values()); colors.sort((a, b) => b.count - a.count);
  const mergeTarget = new Map<string, string>();
  for (let i = 0; i < colors.length; i++) {
    const c = colors[i]; if (mergeTarget.has(c.mark)) continue;
    mergeTarget.set(c.mark, c.mark);
    for (let j = i + 1; j < colors.length; j++) {
      const o = colors[j]; if (mergeTarget.has(o.mark)) continue;
      const d = weightedRgbDistance(
        { r: (parseInt(c.hex,16)>>16)&0xff, g: (parseInt(c.hex,16)>>8)&0xff, b: parseInt(c.hex,16)&0xff },
        { r: (parseInt(o.hex,16)>>16)&0xff, g: (parseInt(o.hex,16)>>8)&0xff, b: parseInt(o.hex,16)&0xff },
      );
      if (d <= threshold) mergeTarget.set(o.mark, c.mark);
    }
  }
  return grid.map((row) => row.map((pixel) => {
    const t = mergeTarget.get(pixel.mark);
    if (t && t !== pixel.mark) { const mc = colorMap.get(t)!; return { hex: mc.hex, mark: mc.mark, distance: pixel.distance }; }
    return pixel;
  }));
}

export function buildMaterials(grid: MatchedPixel[][]): MaterialItem[] {
  const m = new Map<string, { name: string; hex: string; count: number }>();
  for (const r of grid) for (const p of r) { const e = m.get(p.mark); if (e) e.count++; else m.set(p.mark, { name: p.mark, hex: p.hex, count: 1 }); }
  const a = Array.from(m.values()); a.sort((a,b) => a.name.localeCompare(b.name, undefined, { numeric: true })); return a;
}
