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

/**
 * POST /api/convert
 * Accept an image file and convert it to perler bead pixel art.
 *
 * FormData parameters:
 *   - image: File (image file)
 *   - mode: string (color palette mode, e.g. "mard", "coco")
 *   - targetSize: number | "auto" (preset size value or auto-scale)
 *   - maxSize: number (max side length in auto mode, 1-300, default 52)
 *   - tolerance: number (0-100 color merge tolerance)
 *   - numColors: number (0-50, default 0=off) — K-Means quantization cluster count
 */
router.post(
  '/',
  upload.single('image'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Validate file
      if (!req.file) {
        console.error('[convert] No file in request. Content-Type:', req.get('Content-Type'));
        res.status(400).json({ error: 'No image file uploaded' });
        return;
      }

      // 2. Parse and validate parameters
      const mode = req.body.mode as string | undefined;
      const targetSizeRaw = req.body.targetSize as string | undefined;
      const maxSizeRaw = req.body.maxSize as string | undefined;
      const toleranceRaw = req.body.tolerance as string | undefined;

      if (!mode || !getAvailableModes().includes(mode)) {
        res.status(400).json({
          error: `Invalid palette mode "${mode}". Available: ${getAvailableModes().join(', ')}`,
        });
        return;
      }

      const palette = getPalette(mode)!;

      // 3. Parse targetSize
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

      // 4. Parse numColors
      const numColorsRaw = req.body.numColors as string | undefined;
      let numColors = numColorsRaw ? parseInt(numColorsRaw, 10) : 0;
      if (isNaN(numColors) || numColors < 0) numColors = 0;
      if (numColors > 50) numColors = 50;

      // 5. Image processing (resize → raw pixels)
      let { pixels } = await processImage(req.file.buffer, targetWidth, targetHeight);

      // 6. Optional: K-Means color quantization
      if (numColors > 0) {
        pixels = quantizeColors(pixels, numColors);
      }

      // 7. Color matching
      let grid = matchPixels(pixels, palette);

      // 8. Color merging (tolerance > 0 merges similar colors using Lab ΔE)
      const tolerance = toleranceRaw ? parseFloat(toleranceRaw) : 0;
      if (tolerance > 0) {
        grid = mergeSimilarColors(grid, Math.min(tolerance, 100));
      }

      // 9. Material statistics
      const materials = buildMaterials(grid);

      const response: ConvertResponse = {
        mode,
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
