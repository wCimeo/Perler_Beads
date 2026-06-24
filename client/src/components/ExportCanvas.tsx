import { forwardRef, useImperativeHandle } from 'react';
import type { ConvertResponse } from '../types/index.js';
import { useCanvasExport } from '../hooks/useCanvasExport.js';

interface ExportCanvasProps {
  result: ConvertResponse;
}

export interface ExportCanvasHandle {
  exportPng: () => void;
}

const ExportCanvas = forwardRef<ExportCanvasHandle, ExportCanvasProps>(
  function ExportCanvas({ result }, ref) {
    const { exportPng } = useCanvasExport(result);
    useImperativeHandle(ref, () => ({ exportPng }), [exportPng]);
    return null;
  },
);

export default ExportCanvas;
