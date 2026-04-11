import { useState } from 'react';
import { SAMPLE_DATASETS } from './sampleDatasets.ts';

export interface SampleDataset {
  id: string;
  filename: string;
  name: string;
  type: 'real' | 'mock';
  dataFormat: 'binary' | 'aggregated';
  description: string;
  reference?: string;
}

interface SampleDataDialogProps {
  isOpen: boolean;
  onSelect: (dataset: SampleDataset) => void;
  onClose: () => void;
}

export function SampleDataDialog({ isOpen, onSelect, onClose }: SampleDataDialogProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (!isOpen) return null;

  const realDatasets = SAMPLE_DATASETS.filter(d => d.type === 'real');
  const mockDatasets = SAMPLE_DATASETS.filter(d => d.type === 'mock');

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={e => e.stopPropagation()} style={{ minWidth: 480, maxWidth: 560, maxHeight: '80vh', overflow: 'auto' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Select Sample Dataset</h3>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-secondary)' }}>Choose a dataset to load into the Venn Diagram calculator.</p>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Real datasets</div>
          {realDatasets.map(d => (
            <div
              key={d.id}
              className="sample-dataset-card"
              style={{
                padding: '10px 12px',
                marginBottom: 6,
                borderRadius: 6,
                border: '1px solid var(--dialog-border)',
                cursor: 'pointer',
                background: hoveredId === d.id ? 'var(--bg-hover)' : 'transparent',
                transition: 'background 0.1s',
              }}
              onMouseEnter={() => setHoveredId(d.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSelect(d)}
            >
              <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 3 }}>
                {d.name}
                <span style={{
                  display: 'inline-block', fontSize: 9, fontWeight: 'bold', padding: '1px 5px',
                  borderRadius: 3, marginLeft: 8, verticalAlign: 'middle', letterSpacing: 0.5,
                  background: d.dataFormat === 'aggregated' ? '#66bb6a' : 'var(--accent)',
                  color: '#fff',
                }}>{d.dataFormat === 'aggregated' ? 'AGGREGATED' : 'BINARY'}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{d.description}</div>
              {d.reference && (
                <div style={{ fontSize: 10, color: 'var(--success)', marginTop: 3 }}>Ref: {d.reference}</div>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Test / mock datasets</div>
          {mockDatasets.map(d => (
            <div
              key={d.id}
              className="sample-dataset-card"
              style={{
                padding: '10px 12px',
                marginBottom: 6,
                borderRadius: 6,
                border: '1px solid var(--dialog-border)',
                cursor: 'pointer',
                background: hoveredId === d.id ? 'var(--bg-hover)' : 'transparent',
                transition: 'background 0.1s',
              }}
              onMouseEnter={() => setHoveredId(d.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSelect(d)}
            >
              <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 3 }}>
                {d.name}
                <span style={{
                  display: 'inline-block', fontSize: 9, fontWeight: 'bold', padding: '1px 5px',
                  borderRadius: 3, marginLeft: 8, verticalAlign: 'middle', letterSpacing: 0.5,
                  background: d.dataFormat === 'aggregated' ? '#66bb6a' : 'var(--accent)',
                  color: '#fff',
                }}>{d.dataFormat === 'aggregated' ? 'AGGREGATED' : 'BINARY'}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{d.description}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'right', marginTop: 8 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
