# Per-sample metadata. The companion SAMPLES table in
# scripts/generate-parity-fixtures.mts AND python/src/venn_diagram_lab/samples.py
# mirror this — keep them in sync.
.SAMPLE_REGISTRY <- list(
    dataset_mock_gene_sets               = list(ext = "csv", mode = "aggregated", prefix_cols = 1L),
    dataset_mock_streaming_platforms     = list(ext = "csv", mode = "binary",     prefix_cols = 2L),
    dataset_real_cancer_drivers_4        = list(ext = "tsv", mode = "binary",     prefix_cols = 1L),
    dataset_real_msigdb_cancer_pathways  = list(ext = "tsv", mode = "binary",     prefix_cols = 1L),
    dataset_real_msigdb_immune_pathways  = list(ext = "tsv", mode = "binary",     prefix_cols = 1L)
)

#' List bundled sample dataset names
#'
#' Returns the names of the 5 bundled sample datasets, sorted alphabetically.
#' Use [load_sample()] to load one.
#'
#' @return Character vector of 5 sample identifiers.
#' @export
#' @examples
#' list_samples()
list_samples <- function() {
    sort(names(.SAMPLE_REGISTRY))
}

#' Load a bundled sample dataset by name
#'
#' Sample datasets ship inside the package under `inst/extdata/samples/` and
#' cover biological (cancer drivers, MSigDB pathways) and mock (streaming
#' platforms, gene sets) use cases. Use [list_samples()] to enumerate.
#'
#' @param name Sample identifier from [list_samples()].
#' @return A [`VennDataset-class`] with the appropriate format and mode applied.
#' @export
#' @examples
#' ds <- load_sample("dataset_mock_gene_sets")
#' length(ds@set_names)
#' \donttest{
#' ds <- load_sample("dataset_real_cancer_drivers_4")
#' analyze(ds)@model
#' }
load_sample <- function(name) {
    if (!name %in% names(.SAMPLE_REGISTRY)) {
        stop(sprintf("'%s' is not a known sample. Available: %s",
                     name, paste(list_samples(), collapse = ", ")))
    }
    meta <- .SAMPLE_REGISTRY[[name]]
    path <- system.file("extdata", "samples",
                         sprintf("%s.%s", name, meta$ext),
                         package = "vennDiagramLab")
    if (!nzchar(path) || !file.exists(path)) {
        stop(sprintf("Sample file missing: %s. Run r/data-raw/sync_data.R to populate inst/extdata/samples/.",
                     path))
    }
    binary <- meta$mode == "binary"
    if (meta$ext == "tsv") {
        return(load_tsv(path, binary = binary, prefix_cols = meta$prefix_cols))
    }
    load_csv(path, binary = binary, prefix_cols = meta$prefix_cols)
}
