export interface ColorEntry {
  name: string;
  color: string;
}

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface LabColor {
  L: number;  // CIE L* (0–100)
  A: number;  // CIE a* (green–red, approx -128–127)
  B: number;  // CIE b* (blue–yellow, approx -128–127)
}

export interface PaletteColor extends RgbColor {
  name: string;
  hex: string;
  /** 纯字母数字标识（如 "H2"），用于像素格子内显示 */
  mark: string;
  /** Pre-computed CIE L*a*b* values for perceptual distance calculation */
  lab: LabColor;
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

export type PaletteMode = string;

/** Additional options passed from the client for the conversion pipeline */
export interface ConvertOptions {
  /** K-Means cluster count for quantization (0 = disabled) */
  numColors: number;
}

export interface ConvertResponse {
  mode: string;
  width: number;
  height: number;
  grid: MatchedPixel[][];
  materials: MaterialItem[];
}
