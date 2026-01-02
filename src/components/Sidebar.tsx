import { useRef, useCallback } from 'react';
import type { VennDocument, SelectableElement, VennText } from '../types.ts';
import { LayerTree } from './LayerTree.tsx';
import { StatsPanel } from './StatsPanel.tsx';

interface SidebarProps {
  doc: VennDocument | null;
  selected: SelectableElement | null;
  onLoadFile: (filename: string, content: string) => void;
  onSave: () => void;
  onRestore: () => void;
  onSelectFromLibrary: () => void;
  onOpenCustomFile: (filename: string, content: string) => void;
  onSelect: (id: string) => void;
  onToggleMeta: (key: 'headerHidden' | 'bulletsHidden') => void;
  onMoveElement: (group: 'shapes' | 'names' | 'values' | 'sums' | 'bullets', id: string, direction: 'up' | 'down') => void;
  onAddText: (group: 'names' | 'values' | 'sums') => void;
  onAddTextDirect: (group: 'names' | 'values' | 'sums', text: VennText) => void;
  onRemoveText: (id: string) => void;
  onToggleElementVisibility: (id: string) => void;
  onToggleGroupVisibility: (group: string) => void;
}

export function Sidebar({ doc, selected, onSave, onRestore, onSelectFromLibrary, onOpenCustomFile, onSelect, onToggleMeta, onMoveElement, onAddText, onAddTextDirect, onRemoveText, onToggleElementVisibility, onToggleGroupVisibility }: SidebarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onOpenCustomFile(file.name, reader.result as string);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleStatsAddText = useCallback((group: 'values', id: string, content: string) => {
    if (!doc) return;
    // Check duplicate
    if (doc.texts.values.some(t => t.id === id)) return;
    const vb = doc.viewBox;
    const fontSize = content.length <= 2 ? '14' : content.length <= 4 ? '10' : '8';
    onAddTextDirect(group, {
      id,
      x: Math.round(vb.x + vb.w / 2),
      y: Math.round(vb.y + vb.h / 2),
      content,
      style: `fill:#262262;stroke:#000000;stroke-width:0.5;stroke-miterlimit:10;font-family:'Tahoma';font-size:${fontSize}`,
    });
  }, [doc, onAddTextDirect]);

  return (
    <div className="sidebar">
      <div className="sidebar-file-section">
        <div className="sidebar-title">SVG File</div>
        <input ref={inputRef} type="file" accept=".svg" style={{ display: 'none' }} onChange={handleFileChange} />
        <div className="sidebar-file-buttons">
          <button className="btn" onClick={onSelectFromLibrary}>Select</button>
          <button className="btn" onClick={() => inputRef.current?.click()}>Open Custom</button>
        </div>
        {doc && (
          <>
            <div className="sidebar-filename" title={doc.filename}>{doc.filename}</div>
            <div className="sidebar-file-buttons">
              <button className="btn" onClick={onSave}>Save</button>
              <button className="btn" onClick={onRestore}>Restore</button>
            </div>
          </>
        )}
      </div>
      {doc && (
        <div className="sidebar-layers-section">
          <LayerTree
            doc={doc}
            selected={selected}
            onSelect={onSelect}
            onToggleMeta={onToggleMeta}
            onMoveElement={onMoveElement}
            onAddText={onAddText}
            onRemoveText={onRemoveText}
            onToggleElementVisibility={onToggleElementVisibility}
            onToggleGroupVisibility={onToggleGroupVisibility}
          />
          <StatsPanel doc={doc} onAddText={handleStatsAddText} />
        </div>
      )}
    </div>
  );
}
