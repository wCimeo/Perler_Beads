import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** 预设尺寸列表（正方形边长） */
export const PRESET_SIZES = [25, 40, 52, 64, 72, 90, 104, 120, 156, 208] as const;
export type PresetSize = (typeof PRESET_SIZES)[number];

/** 默认色卡模式 */
export const DEFAULT_PALETTE = 'mard';

/** 服务端默认端口 */
export const DEFAULT_PORT = 3001;

/** colors.json 文件路径 */
export const COLORS_PATH = resolve(__dirname, '../../assets/colors.json');

/** Canvas 导出每格像素大小 */
export const CELL_SIZE = 30;

/** 文件上传大小上限 (10MB) */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** auto 模式下默认最大边长 */
export const DEFAULT_MAX_SIZE = 52;

/** auto 模式下最大边长上限 */
export const MAX_SIZE_LIMIT = 300;
