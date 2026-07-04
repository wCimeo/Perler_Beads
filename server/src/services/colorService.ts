import { readFileSync } from 'fs';
import type { ColorEntry, PaletteColor, PaletteMode } from '../types/index.js';
import { COLORS_PATH } from '../config.js';
import { rgbToLab } from './colorSpaceService.js';

type PaletteMap = Map<PaletteMode, PaletteColor[]>;

/** �?hex 字符串解析为 RGB �?*/
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

/** 加载并解�?colors.json，返回按模式索引的色�?Map */
export function loadPalettes(path: string = COLORS_PATH): PaletteMap {
  const raw = readFileSync(path, 'utf-8');
  const data = JSON.parse(raw) as Record<string, ColorEntry[]>;

  const palettes = new Map<PaletteMode, PaletteColor[]>();

  for (const [mode, entries] of Object.entries(data)) {
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
    palettes.set(mode, colors);
  }

  return palettes;
}

let _palettes: PaletteMap | null = null;

/** 获取已缓存的色卡（若未加载则自动加载�?*/
export function getPalettes(): PaletteMap {
  if (!_palettes) {
    _palettes = loadPalettes();
  }
  return _palettes;
}

/** 获取指定模式的色卡，不存在则返回 undefined */
export function getPalette(mode: PaletteMode): PaletteColor[] | undefined {
  return getPalettes().get(mode);
}

/** 获取所有可用模式名 */
export function getAvailableModes(): string[] {
  return Array.from(getPalettes().keys());
}

/** 测试用：重置缓存 */
export function resetPalettes(): void {
  _palettes = null;
}
