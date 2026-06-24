/** 预设尺寸列表 */
export const PRESET_SIZES = [25, 40, 52, 64, 72, 90, 104, 120, 156, 208] as const;
export type PresetSize = (typeof PRESET_SIZES)[number];

/** 默认色卡模式 */
export const DEFAULT_PALETTE = 'mard';

/** auto 模式下默认最大边长 */
export const DEFAULT_MAX_SIZE = 52;

/** auto 模式下最大边长上限 */
export const MAX_SIZE_LIMIT = 300;

/** 导出 PNG 每格像素大小 */
export const CELL_SIZE = 30;
