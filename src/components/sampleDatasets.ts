import type { SampleDataset } from './SampleDataDialog.tsx';

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    id: 'msigdb-cancer',
    filename: 'dataset_real_msigdb_cancer_pathways.tsv',
    name: 'MSigDB Hallmark gene collection - Cancer',
    type: 'real',
    dataFormat: 'binary',
    description: 'Curated cancer-related hallmark gene sets from the Molecular Signatures Database (MSigDB). Includes key oncogenic pathways such as P53, MYC targets, and cell cycle regulation.',
    reference: 'Liberzon A. et al., Cell Syst 2015; 1(6):417-425. DOI: 10.1016/j.cels.2015.12.004',
  },
  {
    id: 'msigdb-immune',
    filename: 'dataset_real_msigdb_immune_pathways.tsv',
    name: 'MSigDB Hallmark gene collection - Immune signaling',
    type: 'real',
    dataFormat: 'binary',
    description: 'Immune signaling hallmark gene sets from MSigDB. Covers interferon response, TNF-alpha signaling, inflammatory response, and complement pathways.',
    reference: 'Liberzon A. et al., Cell Syst 2015; 1(6):417-425. DOI: 10.1016/j.cels.2015.12.004',
  },
  {
    id: 'cancer-drivers',
    filename: 'dataset_real_cancer_drivers_4.tsv',
    name: 'Cancer dataset (COSMIC, OncoKB, IntOGen, Vogelstein)',
    type: 'real',
    dataFormat: 'binary',
    description: 'Cancer driver genes compiled from four major databases: COSMIC Cancer Gene Census, OncoKB, IntOGen, and Vogelstein et al. Useful for cross-database comparison of oncogene and tumor suppressor annotations.',
    reference: 'COSMIC CGC (Sondka et al. 2018); OncoKB (Chakravarty et al. 2017); IntOGen (Martinez-Jimenez et al. 2020); Vogelstein et al. 2013.',
  },
  {
    id: 'mock-pathways',
    filename: 'dataset_mock_gene_sets.csv',
    name: 'Test - Mock data - Pathways',
    type: 'mock',
    dataFormat: 'aggregated',
    description: 'Synthetic gene set data for testing the import and Venn calculation pipeline. Contains mock pathway memberships with controlled overlaps.',
  },
  {
    id: 'mock-streaming',
    filename: 'dataset_mock_streaming_platforms.csv',
    name: 'Test - Mock data - Streaming platforms',
    type: 'mock',
    dataFormat: 'binary',
    description: 'Fictional movie/show availability across streaming platforms. Binary format with controlled overlaps, ideal for quick demos and testing.',
  },
];
