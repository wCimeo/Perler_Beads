import { useMemo } from 'react';
import type { ConvertResponse } from '../types/index.js';
import { CELL_SIZE } from '../utils/constants.js';
import { getContrastTextColor } from '../utils/contrast.js';

const RULER_WIDTH = 30;
const LEGEND_WIDTH = 180;
const LEGEND_GAP = 20;
const RULER_FONT_SIZE = 11;
const CELL_FONT_SIZE = 9;
const LEGEND_SWATCH_SIZE = 20;
const LEGEND_FONT_SIZE = 12;

function drawRuler(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  count: number,
  horizontal: boolean,
): void {
  ctx.save();
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(x, y, width, height);

  ctx.fillStyle = '#333';
  ctx.font = `${RULER_FONT_SIZE}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < count; i++) {
    const num = i + 1;
    const showLabel = num === 1 || num === count || num % 10 === 0;

    if (showLabel) {
      if (horizontal) {
        const cx = x + RULER_WIDTH + i * CELL_SIZE + CELL_SIZE / 2;
        const cy = y + height / 2;
        ctx.fillText(String(num), cx, cy);
      } else {
        const cx = x + width / 2;
        const cy = y + RULER_WIDTH + i * CELL_SIZE + CELL_SIZE / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(String(num), 0, 0);
        ctx.restore();
      }
    }

    ctx.strokeStyle = showLabel ? '#999' : '#ddd';
    ctx.lineWidth = showLabel ? 1 : 0.5;
    if (horizontal) {
      const tickX = x + RULER_WIDTH + i * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(tickX, y + height - 4);
      ctx.lineTo(tickX, y + height);
      ctx.stroke();
    } else {
      const tickY = y + RULER_WIDTH + i * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(x + width - 4, tickY);
      ctx.lineTo(x + width, tickY);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawPixelGrid(
  ctx: CanvasRenderingContext2D,
  result: ConvertResponse,
  originX: number,
  originY: number,
): void {
  const { grid, width, height } = result;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = grid[y][x];
      const px = originX + x * CELL_SIZE;
      const py = originY + y * CELL_SIZE;

      ctx.fillStyle = `#${pixel.hex}`;
      ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

      const fg = getContrastTextColor(pixel.hex);
      ctx.fillStyle = fg;
      ctx.font = `600 ${CELL_FONT_SIZE}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pixel.mark, px + CELL_SIZE / 2, py + CELL_SIZE / 2);
    }
  }
}

function drawLegend(
  ctx: CanvasRenderingContext2D,
  materials: ConvertResponse['materials'],
  startX: number,
  startY: number,
  maxHeight: number,
): void {
  ctx.save();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(startX, startY, LEGEND_WIDTH, maxHeight);
  ctx.strokeStyle = '#dddddd';
  ctx.lineWidth = 1;
  ctx.strokeRect(startX, startY, LEGEND_WIDTH, maxHeight);

  ctx.fillStyle = '#2c3e50';
  ctx.font = `bold ${LEGEND_FONT_SIZE + 2}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('图例 Legend', startX + 10, startY + 12);

  let ly = startY + 40;
  for (const m of materials) {
    if (ly + LEGEND_SWATCH_SIZE > startY + maxHeight) break;

    ctx.fillStyle = `#${m.hex}`;
    ctx.fillRect(startX + 10, ly, LEGEND_SWATCH_SIZE, LEGEND_SWATCH_SIZE);
    ctx.strokeStyle = '#cccccc';
    ctx.strokeRect(startX + 10, ly, LEGEND_SWATCH_SIZE, LEGEND_SWATCH_SIZE);

    ctx.fillStyle = '#2c3e50';
    ctx.font = `${LEGEND_FONT_SIZE}px sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(`${m.name} ×${m.count}`, startX + 36, ly + 2);

    ly += LEGEND_SWATCH_SIZE + 4;
  }

  ctx.restore();
}

export function useCanvasExport(result: ConvertResponse | null) {
  const exportPng = useMemo(
    () => () => {
      if (!result) return;

      const { width, height, materials } = result;
      const pixelAreaW = width * CELL_SIZE;
      const pixelAreaH = height * CELL_SIZE;

      const canvasWidth =
        RULER_WIDTH + pixelAreaW + RULER_WIDTH + LEGEND_GAP + LEGEND_WIDTH;
      const canvasHeight = Math.max(
        RULER_WIDTH + pixelAreaH + RULER_WIDTH,
        RULER_WIDTH + RULER_WIDTH + materials.length * (LEGEND_SWATCH_SIZE + 4) + 60,
      );

      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      drawRuler(ctx, RULER_WIDTH, 0, pixelAreaW, RULER_WIDTH, width, true);
      drawRuler(ctx, RULER_WIDTH, RULER_WIDTH + pixelAreaH, pixelAreaW, RULER_WIDTH, width, true);
      drawRuler(ctx, 0, RULER_WIDTH, RULER_WIDTH, pixelAreaH, height, false);
      drawRuler(ctx, RULER_WIDTH + pixelAreaW, RULER_WIDTH, RULER_WIDTH, pixelAreaH, height, false);

      drawPixelGrid(ctx, result, RULER_WIDTH, RULER_WIDTH);

      const legendX = RULER_WIDTH + pixelAreaW + RULER_WIDTH + LEGEND_GAP;
      drawLegend(ctx, materials, legendX, 0, canvasHeight);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `perler_beads_${result.width}x${result.height}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png');
    },
    [result],
  );

  return { exportPng };
}
