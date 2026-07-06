import { Router } from 'express';
import { getAvailableModes, getAvailableColorFiles } from '../services/colorService.js';

const router = Router();

/** GET /api/palettes — 返回所有可用的色卡模式名称列表 + colorFile 选项 */
router.get('/', (_req, res) => {
  const modes = getAvailableModes();
  const colorFiles = getAvailableColorFiles();
  res.json({ palettes: modes, colorFiles });
});

export default router;
