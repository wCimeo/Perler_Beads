export interface ColorEntry {
  name: string;
  color: string;
}

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface PaletteColor extends RgbColor {
  name: string;
  hex: string;
}

export interface MatchedPixel {
  hex: string;
  mark: string;
  distance: number;
}

export interface MaterialItem {
  name: string;
  hex: string;
  count: number;
}

export type PaletteMode = string;

export interface ConvertResponse {
  mode: string;
  width: number;
  height: number;
  grid: MatchedPixel[][];
  materials: MaterialItem[];
}
