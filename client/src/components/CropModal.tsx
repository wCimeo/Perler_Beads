import { useState, useRef, useEffect } from 'react';

interface CropModalProps {
  imageUrl: string;
  onCrop: (blob: Blob) => void;
  onCancel: () => void;
}

export default function CropModal({ imageUrl, onCrop, onCancel }: CropModalProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    const img = imgRef.current; if (!img) return;
    const r = img.getBoundingClientRect();
    const sx = (e.clientX - r.left) / r.width;
    const sy = (e.clientY - r.top) / r.height;
    setStart({ x: Math.max(0, Math.min(1, sx)), y: Math.max(0, Math.min(1, sy)) });
    setDragging(true);
    setRect(null);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const img = imgRef.current; if (!img) return;
    const r = img.getBoundingClientRect();
    const ex = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const ey = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    setRect({ x: Math.min(start.x, ex), y: Math.min(start.y, ey), w: Math.abs(ex - start.x), h: Math.abs(ey - start.y) });
  };
  const handleMouseUp = () => setDragging(false);

  const confirmCrop = () => {
    if (!rect || !imgRef.current) return;
    const img = imgRef.current;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(rect.w * nw);
    canvas.height = Math.round(rect.h * nh);
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.drawImage(img, rect.x * nw, rect.y * nh, rect.w * nw, rect.h * nh, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(b => { if (b) onCrop(b); }, 'image/png');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 8, padding: '1rem', maxWidth: '80vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ margin: '0 0 0.75rem' }}>裁剪图片 — 拖拽选择区域</h3>
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 4, cursor: 'crosshair' }}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <img ref={imgRef} src={imageUrl} alt="crop" style={{ display: 'block', maxWidth: '70vw', maxHeight: '60vh', userSelect: 'none' }} draggable={false} />
          {rect && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: `${rect.x * 100}%`, height: '100%', background: 'rgba(0,0,0,0.45)' }} />
              <div style={{ position: 'absolute', top: 0, right: 0, width: `${(1 - rect.x - rect.w) * 100}%`, height: '100%', background: 'rgba(0,0,0,0.45)' }} />
              <div style={{ position: 'absolute', top: 0, left: `${rect.x * 100}%`, width: `${rect.w * 100}%`, height: `${rect.y * 100}%`, background: 'rgba(0,0,0,0.45)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: `${rect.x * 100}%`, width: `${rect.w * 100}%`, height: `${(1 - rect.y - rect.h) * 100}%`, background: 'rgba(0,0,0,0.45)' }} />
              <div style={{ position: 'absolute', top: `${rect.y * 100}%`, left: `${rect.x * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%`, border: '2px solid #e74c3c' }} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel} style={{ fontSize: 14 }}>取消</button>
          <button className="btn btn-primary" onClick={confirmCrop} disabled={!rect} style={{ fontSize: 14 }}>确认裁剪</button>
        </div>
      </div>
    </div>
  );
}
