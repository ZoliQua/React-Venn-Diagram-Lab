import { describe, it, expect } from 'vitest';
import {
  parseCsvWithDelimiter,
  splitCsvLineWithDelimiter,
  detectDelimiter,
  validateBinaryColumns,
  validateAggregatedColumns,
  calculateVennCountsFromAggregated,
  getBinaryColumns,
} from '../utils/csvParser.ts';

describe('splitCsvLineWithDelimiter', () => {
  it('splits by comma', () => {
    expect(splitCsvLineWithDelimiter('a,b,c', ',')).toEqual(['a', 'b', 'c']);
  });
  it('splits by semicolon', () => {
    expect(splitCsvLineWithDelimiter('a;b;c', ';')).toEqual(['a', 'b', 'c']);
  });
  it('splits by tab', () => {
    expect(splitCsvLineWithDelimiter('a\tb\tc', '\t')).toEqual(['a', 'b', 'c']);
  });
  it('respects quoted fields with delimiter inside', () => {
    expect(splitCsvLineWithDelimiter('"a,b",c,d', ',')).toEqual(['a,b', 'c', 'd']);
  });
  it('handles escaped quotes', () => {
    expect(splitCsvLineWithDelimiter('"say ""hello""",b', ',')).toEqual(['say "hello"', 'b']);
  });
  it('trims whitespace', () => {
    expect(splitCsvLineWithDelimiter(' a , b , c ', ',')).toEqual(['a', 'b', 'c']);
  });
});

describe('parseCsvWithDelimiter', () => {
  it('parses comma CSV with header', () => {
    const csv = parseCsvWithDelimiter('A,B,C\n1,2,3\n4,5,6', ',', true);
    expect(csv.headers).toEqual(['A', 'B', 'C']);
    expect(csv.rows).toEqual([['1', '2', '3'], ['4', '5', '6']]);
  });
  it('parses semicolon CSV', () => {
    const csv = parseCsvWithDelimiter('A;B;C\n1;2;3', ';', true);
    expect(csv.headers).toEqual(['A', 'B', 'C']);
    expect(csv.rows).toEqual([['1', '2', '3']]);
  });
  it('parses tab CSV', () => {
    const csv = parseCsvWithDelimiter('A\tB\n1\t2', '\t', true);
    expect(csv.headers).toEqual(['A', 'B']);
    expect(csv.rows).toEqual([['1', '2']]);
  });
  it('generates synthetic headers when hasHeader=false', () => {
    const csv = parseCsvWithDelimiter('1,2,3\n4,5,6', ',', false);
    expect(csv.headers).toEqual(['Column 1', 'Column 2', 'Column 3']);
    expect(csv.rows).toEqual([['1', '2', '3'], ['4', '5', '6']]);
  });
  it('throws on empty file', () => {
    expect(() => parseCsvWithDelimiter('', ',', true)).toThrow();
  });
  it('filters empty lines', () => {
    const csv = parseCsvWithDelimiter('A,B\n1,2\n\n3,4\n', ',', true);
    expect(csv.rows).toHaveLength(2);
  });
});

describe('detectDelimiter', () => {
  it('detects comma', () => {
    expect(detectDelimiter('a,b,c\n1,2,3\n4,5,6')).toBe(',');
  });
  it('detects tab', () => {
    expect(detectDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t');
  });
  it('detects semicolon', () => {
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
  });
  it('falls back to comma for ambiguous input', () => {
    expect(detectDelimiter('abc')).toBe(',');
  });
});

describe('validateBinaryColumns', () => {
  const csv = {
    headers: ['Title', 'A', 'B', 'C'],
    rows: [
      ['x', '1', '0', '1'],
      ['y', '0', '1', '0'],
      ['z', '1', '1', '1'],
    ],
  };

  it('returns null for valid binary columns', () => {
    expect(validateBinaryColumns(csv, [1, 2, 3])).toBeNull();
  });
  it('rejects fewer than 2 columns', () => {
    expect(validateBinaryColumns(csv, [1])).toContain('At least 2');
  });
  it('rejects more than 8 columns', () => {
    expect(validateBinaryColumns(csv, [0, 1, 2, 3, 4, 5, 6, 7, 8])).toContain('Maximum 8');
  });
  it('rejects column with invalid values', () => {
    const badCsv = {
      headers: ['A', 'B'],
      rows: [['1', 'maybe'], ['0', '1']],
    };
    expect(validateBinaryColumns(badCsv, [0, 1])).toContain('invalid value');
  });
  it('rejects column with no truthy values', () => {
    const zeroCsv = {
      headers: ['A', 'B'],
      rows: [['0', '1'], ['0', '0']],
    };
    expect(validateBinaryColumns(zeroCsv, [0, 1])).toContain('no truthy');
  });
});

describe('validateAggregatedColumns', () => {
  const csv = {
    headers: ['SetA', 'SetB', 'SetC'],
    rows: [
      ['gene1', 'gene2', 'gene3'],
      ['gene4', '', 'gene5'],
    ],
  };

  it('returns null for valid aggregated columns', () => {
    expect(validateAggregatedColumns(csv, [0, 1])).toBeNull();
  });
  it('rejects fewer than 2 columns', () => {
    expect(validateAggregatedColumns(csv, [0])).toContain('At least 2');
  });
  it('rejects empty column', () => {
    const emptyCsv = {
      headers: ['A', 'B'],
      rows: [['gene1', ''], ['gene2', '']],
    };
    expect(validateAggregatedColumns(emptyCsv, [0, 1])).toContain('empty');
  });
});

describe('calculateVennCountsFromAggregated', () => {
  it('computes 2-set intersections correctly', () => {
    const csv = {
      headers: ['SetA', 'SetB'],
      rows: [
        ['X', 'Y'],
        ['Y', 'Z'],
        ['Z', 'W'],
      ],
    };
    // SetA = {X, Y, Z}, SetB = {Y, Z, W}
    // Exclusive A = {X} = 1, Exclusive B = {W} = 1, AB = {Y, Z} = 2
    const result = calculateVennCountsFromAggregated(csv, [0, 1], ',');
    expect(result.exclusive.get('A')).toBe(1);
    expect(result.exclusive.get('B')).toBe(1);
    expect(result.exclusive.get('AB')).toBe(2);
    // Inclusive: A = 3 (X,Y,Z), B = 3 (Y,Z,W), AB = 2 (Y,Z)
    expect(result.inclusive.get('A')).toBe(3);
    expect(result.inclusive.get('B')).toBe(3);
    expect(result.inclusive.get('AB')).toBe(2);
  });

  it('computes 3-set intersections correctly', () => {
    const csv = {
      headers: ['A', 'B', 'C'],
      rows: [
        ['X', 'X', 'X'],  // X in all 3
        ['Y', 'Y', ''],   // Y in A,B
        ['Z', '', 'Z'],   // Z in A,C
        ['W', '', ''],     // W only in A
      ],
    };
    const result = calculateVennCountsFromAggregated(csv, [0, 1, 2], ',');
    expect(result.exclusive.get('ABC')).toBe(1); // X
    expect(result.exclusive.get('AB')).toBe(1);  // Y
    expect(result.exclusive.get('AC')).toBe(1);  // Z
    expect(result.exclusive.get('A')).toBe(1);   // W
    expect(result.exclusive.get('B')).toBe(0);
    expect(result.exclusive.get('C')).toBe(0);
    expect(result.exclusive.get('BC')).toBe(0);
  });

  it('handles item delimiter within cells', () => {
    const csv = {
      headers: ['SetA', 'SetB'],
      rows: [
        ['X;Y;Z', 'Y;W'],
      ],
    };
    // SetA = {X, Y, Z}, SetB = {Y, W}
    const result = calculateVennCountsFromAggregated(csv, [0, 1], ';');
    expect(result.exclusive.get('A')).toBe(2);  // X, Z
    expect(result.exclusive.get('B')).toBe(1);  // W
    expect(result.exclusive.get('AB')).toBe(1); // Y
  });

  it('ignores empty cells and whitespace', () => {
    const csv = {
      headers: ['A', 'B'],
      rows: [
        ['X', ''],
        ['', 'Y'],
        ['  ', '  '],
      ],
    };
    const result = calculateVennCountsFromAggregated(csv, [0, 1], ',');
    expect(result.exclusive.get('A')).toBe(1);
    expect(result.exclusive.get('B')).toBe(1);
    expect(result.exclusive.get('AB')).toBe(0);
  });

  it('is case-sensitive', () => {
    const csv = {
      headers: ['A', 'B'],
      rows: [
        ['Gene1', 'gene1'],
        ['gene1', 'Gene1'],
      ],
    };
    const result = calculateVennCountsFromAggregated(csv, [0, 1], ',');
    // Gene1 in A and B → AB; gene1 in A and B → AB
    expect(result.exclusive.get('AB')).toBe(2);
  });
});

describe('getBinaryColumns', () => {
  it('detects binary columns', () => {
    const csv = {
      headers: ['Title', 'A', 'B', 'Type'],
      rows: [
        ['x', '1', '0', 'movie'],
        ['y', '0', '1', 'series'],
      ],
    };
    expect(getBinaryColumns(csv)).toEqual([1, 2]);
  });
  it('skips columns with no truthy values', () => {
    const csv = {
      headers: ['A', 'B'],
      rows: [['0', '1'], ['0', '0']],
    };
    expect(getBinaryColumns(csv)).toEqual([1]);
  });
});
