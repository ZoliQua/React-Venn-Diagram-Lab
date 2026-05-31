# Render the Item Share Distribution histogram

Vertical bar chart with N bars (k = 1..N), tier-gradient fill from
`#ffe4b5` (k=1) to `#7e14ff` (k=N). Mirrors the webtool's
`buildShareDistributionSvg` layout (480x280 viewBox, Tahoma typography,
`sd-bar` CSS class on every rect) so downstream CSS, PDF embed, and
cross-package parity assertions can key on the same structure.

## Usage

``` r
render_share_distribution(dataset, style = NULL)
```

## Arguments

- dataset:

  A \[\`VennDataset-class\`\].

- style:

  Optional named list of style overrides (reserved for v2.3+; currently
  ignored).

## Value

An \[\`SvgImage-class\`\] with \`content\`, \`width = 480\`, \`height =
280\`.

## Details

Pure string construction – no xml2 – so the output is byte-stable.

## Examples

``` r
# \donttest{
ds <- load_sample("dataset_real_cancer_drivers_4")
img <- render_share_distribution(ds)
nchar(slot(img, "content")) > 0
#> [1] TRUE
# }
```
