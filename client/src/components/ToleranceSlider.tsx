interface ToleranceSliderProps {
  value: number;
  onChange: (tolerance: number) => void;
}

export default function ToleranceSlider({ value, onChange }: ToleranceSliderProps) {
  return (
    <div>
      <label
        htmlFor="tolerance"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem' }}
      >
        <span>🎯 色块平滑</span>
        <span style={{ fontWeight: 400, color: '#7f8c8d', fontSize: '0.85rem' }}>
          {value === 0 ? '关闭' : value <= 33 ? '轻度' : value <= 66 ? '中等' : '强度'}
          {' · '}{value}%
        </span>
      </label>
      <input
        id="tolerance"
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          height: 6,
          accentColor: value > 0 ? '#e74c3c' : '#bdc3c7',
          cursor: 'pointer',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#bdc3c7', marginTop: '0.25rem' }}>
        <span>不处理</span>
        <span>最大平滑</span>
      </div>
      {value > 0 && (
        <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#7f8c8d' }}>
          用周围较大面积的色块替换当前像素（只在已有色卡颜色间替换），减少孤立噪声。
        </p>
      )}
    </div>
  );
}
