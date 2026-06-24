import { useRef, useState, useEffect, useCallback } from 'react';
import { getContrastTextColor } from '../utils/contrast.js';
import type { MatchedPixel } from '../types/index.js';
import { CELL_SIZE } from '../utils/constants.js';

const ROW_COL_W = 22;

interface PixelGridProps {
  grid: MatchedPixel[][]; width: number; height: number;
  pixelEditMode?: boolean;
  editTarget?: { y: number; x: number } | null;
  onCellSelect?: (y: number, x: number) => void;
}

export default function PixelGrid({ grid, width, height, pixelEditMode, editTarget, onCellSelect }: PixelGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [baseScale, setBaseScale] = useState(1);
  const [userZoom, setUserZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, scrollX: 0, scrollY: 0 });

  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const update = () => {
      const availW = el.clientWidth - 32 - ROW_COL_W;
      const availH = window.innerHeight * 0.72;
      setBaseScale(Math.min(1, availW / (width * CELL_SIZE), availH / (height * CELL_SIZE + ROW_COL_W)));
    };
    update();
    const obs = new ResizeObserver(update); obs.observe(el);
    window.addEventListener('resize', update);
    return () => { obs.disconnect(); window.removeEventListener('resize', update); };
  }, [width, height]);

  const handleViewportWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const vp = viewportRef.current; if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const mx = e.clientX - rect.left + vp.scrollLeft;
    const my = e.clientY - rect.top + vp.scrollTop;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setUserZoom((prev) => { const max = Math.min(10, 10 / baseScale); return Math.max(1, Math.min(max, prev * delta)); });
    requestAnimationFrame(() => { const vp2 = viewportRef.current; if (!vp2) return; vp2.scrollLeft = mx * delta - (e.clientX - rect.left); vp2.scrollTop = my * delta - (e.clientY - rect.top); });
  }, [baseScale, pixelEditMode]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (userZoom <= 1 || pixelEditMode) return;
    const vp = viewportRef.current; if (!vp) return;
    setDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, scrollX: vp.scrollLeft, scrollY: vp.scrollTop };
  }, [userZoom, pixelEditMode]);
  const onMouseMove = useCallback((e: React.MouseEvent) => { if (!dragging) return; const vp = viewportRef.current; if (!vp) return; vp.scrollLeft = dragRef.current.scrollX + dragRef.current.startX - e.clientX; vp.scrollTop = dragRef.current.scrollY + dragRef.current.startY - e.clientY; }, [dragging]);
  const onMouseUp = useCallback(() => setDragging(false), []);

  const handleCellClick = useCallback((e: React.MouseEvent, y: number, x: number) => {
    if (!pixelEditMode || !onCellSelect) return;
    e.stopPropagation();
    onCellSelect(y, x);
  }, [pixelEditMode, onCellSelect]);

  const effectiveScale = baseScale * userZoom;
  const fitW = width * CELL_SIZE * baseScale + ROW_COL_W * baseScale;
  const fitH = height * CELL_SIZE * baseScale + ROW_COL_W * baseScale;
  const totalW = width * CELL_SIZE + ROW_COL_W;
  const totalH = height * CELL_SIZE + ROW_COL_W;
  const step = Math.max(1, Math.floor(width / 25)) || 1;
  const stepH = Math.max(1, Math.floor(height / 25)) || 1;
  const showLabel = (i: number, max: number, s: number) => i === 0 || i === max - 1 || (i + 1) % s === 0;

  return (
    <div className="pixel-grid-container" ref={containerRef}
      style={{ overflow: 'hidden', maxHeight: 'none', position: 'relative', outline: '1px solid #bbb' }}>
      {userZoom > 1 && (
        <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 10, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: '0 0 4px 0' }}>
          {Math.round(effectiveScale * 100)}%
        </div>
      )}
      <div ref={viewportRef} onWheel={handleViewportWheel}
        style={{ width: fitW, height: fitH, overflow: 'auto', margin: '0 auto', border: '2px solid #999', borderRadius: 2,
          cursor: pixelEditMode ? 'crosshair' : userZoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'default',
          scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
        <style>{'.pixel-grid-container div::-webkit-scrollbar{display:none}'}</style>
        <div style={{ width: totalW * effectiveScale, height: totalH * effectiveScale }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `${ROW_COL_W}px repeat(${width}, ${CELL_SIZE}px)`,
            gridTemplateRows: `${ROW_COL_W}px repeat(${height}, ${CELL_SIZE}px)`,
            transform: `scale(${effectiveScale})`, transformOrigin: 'top left',
          }}>
            <div style={{ width: ROW_COL_W, height: ROW_COL_W, background: '#eee' }} />
            {Array.from({ length: width }, (_, x) => (
              <div key={`rc${x}`} style={{ height: ROW_COL_W, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#666', fontWeight: 600, fontFamily: 'monospace' }}>
                {showLabel(x, width, step) ? x + 1 : ''}
              </div>
            ))}
            {grid.map((row, y) => {
              const rulerCell = (
                <div key={`rr${y}`} style={{ width: ROW_COL_W, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#666', fontWeight: 600, fontFamily: 'monospace' }}>
                  {showLabel(y, height, stepH) ? y + 1 : ''}
                </div>
              );
              const pixelCells = row.map((pixel, x) => {
                const bg = `#${pixel.hex}`;
                const fg = getContrastTextColor(pixel.hex);
                const isSelected = editTarget && editTarget.y === y && editTarget.x === x;
                return (
                  <div key={`${y}-${x}`} className="pixel-cell"
                    style={{ backgroundColor: bg, color: fg, border: '0.5px solid #ddd', boxSizing: 'border-box', cursor: pixelEditMode ? 'crosshair' : 'inherit', outline: isSelected ? '2px solid #e74c3c' : 'none' }}
                    title={`${pixel.mark} (#${pixel.hex})`}
                    onClick={(e) => handleCellClick(e, y, x)}>
                    <span style={{ fontSize: effectiveScale < 0.4 ? 8 : 9, fontWeight: 600, userSelect: 'none', pointerEvents: 'none' }}>{pixel.mark}</span>
                  </div>
                );
              });
              return <div key={`row-${y}`} style={{ display: 'contents' }}>{rulerCell}{pixelCells}</div>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
