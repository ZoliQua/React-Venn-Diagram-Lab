export interface CsvData {
  headers: string[];
  rows: string[][];
}

export function parseCsv(text: string): CsvData {
  const lines = text.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV must have at least a header and one data row');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => line.split(',').map(cell => cell.trim()));
  return { headers, rows };
}

/**
 * Calculate Venn region counts from binary (0/1) columns.
 * selectedColumns: indices into headers for the sets (A, B, C, ...)
 * Returns a Map: region label (e.g., "AB") → count of rows where exactly those columns are 1.
 * Also returns intersection counts (rows where ALL specified columns are 1, regardless of others).
 */
export function calculateVennCounts(
  csv: CsvData,
  selectedColumns: number[],
): Map<string, number> {
  const n = selectedColumns.length;
  const letters = 'ABCDEFGH'.slice(0, n).split('');
  const counts = new Map<string, number>();

  // Initialize all 2^n - 1 regions
  for (let mask = 1; mask < (1 << n); mask++) {
    const label = letters.filter((_, i) => mask & (1 << i)).join('');
    counts.set(label, 0);
  }

  // Count rows for each intersection (inclusive — rows where ALL bits in mask are 1)
  for (const row of csv.rows) {
    // Build bitmask for this row
    let rowMask = 0;
    for (let i = 0; i < n; i++) {
      const val = row[selectedColumns[i]];
      if (val === '1' || val?.toLowerCase() === 'true' || val?.toLowerCase() === 'yes') {
        rowMask |= (1 << i);
      }
    }

    // This row contributes to every subset of its active sets
    // For inclusive intersection counting: mask is a subset of rowMask
    if (rowMask === 0) continue;
    for (let mask = 1; mask < (1 << n); mask++) {
      if ((rowMask & mask) === mask) {
        const label = letters.filter((_, i) => mask & (1 << i)).join('');
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
    }
  }

  return counts;
}

/**
 * Get list of numeric/binary columns suitable for Venn sets.
 */
export function getBinaryColumns(csv: CsvData): number[] {
  const result: number[] = [];
  for (let i = 0; i < csv.headers.length; i++) {
    // Check if all values in column are 0/1/true/false/yes/no
    const isBinary = csv.rows.every(row => {
      const v = row[i]?.toLowerCase();
      return v === '0' || v === '1' || v === 'true' || v === 'false' || v === 'yes' || v === 'no' || v === '';
    });
    if (isBinary && csv.rows.some(row => row[i] === '1' || row[i]?.toLowerCase() === 'true' || row[i]?.toLowerCase() === 'yes')) {
      result.push(i);
    }
  }
  return result;
}
