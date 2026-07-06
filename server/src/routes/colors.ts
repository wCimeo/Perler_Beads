import { Router } from 'express';
import { getPalette, getAvailableModes, getAvailableColorFiles } from '../services/colorService.js';

const router = Router();

/** GET /api/colors/:mode?file=full|221 — 返回指定模式和色卡文件的颜色数据 */
router.get('/:mode', (req, res) => {
  const { mode } = req.params;
  const colorFile = (req.query.file as string) || 'full';

  if (!getAvailableModes().includes(mode)) {
    res.status(400).json({
      error: `无效的色卡模式 "${mode}"，可用模式：${getAvailableModes().join(', ')}`,
    });
    return;
  }
  if (!getAvailableColorFiles().includes(colorFile)) {
    res.status(400).json({
      error: `无效的色卡文件 "${colorFile}"，可用：${getAvailableColorFiles().join(', ')}`,
    });
    return;
  }

  const palette = getPalette(mode, colorFile);
  res.json({ colors: palette });
});

export default router;
