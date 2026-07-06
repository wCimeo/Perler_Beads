import { useCallback, useState, useRef, useEffect } from 'react';
import { convertImage } from '../api/client.js';
import type { SizeOption, ConvertResponse } from '../types/index.js';
import PaletteSelect from './PaletteSelect.js';
import ImageUpload from './ImageUpload.js';
import SizeSelector from './SizeSelector.js';
import ToleranceSlider from './ToleranceSlider.js';
import CropModal from './CropModal.js';

interface ConverterFormProps {
  mode: string; colorFile: string; imageFile: File | null; imagePreviewUrl: string | null;
  selectedSize: SizeOption; maxSize: number; tolerance: number;
  numColors: number;
  loading: boolean; error: string | null;
  onModeChange: (mode: string) => void;
  onColorFileChange: (colorFile: string) => void;
  onImageChange: (file: File, previewUrl: string) => void;
  onSizeChange: (size: SizeOption) => void;
  onMaxSizeChange: (maxSize: number) => void;
  onToleranceChange: (tolerance: number) => void;
  onNumColorsChange: (numColors: number) => void;
  onStartConvert: () => void;
  onConvertSuccess: (result: ConvertResponse) => void;
  onConvertError: (error: string) => void;
  onReset: () => void;
}

export default function ConverterForm({
  mode, colorFile, imageFile, imagePreviewUrl, selectedSize, maxSize, tolerance,
  numColors,
  loading, error, onModeChange, onColorFileChange, onImageChange, onSizeChange, onMaxSizeChange,
  onToleranceChange, onNumColorsChange,
  onStartConvert, onConvertSuccess, onConvertError, onReset,
}: ConverterFormProps) {
  const [showCrop, setShowCrop] = useState(false);
  const imageFileRef = useRef(imageFile);
  useEffect(() => { imageFileRef.current = imageFile; }, [imageFile]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const file = imageFileRef.current;
    if (!file) { onConvertError('请先选择图片文件'); return; }
    onStartConvert();
    try {
      const fd = new FormData(); fd.append('image', file); fd.append('mode', mode);
      fd.append('colorFile', colorFile);
      fd.append('targetSize', String(selectedSize));
      if (selectedSize === 'auto') fd.append('maxSize', String(maxSize));
      fd.append('tolerance', String(tolerance));
      fd.append('numColors', String(numColors));
      onConvertSuccess(await convertImage(fd));
    } catch (err: any) { onConvertError(err?.response?.data?.error || err?.message || '转换失败，请重试'); }
  }, [mode, colorFile, selectedSize, maxSize, tolerance, numColors, onStartConvert, onConvertSuccess, onConvertError]);

  const handleCrop = (blob: Blob) => {
    const file = new File([blob], 'cropped.png', { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    onImageChange(file, url);
  };

  const openRemoveBg = () => {
    window.open('https://www.remove.bg/zh', '_blank');
  };

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      {error && <div className="error-message">{error}</div>}

      <div className="form-three-col">
        {/* ===== 左列 ===== */}
        <div className="form-col-box">
          <h2 className="col-title">图片处理</h2>
          <div className="form-group">
            <label>选择图片</label>
            <ImageUpload previewUrl={imagePreviewUrl} onImageChange={onImageChange} />
          </div>
          <div className="col-actions">
            <button type="button" className="btn btn-secondary" disabled={!imagePreviewUrl} onClick={() => setShowCrop(true)}>
              图片裁剪
            </button>
            <button type="button" className="btn btn-secondary" disabled={!imagePreviewUrl} onClick={openRemoveBg}>
              去除背景（在线）
            </button>
            <button type="button" className="btn btn-secondary" disabled style={{ pointerEvents: 'none' }}>
              去除背景（本地）
            </button>
          </div>
        </div>

        {/* ===== 中列 ===== */}
        <div className="form-col-box">
          <h2 className="col-title">色卡设置</h2>
          <div className="form-group">
            <label>色卡模式</label>
            <PaletteSelect value={mode} onChange={onModeChange} />
          </div>
          <div className="form-group">
            <label>颜色数量</label>
            <div className="colorfile-toggle">
              <button
                type="button"
                className={`toggle-btn${colorFile === '221' ? ' active' : ''}`}
                onClick={() => onColorFileChange('221')}
              >
                221 基础色
              </button>
              <button
                type="button"
                className={`toggle-btn${colorFile === 'full' ? ' active' : ''}`}
                onClick={() => onColorFileChange('full')}
              >
                290 全量色
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>目标尺寸</label>
            <SizeSelector value={selectedSize} maxSize={maxSize} onSizeChange={onSizeChange} onMaxSizeChange={onMaxSizeChange} />
          </div>
        </div>

        {/* ===== 右列 ===== */}
        <div className="form-col-box">
          <h2 className="col-title">图像优化</h2>
          <div className="form-group"><ToleranceSlider value={tolerance} onChange={onToleranceChange} /></div>
          <div className="form-group">
            <label
              htmlFor="numColors"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem' }}
            >
              <span>颜色聚类</span>
              <span style={{ fontWeight: 400, color: '#7f8c8d', fontSize: '0.85rem' }}>
                {numColors === 0 ? '关闭' : `${numColors} 种颜色`}
              </span>
            </label>
            <input
              id="numColors"
              type="range"
              min={0}
              max={50}
              step={1}
              value={numColors}
              onChange={(e) => onNumColorsChange(Number(e.target.value))}
              style={{
                width: '100%',
                height: 6,
                accentColor: numColors > 0 ? '#9b59b6' : '#bdc3c7',
                cursor: 'pointer',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#bdc3c7', marginTop: '0.25rem' }}>
              <span>不压缩</span>
              <span>50 种</span>
            </div>
            {numColors > 0 && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#7f8c8d' }}>
                K-Means++ 算法全局压缩颜色，保留主色调，减少噪点。
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ===== 底部 ===== */}
      <button type="submit" className="btn btn-primary btn-block" disabled={loading || !imagePreviewUrl}>
        {loading ? <><span className="loading-spinner" /> 正在转换...</> : '开始转换'}
      </button>
      {imagePreviewUrl && (
        <button type="button" className="btn btn-secondary btn-block" style={{ marginTop: '0.5rem' }} onClick={onReset}>重新开始</button>
      )}
      {showCrop && imagePreviewUrl && <CropModal imageUrl={imagePreviewUrl} onCrop={handleCrop} onCancel={() => setShowCrop(false)} />}
    </form>
  );
}
