import { useCallback, useState } from 'react';
import { convertImage } from '../api/client.js';
import type { SizeOption, ConvertResponse } from '../types/index.js';
import PaletteSelect from './PaletteSelect.js';
import ImageUpload from './ImageUpload.js';
import SizeSelector from './SizeSelector.js';
import ToleranceSlider from './ToleranceSlider.js';
import CropModal from './CropModal.js';

interface ConverterFormProps {
  mode: string; imageFile: File | null; imagePreviewUrl: string | null;
  selectedSize: SizeOption; maxSize: number; tolerance: number;
  numColors: number;
  loading: boolean; error: string | null;
  onModeChange: (mode: string) => void;
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
  mode, imageFile, imagePreviewUrl, selectedSize, maxSize, tolerance,
  numColors,
  loading, error, onModeChange, onImageChange, onSizeChange, onMaxSizeChange,
  onToleranceChange, onNumColorsChange,
  onStartConvert, onConvertSuccess, onConvertError, onReset,
}: ConverterFormProps) {
  const [showCrop, setShowCrop] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) { onConvertError('请先选择图片文件'); return; }
    onStartConvert();
    try {
      const fd = new FormData(); fd.append('image', imageFile); fd.append('mode', mode);
      fd.append('targetSize', String(selectedSize));
      if (selectedSize === 'auto') fd.append('maxSize', String(maxSize));
      fd.append('tolerance', String(tolerance));
      fd.append('numColors', String(numColors));
      onConvertSuccess(await convertImage(fd));
    } catch (err: any) { onConvertError(err?.response?.data?.error || err?.message || '转换失败，请重试'); }
  }, [imageFile, mode, selectedSize, maxSize, tolerance, numColors, onStartConvert, onConvertSuccess, onConvertError]);

  const handleCrop = (blob: Blob) => {
    const file = new File([blob], 'cropped.png', { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    onImageChange(file, url);
  };

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <h2>上传图片</h2>
      {error && <div className="error-message">{error}</div>}
      <div className="form-group"><label>色卡模式</label><PaletteSelect value={mode} onChange={onModeChange} /></div>
      <div className="form-group">
        <label>选择图片</label>
        <ImageUpload previewUrl={imagePreviewUrl} onImageChange={onImageChange} />
        {imagePreviewUrl && (
          <button type="button" className="btn btn-secondary" style={{ marginTop: 8, fontSize: 13 }} onClick={() => setShowCrop(true)}>裁剪图片</button>
        )}
      </div>
      <div className="form-group"><label>目标尺寸</label><SizeSelector value={selectedSize} maxSize={maxSize} onSizeChange={onSizeChange} onMaxSizeChange={onMaxSizeChange} /></div>
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
