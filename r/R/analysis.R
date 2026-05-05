#' @importFrom BiocGenerics union
NULL

.LETTERS_VDL <- "ABCDEFGHI"

# Internal: locate the bundled inst/extdata/models/json/ directory.
.models_json_dir <- function() {
    system.file("extdata", "models", "json", package = "vennDiagramLab", mustWork = TRUE)
}

#' List all bundled Venn diagram models
#'
#' Returns metadata for the 44 bundled SVG model templates plus the
#' `proportional` synthetic generator (added in Phase 3). Read from JSON
#' region files in `inst/extdata/models/json/`.
#'
#' @return A `data.frame` with columns `name` (filename stem), `set_count`
#'   (2-9), and `display_name` (from the JSON `name` field). Sorted by
#'   `(set_count, name)`.
#' @export
#' @examples
#' head(list_models())
list_models <- function() {
    json_dir <- .models_json_dir()
    files <- list.files(json_dir, pattern = "\\.json$", full.names = TRUE)
    if (length(files) == 0L) {
        stop(sprintf("Bundled model directory is empty: %s. Run r/data-raw/sync_data.R.",
                     json_dir))
    }

    rows <- lapply(files, function(f) {
        data <- jsonlite::fromJSON(f)
        name <- tools::file_path_sans_ext(basename(f))
        list(
            name         = name,
            set_count    = as.integer(data$n),
            display_name = as.character(data$name)
        )
    })
    df <- data.frame(
        name         = vapply(rows, `[[`, character(1L), "name"),
        set_count    = vapply(rows, `[[`, integer(1L),   "set_count"),
        display_name = vapply(rows, `[[`, character(1L), "display_name"),
        stringsAsFactors = FALSE
    )
    df <- df[order(df$set_count, df$name), , drop = FALSE]
    rownames(df) <- NULL
    df
}

# Null-coalesce helper (R < 4.4 lacks base %||%).
`%||%` <- function(x, y) if (is.null(x)) y else x

#' @noRd
.label_for_bitmask <- function(bitmask) {
    letters_chars <- strsplit(.LETTERS_VDL, "", fixed = TRUE)[[1L]]
    indices <- which(bitwAnd(bitmask, bitwShiftL(1L, 0:(nchar(.LETTERS_VDL) - 1L))) != 0L)
    paste(letters_chars[indices], collapse = "")
}

# Internal: convert bitmask integer to the named-list key.
.region_key <- function(bitmask) as.character(as.integer(bitmask))

#' @noRd
.enumerate_regions <- function(dataset) {
    n <- length(dataset@set_names)
    if (n == 0L) return(list())

    # Build per-item bitmask: which sets each item belongs to.
    universe <- unique(unlist(dataset@items, use.names = FALSE))
    item_mask <- setNames(integer(length(universe)), universe)
    for (i in seq_along(dataset@set_names)) {
        members <- dataset@items[[dataset@set_names[i]]]
        if (length(members) == 0L) next
        item_mask[members] <- bitwOr(item_mask[members], bitwShiftL(1L, i - 1L))
    }
    item_mask <- item_mask[item_mask != 0L]

    # Bucket items by their exact bitmask (exclusive regions).
    exclusive <- split(names(item_mask), item_mask)

    # For each possible region mask, build RegionData if non-empty.
    out <- list()
    for (mask in 1L:(bitwShiftL(1L, n) - 1L)) {
        excl <- exclusive[[as.character(mask)]] %||% character(0L)
        # Inclusive = items whose bitmask is a superset of region_mask.
        incl <- names(item_mask)[bitwAnd(item_mask, mask) == mask]
        if (length(excl) == 0L && length(incl) == 0L) next

        set_indices <- which(bitwAnd(mask, bitwShiftL(1L, 0L:(n - 1L))) != 0L) - 1L
        set_names_for_region <- dataset@set_names[set_indices + 1L]

        out[[.region_key(mask)]] <- methods::new("RegionData",
            bitmask         = as.integer(mask),
            label           = .label_for_bitmask(mask),
            set_indices     = as.integer(set_indices),
            set_names       = set_names_for_region,
            exclusive_items = excl,
            inclusive_items = incl
        )
    }
    out
}

.MIN_SETS_FOR_STATISTICS <- 2L
.PROPORTIONAL_APPROXIMATE_SET_COUNT <- 3L

#' @noRd
.resolve_model <- function(model, set_count) {
    if (model == "proportional") return("proportional")

    models <- list_models()
    if (model == "auto") {
        candidates <- models[models$set_count == set_count, ]
        if (nrow(candidates) == 0L) {
            .stop_unknown_model(
                sprintf("No bundled model for %d sets. Use list_models() to see available models.",
                        set_count)
            )
        }
        return(candidates$name[1L])   # alphabetical first
    }

    if (!model %in% models$name) {
        alts <- paste(head(models$name, 5L), collapse = ", ")
        .stop_unknown_model(
            sprintf("Unknown model '%s'. Some available: %s. Use list_models() for the full list.",
                    model, alts)
        )
    }

    expected_set_count <- models$set_count[models$name == model]
    if (expected_set_count != set_count) {
        .stop_incompatible_model(
            sprintf("Model '%s' supports %d sets but dataset has %d.",
                    model, expected_set_count, set_count)
        )
    }
    model
}

#' Analyze a Venn diagram dataset
#'
#' Compute the Venn region map for a [`VennDataset-class`] and bind it to
#' a model.
#'
#' @param dataset A [`VennDataset-class`] (from one of the `load_*` functions).
#' @param model Model identifier. `"auto"` picks the canonical model for the
#'   dataset's set count (alphabetical first match), e.g. 4 sets ->
#'   `venn-4-set`. `"proportional"` requests an area-proportional layout (only
#'   supports 2-3 sets, added in Phase 3). Otherwise pass an explicit name from
#'   [list_models()].
#' @return A [`RegionResult-class`] with the per-region item membership, set
#'   sizes, and (lazily) `statistics(result)`.
#' @export
#' @examples
#' ds <- methods::new("VennDataset",
#'     set_names = c("A", "B"),
#'     items = list(A = c("x", "y"), B = c("y", "z")),
#'     item_order = c("x", "y", "z"),
#'     universe_size = 10L, source_path = NULL, format = "csv")
#' result <- analyze(ds)
#' result@model
#' \donttest{
#' ds <- load_sample("dataset_real_cancer_drivers_4")
#' result <- analyze(ds, model = "auto")
#' result@model
#' }
analyze <- function(dataset, model = "auto") {
    n <- length(dataset@set_names)
    resolved <- .resolve_model(model, n)
    regions <- .enumerate_regions(dataset)
    set_sizes <- vapply(dataset@items, length, integer(1L))
    is_approx <- (resolved == "proportional" && n == .PROPORTIONAL_APPROXIMATE_SET_COUNT)

    set_sizes_int <- as.integer(set_sizes)
    names(set_sizes_int) <- names(set_sizes)

    methods::new("RegionResult",
        dataset        = dataset,
        model          = resolved,
        regions        = regions,
        set_sizes      = set_sizes_int,
        is_approximate = is_approx
    )
}

#' Effective hypergeometric universe size for a RegionResult
#'
#' Returns the universe N consistent with the web tool. Binary CSV/TSV
#' datasets get `dataset@universe_size` (= csv.rows.length, includes
#' all-zero rows); aggregated/GMT/GMX datasets fall back to
#' `length(item_order)` (= |union of items|).
#'
#' @param result A [`RegionResult-class`].
#' @return Integer, the universe size N.
#' @export
#' @examples
#' ds <- methods::new("VennDataset",
#'     set_names = c("A", "B"),
#'     items = list(A = c("x", "y"), B = c("y", "z")),
#'     item_order = c("x", "y", "z"),
#'     universe_size = 10L, source_path = NULL, format = "csv")
#' result <- analyze(ds)
#' effective_universe(result)
#' \donttest{
#' ds <- load_sample("dataset_real_cancer_drivers_4")
#' result <- analyze(ds)
#' effective_universe(result)   # 20000 for binary cancer drivers sample
#' }
setGeneric("effective_universe", function(result) standardGeneric("effective_universe"))

#' @rdname effective_universe
setMethod("effective_universe", "RegionResult", function(result) {
    if (!is.null(result@dataset@universe_size)) {
        return(as.integer(result@dataset@universe_size))
    }
    # Fallback: |union of all items| across sets (Bioconductor-idiomatic set union).
    all_items <- Reduce(BiocGenerics::union, result@dataset@items, character(0L))
    length(all_items)
})

#' Lazy pairwise statistics for a RegionResult
#'
#' Computes (and on subsequent calls re-computes) the [`StatisticsResult-class`]
#' for the pairwise metric tables. R has no built-in `cached_property`
#' equivalent for S4 slots, so this is recomputed each call. Cache externally
#' via `stats <- statistics(result)` if you need to access it many times.
#'
#' @param result A [`RegionResult-class`].
#' @return A [`StatisticsResult-class`].
#' @export
#' @examples
#' ds <- methods::new("VennDataset",
#'     set_names = c("A", "B"),
#'     items = list(A = c("x", "y"), B = c("y", "z")),
#'     item_order = c("x", "y", "z"),
#'     universe_size = 10L, source_path = NULL, format = "csv")
#' result <- analyze(ds)
#' stats <- statistics(result)
#' stats@jaccard["A", "B"]
#' \donttest{
#' result <- analyze(load_sample("dataset_real_cancer_drivers_4"))
#' stats <- statistics(result)
#' stats@jaccard
#' stats@hypergeometric
#' }
setGeneric("statistics", function(result) standardGeneric("statistics"))

#' @rdname statistics
setMethod("statistics", "RegionResult", function(result) {
    n <- length(result@dataset@set_names)
    if (n < .MIN_SETS_FOR_STATISTICS) {
        return(methods::new("StatisticsResult",
            jaccard             = matrix(numeric(0L), nrow = 0L, ncol = 0L),
            dice                = matrix(numeric(0L), nrow = 0L, ncol = 0L),
            overlap_coefficient = matrix(numeric(0L), nrow = 0L, ncol = 0L),
            fold_enrichment     = matrix(numeric(0L), nrow = 0L, ncol = 0L),
            hypergeometric      = data.frame()
        ))
    }

    # Build pairwise inclusive intersections from regions: (A, B) -> |A & B| inclusive.
    pair_inter <- list()
    for (i in seq_len(n - 1L)) {
        for (j in (i + 1L):n) {
            mask_pair <- bitwOr(bitwShiftL(1L, i - 1L), bitwShiftL(1L, j - 1L))
            inter_count <- 0L
            for (region_key in names(result@regions)) {
                region_mask <- as.integer(region_key)
                if (bitwAnd(region_mask, mask_pair) == mask_pair) {
                    inter_count <- inter_count + length(result@regions[[region_key]]@exclusive_items)
                }
            }
            key <- paste(result@dataset@set_names[i], result@dataset@set_names[j], sep = "|")
            pair_inter[[key]] <- inter_count
        }
    }

    universe <- effective_universe(result)
    compute_pairwise(
        set_names = result@dataset@set_names,
        inclusive_sizes = result@set_sizes,
        pairwise_intersections = pair_inter,
        universe_size = universe
    )
})
