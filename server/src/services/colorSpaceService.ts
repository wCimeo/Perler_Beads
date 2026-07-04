/**
 * Color space conversion utilities.
 *
 * Implements the full sRGB → CIE Lab conversion chain:
 *   sRGB (gamma-encoded) → linear RGB → XYZ (D65) → CIE L*a*b* (CIE 1976)
 *
 * Reference: IEC 61966-2-1 (sRGB), CIE 15:2004
 */

// ── D65 reference white ────────────────────────────────────────────
const D65_X = 0.95047;
const D65_Y = 1.0;
const D65_Z = 1.08883;

// ── sRGB gamma ─────────────────────────────────────────────────────

/** Inverse sRGB companding (linearize a single channel, 0-1 range) */
function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * Convert an sRGB triplet to linear-light RGB (all values 0–1).
 * Step 1 of the sRGB → Lab chain.
 */
export function srgbToLinearRgb(
  r: number,
  g: number,
  b: number,
): { r: number; g: number; b: number } {
  return {
    r: srgbToLinear(r),
    g: srgbToLinear(g),
    b: srgbToLinear(b),
  };
}

// ── linear RGB → XYZ (D65) ─────────────────────────────────────────
// Standard CIE 1931 2° observer matrix, D65 adapted.

function mulMatrix(
  m: [number, number, number][],
  v: [number, number, number],
): [number, number, number] {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}

// sRGB → XYZ linear transform
const RGB2XYZ: [number, number, number][] = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.0721750],
  [0.0193339, 0.1191920, 0.9503041],
];

/**
 * Convert linear RGB (0–1) to CIE XYZ (D65 illuminant, 2° observer).
 * Step 2 of the sRGB → Lab chain.
 */
export function linearRgbToXyz(
  lr: number,
  lg: number,
  lb: number,
): { x: number; y: number; z: number } {
  const [x, y, z] = mulMatrix(RGB2XYZ, [lr, lg, lb]);
  return { x, y, z };
}

// ── XYZ → CIE L*a*b* ───────────────────────────────────────────────

const LAB_EPSILON = 216 / 24389; // (6/29)³
const LAB_KAPPA = 24389 / 27;    // (29/3)³

function xyzF(t: number): number {
  return t > LAB_EPSILON ? Math.cbrt(t) : (LAB_KAPPA * t + 16) / 116;
}

/**
 * Convert CIE XYZ to CIE L*a*b* (CIE 1976).
 * Step 3 of the sRGB → Lab chain.
 *
 * L* range: 0–100
 * a* range: roughly -128 to 127
 * b* range: roughly -128 to 127
 */
export function xyzToLab(
  x: number,
  y: number,
  z: number,
): { L: number; A: number; B: number } {
  const fx = xyzF(x / D65_X);
  const fy = xyzF(y / D65_Y);
  const fz = xyzF(z / D65_Z);

  return {
    L: 116 * fy - 16,
    A: 500 * (fx - fy),
    B: 200 * (fy - fz),
  };
}

/** Combined sRGB → linear RGB → XYZ → Lab in one call */
export function rgbToLab(
  r: number,
  g: number,
  b: number,
): { L: number; A: number; B: number } {
  const linear = srgbToLinearRgb(r, g, b);
  const xyz = linearRgbToXyz(linear.r, linear.g, linear.b);
  return xyzToLab(xyz.x, xyz.y, xyz.z);
}

// ── Delta E ────────────────────────────────────────────────────────

/** Simple Lab object / protocol used by deltaE */
export interface LabColor {
  L: number;
  A: number;
  B: number;
}

/**
 * Delta E CIE 1976 (CIE76).
 * Euclidean distance in CIE L*a*b* space.
 *
 * A ΔE of ~2.3 is considered a "just noticeable difference" (JND).
 */
export function deltaE(c1: LabColor, c2: LabColor): number {
  const dL = c1.L - c2.L;
  const dA = c1.A - c2.A;
  const dB = c1.B - c2.B;
  return Math.sqrt(dL * dL + dA * dA + dB * dB);
}
