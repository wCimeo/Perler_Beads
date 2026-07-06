import { describe, it, expect } from 'vitest';
import {
  srgbToLinearRgb,
  linearRgbToXyz,
  xyzToLab,
  rgbToLab,
  deltaE,
  weightedLabDistance,
} from '../colorSpaceService.js';

describe('sRGB to Linear RGB', () => {
  it('black maps to 0', () => {
    const { r, g, b } = srgbToLinearRgb(0, 0, 0);
    expect(r).toBeCloseTo(0, 6);
    expect(g).toBeCloseTo(0, 6);
    expect(b).toBeCloseTo(0, 6);
  });

  it('white maps to 1', () => {
    const { r, g, b } = srgbToLinearRgb(255, 255, 255);
    expect(r).toBeCloseTo(1.0, 4);
    expect(g).toBeCloseTo(1.0, 4);
    expect(b).toBeCloseTo(1.0, 4);
  });

  it('mid-gray gives roughly linear light', () => {
    const { r, g, b } = srgbToLinearRgb(128, 128, 128);
    expect(r).toBeCloseTo(0.21586, 3);
  });
});

describe('Linear RGB to XYZ (D65)', () => {
  it('full white to D65 reference Y=1', () => {
    const { x, y, z } = linearRgbToXyz(1, 1, 1);
    expect(x).toBeCloseTo(0.95047, 4);
    expect(y).toBeCloseTo(1.0, 4);
    expect(z).toBeCloseTo(1.08883, 4);
  });

  it('black to zero', () => {
    const { x, y, z } = linearRgbToXyz(0, 0, 0);
    expect(x).toBe(0);
    expect(y).toBe(0);
    expect(z).toBe(0);
  });
});

describe('XYZ to CIE L*a*b*', () => {
  it('D65 white to L=100, a=0, b=0', () => {
    const lab = xyzToLab(0.95047, 1.0, 1.08883);
    expect(lab.L).toBeCloseTo(100, 1);
    expect(lab.A).toBeCloseTo(0, 1);
    expect(lab.B).toBeCloseTo(0, 1);
  });

  it('black to L=0', () => {
    const lab = xyzToLab(0, 0, 0);
    expect(lab.L).toBeCloseTo(0, 1);
    expect(lab.A).toBeCloseTo(0, 1);
    expect(lab.B).toBeCloseTo(0, 1);
  });
});

describe('rgbToLab (combined)', () => {
  it('converts pure red sRGB(255,0,0) to reasonable Lab', () => {
    const lab = rgbToLab(255, 0, 0);
    expect(lab.L).toBeGreaterThan(40);
    expect(lab.L).toBeLessThan(60);
    expect(lab.A).toBeGreaterThan(60);
    expect(lab.B).toBeGreaterThan(40);
  });

  it('converts pure green sRGB(0,255,0) to reasonable Lab', () => {
    const lab = rgbToLab(0, 255, 0);
    expect(lab.L).toBeGreaterThan(80);
    expect(lab.A).toBeLessThan(-60);
    expect(lab.B).toBeGreaterThan(60);
  });

  it('converts pure blue sRGB(0,0,255) to reasonable Lab', () => {
    const lab = rgbToLab(0, 0, 255);
    expect(lab.L).toBeGreaterThan(20);
    expect(lab.L).toBeLessThan(40);
    expect(lab.B).toBeLessThan(-80);
    expect(lab.A).toBeGreaterThan(60);
  });
});

describe('Delta E CIE76', () => {
  it('returns 0 for identical colors', () => {
    expect(deltaE({ L: 50, A: 10, B: -20 }, { L: 50, A: 10, B: -20 })).toBe(0);
  });

  it('returns a positive value for different colors', () => {
    const d = deltaE({ L: 100, A: 0, B: 0 }, { L: 0, A: 0, B: 0 });
    expect(d).toBe(100);
  });

  it('is symmetric', () => {
    const c1 = { L: 60, A: 15, B: -30 };
    const c2 = { L: 45, A: -20, B: 10 };
    expect(deltaE(c1, c2)).toBeCloseTo(deltaE(c2, c1), 10);
  });
});

describe('weightedLabDistance', () => {
  it('returns 0 for identical colors with default weights', () => {
    const d = weightedLabDistance({ L: 50, A: 10, B: -20 }, { L: 50, A: 10, B: -20 });
    expect(d).toBe(0);
  });

  it('L difference is scaled by wL=1.5 by default', () => {
    const d = weightedLabDistance({ L: 60, A: 0, B: 0 }, { L: 50, A: 0, B: 0 });
    expect(d).toBeCloseTo(15, 5);
  });

  it('A/B differences use weight 1.0 by default', () => {
    const d = weightedLabDistance({ L: 50, A: 10, B: 0 }, { L: 50, A: 0, B: 0 });
    expect(d).toBeCloseTo(10, 5);
  });

  it('accepts custom weights', () => {
    const d = weightedLabDistance(
      { L: 100, A: 0, B: 0 }, { L: 0, A: 0, B: 0 },
      { wL: 2.0, wA: 1.0, wB: 1.0 },
    );
    expect(d).toBeCloseTo(200, 5);
  });

  it('is symmetric', () => {
    const c1 = { L: 60, A: 15, B: -30 };
    const c2 = { L: 45, A: -20, B: 10 };
    expect(weightedLabDistance(c1, c2)).toBeCloseTo(weightedLabDistance(c2, c1), 10);
  });
});

describe('Round-trip consistency', () => {
  it('mid-gray sRGB(128,128,128) gives Lab values without NaN', () => {
    const lab = rgbToLab(128, 128, 128);
    expect(Number.isNaN(lab.L)).toBe(false);
    expect(Number.isNaN(lab.A)).toBe(false);
    expect(Number.isNaN(lab.B)).toBe(false);
    expect(lab.L).toBeGreaterThan(0);
    expect(lab.L).toBeLessThan(100);
    expect(Math.abs(lab.A)).toBeLessThan(1);
    expect(Math.abs(lab.B)).toBeLessThan(1);
  });

  it('all valid RGB values produce finite Lab', () => {
    const testCases = [
      { r: 255, g: 255, b: 255 },
      { r: 0, g: 0, b: 0 },
      { r: 128, g: 128, b: 128 },
      { r: 255, g: 0, b: 0 },
      { r: 0, g: 255, b: 0 },
      { r: 0, g: 0, b: 255 },
      { r: 255, g: 255, b: 0 },
      { r: 51, g: 153, b: 204 },
    ];
    for (const { r, g, b } of testCases) {
      const lab = rgbToLab(r, g, b);
      expect(Number.isFinite(lab.L)).toBe(true);
      expect(Number.isFinite(lab.A)).toBe(true);
      expect(Number.isFinite(lab.B)).toBe(true);
      expect(lab.L).toBeGreaterThanOrEqual(0);
      expect(lab.L).toBeLessThanOrEqual(100.1);
    }
  });
});
