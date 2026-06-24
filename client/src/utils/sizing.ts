/**
 * 按最大边长等比缩放尺寸。
 * 最长边不超过 maxSize，最小 1x1。
 */
export function scaleDimensions(
  origW: number,
  origH: number,
  maxSize: number,
): { width: number; height: number } {
  const scale = maxSize / Math.max(origW, origH);
  return {
    width: Math.max(1, Math.round(origW * scale)),
    height: Math.max(1, Math.round(origH * scale)),
  };
}
