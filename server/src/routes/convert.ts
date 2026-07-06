import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { upload } from '../middleware/upload.js';
import { getPalette, getAvailableModes } from '../services/colorService.js';
import { processImage, getImageMetadata } from '../services/imageService.js';
import { matchPixels, buildMaterials, mergeSimilarColors } from '../services/matchingService.js';
import { quantizeColors } from '../services/quantizationService.js';
import { PRESET_SIZES, DEFAULT_MAX_SIZE, MAX_SIZE_LIMIT } from '../config.js';
import type { ConvertResponse } from '../types/index.js';

const router = Router();

router.post(
  '/',
  upload.single('image'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        console.error('[convert] No file in request. Content-Type:', req.get('Content-Type'));
        res.status(400).json({ error: 'No image file uploaded' });
        return;
      }

      const mode = req.body.mode as string | undefined;
      const colorFile = (req.body.colorFile as string) || 'full';
      const targetSizeRaw = req.body.targetSize as string | undefined;
      const maxSizeRaw = req.body.maxSize as string | undefined;
      const toleranceRaw = req.body.tolerance as string | undefined;

      if (!mode || !getAvailableModes().includes(mode)) {
        res.status(400).json({
          error: `Invalid palette mode "${mode}". Available: ${getAvailableModes().join(', ')}`,
        });
        return;
      }

      const palette = getPalette(mode, colorFile);
      if (!palette) {
        res.status(400).json({
          error: `Palette not found for mode="${mode}" colorFile="${colorFile}"`,
        });
        return;
      }

      let targetWidth: number;
      let targetHeight: number;

      if (targetSizeRaw === 'auto') {
        let maxSize = maxSizeRaw ? parseInt(maxSizeRaw, 10) : DEFAULT_MAX_SIZE;
        if (isNaN(maxSize) || maxSize < 1 || maxSize > MAX_SIZE_LIMIT) {
          maxSize = DEFAULT_MAX_SIZE;
        }
        const meta = await getImageMetadata(req.file.buffer);
        const scale = maxSize / Math.max(meta.width, meta.height);
        targetWidth = Math.max(1, Math.round(meta.width * scale));
        targetHeight = Math.max(1, Math.round(meta.height * scale));
      } else {
        const size = parseInt(targetSizeRaw || '', 10);
        if (isNaN(size) || !PRESET_SIZES.includes(size as typeof PRESET_SIZES[number])) {
          res.status(400).json({
            error: `Invalid size "${targetSizeRaw}". Available: ${PRESET_SIZES.join(', ')}`,
          });
          return;
        }
        targetWidth = size;
        targetHeight = size;
      }

      const numColorsRaw = req.body.numColors as string | undefined;
      let numColors = numColorsRaw ? parseInt(numColorsRaw, 10) : 0;
      if (isNaN(numColors) || numColors < 0) numColors = 0;
      if (numColors > 50) numColors = 50;

      let { pixels } = await processImage(req.file.buffer, targetWidth, targetHeight);

      if (numColors > 0) {
        pixels = quantizeColors(pixels, numColors);
      }

      let grid = matchPixels(pixels, palette);

      const tolerance = toleranceRaw ? parseFloat(toleranceRaw) : 0;
      if (tolerance > 0) {
        grid = mergeSimilarColors(grid, Math.min(tolerance, 100));
      }

      const materials = buildMaterials(grid);

      const response: ConvertResponse = {
        mode,
        colorFile,
        width: targetWidth,
        height: targetHeight,
        grid,
        materials,
      };

      res.json(response);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
