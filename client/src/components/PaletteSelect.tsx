import { useEffect, useState } from 'react';
import { fetchPalettes } from '../api/client.js';

interface PaletteSelectProps {
  value: string;
  onChange: (mode: string) => void;
}

export default function PaletteSelect({ value, onChange }: PaletteSelectProps) {
  const [palettes, setPalettes] = useState<string[]>([]);

  useEffect(() => {
    fetchPalettes()
      .then(({ palettes }) => setPalettes(palettes))
      .catch(() => setPalettes(['mard', 'coco']));
  }, []);

  return (
    <select
      className="palette-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {palettes.map((p) => (
        <option key={p} value={p}>
          {p.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
