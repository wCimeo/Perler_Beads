import { Router } from 'express';
import { getAvailableModes } from '../services/colorService.js';

const router = Router();

/** GET /api/palettes — 返回所有可用的色卡模式名称列表 */
router.get('/', (_req, res) => {
  const modes = getAvailableModes();
  res.json({ palettes: modes });
});

export default router;
