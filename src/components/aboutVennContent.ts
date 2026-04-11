export interface AboutVennReference {
  id: string;
  title: string;
  details: string;
  file?: string;
}

export interface AboutVennImage {
  src: string;
  alt: string;
  caption: string;
  referenceIds: string[];
}

export interface AboutVennSection {
  id: string;
  title: string;
  intro: string;
  paragraphs: string[];
  keyPoints: string[];
  quote?: {
    text: string;
    attribution: string;
    referenceId: string;
  };
  images: AboutVennImage[];
  referenceIds: string[];
}

export const ABOUT_VENN_REFERENCES: AboutVennReference[] = [
  {
    id: 'farrokhi2023',
    title: 'Farrokhi, M. D. G. - Venn Diagrams',
    details: 'Lecture slides dated June 13, 2023. Used as one secondary source for the historical timeline and for a compact overview of classical definitions and later research themes.',
    file: 'publications/Farrokhi-lecture-2023.pdf',
  },
  {
    id: 'venn1880',
    title: 'Venn, J. - On the diagrammatic and mechanical representation of propositions and reasonings',
    details: 'Philosophical Magazine, Series 5, 10:59 (1880), 1-18.',
    file: 'publications/Venn-1880.pdf',
  },
  {
    id: 'grunbaum1975',
    title: 'Grunbaum, B. - Venn diagrams and independent families of sets',
    details: 'Mathematics Magazine 48 (1975), 12-23. Used here for independence and circle/ellipse lower bounds.',
  },
  {
    id: 'henderson1963',
    title: 'Henderson, D. W. - Venn diagrams for more than four classes',
    details: 'American Mathematical Monthly 70(4) (1963), 424-426. Used here for the prime-only symmetry condition.',
  },
  {
    id: 'griggs2004',
    title: 'Griggs, J., Killian, C. E., Savage, C. D. - Venn Diagrams and Symmetric Chain Decompositions in the Boolean Lattice',
    details: 'Electronic Journal of Combinatorics 11 (2004), R2.',
    file: 'publications/Griggs-et-al-2004.pdf',
  },
  {
    id: 'grunbaum1984',
    title: 'Grunbaum, B. - The construction of Venn diagrams',
    details: 'College Mathematics Journal 15(3) (1984), 238-247. Used here for reducibility and irreducible examples.',
    file: 'publications/Grunbaum-1984.pdf',
  },
  {
    id: 'carroll2000',
    title: 'Carroll, J. - Drawing Venn triangles',
    details: 'HP Labs Technical Report HPL-2000-73 (2000). Used here for the 6-Venn triangle construction.',
    file: 'publications/Carroll-2000.pdf',
  },
];

export const ABOUT_VENN_SECTIONS: AboutVennSection[] = [
  {
    id: 'history',
    title: 'Origins and Historical Background',
    intro:
      'Venn diagrams belong to a much older effort to make logical structure visible. The name comes from John Venn, but the idea of reasoning with geometric or diagrammatic arrangements predates him by centuries.',
    paragraphs: [
      'The historical background of Venn diagrams is longer than the name suggests. Taken together, the cited sources place John Venn in a line that includes Raymond Llull, Juan Luis Vives, Johann Christoph Strum, Gottfried Wilhelm Leibniz, Christian Weise, Leonhard Euler, and Johann Heinrich Lambert before Venn appears in 1880. That sequence shows that Venn diagrams did not emerge in isolation, but out of earlier attempts to represent classes, propositions, and syllogistic relations visually.',
      'What makes Venn especially important is not simply that he used circles or closed curves. In the opening pages of his 1880 paper, he explicitly discusses the broad acceptance of what he calls Eulerian circles while also criticizing their limitations. The point of his reformulation is to move from a convenient picture for selected cases toward a more systematic logical representation.',
      'This is why Venn diagrams and Euler diagrams are related but not identical. In modern usage, Euler diagrams may omit combinations that are empty or irrelevant, while Venn diagrams are expected to make room for every possible in-or-out pattern. The later mathematical literature represented in this repository treats that completeness condition as one of the defining features of the subject.',
      'Seen this way, the history of Venn diagrams is not just the story of a familiar classroom picture. It is the story of how logical diagrams became more precise, more combinatorial, and more demanding geometrically as mathematicians asked what it really means to represent all possible set relationships at once.',
    ],
    keyPoints: [
      'The historical path runs from medieval and early modern logical diagrams to Venn rather than beginning with Venn alone.',
      'Venn’s 1880 intervention is best understood as a push toward systematic completeness.',
      'Modern mathematical definitions of Venn diagrams are stricter than everyday classroom usage.',
    ],
    quote: {
      text: 'met with any general acceptance',
      attribution: 'J. Venn on Eulerian circles, 1880',
      referenceId: 'venn1880',
    },
    images: [
      {
        src: './about-venn/history-timeline.svg',
        alt: 'Custom timeline showing the historical sequence from Llull to Venn.',
        caption: 'Custom timeline synthesized from the historical sequence documented in the cited sources.',
        referenceIds: ['farrokhi2023'],
      },
      {
        src: './about-venn/venn-1880-paper.png',
        alt: 'Opening page of John Venn’s 1880 paper.',
        caption: 'First page of Venn’s 1880 paper, kept here as a primary-source image.',
        referenceIds: ['venn1880'],
      },
    ],
    referenceIds: ['farrokhi2023', 'venn1880', 'griggs2004'],
  },
  {
    id: 'definitions',
    title: 'What a Venn Diagram Is',
    intro:
      'In mathematical work, a Venn diagram is not merely any collection of overlapping shapes. The definition is combinatorial as well as geometric.',
    paragraphs: [
      'A mathematical definition of a Venn diagram is more demanding than the everyday textbook intuition. In the formulation used by Griggs, Killian, and Savage, an n-Venn diagram is a collection of n simple closed curves such that each subset of the index set determines a nonempty and connected region obtained from the appropriate interiors and exteriors of the curves.',
      'That definition has an immediate combinatorial consequence: the plane is partitioned into exactly 2^n regions. This is the structural reason Venn diagrams are so useful in logic, combinatorics, and set visualization. Every possible membership pattern has a place, so the diagram is required to encode the whole Boolean structure rather than only the cases someone wants to highlight.',
      'The same body of literature also shows that not every geometric family is flexible enough to realize that requirement for all n. Grunbaum’s 1975 work on independent families of Jordan curves yields a well-known corollary: there is no Venn diagram with four circles and no Venn diagram with six ellipses. Results like that explain why higher-order constructions often move beyond the most familiar classroom shapes.',
      'Polygonal constructions are constrained as well. The cited sources discuss lower bounds for Venn diagrams drawn with convex k-gons, together with the corollary that there is no Venn diagram with seven triangles or eight quadrilaterals. Once the number of sets grows, the geometry stops being a simple drawing exercise and becomes a research problem in its own right.',
    ],
    keyPoints: [
      'A true n-Venn diagram realizes every subset pattern as a nonempty connected region.',
      'The plane is partitioned into exactly 2^n regions.',
      'Impossibility results for circles, ellipses, and polygons are part of the subject, not edge cases.',
    ],
    images: [
      {
        src: './about-venn/complete-regions.svg',
        alt: 'Custom illustration showing that every in-out pattern receives its own region.',
        caption: 'Custom explanatory figure illustrating the idea that all membership patterns must be represented.',
        referenceIds: ['griggs2004', 'grunbaum1975'],
      },
      {
        src: './about-venn/construction-families.svg',
        alt: 'Custom illustration comparing circles, ellipses, polygons, and freeform curve families.',
        caption: 'Custom overview showing why different curve families become relevant as the number of sets increases.',
        referenceIds: ['farrokhi2023', 'grunbaum1975', 'carroll2000'],
      },
    ],
    referenceIds: ['griggs2004', 'grunbaum1975', 'farrokhi2023', 'carroll2000'],
  },
  {
    id: 'modern',
    title: 'Symmetry and Later Research Directions',
    intro:
      'Once existence is established, the subject quickly branches into sharper questions: which Venn diagrams can be symmetric, convex, monotone, reducible, irreducible, or extendable, and what kinds of curves are needed to build them.',
    paragraphs: [
      'Symmetry is one of the most visible themes in the later theory. Henderson’s 1963 theorem shows that symmetric n-Venn diagrams can exist only when n is prime. Later work pushed that story much further by proving that symmetric Venn diagrams exist for every prime n, and by connecting those constructions to symmetric chain decompositions and minimum-vertex monotone diagrams.',
      'This means that symmetry is not just a decorative property. It is tied to the arithmetic of the number of sets and to the deeper combinatorial structure of the construction. The subject therefore moves well beyond the classroom picture of overlapping loops and into a genuinely rich interaction between geometry and discrete mathematics.',
      'Reducibility is another important notion. In Grunbaum’s 1984 terminology, a Venn diagram is reducible if removing a suitable curve still leaves a Venn diagram. The same paper is also the source for the theorem that simple irreducible Venn diagrams exist for all n >= 5. This distinction matters because it separates constructions that can be peeled apart from those that already have a more resistant internal structure.',
      'The model families in this application reflect those research directions rather than presenting a single canonical shape. Classical circle and ellipse-based forms sit beside Edwards constructions, Carroll triangle constructions, Grunbaum variants, Bannier-Bodin families, and later symmetric examples. That variety is faithful to the literature: the theory of Venn diagrams is not about one fixed image, but about a broad family of constructions shaped by logic, combinatorics, geometry, and symmetry.',
    ],
    keyPoints: [
      'Rotational symmetry is tied to primality in the classical theory.',
      'Later results prove existence of symmetric diagrams for every prime n.',
      'Reducibility and irreducibility capture structural differences between constructions.',
    ],
    images: [
      {
        src: './about-venn/prime-symmetry.svg',
        alt: 'Custom illustration contrasting prime-friendly rotational symmetry with non-prime obstruction.',
        caption: 'Custom diagram summarizing the prime-only symmetry condition and the later prime-existence results.',
        referenceIds: ['henderson1963', 'griggs2004', 'farrokhi2023'],
      },
      {
        src: './about-venn/irreducible-structure.svg',
        alt: 'Custom illustration showing the idea of removing a curve from a reducible or irreducible construction.',
        caption: 'Custom explanatory sketch for reducibility versus irreducibility, paired with Grunbaum’s theorem on irreducible examples.',
        referenceIds: ['grunbaum1984', 'farrokhi2023'],
      },
    ],
    referenceIds: ['farrokhi2023', 'henderson1963', 'griggs2004', 'grunbaum1984'],
  },
];
