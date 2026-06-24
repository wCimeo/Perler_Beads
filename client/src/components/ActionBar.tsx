interface ActionBarProps {
  onReUpload: () => void;
  onChangeSize: () => void;
  onExportPng: () => void;
  exporting?: boolean;
  undoCount?: number;
  onUndo?: () => void;
  editMode?: boolean;
  onToggleEdit?: () => void;
}

export default function ActionBar({
  onReUpload, onChangeSize, onExportPng, exporting,
  undoCount = 0, onUndo, editMode, onToggleEdit,
}: ActionBarProps) {
  return (
    <div className="action-bar">
      <button type="button" className="btn btn-secondary" onClick={onReUpload}>重新上传</button>
      <button type="button" className="btn btn-secondary" onClick={onChangeSize}>修改尺寸</button>
      {undoCount > 0 && onUndo && (
        <button type="button" className="btn btn-secondary" onClick={onUndo} title={`撤销上一步颜色替换（还剩 ${undoCount} 步）`}>
          撤销替换（{undoCount}）
        </button>
      )}
      {onToggleEdit && (
        <button type="button" className={editMode ? 'btn btn-primary' : 'btn btn-secondary'} onClick={onToggleEdit}>
          {editMode ? '退出编辑' : '特殊处理'}
        </button>
      )}
      <button type="button" className="btn btn-success" onClick={onExportPng} disabled={exporting}>
        {exporting ? <><span className="loading-spinner" />导出中...</> : '导出 PNG'}
      </button>
    </div>
  );
}
