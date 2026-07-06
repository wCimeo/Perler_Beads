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

/** colors.json 文件路径（全量色卡） */
export const COLORS_PATH = resolve(__dirname, '../../assets/colors.json');

/** colors_221.json 文件路径（基础色卡） */
export const COLORS_221_PATH = resolve(__dirname, '../../assets/colors_221.json');

/** Canvas 导出每格像素大小 */
export const CELL_SIZE = 30;

/** 文件上传大小上限 (10MB) */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** auto 模式下默认最大边长 */
export const DEFAULT_MAX_SIZE = 52;

/** auto 模式下最大边长上限 */
export const MAX_SIZE_LIMIT = 300;

/** 加权 Lab 距离 — L* 通道权重（强调亮度一致性） */
export const LAB_WEIGHT_L = 1.5;

/** 加权 Lab 距离 — a* 通道权重 */
export const LAB_WEIGHT_A = 1.0;

/** 加权 Lab 距离 — b* 通道权重 */
export const LAB_WEIGHT_B = 1.0;

/** 空间平滑邻域窗口大小（奇数，5 = 5×5 窗口） */
export const SPATIAL_WINDOW = 5;

/** 空间平滑高斯核 σ */
export const SPATIAL_SIGMA = 1.5;

/** Sobel 边缘检测分位数阈值（百分比，0-100） */
export const EDGE_PERCENTILE = 85;
