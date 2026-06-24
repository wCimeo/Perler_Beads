import { useRef, useState, useCallback } from 'react';

interface ImageUploadProps {
  previewUrl: string | null;
  onImageChange: (file: File, previewUrl: string) => void;
}

export default function ImageUpload({ previewUrl, onImageChange }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
      }
      const url = URL.createObjectURL(file);
      onImageChange(file, url);
    },
    [onImageChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div>
      {previewUrl ? (
        <div className="image-preview" onClick={() => fileInputRef.current?.click()}>
          <img src={previewUrl} alt="预览" />
          <p className="upload-hint" style={{ marginTop: '0.5rem', color: '#7f8c8d' }}>
            点击更换图片
          </p>
        </div>
      ) : (
        <div
          className={`image-upload-area${dragOver ? ' drag-over' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <span className="upload-hint">
            <span className="upload-icon">📁</span>
            拖拽图片到此处，或点击选择文件
            <br />
            <small>支持 JPG、PNG、WebP 等常见格式</small>
          </span>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}
