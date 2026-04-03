/**
 * Tour mock dataset config (v1.13.0).
 *
 * The guided tour bypasses the standard CsvImportDialog flow and directly
 * seeds the Data-mode state with a curated sample so every step lands in a
 * known UI configuration.
 */

export interface TourDatasetConfig {
  filename: string;        // file in /data, served statically
  delimiter: string;       // column separator in the file
  preferredModel: string;  // SVG model filename (from MODEL_LIST)
  preferredColumns: number[]; // 0-based column indices from the file header
  fileType: 'binary' | 'aggregated';
}

export const TOUR_DATASET: TourDatasetConfig = {
  filename: 'dataset_real_cancer_drivers_4.tsv',
  delimiter: '\t',
  preferredModel: 'venn-4a-set-edwards.svg',
  // File columns: Gene | Vogelstein | COSMIC_CGC | OncoKB | IntOGen
  preferredColumns: [1, 2, 3, 4],
  fileType: 'binary',
};
