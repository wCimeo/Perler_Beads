import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import type { ConvertResponse, PaletteColor, MatchedPixel } from '../types/index.js';
import { fetchPaletteColors } from '../api/client.js';
import ActionBar from './ActionBar.js';
import PixelGrid from './PixelGrid.js';
import MaterialsList from './MaterialsList.js';
import ExportCanvas from './ExportCanvas.js';
import type { ExportCanvasHandle } from './ExportCanvas.js';

interface PreviewAreaProps {
  result: ConvertResponse; originalImageUrl: string | null;
  onReUpload: () => void; onChangeSize: () => void;
}

export default function PreviewArea({ result, originalImageUrl, onReUpload, onChangeSize }: PreviewAreaProps) {
  const [exporting] = useState(false);
  const exportCanvasRef = useRef<ExportCanvasHandle>(null);
  const [paletteColors, setPaletteColors] = useState<PaletteColor[]>([]);
  const [hist, setHist] = useState<Record<string, PaletteColor>[]>([]);
  const [replacements, setReplacements] = useState<Record<string, PaletteColor>>({});
  const [pixelEditMode, setPixelEditMode] = useState(false);
  const [singleEdits, setSingleEdits] = useState<Record<string, PaletteColor>>({});
  const [editTargets, setEditTargets] = useState<Set<string>>(new Set());
  const [editSearch, setEditSearch] = useState('');
  const [replaceCount, setReplaceCount] = useState(0);

  useEffect(() => { fetchPaletteColors(result.mode, result.colorFile).then(setPaletteColors).catch(() => {}); }, [result.mode, result.colorFile]);

  const effectiveGrid = useMemo(() => {
    let g: MatchedPixel[][] = result.grid;
    if (Object.keys(replacements).length > 0) g = g.map(r => r.map(p => { const x = replacements[p.mark]; return x ? { hex: x.hex, mark: x.mark, name: x.name, distance: p.distance } : p; }));
    if (Object.keys(singleEdits).length > 0) g = g.map((r, y) => r.map((p, x) => { const e = singleEdits[`${y}-${x}`]; return e ? { hex: e.hex, mark: e.mark, name: e.name, distance: p.distance } : p; }));
    return g;
  }, [result.grid, replacements, singleEdits]);

  const effectiveMaterials = useMemo(() => {
    const m = new Map<string, { name: string; hex: string; count: number }>();
    for (const r of effectiveGrid) for (const p of r) { const e = m.get(p.name); if (e) e.count++; else m.set(p.name, { name: p.name, hex: p.hex, count: 1 }); }
    return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [effectiveGrid]);

  const effectiveResult = useMemo(() => ({ ...result, grid: effectiveGrid, materials: effectiveMaterials }), [result, effectiveGrid, effectiveMaterials]);

  const handleReplace = useCallback((f: string, t: PaletteColor | null) => { setReplacements(p => { if (t === null || t.mark === f) { if (!(f in p)) return p; setHist(h => [...h, { ...p }]); const n = { ...p }; delete n[f]; return n; } setHist(h => [...h, { ...p }]); return { ...p, [f]: t }; }); }, []);
  const handleUndo = useCallback(() => { setHist(h => { if (h.length === 0) return h; setReplacements(h[h.length - 1]); return h.slice(0, -1); }); }, []);

  const handleSingleEdit = useCallback((y: number, x: number, color: PaletteColor | null) => {
    setSingleEdits(p => { if (color === null) { const n = { ...p }; delete n[`${y}-${x}`]; return n; } return { ...p, [`${y}-${x}`]: color }; });
  }, []);

  const handleBatchEdit = useCallback((color: PaletteColor) => {
    setSingleEdits(p => {
      const n = { ...p };
      editTargets.forEach(key => { n[key] = color; });
      return n;
    });
    setReplaceCount(c => c + 1);
    setEditTargets(new Set());
    setEditSearch('');
  }, [editTargets]);

  const handleExportPng = () => exportCanvasRef.current?.exportPng();

  const handleCellSelect = useCallback((y: number, x: number, ctrl: boolean) => {
    const key = `${y}-${x}`;
    setEditTargets(prev => {
      const next = ctrl ? new Set(prev) : new Set<string>();
      if (ctrl && prev.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
    setEditSearch('');
  }, []);

  const filteredEditColors = paletteColors.filter(pc => {
    if (!editSearch) return true; const q = editSearch.toLowerCase();
    return (pc.name || '').toLowerCase().includes(q) || String(pc.hex || '').toLowerCase().includes(q);
  });

  if (!result || !result.grid || !result.materials) return (<div className="preview-area"><div className="form-card"><p style={{ textAlign: 'center', color: '#7f8c8d', padding: '2rem' }}>结果不可用，请重新上传。</p><button className="btn btn-primary btn-block" onClick={onReUpload}>重新上传</button></div></div>);

  const { mode, colorFile, width, height } = result;
  return (
    <div className="preview-area">
      <div className="preview-header">
        <div><h2>转换结果</h2><p className="preview-meta">色卡模式：{mode?.toUpperCase?.() ?? '?'} · 颜色数量：{colorFile === '221' ? '221 基础色' : '全量色'} · 尺寸：{width}×{height}</p></div>
        <ActionBar onReUpload={onReUpload} onChangeSize={onChangeSize} onExportPng={handleExportPng} exporting={exporting} undoCount={hist.length} onUndo={handleUndo} editMode={pixelEditMode} onToggleEdit={() => { setPixelEditMode(p => !p); setEditTargets(new Set()); }} />
      </div>
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {originalImageUrl && (
          <div style={{ flex: '0 0 auto', width: 'min(240px, 30vw)', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '0.75rem' }}>
            <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', color: '#2c3e50' }}>原图</h3>
            <img src={originalImageUrl} alt="原图" style={{ width: '100%', height: 'auto', borderRadius: 4, border: '1px solid #ddd', display: 'block' }} />
          </div>
        )}
        <div style={{ flex: '1 1 auto', minWidth: 0, position: 'relative' }}>
          <PixelGrid grid={effectiveGrid} width={width} height={height} pixelEditMode={pixelEditMode} editTargets={editTargets} onCellSelect={handleCellSelect} />
          {pixelEditMode && editTargets.size > 0 && (
            <div style={{ position: 'absolute', right: -216, top: 0, width: 200, zIndex: 50, background: '#fff', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', padding: '0.75rem', maxHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', color: '#2c3e50', margin: 0 }}>替换像素{editTargets.size > 1 ? `（已选 ${editTargets.size} 格）` : ''}</h3>
                <button onClick={() => setEditTargets(new Set())} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#999' }}>×</button>
              </div>
              {editTargets.size === 1 && (
                <p style={{ fontSize: 12, color: '#7f8c8d', marginBottom: '0.5rem' }}>
                  按住 Ctrl/Cmd 点击可多选
                </p>
              )}
              <input type="text" placeholder="搜索颜色..." autoFocus value={editSearch} onChange={(e) => setEditSearch(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', fontSize: 12, border: '1px solid #ddd', borderRadius: 4, outline: 'none', marginBottom: '0.5rem' }} />
              <div style={{ overflow: 'auto', flex: 1 }}>
                {filteredEditColors.map(pc => (
                  <div key={String(pc.hex)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', cursor: 'pointer', fontSize: 12, borderRadius: 4 }}
                    onClick={() => { handleBatchEdit(pc); }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <span style={{ display: 'inline-block', width: 18, height: 18, borderRadius: 3, border: '1px solid #ccc', backgroundColor: `#${pc.hex}`, flexShrink: 0 }} />
                    <span>{pc.name}</span>
                    <span style={{ color: '#bbb', fontSize: 10, marginLeft: 'auto' }}>{pc.hex}</span>
                  </div>
                ))}
                {filteredEditColors.length === 0 && <div style={{ padding: 8, fontSize: 12, color: '#999', textAlign: 'center' }}>无匹配</div>}
              </div>
            </div>
          )}
        </div>
      </div>
      <MaterialsList materials={effectiveMaterials} paletteColors={paletteColors} replacements={replacements} onReplace={handleReplace} />
      <ExportCanvas ref={exportCanvasRef} result={effectiveResult} />
    </div>
  );
}
