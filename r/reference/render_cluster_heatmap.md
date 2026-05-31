# Render a cluster-ordered Jaccard similarity heatmap

Mirrors the webtool's cluster-aware `buildEnrichmentHeatmapSvg` path.
Distance `D = 1 - Jaccard` is fed to \[cluster_set_order()\]; the
resulting `leaf_order` permutes both axes, and merge heights drive the
L-shaped overlays emitted under `<g class="hm-dendro-col">` (top band)
and `<g class="hm-dendro-row">` (left band).

## Usage

``` r
render_cluster_heatmap(
  result,
  linkage = c("average", "complete", "single"),
  show_row_dendrogram = TRUE,
  show_col_dendrogram = TRUE,
  dendrogram_fraction = 0.12,
  style = NULL
)
```

## Arguments

- result:

  A \[\`RegionResult-class\`\] from \[analyze()\].

- linkage:

  Linkage method passed to \[cluster_set_order()\]: one of `"average"`
  (UPGMA, default), `"complete"`, `"single"`.

- show_row_dendrogram:

  Logical, default `TRUE`. When `FALSE`, the row band is omitted from
  layout entirely (no reserved gap).

- show_col_dendrogram:

  Logical, default `TRUE`. Same semantics for the column band.

- dendrogram_fraction:

  Fraction of the grid extent reserved per dendrogram band (default
  `0.12`, minimum effective height 20 pixels). Matches the webtool's
  `dendrogramFraction` option.

- style:

  Optional named list of style overrides (reserved for v2.3+; currently
  ignored).

## Value

An \[\`SvgImage-class\`\] with \`content\`, \`width\`, \`height\` set
from the computed layout extents.

## Details

Pure string construction – no xml2.

## Examples

``` r
# \donttest{
ds <- load_sample("dataset_real_cancer_drivers_4")
res <- analyze(ds)
img <- render_cluster_heatmap(res, linkage = "average")
nchar(slot(img, "content")) > 0
#> [1] TRUE
# }
```
