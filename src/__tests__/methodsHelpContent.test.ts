import { describe, expect, it } from 'vitest';
import { METHODS_HELP } from '../components/methodsHelpContent.ts';

const EXPECTED_IDS = ['jaccard', 'dice', 'overlap', 'hypergeometric', 'fold_enrichment', 'bh_fdr'] as const;

describe('METHODS_HELP content', () => {
  it('contains exactly six method entries', () => {
    expect(METHODS_HELP).toHaveLength(6);
  });

  it('has the expected id set in the expected order', () => {
    expect(METHODS_HELP.map(m => m.id)).toEqual(EXPECTED_IDS);
  });

  it('has unique entry ids', () => {
    const ids = METHODS_HELP.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('provides name, formula and description for every entry', () => {
    for (const method of METHODS_HELP) {
      expect(method.name.trim().length).toBeGreaterThan(0);
      expect(method.formula.trim().length).toBeGreaterThan(0);
      expect(method.description.trim().length).toBeGreaterThan(0);
    }
  });

  it('keeps descriptions between 40 and 400 characters', () => {
    for (const method of METHODS_HELP) {
      expect(method.description.length).toBeGreaterThanOrEqual(40);
      expect(method.description.length).toBeLessThanOrEqual(400);
    }
  });

  it('every formula includes an equals sign', () => {
    for (const method of METHODS_HELP) {
      expect(method.formula).toContain('=');
    }
  });

  it('set-based formulas include the set-size operator', () => {
    const setBased = METHODS_HELP.filter(m => m.id !== 'bh_fdr');
    for (const method of setBased) {
      expect(method.formula).toContain('|');
    }
  });
});
