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
  loading: boolean; error: string | null;
  onModeChange: (mode: string) => void;
  onImageChange: (file: File, previewUrl: string) => void;
  onSizeChange: (size: SizeOption) => void;
  onMaxSizeChange: (maxSize: number) => void;
  onToleranceChange: (tolerance: number) => void;
  onStartConvert: () => void;
  onConvertSuccess: (result: ConvertResponse) => void;
  onConvertError: (error: string) => void;
  onReset: () => void;
}

export default function ConverterForm({
  mode, imageFile, imagePreviewUrl, selectedSize, maxSize, tolerance,
  loading, error, onModeChange, onImageChange, onSizeChange, onMaxSizeChange,
  onToleranceChange, onStartConvert, onConvertSuccess, onConvertError, onReset,
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
      onConvertSuccess(await convertImage(fd));
    } catch (err: any) { onConvertError(err?.response?.data?.error || err?.message || '转换失败，请重试'); }
  }, [imageFile, mode, selectedSize, maxSize, tolerance, onStartConvert, onConvertSuccess, onConvertError]);

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
