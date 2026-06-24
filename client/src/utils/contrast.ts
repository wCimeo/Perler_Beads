/** Compute best text contrast color (black or white) for a given background hex color. */
export function getContrastTextColor(hexBg: string | undefined | null): '#000000' | '#ffffff' {
  // Defensive: if hex is not a valid string, default to black text
  if (typeof hexBg !== 'string' || hexBg.length < 6) {
    return '#000000';
  }
  const r = parseInt(hexBg.substring(0, 2), 16);
  const g = parseInt(hexBg.substring(2, 4), 16);
  const b = parseInt(hexBg.substring(4, 6), 16);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 128 ? '#000000' : '#ffffff';
}
