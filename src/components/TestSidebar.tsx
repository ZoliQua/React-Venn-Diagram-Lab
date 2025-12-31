import { useState, useMemo, useCallback } from 'react';
import type { ViewStyle } from '../App.tsx';
import { MODEL_LIST, getModelsBySetCount } from '../models.ts';
import type { CsvData } from '../utils/csvParser.ts';
import { getBinaryColumns } from '../utils/csvParser.ts';

interface TestSidebarProps {
  csvData: CsvData | null;
  csvFilename: string | null;
  onLoadCsv: (source: 'file' | 'sample') => void;
  onFileUpload: (file: File) => void;
  selectedModel: string | null;
  onSelectModel: (filename: string) => void;
  columnMapping: number[];  // indices into csv headers for A, B, C, ...
  onSetColumnMapping: (mapping: number[]) => void;
  onCalculate: () => void;
  isCalculated: boolean;
  viewStyle: ViewStyle;
  onSetViewStyle: (style: ViewStyle) => void;
  error: string | null;
}

export function TestSidebar({
  csvData, csvFilename,
  onLoadCsv, onFileUpload,
  selectedModel, onSelectModel,
  columnMapping, onSetColumnMapping,
  onCalculate, isCalculated,
  viewStyle, onSetViewStyle,
  error,
}: TestSidebarProps) {
  useMemo(() => getModelsBySetCount(), []);
  const [fileInputKey, setFileInputKey] = useState(0);

  const binaryColumns = useMemo(() => {
    if (!csvData) return [];
    return getBinaryColumns(csvData);
  }, [csvData]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
      setFileInputKey(k => k + 1);
    }
  }, [onFileUpload]);

  const handleColumnChange = useCallback((setIndex: number, colIndex: number) => {
    const newMapping = [...columnMapping];
    newMapping[setIndex] = colIndex;
    onSetColumnMapping(newMapping);
  }, [columnMapping, onSetColumnMapping]);

  const n = columnMapping.length;
  const letters = 'ABCDEFGH'.slice(0, n).split('');

  // Filter models to show only those matching column count
  const compatibleModels = useMemo(() => {
    if (n < 2) return [];
    return MODEL_LIST.filter(m => m.setCount === n);
  }, [n]);

  return (
    <div className="sidebar test-sidebar">
      {/* Data Source */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">1. Data Source</div>
        <button className="btn btn-sm" style={{ width: '100%', marginBottom: 4 }} onClick={() => onLoadCsv('sample')}>
          Load Sample Dataset
        </button>
        <div className="test-file-upload">
          <label className="btn btn-sm" style={{ width: '100%', textAlign: 'center', cursor: 'pointer' }}>
            Upload CSV File
            <input key={fileInputKey} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileChange} />
          </label>
        </div>
        {csvFilename && (
          <div className="test-csv-info">
            <div className="test-csv-filename">{csvFilename}</div>
            <div className="test-csv-stats">{csvData?.rows.length} rows, {csvData?.headers.length} columns</div>
            <div className="test-csv-stats">{binaryColumns.length} binary columns detected</div>
          </div>
        )}
      </div>

      {/* Model Selection */}
      {csvData && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">2. Diagram Model</div>
          {n >= 2 ? (
            <select
              className="model-selector"
              value={selectedModel ?? ''}
              onChange={e => onSelectModel(e.target.value)}
            >
              <option value="">— Select {n}-set model —</option>
              {compatibleModels.map(m => (
                <option key={m.filename} value={m.filename}>{m.label}</option>
              ))}
            </select>
          ) : (
            <div className="test-error">Need at least 2 binary columns</div>
          )}
        </div>
      )}

      {/* Column Mapping */}
      {csvData && n >= 2 && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">3. Column Mapping</div>
          <div className="test-column-mapping">
            {letters.map((letter, i) => (
              <div key={letter} className="test-column-row">
                <span className="test-column-letter">{letter}</span>
                <select
                  className="test-column-select"
                  value={columnMapping[i]}
                  onChange={e => handleColumnChange(i, parseInt(e.target.value))}
                >
                  {csvData.headers.map((h, hi) => (
                    <option key={hi} value={hi}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <button
            className="btn btn-sm btn-accent"
            style={{ width: '100%', marginTop: 8 }}
            onClick={onCalculate}
            disabled={!selectedModel || n < 2}
          >
            Calculate Venn Diagram
          </button>
        </div>
      )}

      {/* View Style */}
      {isCalculated && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">4. View</div>
          <div className="view-style-switcher">
            <button className={`btn btn-sm btn-view-style ${viewStyle === 'layer' ? 'btn-mode-active' : ''}`} onClick={() => onSetViewStyle('layer')}>Layer</button>
            <button className={`btn btn-sm btn-view-style ${viewStyle === 'cut' ? 'btn-mode-active' : ''}`} onClick={() => onSetViewStyle('cut')}>Cut</button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="sidebar-section">
          <div className="test-error">{error}</div>
        </div>
      )}
    </div>
  );
}
