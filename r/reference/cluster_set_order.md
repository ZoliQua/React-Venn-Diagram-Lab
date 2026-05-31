# Hierarchical clustering on a symmetric distance matrix.

Wraps [`stats::hclust`](https://rdrr.io/r/stats/hclust.html) to produce
a normalized output that mirrors the webtool's pure-JS `clusterSetOrder`
and Python `cluster_set_order`.

## Usage

``` r
cluster_set_order(D, linkage = c("average", "complete", "single"))
```

## Arguments

- D:

  Symmetric numeric distance matrix (NxN, zero diagonal).

- linkage:

  One of "average" (UPGMA), "complete", "single".

## Value

A list with:

- `leaf_order`: 1-based integer vector — left-to-right ordering of
  original indices. At each internal node the subtree whose minimum
  original leaf index is smaller is placed on the left (deterministic;
  mirrors the webtool / Python convention).

- `merges`: data.frame with columns `left`, `right` (0-based cluster ids
  matching the webtool/Python convention; leaves are 0..N-1, internal
  nodes are N..2N-2), `height` (linkage distance), `size` (number of
  leaves in the merged cluster).

## Examples

``` r
D <- matrix(c(0, 0.2, 0.9, 0.2, 0, 0.85, 0.9, 0.85, 0), nrow = 3)
cluster_set_order(D, linkage = "average")
#> $leaf_order
#> [1] 1 2 3
#> 
#> $merges
#>   left right height size
#> 1    0     1  0.200    2
#> 2    2     3  0.875    3
#> 
```
