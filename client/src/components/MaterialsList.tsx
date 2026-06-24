import { useState, useEffect, useRef, useMemo } from 'react';
import type { MaterialItem, PaletteColor } from '../types/index.js';

interface MaterialsListProps {
  materials: MaterialItem[];
  paletteColors: PaletteColor[];
  replacements: Record<string, PaletteColor>;
  onReplace: (fromMark: string, toColor: PaletteColor | null) => void;
}

export default function MaterialsList({
  materials,
  paletteColors,
  replacements,
  onReplace,
}: MaterialsListProps) {
  const [openMark, setOpenMark] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const totalBeads = materials.reduce((sum, m) => sum + m.count, 0);

  useEffect(() => {
    if (!openMark) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpenMark(null);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMark]);

  useEffect(() => {
    if (openMark && searchRef.current) {
      searchRef.current.focus();
      setSearch('');
    }
  }, [openMark]);

  const resolveColor = (mark: string) => {
    const repl = replacements[mark];
    if (repl) return { hex: repl.hex, mark: repl.name };
    return null;
  };

  const filteredColors = useMemo(() => {
    if (!search) return paletteColors;
    const q = search.toLowerCase();
    return paletteColors.filter((pc) => {
      const n = typeof pc.name === 'string' ? pc.name.toLowerCase() : '';
      const h = typeof pc.hex === 'string' ? pc.hex.toLowerCase() : String(pc.hex || '').toLowerCase();
      return n.includes(q) || h.includes(q);
    });
  }, [paletteColors, search]);

  return (
    <div className="materials-card" ref={panelRef}>
      <h3>
        用料清单
        <span style={{ fontWeight: 400, color: '#7f8c8d', marginLeft: '0.75rem' }}>
          共 {materials.length} 色 / {totalBeads} 颗
        </span>
      </h3>
      <div className="materials-grid">
        {materials.map((m) => {
          const isOpen = openMark === m.name;
          const resolved = resolveColor(m.name);
          return (
            <div key={m.name} style={{ position: 'relative' }}>
              <div
                className="material-item"
                style={{ cursor: 'pointer', borderRadius: 4, padding: '2px 4px', background: isOpen ? '#f0f0f0' : 'transparent' }}
                onClick={() => setOpenMark(isOpen ? null : m.name)}
                title="点击替换此颜色"
              >
                <span className="material-swatch" style={{ backgroundColor: `#${String(m.hex)}` }} />
                <span className="material-name">{m.name}</span>
                <span className="material-count">×{m.count}</span>
                {resolved && (
                  <span style={{ fontSize: 10, color: '#e74c3c', marginLeft: 4 }}>
                    →{resolved.mark}
                  </span>
                )}
              </div>
              {isOpen && paletteColors.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, zIndex: 100,
                  background: '#fff', border: '1px solid #ddd', borderRadius: 4,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxHeight: 240,
                  overflow: 'hidden', minWidth: 180, display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{ padding: '4px 6px', borderBottom: '1px solid #eee' }}>
                    <input
                      ref={searchRef}
                      type="text"
                      placeholder="搜索颜色..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{ width: '100%', padding: '4px 6px', fontSize: 12, border: '1px solid #ddd', borderRadius: 3, outline: 'none' }}
                    />
                  </div>
                  <div style={{ overflow: 'auto', maxHeight: 200, flex: 1 }}>
                    {filteredColors.map((pc) => (
                      <div
                        key={String(pc.hex)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '4px 8px', cursor: 'pointer',
                          background: pc.name === m.name ? '#e8f4e8' : 'transparent',
                          fontSize: 12,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (pc.name !== m.name) onReplace(m.name, pc);
                          setOpenMark(null);
                          setSearch('');
                        }}
                        title={`${pc.name} (#${pc.hex})`}
                      >
                        <span style={{
                          display: 'inline-block', width: 16, height: 16,
                          borderRadius: 2, border: '1px solid #ccc',
                          backgroundColor: `#${pc.hex}`,
                          flexShrink: 0,
                        }} />
                        <span>{pc.name}</span>
                        <span style={{ color: '#bbb', fontSize: 10 }}>{String(pc.hex)}</span>
                        {pc.name === m.name && (
                          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#27ae60' }}>
                            当前
                          </span>
                        )}
                      </div>
                    ))}
                    {filteredColors.length === 0 && (
                      <div style={{ padding: '8px', fontSize: 12, color: '#999', textAlign: 'center' }}>
                        无匹配结果
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
