# Item Share Distribution

Per-membership-count item totals.

## Usage

``` r
item_share_distribution(matrix)
```

## Arguments

- matrix:

  Binary item \\\times\\ set matrix.

## Value

Named integer vector with names "1", "2", ..., "n_sets".

## Details

Given a binary item \\\times\\ set matrix (rows = items, columns = sets,
cells in \\\\0, 1\\\\), returns a named integer vector keyed by k =
1..n_sets giving the number of items belonging to exactly k sets. All
bins are present even when their count is zero. Rows that sum to zero
are skipped (universe-rule violation; defensive).

## Examples

``` r
m <- matrix(c(
  1, 0, 0,
  1, 1, 0,
  1, 1, 1
), ncol = 3, byrow = TRUE)
item_share_distribution(m)
#> 1 2 3 
#> 1 1 1 
```
