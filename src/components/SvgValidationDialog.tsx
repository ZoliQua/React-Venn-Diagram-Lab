import { useState, useEffect } from 'react';

interface SvgValidationDialogProps {
  isOpen: boolean;
  svgContent: string;
  filename: string;
  onAccept: () => void;
  onCancel: () => void;
}

interface CheckResult {
  label: string;
  passed: boolean;
  detail: string;
}

function validateSvg(content: string): CheckResult[] {
  const results: CheckResult[] = [];

  // 1. XML declaration
  results.push({
    label: 'XML declaration',
    passed: content.trimStart().startsWith('<?xml'),
    detail: content.trimStart().startsWith('<?xml') ? 'Found' : 'Missing <?xml ...?> declaration',
  });

  // 2. SVG element
  const hasSvg = /<svg[\s>]/.test(content);
  results.push({ label: 'SVG element', passed: hasSvg, detail: hasSvg ? 'Found' : 'No <svg> element' });

  // 3. Shapes group
  const hasShapes = /id="Shapes"/.test(content);
  results.push({ label: 'Shapes group', passed: hasShapes, detail: hasShapes ? 'Found' : 'Missing id="Shapes"' });

  // 4. Shape elements
  const shapeMatches = content.match(/id="Shape[A-H]"/g) ?? [];
  const n = shapeMatches.length;
  results.push({ label: 'Shape elements', passed: n >= 2, detail: `${n} shapes found (${n >= 2 ? 'OK' : 'need at least 2'})` });

  // 5. Texts group
  const hasTexts = /id="Texts"/.test(content);
  results.push({ label: 'Texts group', passed: hasTexts, detail: hasTexts ? 'Found' : 'Missing id="Texts"' });

  // 6. Group_Values
  const hasValues = /id="Group_Values"/.test(content);
  results.push({ label: 'Group_Values', passed: hasValues, detail: hasValues ? 'Found' : 'Missing' });

  // 7. Count elements
  const countMatches = content.match(/id="Count_[A-H]+"/g) ?? [];
  const expected = n >= 2 ? Math.pow(2, n) - 1 : 0;
  results.push({
    label: 'Count elements',
    passed: countMatches.length === expected,
    detail: `${countMatches.length} found, ${expected} expected (2^${n}-1)`,
  });

  // 8. Group_Names
  const hasNames = /id="Group_Names"/.test(content);
  results.push({ label: 'Group_Names', passed: hasNames, detail: hasNames ? 'Found' : 'Missing' });

  // 9. Name elements
  const nameMatches = content.match(/id="Name[A-H]"/g) ?? [];
  results.push({ label: 'Name elements', passed: nameMatches.length === n, detail: `${nameMatches.length} found, ${n} expected` });

  // 10. Author comment
  const hasComment = /Zoltan Dul|Created by/.test(content);
  results.push({ label: 'Author comment', passed: hasComment, detail: hasComment ? 'Found' : 'No author comment (optional)' });

  return results;
}

export function SvgValidationDialog({ isOpen, svgContent, filename, onAccept, onCancel }: SvgValidationDialogProps) {
  const [results, setResults] = useState<CheckResult[]>([]);

  useEffect(() => {
    if (isOpen && svgContent) {
      setResults(validateSvg(svgContent));
    }
  }, [isOpen, svgContent]);

  if (!isOpen) return null;

  const allPassed = results.every(r => r.passed);
  const criticalFails = results.filter(r => !r.passed && !r.label.includes('optional') && !r.label.includes('Author'));

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="validation-dialog" onClick={e => e.stopPropagation()}>
        <h2 className="validation-title">SVG Validation: {filename}</h2>
        <div className="validation-results">
          {results.map((r, i) => (
            <div key={i} className={`validation-row ${r.passed ? 'validation-pass' : 'validation-fail'}`}>
              <span className="validation-icon">{r.passed ? '✓' : '✗'}</span>
              <span className="validation-label">{r.label}</span>
              <span className="validation-detail">{r.detail}</span>
            </div>
          ))}
        </div>
        <div className="validation-actions">
          {allPassed ? (
            <button className="btn btn-accent" onClick={onAccept}>Done — Open File</button>
          ) : (
            <>
              <button className="btn" onClick={onAccept}>
                Open Anyway ({criticalFails.length} issue{criticalFails.length !== 1 ? 's' : ''})
              </button>
            </>
          )}
          <button className="btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
