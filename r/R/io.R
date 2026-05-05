# Internal io helpers. Port of python/src/venn_diagram_lab/io.py:
# _split_line, _detect_delimiter, _parse_table, _read_text.
# Keep this file's helper signatures stable — Phase 2 (TSV exports) and
# Phase 3 (SVG render) call them via the loaders.

#' @importFrom stats setNames
#' @importFrom utils head
NULL

.TRUTHY <- c("1", "true", "yes")
.FALSY  <- c("0", "false", "no", "")
.DELIMITER_CANDIDATES <- c(",", ";", "\t", " ")

.MIN_SETS <- 2L
.MAX_SETS <- 9L

#' @noRd
.split_line <- function(line, delimiter) {
    result <- character()
    current <- character()
    in_quotes <- FALSE
    chars <- strsplit(line, "", fixed = TRUE)[[1L]]
    n <- length(chars)
    i <- 1L
    while (i <= n) {
        ch <- chars[i]
        if (ch == '"') {
            # Escaped quote inside quoted field?
            if (in_quotes && i + 1L <= n && chars[i + 1L] == '"') {
                current <- c(current, '"')
                i <- i + 2L
                next
            }
            in_quotes <- !in_quotes
        } else if (ch == delimiter && !in_quotes) {
            result <- c(result, trimws(paste(current, collapse = "")))
            current <- character()
        } else {
            current <- c(current, ch)
        }
        i <- i + 1L
    }
    result <- c(result, trimws(paste(current, collapse = "")))
    result
}

#' @noRd
.detect_delimiter <- function(text) {
    text <- gsub("\r\n", "\n", text, fixed = TRUE)
    text <- gsub("\r", "\n", text, fixed = TRUE)
    lines <- strsplit(trimws(text), "\n", fixed = TRUE)[[1L]]
    lines <- head(lines, 5L)
    if (length(lines) == 0L) return(",")

    best_delim <- ","
    best_score <- -1L
    for (d in .DELIMITER_CANDIDATES) {
        counts <- integer(length(lines))
        for (li in seq_along(lines)) {
            count <- 0L
            in_quotes <- FALSE
            chars <- strsplit(lines[li], "", fixed = TRUE)[[1L]]
            for (ch in chars) {
                if (ch == '"') {
                    in_quotes <- !in_quotes
                } else if (ch == d && !in_quotes) {
                    count <- count + 1L
                }
            }
            counts[li] <- count
        }
        lo <- min(counts); hi <- max(counts)
        if (lo >= 1L && hi - lo <= 1L) {
            score <- lo * 10L + (if (hi == lo) 5L else 0L)
            if (score > best_score) {
                best_score <- score
                best_delim <- d
            }
        }
    }
    best_delim
}

#' @noRd
.read_text <- function(path) {
    text <- paste(readLines(path, warn = FALSE, encoding = "UTF-8"), collapse = "\n")
    list(text = text, source = normalizePath(path, mustWork = TRUE))
}

#' @noRd
.parse_table <- function(text, delimiter) {
    text <- gsub("\r\n", "\n", text, fixed = TRUE)
    text <- gsub("\r", "\n", text, fixed = TRUE)
    raw_lines <- strsplit(trimws(text), "\n", fixed = TRUE)[[1L]]
    lines <- raw_lines[nzchar(trimws(raw_lines))]
    if (length(lines) < 2L)
        .stop_invalid_dataset("File must have at least a header and one data row")
    headers <- .split_line(lines[1L], delimiter)
    rows <- lapply(lines[-1L], .split_line, delimiter = delimiter)
    list(headers = headers, rows = rows)
}

#' @noRd
.binary_columns_to_dataset <- function(headers, rows, source_path, fmt, prefix_cols = 1L) {
    if (length(headers) < prefix_cols + .MIN_SETS)
        .stop_invalid_dataset(
            sprintf("Binary file must have at least %d data columns", .MIN_SETS)
        )

    set_names <- headers[(prefix_cols + 1L):length(headers)]
    items <- setNames(replicate(length(set_names), character(0), simplify = FALSE), set_names)
    item_order_seen <- character()
    nonempty_row_count <- 0L

    for (row_idx in seq_along(rows)) {
        row <- rows[[row_idx]]
        if (length(row) == 0L || !nzchar(trimws(row[1L]))) next
        nonempty_row_count <- nonempty_row_count + 1L
        item_id <- trimws(row[1L])
        if (!item_id %in% item_order_seen)
            item_order_seen <- c(item_order_seen, item_id)
        for (col_offset in seq_along(set_names)) {
            set_name <- set_names[col_offset]
            col_idx <- prefix_cols + col_offset
            cell <- if (col_idx <= length(row)) tolower(trimws(row[col_idx])) else ""
            if (cell %in% .TRUTHY) {
                items[[set_name]] <- c(items[[set_name]], item_id)
            } else if (cell %in% .FALSY) {
                next
            } else {
                raw <- if (col_idx <= length(row)) row[col_idx] else ""
                .stop_invalid_dataset(
                    sprintf("Column '%s' row %d has invalid value '%s' (expected 0/1/true/false/yes/no)",
                            set_name, row_idx + 1L, raw)
                )
            }
        }
    }
    # Dedupe per-set after collection.
    items <- lapply(items, unique)

    methods::new("VennDataset",
        set_names     = set_names,
        items         = items,
        item_order    = item_order_seen,
        universe_size = nonempty_row_count,
        source_path   = source_path,
        format        = fmt
    )
}

#' @noRd
.aggregated_columns_to_dataset <- function(headers, rows, source_path, fmt) {
    if (length(headers) < .MIN_SETS)
        .stop_invalid_dataset(
            sprintf("Aggregated file must have at least %d columns", .MIN_SETS)
        )

    set_names <- headers
    items <- setNames(replicate(length(set_names), character(0), simplify = FALSE), set_names)
    seen <- character()

    for (row in rows) {
        for (col_idx in seq_along(set_names)) {
            cell <- if (col_idx <= length(row)) trimws(row[col_idx]) else ""
            if (nzchar(cell)) {
                items[[set_names[col_idx]]] <- c(items[[set_names[col_idx]]], cell)
                if (!cell %in% seen) seen <- c(seen, cell)
            }
        }
    }
    items <- lapply(items, unique)

    if (!any(vapply(items, length, integer(1L)) > 0L))
        .stop_invalid_dataset("Aggregated file has no non-empty cells")

    methods::new("VennDataset",
        set_names     = set_names,
        items         = items,
        item_order    = seen,
        universe_size = NULL,
        source_path   = source_path,
        format        = fmt
    )
}

#' Load a delimited file (CSV/TSV) into a [`VennDataset-class`]
#'
#' Supports two layouts:
#' * Binary mode (default): one row per item, with 0/1 columns marking
#'   membership in each set. The first `prefix_cols` columns are item
#'   metadata; remaining columns are sets.
#' * Aggregated mode (`binary = FALSE`): each column is a set, and cells
#'   contain item identifiers. Empty cells are ignored.
#'
#' @param path Path to the file.
#' @param binary `TRUE` for binary 0/1 mode (default), `FALSE` for aggregated.
#' @param delimiter Explicit delimiter override. `NULL` auto-detects from
#'   `,`, `;`, tab, and space.
#' @param prefix_cols Number of leading metadata columns in binary mode
#'   (default 1). Ignored when `binary = FALSE`.
#' @return A [`VennDataset-class`].
#' @export
#' @examples
#' tmp <- tempfile(fileext = ".csv")
#' writeLines(c("Gene,SetA,SetB", "G1,1,0", "G2,1,1", "G3,0,1"), tmp)
#' ds <- load_csv(tmp, binary = TRUE)
#' ds@set_names
load_csv <- function(path, binary = TRUE, delimiter = NULL, prefix_cols = 1L) {
    txt_src <- .read_text(path)
    delim <- if (is.null(delimiter)) .detect_delimiter(txt_src$text) else delimiter
    parsed <- .parse_table(txt_src$text, delim)
    fmt <- if (delim == "\t") "tsv" else "csv"
    if (isTRUE(binary)) {
        .binary_columns_to_dataset(parsed$headers, parsed$rows, txt_src$source, fmt,
                                    prefix_cols = as.integer(prefix_cols))
    } else {
        .aggregated_columns_to_dataset(parsed$headers, parsed$rows, txt_src$source, fmt)
    }
}

#' Load a tab-separated file into a [`VennDataset-class`]
#'
#' Equivalent to `load_csv(path, binary = binary, delimiter = "\\t", prefix_cols = prefix_cols)`.
#'
#' @inheritParams load_csv
#' @return A [`VennDataset-class`].
#' @export
#' @examples
#' tmp <- tempfile(fileext = ".tsv")
#' writeLines(c("Gene\tSetA\tSetB", "G1\t1\t0", "G2\t1\t1", "G3\t0\t1"), tmp)
#' ds <- load_tsv(tmp, binary = TRUE)
#' ds@universe_size
load_tsv <- function(path, binary = TRUE, prefix_cols = 1L) {
    load_csv(path, binary = binary, delimiter = "\t", prefix_cols = prefix_cols)
}

#' Load a GMT (Gene Matrix Transposed) file into a [`VennDataset-class`]
#'
#' Each line is one set: `set_name<TAB>description<TAB>item1<TAB>item2<TAB>...`.
#' Lines with fewer than 3 tab-separated columns or empty set names are skipped.
#'
#' @param path Path to the .gmt file.
#' @return A [`VennDataset-class`].
#' @export
#' @examples
#' tmp <- tempfile(fileext = ".gmt")
#' writeLines(c("SetA\tdesc\tGENE1\tGENE2\tGENE3",
#'              "SetB\tdesc\tGENE2\tGENE3\tGENE4"), tmp)
#' ds <- load_gmt(tmp)
#' ds@set_names
load_gmt <- function(path) {
    txt_src <- .read_text(path)
    text <- gsub("\r\n", "\n", txt_src$text, fixed = TRUE)
    text <- gsub("\r", "\n", text, fixed = TRUE)
    raw_lines <- strsplit(trimws(text), "\n", fixed = TRUE)[[1L]]
    lines <- raw_lines[nzchar(trimws(raw_lines))]
    if (length(lines) == 0L) .stop_invalid_dataset("GMT file is empty")

    set_names <- character()
    items <- list()
    seen <- character()
    for (line in lines) {
        parts <- strsplit(line, "\t", fixed = TRUE)[[1L]]
        if (length(parts) < 3L) next
        name <- trimws(parts[1L])
        if (!nzchar(name)) next
        members <- trimws(parts[3L:length(parts)])
        members <- members[nzchar(members)]
        if (length(members) == 0L) next
        set_names <- c(set_names, name)
        items[[name]] <- unique(members)
        for (m in members) {
            if (!m %in% seen) seen <- c(seen, m)
        }
    }

    if (length(set_names) == 0L)
        .stop_invalid_dataset("GMT file has no valid gene sets")
    if (length(set_names) < .MIN_SETS)
        .stop_invalid_dataset(
            sprintf("GMT file must contain at least %d sets, got %d",
                    .MIN_SETS, length(set_names))
        )
    if (length(set_names) > .MAX_SETS)
        .stop_invalid_dataset(
            sprintf("GMT file has %d sets; max supported is %d. Filter the file before loading.",
                    length(set_names), .MAX_SETS)
        )

    methods::new("VennDataset",
        set_names     = set_names,
        items         = items,
        item_order    = seen,
        universe_size = NULL,
        source_path   = txt_src$source,
        format        = "gmt"
    )
}

#' Load a GMX file (transposed GMT) into a [`VennDataset-class`]
#'
#' Row 0 = set names, row 1 = descriptions, rows 2+ = items column-aligned.
#'
#' @param path Path to the .gmx file.
#' @return A [`VennDataset-class`].
#' @export
#' @examples
#' tmp <- tempfile(fileext = ".gmx")
#' writeLines(c("SetA\tSetB",
#'              "desc_A\tdesc_B",
#'              "GENE1\tGENE2",
#'              "GENE2\tGENE3"), tmp)
#' ds <- load_gmx(tmp)
#' length(ds@items)
load_gmx <- function(path) {
    txt_src <- .read_text(path)
    text <- gsub("\r\n", "\n", txt_src$text, fixed = TRUE)
    text <- gsub("\r", "\n", text, fixed = TRUE)
    raw_lines <- strsplit(trimws(text), "\n", fixed = TRUE)[[1L]]
    lines <- raw_lines[nzchar(trimws(raw_lines))]
    if (length(lines) < 3L)
        .stop_invalid_dataset("GMX file must have at least 3 rows (names, descriptions, genes)")

    header_parts <- strsplit(lines[1L], "\t", fixed = TRUE)[[1L]]
    set_names <- trimws(header_parts)
    set_names <- set_names[nzchar(set_names)]
    if (length(set_names) < .MIN_SETS)
        .stop_invalid_dataset(
            sprintf("GMX file must have at least %d columns", .MIN_SETS)
        )
    if (length(set_names) > .MAX_SETS)
        .stop_invalid_dataset(
            sprintf("GMX file has %d sets; max supported is %d.",
                    length(set_names), .MAX_SETS)
        )

    items <- setNames(replicate(length(set_names), character(0), simplify = FALSE), set_names)
    seen <- character()
    for (line in lines[3L:length(lines)]) {
        parts <- trimws(strsplit(line, "\t", fixed = TRUE)[[1L]])
        for (col_idx in seq_along(set_names)) {
            cell <- if (col_idx <= length(parts)) parts[col_idx] else ""
            if (nzchar(cell)) {
                items[[set_names[col_idx]]] <- c(items[[set_names[col_idx]]], cell)
                if (!cell %in% seen) seen <- c(seen, cell)
            }
        }
    }
    items <- lapply(items, unique)

    methods::new("VennDataset",
        set_names     = set_names,
        items         = items,
        item_order    = seen,
        universe_size = NULL,
        source_path   = txt_src$source,
        format        = "gmx"
    )
}
