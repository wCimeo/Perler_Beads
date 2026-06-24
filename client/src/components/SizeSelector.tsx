import { PRESET_SIZES, DEFAULT_MAX_SIZE, MAX_SIZE_LIMIT } from '../utils/constants.js';
import type { SizeOption } from '../types/index.js';

interface SizeSelectorProps {
  value: SizeOption;
  maxSize: number;
  onSizeChange: (size: SizeOption) => void;
  onMaxSizeChange: (maxSize: number) => void;
}

export default function SizeSelector({
  value,
  maxSize,
  onSizeChange,
  onMaxSizeChange,
}: SizeSelectorProps) {
  return (
    <div>
      <div className="size-options">
        {PRESET_SIZES.map((size) => (
          <button
            key={size}
            type="button"
            className={`size-btn${value === size ? ' active' : ''}`}
            onClick={() => onSizeChange(size)}
          >
            {size}×{size}
          </button>
        ))}
        <button
          type="button"
          className={`size-btn auto-btn${value === 'auto' ? ' active' : ''}`}
          onClick={() => onSizeChange('auto')}
        >
          自动
        </button>
      </div>
      {value === 'auto' && (
        <div className="max-size-input">
          <label htmlFor="maxSize">最大边长：</label>
          <input
            id="maxSize"
            type="number"
            min={1}
            max={MAX_SIZE_LIMIT}
            value={maxSize}
            onChange={(e) => onMaxSizeChange(Number(e.target.value) || DEFAULT_MAX_SIZE)}
          />
          <span style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>
            （1-{MAX_SIZE_LIMIT}，等比缩放）
          </span>
        </div>
      )}
    </div>
  );
}
