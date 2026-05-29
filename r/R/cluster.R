#' Hierarchical clustering on a symmetric distance matrix.
#'
#' Wraps \code{stats::hclust} to produce a normalized output that mirrors
#' the webtool's pure-JS \code{clusterSetOrder} and Python
#' \code{cluster_set_order}.
#'
#' @param D Symmetric numeric distance matrix (NxN, zero diagonal).
#' @param linkage One of "average" (UPGMA), "complete", "single".
#' @return A list with:
#'   \itemize{
#'     \item \code{leaf_order}: 1-based integer vector — left-to-right
#'           ordering of original indices. At each internal node the
#'           subtree whose minimum original leaf index is smaller is
#'           placed on the left (deterministic; mirrors the webtool /
#'           Python convention).
#'     \item \code{merges}: data.frame with columns \code{left},
#'           \code{right} (0-based cluster ids matching the webtool/Python
#'           convention; leaves are 0..N-1, internal nodes are N..2N-2),
#'           \code{height} (linkage distance), \code{size} (number of
#'           leaves in the merged cluster).
#'   }
#' @examples
#' D <- matrix(c(0, 0.2, 0.9, 0.2, 0, 0.85, 0.9, 0.85, 0), nrow = 3)
#' cluster_set_order(D, linkage = "average")
#' @importFrom stats as.dist hclust
#' @export
cluster_set_order <- function(D, linkage = c("average", "complete", "single")) {
    linkage <- match.arg(linkage)
    n <- nrow(D)
    if (is.null(n) || n == 0L) {
        return(list(leaf_order = integer(0),
                    merges = data.frame(left = integer(0), right = integer(0),
                                        height = numeric(0), size = integer(0))))
    }
    if (n == 1L) {
        return(list(leaf_order = 1L,
                    merges = data.frame(left = integer(0), right = integer(0),
                                        height = numeric(0), size = integer(0))))
    }
    d <- stats::as.dist(D)
    hc <- stats::hclust(d, method = linkage)
    # hc$merge: negative ids = leaves (1-based), positive ids = internal nodes (1-based row index).
    # Convert to 0-based ids matching the webtool/Python convention:
    # - Leaf -k (1-based negative) -> 0-based id (k - 1)
    # - Internal node k (1-based positive row index) -> 0-based id (n + k - 1)
    raw <- hc$merge
    left <- ifelse(raw[, 1] < 0, -raw[, 1] - 1L, raw[, 1] + n - 1L)
    right <- ifelse(raw[, 2] < 0, -raw[, 2] - 1L, raw[, 2] + n - 1L)
    # Sizes: leaves are 1, internals are computed cumulatively.
    cluster_size <- c(rep(1L, n), integer(n - 1L))
    size_per_merge <- integer(n - 1L)
    for (i in seq_len(n - 1L)) {
        l <- left[i] + 1L
        r <- right[i] + 1L
        s <- cluster_size[l] + cluster_size[r]
        cluster_size[n + i] <- s
        size_per_merge[i] <- s
    }
    merges <- data.frame(
        left = as.integer(left),
        right = as.integer(right),
        height = as.numeric(hc$height),
        size = size_per_merge
    )
    leaf_order <- .ordered_leaves(merges$left, merges$right, n)
    list(leaf_order = leaf_order, merges = merges)
}

#' @noRd
.ordered_leaves <- function(left_ids, right_ids, n) {
    # Deterministic left-to-right leaf ordering: at every internal node
    # the subtree whose minimum original leaf index is smaller is placed
    # on the left. Mirrors python/src/venn_diagram_lab/cluster.py
    # _ordered_leaves so Web / Python / R agree.
    leaves_by_node <- vector("list", 2L * n - 1L)
    for (i in seq_len(n)) leaves_by_node[[i]] <- (i - 1L)  # 0-based ids
    n_merges <- length(left_ids)
    for (i in seq_len(n_merges)) {
        l <- left_ids[i] + 1L
        r <- right_ids[i] + 1L
        l_leaves <- leaves_by_node[[l]]
        r_leaves <- leaves_by_node[[r]]
        if (l_leaves[1L] <= r_leaves[1L]) {
            combined <- c(l_leaves, r_leaves)
        } else {
            combined <- c(r_leaves, l_leaves)
        }
        leaves_by_node[[n + i]] <- combined
    }
    root_id <- n + n_merges
    # Convert 0-based ids back to 1-based for R convention.
    as.integer(leaves_by_node[[root_id]]) + 1L
}
