import type { PaletteColor, MatchedPixel, MaterialItem } from '../types/index.js';
import { deltaE, rgbToLab, weightedLabDistance } from './colorSpaceService.js';

export function labDistance(
  pixel: { r: number; g: number; b: number },
  color: PaletteColor,
): number {
  const lab = rgbToLab(pixel.r, pixel.g, pixel.b);
  return weightedLabDistance(lab, color.lab);
}

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
  let best = palette[0]; let bestDist = labDistance(pixel, best);
  for (let i = 1; i < palette.length; i++) {
    const dist = labDistance(pixel, palette[i]);
    if (dist < bestDist) { bestDist = dist; best = palette[i]; }
  }
  return { hex: best.hex, mark: best.mark, name: best.name, distance: Math.round(bestDist * 100) / 100 };
}

export function matchPixels(
  pixelGrid: { r: number; g: number; b: number }[][], palette: PaletteColor[],
): MatchedPixel[][] {
  return pixelGrid.map((row) => row.map((pixel) => findBestMatch(pixel, palette)));
}

export function mergeSimilarColors(
  grid: MatchedPixel[][], tolerance: number,
): MatchedPixel[][] {
  if (tolerance <= 0) return grid;

  const threshold = tolerance * 0.1;

  const colorMap = new Map<string, { mark: string; name: string; hex: string; count: number }>();
  for (const row of grid) for (const pixel of row) {
    const e = colorMap.get(pixel.mark);
    if (e) e.count++; else colorMap.set(pixel.mark, { mark: pixel.mark, name: pixel.name, hex: pixel.hex, count: 1 });
  }
  const colors = Array.from(colorMap.values()); colors.sort((a, b) => b.count - a.count);
  const mergeTarget = new Map<string, string>();
  for (let i = 0; i < colors.length; i++) {
    const c = colors[i]; if (mergeTarget.has(c.mark)) continue;
    mergeTarget.set(c.mark, c.mark);
    for (let j = i + 1; j < colors.length; j++) {
      const o = colors[j]; if (mergeTarget.has(o.mark)) continue;
      const lab1 = rgbToLab(
        (parseInt(c.hex,16)>>16)&0xff, (parseInt(c.hex,16)>>8)&0xff, parseInt(c.hex,16)&0xff,
      );
      const lab2 = rgbToLab(
        (parseInt(o.hex,16)>>16)&0xff, (parseInt(o.hex,16)>>8)&0xff, parseInt(o.hex,16)&0xff,
      );
      const d = deltaE(lab1, lab2);
      if (d <= threshold) mergeTarget.set(o.mark, c.mark);
    }
  }
  return grid.map((row) => row.map((pixel) => {
    const t = mergeTarget.get(pixel.mark);
    if (t && t !== pixel.mark) { const mc = colorMap.get(t)!; return { hex: mc.hex, mark: mc.mark, name: mc.name, distance: pixel.distance }; }
    return pixel;
  }));
}

export function buildMaterials(grid: MatchedPixel[][]): MaterialItem[] {
  const m = new Map<string, { name: string; hex: string; count: number }>();
  for (const r of grid) for (const p of r) {
    const e = m.get(p.name);
    if (e) e.count++;
    else m.set(p.name, { name: p.name, hex: p.hex, count: 1 });
  }
  const a = Array.from(m.values());
  a.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  return a;
}
