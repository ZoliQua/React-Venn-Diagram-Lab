# Area-proportional 2-3 set Venn diagrams (analytical / triangulation circle solver
# + synthetic SVG generator). Mirrors python/src/venn_diagram_lab/proportional.py.
#
# The solver returns a normalized-coordinate ProportionalLayout (named list); the
# generator transforms to pixel coordinates and emits a 600x600 SVG that matches
# the 44-model schema (Shape*, Name*, Count_*, CountSUM_*, Bullet* groups).

#' @noRd
.BISECTION_MAX_ITER <- 200L
#' @noRd
.BISECTION_EPS <- 1e-9

#' Lens-shaped intersection area of two circles
#'
#' Mirrors `src/utils/proportionalLayout.ts circleIntersectionArea` (web tool)
#' and Python `circle_intersection_area` byte-for-byte.
#'
#' @param r1 Radius of circle 1 (positive numeric).
#' @param r2 Radius of circle 2 (positive numeric).
#' @param d Distance between centers (non-negative numeric).
#' @return Numeric: 0 if circles are disjoint, pi * min(r1,r2)^2 if fully nested,
#'   else the lens-shaped intersection area.
#' @export
#' @examples
#' circle_intersection_area(1, 1, 1)   # ~ 1.228
#' circle_intersection_area(1, 1, 3)   # 0 (disjoint)
circle_intersection_area <- function(r1, r2, d) {
    if (d >= r1 + r2) return(0)
    if (d + min(r1, r2) <= max(r1, r2)) return(pi * min(r1, r2) ^ 2)
    a1 <- r1 ^ 2 * acos((d ^ 2 + r1 ^ 2 - r2 ^ 2) / (2 * d * r1))
    a2 <- r2 ^ 2 * acos((d ^ 2 + r2 ^ 2 - r1 ^ 2) / (2 * d * r2))
    triangle <- 0.5 * sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2))
    a1 + a2 - triangle
}

#' @noRd
.distance_for_overlap <- function(r1, r2, target_overlap) {
    if (target_overlap <= 0) return(r1 + r2)
    max_overlap <- pi * min(r1, r2) ^ 2
    if (target_overlap >= max_overlap) return(abs(r1 - r2))
    lo <- 0; hi <- r1 + r2
    for (i in seq_len(.BISECTION_MAX_ITER)) {
        mid <- (lo + hi) / 2
        area <- circle_intersection_area(r1, r2, mid)
        if (area > target_overlap) lo <- mid else hi <- mid
        if (hi - lo < .BISECTION_EPS) break
    }
    (lo + hi) / 2
}

#' Area-proportional 2-set circle layout
#'
#' Solves for two circles whose areas equal `a_only + ab` and `b_only + ab` and
#' whose intersection area equals `ab`, by analytical bisection on the
#' inter-center distance. Always exact (returns `is_approximate = FALSE`).
#'
#' Mirrors Python `solve_2set` byte-for-byte.
#'
#' @param a_only Items in A only (integer >= 0).
#' @param b_only Items in B only (integer >= 0).
#' @param ab Items in A intersection B (integer >= 0).
#' @return A named list with elements:
#'   \describe{
#'     \item{circles}{Length-2 list of `list(cx, cy, r)` named lists.}
#'     \item{error}{Relative error of the achieved area fit (typically < 1e-4).}
#'     \item{is_approximate}{Always `FALSE` for 2-set.}
#'   }
#' @export
#' @examples
#' solve_2set(a_only = 30L, b_only = 30L, ab = 10L)
solve_2set <- function(a_only, b_only, ab) {
    size_a <- a_only + ab
    size_b <- b_only + ab

    if (size_a <= 0 || size_b <= 0) {
        return(list(
            circles = list(
                list(cx = -1, cy = 0, r = 1),
                list(cx =  1, cy = 0, r = 1)
            ),
            error = 0,
            is_approximate = FALSE
        ))
    }

    r_a <- sqrt(size_a / pi)
    r_b <- sqrt(size_b / pi)
    target_overlap <- as.numeric(ab)

    if (target_overlap <= 0) {
        d <- r_a + r_b
    } else {
        max_overlap <- pi * min(r_a, r_b) ^ 2
        if (target_overlap >= max_overlap) {
            d <- abs(r_a - r_b)
        } else {
            lo <- 0; hi <- r_a + r_b
            for (i in seq_len(.BISECTION_MAX_ITER)) {
                mid <- (lo + hi) / 2
                area <- circle_intersection_area(r_a, r_b, mid)
                if (area > target_overlap) lo <- mid else hi <- mid
                if (hi - lo < .BISECTION_EPS) break
            }
            d <- (lo + hi) / 2
        }
    }

    achieved <- circle_intersection_area(r_a, r_b, d)
    error <- abs(achieved - target_overlap) / max(target_overlap, 1)

    list(
        circles = list(
            list(cx = -d / 2, cy = 0, r = r_a),
            list(cx =  d / 2, cy = 0, r = r_b)
        ),
        error = error,
        is_approximate = FALSE
    )
}

#' Area-proportional 3-set circle layout (Wilkinson 2012-style triangulation)
#'
#' Computes pairwise inter-center distances via bisection on the lens
#' intersection area, then places circle C via barycentric triangulation
#' against AB. Always sets `is_approximate = TRUE` because perfect 3-circle
#' area-proportional fits don't always exist mathematically.
#'
#' Mirrors Python `solve_3set` byte-for-byte (including the `error = NaN`
#' deliberate sentinel - 3-set fit error is not measured in v0.1).
#'
#' @param regions Named list keyed by `as.character(bitmask)` (1..7) -> exclusive count.
#'   Missing keys are treated as 0.
#' @return A named list with elements `circles` (length 3), `error` (always NaN
#'   in v0.1), `is_approximate` (always TRUE).
#' @export
#' @examples
#' solve_3set(list("1" = 100L, "2" = 80L, "3" = 30L,
#'                  "4" = 60L,  "5" = 20L, "6" = 15L, "7" = 5L))
solve_3set <- function(regions) {
    region_count <- function(mask) {
        v <- regions[[as.character(mask)]]
        if (is.null(v)) 0L else as.integer(v)
    }
    # Inclusive sizes via bitmask sum.
    size_a <- sum(vapply(1L:7L, function(m) if (bitwAnd(m, 1L) != 0L) region_count(m) else 0L, integer(1L)))
    size_b <- sum(vapply(1L:7L, function(m) if (bitwAnd(m, 2L) != 0L) region_count(m) else 0L, integer(1L)))
    size_c <- sum(vapply(1L:7L, function(m) if (bitwAnd(m, 4L) != 0L) region_count(m) else 0L, integer(1L)))

    if (size_a <= 0 || size_b <= 0 || size_c <= 0) {
        return(list(
            circles = list(
                list(cx = -2, cy = 0, r = 1),
                list(cx =  0, cy = 0, r = 1),
                list(cx =  2, cy = 0, r = 1)
            ),
            error = 0,
            is_approximate = TRUE
        ))
    }

    r_a <- sqrt(size_a / pi)
    r_b <- sqrt(size_b / pi)
    r_c <- sqrt(size_c / pi)

    inter_ab <- region_count(3L) + region_count(7L)
    inter_ac <- region_count(5L) + region_count(7L)
    inter_bc <- region_count(6L) + region_count(7L)

    d_ab <- .distance_for_overlap(r_a, r_b, as.numeric(inter_ab))
    d_ac <- .distance_for_overlap(r_a, r_c, as.numeric(inter_ac))
    d_bc <- .distance_for_overlap(r_b, r_c, as.numeric(inter_bc))

    cax <- 0; cay <- 0
    cbx <- d_ab; cby <- 0
    if (d_ab > 0) {
        cx_val <- (d_ab ^ 2 + d_ac ^ 2 - d_bc ^ 2) / (2 * d_ab)
        cy_squared <- d_ac ^ 2 - cx_val ^ 2
        cy_val <- sqrt(max(cy_squared, 0))
    } else {
        cx_val <- 0; cy_val <- d_ac
    }

    list(
        circles = list(
            list(cx = cax,    cy = cay, r = r_a),
            list(cx = cbx,    cy = cby, r = r_b),
            list(cx = cx_val, cy = cy_val, r = r_c)
        ),
        error = NaN,
        is_approximate = TRUE
    )
}

# Standard color mapping (matches the 44 templated models). Mirrors
# python/src/venn_diagram_lab/proportional.py _DEFAULT_COLORS.
.DEFAULT_COLORS <- c(
    A = "#FFF200", B = "#2E3192", C = "#ED1C24",
    D = "#808285", E = "#3C2415", F = "#9E1F63",
    G = "#CA4B9B", H = "#21AED1", I = "#F7941E"
)

.PROP_DEFAULT_WIDTH    <- 600L
.PROP_DEFAULT_HEIGHT   <- 600L
.PROP_MARGIN           <- 30L
.PROP_SHAPE_OPACITY    <- 0.4
.PROP_BULLET_OPACITY   <- 0.6
.PROP_SHAPE_STROKE     <- 1.5
.PROP_FONT_FAMILY      <- "Tahoma"
.PROP_FONT_SIZE_TITLE  <- 14L
.PROP_FONT_SIZE_NAME   <- 18L
.PROP_FONT_SIZE_COUNT  <- 24L
.PROP_FONT_SIZE_SUM    <- 14L
.PROP_FONT_SIZE_APPROX <- 9L
.PROP_BULLET_CX        <- 20L
.PROP_BULLET_R         <- 6L
.PROP_BULLET_ROW_STEP  <- 20L
.PROP_BULLET_START_CY  <- 50L
.PROP_NAME_LABEL_OFFSET <- 8L
.PROP_SUM_LABEL_OFFSET  <- 18L
.PROP_TITLE_X          <- 20L
.PROP_TITLE_Y          <- 25L
.PROP_APPROX_MARGIN    <- 10L

.MASK_A_ONLY <- 1L
.MASK_B_ONLY <- 2L
.MASK_AB     <- 3L
.PROP_MIN_SETS <- 2L
.PROP_MAX_SETS <- 3L

#' @noRd
# region count by bitmask, defaulting to 0 if absent
.region_count_from_result <- function(result, mask) {
    region <- result@regions[[as.character(mask)]]
    if (is.null(region)) 0L else length(region@exclusive_items)
}

#' @noRd
.compute_layout <- function(result, n) {
    if (n == .PROP_MIN_SETS) {
        return(solve_2set(
            a_only = .region_count_from_result(result, .MASK_A_ONLY),
            b_only = .region_count_from_result(result, .MASK_B_ONLY),
            ab     = .region_count_from_result(result, .MASK_AB)
        ))
    }
    # 3-set: build regions list keyed by character bitmask
    regions_map <- list()
    for (mask in 1L:7L) {
        regions_map[[as.character(mask)]] <- .region_count_from_result(result, mask)
    }
    solve_3set(regions_map)
}

#' @noRd
.compute_transform <- function(circles, width, height) {
    bbox_min_x <- min(vapply(circles, function(c) c$cx - c$r, numeric(1L)))
    bbox_max_x <- max(vapply(circles, function(c) c$cx + c$r, numeric(1L)))
    bbox_min_y <- min(vapply(circles, function(c) c$cy - c$r, numeric(1L)))
    bbox_max_y <- max(vapply(circles, function(c) c$cy + c$r, numeric(1L)))
    span_x <- max(bbox_max_x - bbox_min_x, 1)
    span_y <- max(bbox_max_y - bbox_min_y, 1)
    usable_w <- width  - 2 * .PROP_MARGIN
    usable_h <- height - 2 * .PROP_MARGIN
    scale <- min(usable_w / span_x, usable_h / span_y)
    offset_x <- .PROP_MARGIN - bbox_min_x * scale + (usable_w - span_x * scale) / 2
    offset_y <- .PROP_MARGIN - bbox_min_y * scale + (usable_h - span_y * scale) / 2
    list(scale = scale, offset_x = offset_x, offset_y = offset_y)
}

#' @noRd
.build_shapes_group <- function(n, circles, scale, offset_x, offset_y) {
    parts <- '<g id="Shapes">'
    letters_chars <- strsplit(.LETTERS_VDL, "", fixed = TRUE)[[1L]]
    for (i in seq_len(n)) {
        c <- circles[[i]]
        cx <- c$cx * scale + offset_x
        cy <- c$cy * scale + offset_y
        r  <- c$r  * scale
        letter <- letters_chars[i]
        color  <- .DEFAULT_COLORS[[letter]]
        style  <- sprintf(
            "opacity:%s;fill:%s;stroke:#000000;stroke-width:%s;",
            .PROP_SHAPE_OPACITY, color, .PROP_SHAPE_STROKE
        )
        parts <- c(parts, sprintf(
            '<circle id="Shape%s" cx="%.2f" cy="%.2f" r="%.2f" style="%s"/>',
            letter, cx, cy, r, style
        ))
    }
    c(parts, "</g>")
}

#' @noRd
.build_texts_group <- function(n, result, circles, scale, offset_x, offset_y) {
    parts <- '<g id="Texts">'
    letters_chars <- strsplit(.LETTERS_VDL, "", fixed = TRUE)[[1L]]
    title_style <- sprintf("font-family:%s;font-size:%d;",
                           .PROP_FONT_FAMILY, .PROP_FONT_SIZE_TITLE)
    parts <- c(parts, sprintf(
        '<g id="Header"><text id="Title" x="%d" y="%d" style="%s">Proportional Venn diagram</text></g>',
        .PROP_TITLE_X, .PROP_TITLE_Y, title_style
    ))

    # Set names above each circle
    parts <- c(parts, '<g id="Group_Names">')
    name_style <- sprintf("font-family:%s;font-size:%d;text-anchor:middle;",
                          .PROP_FONT_FAMILY, .PROP_FONT_SIZE_NAME)
    for (i in seq_len(n)) {
        c <- circles[[i]]
        cx <- c$cx * scale + offset_x
        cy <- c$cy * scale + offset_y
        r  <- c$r  * scale
        letter <- letters_chars[i]
        name <- result@dataset@set_names[[i]]
        parts <- c(parts, sprintf(
            '<text id="Name%s" x="%.2f" y="%.2f" style="%s">%s</text>',
            letter, cx, cy - r - .PROP_NAME_LABEL_OFFSET, name_style, name
        ))
    }
    parts <- c(parts, "</g>")

    # Region exclusive counts (mask 1..2^n - 1, ordered by size then alphabetical)
    parts <- c(parts, '<g id="Group_Values">')
    count_style <- sprintf("font-family:%s;font-size:%d;text-anchor:middle;",
                           .PROP_FONT_FAMILY, .PROP_FONT_SIZE_COUNT)
    for (size in seq_len(n)) {
        combos <- utils::combn(letters_chars[seq_len(n)], size, simplify = FALSE)
        for (combo in combos) {
            label <- paste(combo, collapse = "")
            mask  <- sum(vapply(combo, function(ch) bitwShiftL(1L, which(letters_chars == ch) - 1L), integer(1L)))
            count <- .region_count_from_result(result, mask)
            avg_x <- mean(vapply(combo, function(ch) circles[[which(letters_chars == ch)]]$cx, numeric(1L)))
            avg_y <- mean(vapply(combo, function(ch) circles[[which(letters_chars == ch)]]$cy, numeric(1L)))
            sx <- avg_x * scale + offset_x
            sy <- avg_y * scale + offset_y
            parts <- c(parts, sprintf(
                '<text id="Count_%s" x="%.2f" y="%.2f" style="%s">%d</text>',
                label, sx, sy, count_style, count
            ))
        }
    }
    parts <- c(parts, "</g>")

    # Set size totals below each circle
    parts <- c(parts, '<g id="Group_CountSums">')
    sum_style <- sprintf("font-family:%s;font-size:%d;text-anchor:middle;",
                         .PROP_FONT_FAMILY, .PROP_FONT_SIZE_SUM)
    for (i in seq_len(n)) {
        c <- circles[[i]]
        cx <- c$cx * scale + offset_x
        cy <- c$cy * scale + offset_y
        r  <- c$r  * scale
        letter <- letters_chars[i]
        size_val <- result@set_sizes[[result@dataset@set_names[[i]]]]
        parts <- c(parts, sprintf(
            '<text id="CountSUM_%s" x="%.2f" y="%.2f" style="%s">%d</text>',
            letter, cx, cy + r + .PROP_SUM_LABEL_OFFSET, sum_style, size_val
        ))
    }
    parts <- c(parts, "</g>")

    c(parts, "</g>")  # /Texts
}

#' @noRd
.build_bullets_group <- function(n) {
    parts <- '<g id="Group_Bullets">'
    letters_chars <- strsplit(.LETTERS_VDL, "", fixed = TRUE)[[1L]]
    for (i in seq_len(n)) {
        letter <- letters_chars[i]
        color  <- .DEFAULT_COLORS[[letter]]
        bullet_cy <- .PROP_BULLET_START_CY + .PROP_BULLET_ROW_STEP * (i - 1L)
        style <- sprintf(
            "opacity:%s;fill:%s;stroke:#000000;stroke-width:%s;",
            .PROP_BULLET_OPACITY, color, .PROP_SHAPE_STROKE
        )
        parts <- c(parts, sprintf(
            '<circle id="Bullet%s" cx="%d" cy="%d" r="%d" style="%s"/>',
            letter, .PROP_BULLET_CX, bullet_cy, .PROP_BULLET_R, style
        ))
    }
    c(parts, "</g>")
}

#' Generate an area-proportional SVG for a 2- or 3-set RegionResult
#'
#' Circle sizes and inter-circle distances are solved analytically (2-set,
#' exact) or by triangulation (3-set, approximate) so that overlap areas
#' match the requested intersection counts. The returned SVG matches the
#' 44-model schema: ShapeA-I, NameA-I, Count_*, CountSUM_*, Bullet*
#' elements are all present and addressable via xml2.
#'
#' @param result A [`RegionResult-class`].
#' @param width Canvas width in pixels (default 600).
#' @param height Canvas height in pixels (default 600).
#' @return A `character` (length 1) with the raw SVG.
#' @export
#' @examples
#' tmp <- tempfile(fileext = ".tsv")
#' writeLines(c("Gene\tSetA\tSetB",
#'              "GENE1\t1\t0",
#'              "GENE2\t1\t1",
#'              "GENE3\t0\t1"), tmp)
#' ds  <- load_tsv(tmp, binary = TRUE)
#' res <- analyze(ds, model = "proportional")
#' svg <- generate_proportional_svg(res)
#' nchar(svg) > 0
generate_proportional_svg <- function(result, width = .PROP_DEFAULT_WIDTH,
                                       height = .PROP_DEFAULT_HEIGHT) {
    n <- length(result@dataset@set_names)
    if (n < .PROP_MIN_SETS || n > .PROP_MAX_SETS) {
        .stop_incompatible_model(sprintf(
            "Proportional rendering supports only 2-3 sets, got %d", n
        ))
    }

    layout <- .compute_layout(result, n)
    transform <- .compute_transform(layout$circles, width, height)

    parts <- c(
        '<?xml version="1.0" encoding="utf-8"?>',
        "<!-- Generated by venn-diagram-lab proportional renderer -->",
        sprintf('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">',
                width, height, width, height)
    )
    parts <- c(parts, .build_shapes_group(n, layout$circles,
                                            transform$scale, transform$offset_x, transform$offset_y))
    parts <- c(parts, .build_texts_group(n, result, layout$circles,
                                          transform$scale, transform$offset_x, transform$offset_y))
    parts <- c(parts, .build_bullets_group(n))

    if (isTRUE(layout$is_approximate)) {
        approx_style <- sprintf(
            "font-family:%s;font-size:%d;fill:#888;text-anchor:end;",
            .PROP_FONT_FAMILY, .PROP_FONT_SIZE_APPROX
        )
        parts <- c(parts, sprintf(
            '<text x="%d" y="%d" style="%s">approximate</text>',
            width - .PROP_APPROX_MARGIN, height - .PROP_APPROX_MARGIN, approx_style
        ))
    }

    parts <- c(parts, "</svg>")
    paste(parts, collapse = "\n")
}
