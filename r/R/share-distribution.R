#' Item Share Distribution
#'
#' Per-membership-count item totals.
#'
#' Given a binary item \eqn{\times} set matrix (rows = items,
#' columns = sets, cells in \eqn{\{0, 1\}}), returns a named integer
#' vector keyed by k = 1..n_sets giving the number of items belonging
#' to exactly k sets. All bins are present even when their count is
#' zero. Rows that sum to zero are skipped (universe-rule violation;
#' defensive).
#'
#' @param matrix Binary item \eqn{\times} set matrix.
#' @return Named integer vector with names "1", "2", ..., "n_sets".
#' @examples
#' m <- matrix(c(
#'   1, 0, 0,
#'   1, 1, 0,
#'   1, 1, 1
#' ), ncol = 3, byrow = TRUE)
#' item_share_distribution(m)
#' @export
item_share_distribution <- function(matrix) {
    if (length(matrix) == 0 || nrow(matrix) == 0L) {
        n_sets <- if (is.null(ncol(matrix))) 0L else ncol(matrix)
        out <- integer(n_sets)
        names(out) <- as.character(seq_len(n_sets))
        return(out)
    }
    n_sets <- ncol(matrix)
    row_sums <- as.integer(rowSums(matrix > 0L))
    out <- integer(n_sets)
    for (k in row_sums) {
        if (k >= 1L && k <= n_sets) out[k] <- out[k] + 1L
    }
    names(out) <- as.character(seq_len(n_sets))
    out
}
