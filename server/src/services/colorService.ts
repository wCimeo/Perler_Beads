import { readFileSync } from 'fs';
import type { ColorEntry, PaletteColor, PaletteMode } from '../types/index.js';
import { COLORS_PATH, COLORS_221_PATH } from '../config.js';
import { rgbToLab } from './colorSpaceService.js';

type PaletteMap = Map<string, PaletteColor[]>;

/** hex 字符串解析为 RGB */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

/** 加载并解析色卡文件，返回按 "mode:colorFile" 键索引的色卡 Map */
export function loadPalettes(): PaletteMap {
  const palettes = new Map<string, PaletteColor[]>();

  for (const [key, path] of Object.entries({ 'mard:full': COLORS_PATH, 'coco:full': COLORS_PATH, 'mard:221': COLORS_221_PATH, 'coco:221': COLORS_221_PATH })) {
    const raw = readFileSync(path, 'utf-8');
    const data = JSON.parse(raw) as Record<string, ColorEntry[]>;
    const [mode] = key.split(':');
    const entries = data[mode];
    if (!entries) continue;
    const colors: PaletteColor[] = entries.map((entry) => {
      const rgb = hexToRgb(String(entry.color));
      const lab = rgbToLab(rgb.r, rgb.g, rgb.b);
      return {
        name: entry.name,
        hex: String(entry.color),
        mark: entry.name.replace(/[^A-Za-z\d]/g, ''),
        ...rgb,
        lab: { L: lab.L, A: lab.A, B: lab.B },
      };
    });
    palettes.set(key, colors);
  }

  return palettes;
}

let _palettes: PaletteMap | null = null;

export function getPalettes(): PaletteMap {
  if (!_palettes) {
    _palettes = loadPalettes();
  }
  return _palettes;
}

export function getPalette(mode: string, colorFile: string): PaletteColor[] | undefined {
  return getPalettes().get(`${mode}:${colorFile}`);
}

export function getAvailableModes(): string[] {
  const keys = Array.from(getPalettes().keys());
  return [...new Set(keys.map(k => k.split(':')[0]))];
}

export function getAvailableColorFiles(): string[] {
  const keys = Array.from(getPalettes().keys());
  return [...new Set(keys.map(k => k.split(':')[1]))];
}

export function resetPalettes(): void {
  _palettes = null;
}
