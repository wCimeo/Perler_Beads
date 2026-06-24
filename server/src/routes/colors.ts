import { Router } from 'express';
import { getPalette, getAvailableModes } from '../services/colorService.js';

const router = Router();

/** GET /api/colors/:mode — 返回指定模式的色卡颜色数据 */
router.get('/:mode', (req, res) => {
  const { mode } = req.params;
  const palette = getPalette(mode);
  if (!palette) {
    res.status(400).json({
      error: `无效的色卡模式 "${mode}"，可用模式：${getAvailableModes().join(', ')}`,
    });
    return;
  }
  res.json({ colors: palette });
});

export default router;
