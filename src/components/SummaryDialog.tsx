import { useMemo, useState, useEffect } from 'react';
import { getModelsBySetCount, MODEL_LIST } from '../models.ts';
import { APP_NAME } from '../version.ts';
import { SOURCES, renderLabel } from './summarySources.tsx';

interface SummaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModel: (filename: string) => void;
  selectMode?: boolean; // true = "Select for Edit" header
  onOpenCustom?: () => void;
}

export function SvgPreview({ filename }: { filename: string }) {
  const [svgContent, setSvgContent] = useState<string>('');

  useEffect(() => {
    fetch(`./models/svg/${filename}`)
      .then(r => r.text())
      .then(text => {
        // Strip XML declaration and comments, keep SVG
        const clean = text
          .replace(/<\?xml[^?]*\?>/, '')
          .replace(/<!--[\s\S]*?-->/g, '');
        setSvgContent(clean);
      })
      .catch(() => setSvgContent(''));
  }, [filename]);

  if (!svgContent) return <div className="summary-preview-loading">Loading...</div>;

  return (
    <div
      className="summary-preview-svg"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}

export function SummaryDialog({ isOpen, onClose, onSelectModel, selectMode, onOpenCustom }: SummaryDialogProps) {
  const modelsBySet = useMemo(() => getModelsBySetCount(), []);

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="summary-dialog" onClick={e => e.stopPropagation()}>
        <div className="summary-header">
          <h1 className="summary-title">{selectMode ? 'Select SVG Model' : APP_NAME}</h1>
          <p className="summary-subtitle">{selectMode ? 'Choose a diagram to open in the editor' : `${MODEL_LIST.length} Venn diagram models from 2-set to 9-set`}</p>
          <div className="summary-header-buttons">
            {selectMode && onOpenCustom && <button className="btn btn-toolbar" onClick={onOpenCustom}>Open Custom SVG</button>}
            <button className="btn btn-toolbar summary-close-btn" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="summary-content">
          {Array.from(modelsBySet.entries())
            .sort(([a], [b]) => a - b)
            .map(([setCount, models]) => (
              <div key={setCount} className="summary-group">
                <h2 className="summary-group-title">
                  {setCount}-Set Diagrams
                  <span className="summary-group-count">{models.length} variant{models.length > 1 ? 's' : ''} — {Math.pow(2, setCount) - 1} regions</span>
                </h2>
                <div className="summary-grid">
                  {models.map(m => {
                    const source = SOURCES[m.filename];
                    return (
                      <div
                        key={m.filename}
                        className="summary-card"
                        onClick={() => onSelectModel(m.filename)}
                      >
                        <SvgPreview filename={m.filename} />
                        <div className="summary-card-info">
                          <div className="summary-card-name">{m.label}</div>
                          {source && (
                            <div className="summary-card-source">
                              {source.url ? (
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                >
                                  {renderLabel(source.label)}
                                </a>
                              ) : (
                                <span>{renderLabel(source.label)}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
