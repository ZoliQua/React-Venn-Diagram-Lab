export interface MethodEntry {
  id: string;
  name: string;
  formula: string;
  description: string;
  range?: string;
}

export const METHODS_HELP: MethodEntry[] = [
  {
    id: 'jaccard',
    name: 'Jaccard Index',
    formula: 'J = |A \u2229 B| / |A \u222A B|',
    description: 'Symmetric similarity measure that compares two sets by dividing the size of their intersection by the size of their union. It is insensitive to set size but penalizes pairs that differ greatly in cardinality.',
    range: '0 (disjoint) to 1 (identical)',
  },
  {
    id: 'dice',
    name: 'S\u00F8rensen\u2013Dice Coefficient',
    formula: 'D = 2 \u00B7 |A \u2229 B| / (|A| + |B|)',
    description: 'Symmetric similarity measure that counts each shared element twice relative to the sum of set sizes. Compared with Jaccard it gives more weight to the overlap and is therefore more forgiving for small sets.',
    range: '0 (disjoint) to 1 (identical)',
  },
  {
    id: 'overlap',
    name: 'Szymkiewicz\u2013Simpson Overlap Coefficient',
    formula: 'OC = |A \u2229 B| / min(|A|, |B|)',
    description: 'Divides the intersection by the size of the smaller set, so it reaches 1 whenever one set is fully contained in the other. Useful when the two sets have very different cardinalities.',
    range: '0 (disjoint) to 1 (one set contained in the other)',
  },
  {
    id: 'hypergeometric',
    name: 'Hypergeometric Enrichment Test',
    formula: 'P(X \u2265 k) = \u03A3 C(|A|,i) \u00B7 C(N\u2212|A|, |B|\u2212i) / C(N, |B|)',
    description: 'One-sided test for over-representation that asks how likely an overlap of at least k items is when drawing |B| items from a background of N without replacement. Binomial coefficients are evaluated in log space to avoid numerical overflow for large backgrounds.',
    range: '0 (strong over-representation) to 1 (no evidence)',
  },
  {
    id: 'fold_enrichment',
    name: 'Fold Enrichment',
    formula: 'FE = (|A \u2229 B| \u00B7 N) / (|A| \u00B7 |B|)',
    description: 'Ratio of the observed intersection to the size expected under independence given the background N. Values above 1 indicate over-representation and values below 1 indicate under-representation.',
    range: '0 (no overlap) to N (complete overlap); 1 = expected by chance',
  },
  {
    id: 'bh_fdr',
    name: 'Benjamini\u2013Hochberg FDR Correction',
    formula: 'FDR_i = p_i \u00B7 m / rank(p_i)',
    description: 'Adjusts the hypergeometric p-values of all pairwise comparisons to control the false discovery rate across the full set of tests. Significance markers in the tables correspond to FDR < 0.05 (*), < 0.01 (**), and < 0.001 (***).',
    range: '0 (strong evidence) to 1 (no evidence after correction)',
  },
];
