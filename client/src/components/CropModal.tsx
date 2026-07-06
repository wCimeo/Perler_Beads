import { useState, useRef } from 'react';

interface CropModalProps {
  imageUrl: string;
  onCrop: (blob: Blob) => void;
  onCancel: () => void;
}

const RATIOS = [
  { label: '自由', w: 0, h: 0 },
  { label: '1:1', w: 1, h: 1 },
  { label: '3:4', w: 3, h: 4 },
  { label: '9:16', w: 9, h: 16 },
];

export default function CropModal({ imageUrl, onCrop, onCancel }: CropModalProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [ratioIdx, setRatioIdx] = useState(0);
  const [rect, setRect] = useState({ x: 0.2, y: 0.2, w: 0.6, h: 0.6 });
  const [hasRect, setHasRect] = useState(true);
  const [dragMode, setDragMode] = useState<'draw' | 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se' | null>(null);
  const dragRef = useRef({ sx: 0, sy: 0, rx: 0, ry: 0, rw: 0, rh: 0 });

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const applyRatio = (x: number, y: number, w: number, h: number) => {
    const ratio = RATIOS[ratioIdx];
    if (ratio.w === 0) return { x, y, w, h };
    const ar = ratio.w / ratio.h;
    let nw = clamp(w, 0.005, 1 - x);
    let nh = clamp(nw / ar, 0.005, 1 - y);
    if (nh > 1 - y) {
      nh = clamp(h, 0.005, 1 - y);
      nw = clamp(nh * ar, 0.005, 1 - x);
    }
    return { x, y, w: nw, h: nh };
  };

  const getNormPos = (e: React.MouseEvent) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const cornerHit = (px: number, py: number) => {
    if (!hasRect) return null;
    const d = 0.03;
    if (Math.abs(px - rect.x) < d && Math.abs(py - rect.y) < d) return 'resize-nw';
    if (Math.abs(px - (rect.x + rect.w)) < d && Math.abs(py - rect.y) < d) return 'resize-ne';
    if (Math.abs(px - rect.x) < d && Math.abs(py - (rect.y + rect.h)) < d) return 'resize-sw';
    if (Math.abs(px - (rect.x + rect.w)) < d && Math.abs(py - (rect.y + rect.h)) < d) return 'resize-se';
    if (px > rect.x && px < rect.x + rect.w && py > rect.y && py < rect.y + rect.h) return 'move';
    return null;
  };

  const onDown = (e: React.MouseEvent) => {
    const p = getNormPos(e);
    const hit = cornerHit(p.x, p.y);
    if (hit) {
      setDragMode(hit);
      dragRef.current = { sx: p.x, sy: p.y, rx: rect.x, ry: rect.y, rw: rect.w, rh: rect.h };
      return;
    }
    setDragMode('draw');
    dragRef.current = { sx: p.x, sy: p.y, rx: p.x, ry: p.y, rw: 0, rh: 0 };
    setRect({ x: p.x, y: p.y, w: 0, h: 0 });
    setHasRect(true);
  };

  const onMove = (e: React.MouseEvent) => {
    if (!dragMode) return;
    const p = getNormPos(e);
    const r = dragRef.current;

    let nx = r.rx, ny = r.ry, nw = r.rw, nh = r.rh;

    if (dragMode === 'draw') {
      nx = Math.min(r.sx, p.x);
      ny = Math.min(r.sy, p.y);
      nw = Math.abs(r.sx - p.x);
      nh = Math.abs(r.sy - p.y);
    } else if (dragMode === 'move') {
      nx = clamp(r.rx + p.x - r.sx, 0, 1 - r.rw);
      ny = clamp(r.ry + p.y - r.sy, 0, 1 - r.rh);
    } else if (dragMode === 'resize-nw') {
      nw = clamp(r.rw - (p.x - r.sx), 0.005, r.rx + r.rw);
      nh = clamp(r.rh - (p.y - r.sy), 0.005, r.ry + r.rh);
      nx = clamp(r.rx + r.rw - nw, 0, 1 - nw);
      ny = clamp(r.ry + r.rh - nh, 0, 1 - nh);
    } else if (dragMode === 'resize-ne') {
      nw = clamp(r.rw + p.x - r.sx, 0.005, 1 - r.rx);
      nh = clamp(r.rh - (p.y - r.sy), 0.005, r.ry + r.rh);
      ny = clamp(r.ry + r.rh - nh, 0, 1 - nh);
    } else if (dragMode === 'resize-sw') {
      nw = clamp(r.rw - (p.x - r.sx), 0.005, r.rx + r.rw);
      nh = clamp(r.rh + p.y - r.sy, 0.005, 1 - r.ry);
      nx = clamp(r.rx + r.rw - nw, 0, 1 - nw);
    } else if (dragMode === 'resize-se') {
      nw = clamp(r.rw + p.x - r.sx, 0.005, 1 - r.rx);
      nh = clamp(r.rh + p.y - r.sy, 0.005, 1 - r.ry);
    }

    // Apply ratio constraint to draw and all resize operations
    if (RATIOS[ratioIdx].w > 0 && dragMode !== 'move') {
      const cr = applyRatio(nx, ny, nw, nh);
      nx = cr.x; ny = cr.y; nw = cr.w; nh = cr.h;
    }

    setRect({ x: nx, y: ny, w: nw, h: nh });
  };

  const onUp = () => setDragMode(null);

  const confirmCrop = () => {
    if (!imgRef.current || rect.w < 0.01 || rect.h < 0.01) return;
    const img = imgRef.current;
    const nw = img.naturalWidth, nh = img.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(rect.w * nw));
    canvas.height = Math.max(1, Math.round(rect.h * nh));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, rect.x * nw, rect.y * nh, rect.w * nw, rect.h * nh, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(b => { if (b) onCrop(b); }, 'image/png');
  };

  const cursorStyle = () => {
    if (dragMode) {
      if (dragMode === 'move') return 'grabbing';
      if (dragMode.startsWith('resize-')) return dragMode.replace('resize-', '') + '-resize';
      return 'crosshair';
    }
    if (!hasRect) return 'crosshair';
    // Need a sample point to check corner hit — use rect center as proxy for "inside"
    const inside = (0.5 > rect.x && 0.5 < rect.x + rect.w && 0.5 > rect.y && 0.5 < rect.y + rect.h);
    // We can't easily get mouse pos here, just use a simplified approach
    return 'crosshair';
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 8, padding: '1rem', maxWidth: '85vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0 }}>裁剪图片</h3>
          <div style={{ display: 'flex', gap: 4 }}>
            {RATIOS.map((r, i) => (
              <button key={r.label} type="button" onClick={() => setRatioIdx(i)}
                style={{ padding: '2px 10px', border: '1px solid ' + (i === ratioIdx ? '#6366f1' : '#ddd'), borderRadius: 4, background: i === ratioIdx ? '#6366f1' : '#fff', color: i === ratioIdx ? '#fff' : '#333', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 4, cursor: cursorStyle(), userSelect: 'none' }}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}>
          <img ref={imgRef} src={imageUrl} alt="crop" style={{ display: 'block', maxWidth: '78vw', maxHeight: '65vh' }} draggable={false} />
          {hasRect && rect.w > 0.005 && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: rect.y * 100 + '%', background: 'rgba(0,0,0,0.45)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: (1 - rect.y - rect.h) * 100 + '%', background: 'rgba(0,0,0,0.45)' }} />
              <div style={{ position: 'absolute', top: rect.y * 100 + '%', left: 0, width: rect.x * 100 + '%', height: rect.h * 100 + '%', background: 'rgba(0,0,0,0.45)' }} />
              <div style={{ position: 'absolute', top: rect.y * 100 + '%', right: 0, width: (1 - rect.x - rect.w) * 100 + '%', height: rect.h * 100 + '%', background: 'rgba(0,0,0,0.45)' }} />
              <div style={{ position: 'absolute', top: rect.y * 100 + '%', left: rect.x * 100 + '%', width: rect.w * 100 + '%', height: rect.h * 100 + '%', border: '2px solid #6366f1' }} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel} style={{ fontSize: 14 }}>取消</button>
          <button className="btn btn-primary" onClick={confirmCrop} disabled={rect.w < 0.005} style={{ fontSize: 14 }}>确认裁剪</button>
        </div>
      </div>
    </div>
  );
}
