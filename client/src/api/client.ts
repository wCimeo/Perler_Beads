import axios from 'axios';
import type { PaletteColor, ConvertResponse } from '../types/index.js';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

/** 获取可用的色卡模式列表 */
export async function fetchPalettes(): Promise<string[]> {
  const { data } = await api.get<{ palettes: string[] }>('/palettes');
  return data.palettes;
}

/** 获取指定模式的色卡数据 */
export async function fetchPaletteColors(mode: string): Promise<PaletteColor[]> {
  const { data } = await api.get<{ colors: PaletteColor[] }>(`/colors/${mode}`);
  return data.colors;
}

/** 上传图片并进行颜色匹配转换 */
export async function convertImage(formData: FormData): Promise<ConvertResponse> {
  // 不手动设置 Content-Type，让 axios 自动添加正确的 boundary
  const { data } = await api.post<ConvertResponse>('/convert', formData);
  return data;
}
