export interface PaletteColor {
  name: string;
  mark: string;
  hex: string;
  r: number;
  g: number;
  b: number;
}

export interface MatchedPixel {
  hex: string;
  mark: string;
  name: string;
  distance: number;
}

export interface MaterialItem {
  name: string;
  hex: string;
  count: number;
}

export interface ConvertResponse {
  mode: string;
  width: number;
  height: number;
  grid: MatchedPixel[][];
  materials: MaterialItem[];
}

export type AppView = 'form' | 'preview';

export type SizeOption = number | 'auto';
