import { describe, expect, it } from 'vitest';
import { ABOUT_VENN_REFERENCES, ABOUT_VENN_SECTIONS } from '../components/aboutVennContent.ts';

describe('ABOUT_VENN content', () => {
  it('has unique reference ids', () => {
    const ids = ABOUT_VENN_REFERENCES.map(reference => reference.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique section ids', () => {
    const ids = ABOUT_VENN_SECTIONS.map(section => section.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only uses declared reference ids', () => {
    const referenceIds = new Set(ABOUT_VENN_REFERENCES.map(reference => reference.id));

    for (const section of ABOUT_VENN_SECTIONS) {
      for (const referenceId of section.referenceIds) {
        expect(referenceIds.has(referenceId)).toBe(true);
      }
      for (const image of section.images) {
        for (const referenceId of image.referenceIds) {
          expect(referenceIds.has(referenceId)).toBe(true);
        }
      }
      if (section.quote) {
        expect(referenceIds.has(section.quote.referenceId)).toBe(true);
      }
    }
  });

  it('gives every section at least one image', () => {
    for (const section of ABOUT_VENN_SECTIONS) {
      expect(section.images.length).toBeGreaterThan(0);
    }
  });

  it('keeps every section prose-heavy', () => {
    for (const section of ABOUT_VENN_SECTIONS) {
      expect(section.paragraphs.length).toBeGreaterThanOrEqual(3);
      for (const paragraph of section.paragraphs) {
        expect(paragraph.length).toBeGreaterThan(180);
      }
    }
  });
});
