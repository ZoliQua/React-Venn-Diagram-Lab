"""Multi-page PDF report (matplotlib PdfPages composition)."""

from __future__ import annotations

import io
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING

import matplotlib.image as mpimg
import matplotlib.pyplot as plt
from matplotlib.figure import Figure

from venn_diagram_lab.version import __version__

if TYPE_CHECKING:
    from venn_diagram_lab.analysis import RegionResult

# US Letter landscape, in inches.
_PAGE_WIDTH = 11.0
_PAGE_HEIGHT = 8.5

# Standard 9-set color palette (matches the 44 model SVGs and proportional renderer).
_DEFAULT_COLORS = (
    "#FFF200", "#2E3192", "#ED1C24", "#808285", "#3C2415",
    "#9E1F63", "#CA4B9B", "#21AED1", "#F7941E",
)

# PNG render resolution.
_DPI = 300
_MAX_UPSET_COLUMNS = 20

# Layout fractions for the 2-panel page (left venn, right upset).
_VENN_LEFT = 0.02
_VENN_BOTTOM = 0.05
_VENN_WIDTH = 0.48
_VENN_HEIGHT = 0.9
_UPSET_LEFT = 0.52
_UPSET_BOTTOM = 0.05
_UPSET_WIDTH = 0.46
_UPSET_HEIGHT = 0.9


def _build_overview_page(result: RegionResult, *, title: str | None = None) -> Figure:
    """Page 1: dataset metadata + Set Sizes pie chart + per-set table."""
    fig = plt.figure(figsize=(_PAGE_WIDTH, _PAGE_HEIGHT))
    fig.suptitle(title or "Venn Diagram Lab Report", fontsize=16, fontweight="bold")

    n = len(result.dataset.set_names)
    sizes = [result.set_sizes[name] for name in result.dataset.set_names]
    colors = list(_DEFAULT_COLORS[:n])

    # Pie chart on left.
    ax_pie = fig.add_axes((0.05, 0.15, 0.45, 0.7))
    ax_pie.pie(
        sizes,
        labels=list(result.dataset.set_names),
        colors=colors,
        autopct="%1.0f%%",
        startangle=90,
    )
    ax_pie.set_title("Set sizes")

    # Metadata on top right.
    ax_meta = fig.add_axes((0.55, 0.55, 0.4, 0.3))
    ax_meta.set_axis_off()
    universe = sum(r.exclusive_count for r in result.regions.values())
    n_regions = len(result.regions)
    metadata_lines = [
        f"Model: {result.model}",
        f"Sets: {n}",
        f"Items in universe: {universe}",
        f"Non-empty regions: {n_regions}",
        f"Approximate fit: {result.is_approximate}",
    ]
    ax_meta.text(0.0, 1.0, "Overview", fontsize=14, fontweight="bold", va="top")
    for i, line in enumerate(metadata_lines, start=1):
        ax_meta.text(0.0, 1.0 - i * 0.18, line, fontsize=11, va="top")

    # Table of set sizes on bottom right.
    ax_table = fig.add_axes((0.55, 0.15, 0.4, 0.35))
    ax_table.set_axis_off()
    table_data = [["Set", "Items"]] + [
        [name, str(result.set_sizes[name])]
        for name in result.dataset.set_names
    ]
    table = ax_table.table(cellText=table_data, loc="center", cellLoc="left")
    table.auto_set_font_size(False)
    table.set_fontsize(10)
    for col_idx in range(len(table_data[0])):
        cell = table[0, col_idx]
        cell.set_text_props(fontweight="bold")
        cell.set_facecolor("#dddddd")

    return fig


def _figure_to_png_bytes(fig: Figure, *, dpi: int = _DPI) -> bytes:
    """Render a matplotlib Figure to PNG bytes via savefig + BytesIO."""
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=dpi, bbox_inches="tight")
    buf.seek(0)
    return buf.getvalue()


def _svg_string_to_png_bytes(svg: str, *, dpi: int = _DPI) -> bytes:
    """Convert an SVG string to PNG bytes via cairosvg."""
    import cairosvg  # type: ignore[import-untyped]  # noqa: PLC0415
    return cairosvg.svg2png(bytestring=svg.encode("utf-8"), dpi=dpi)


def _build_venn_upset_page(result: RegionResult) -> Figure:
    """Page 2: Venn diagram (left) + UpSet plot (right) -- both as imshow panels.

    Renders each component to PNG bytes (cairosvg for venn, savefig for upset),
    then displays as imshow on a 2-panel matplotlib figure. Pixel-accurate
    reproduction of the source SVG/Figure at 300 dpi.
    """
    venn_img = result.render_venn()
    venn_png = _svg_string_to_png_bytes(venn_img.svg, dpi=_DPI)
    venn_arr = mpimg.imread(io.BytesIO(venn_png), format="png")

    upset_img = result.render_upset(max_columns=_MAX_UPSET_COLUMNS)
    upset_png = _figure_to_png_bytes(upset_img.fig, dpi=_DPI)
    upset_arr = mpimg.imread(io.BytesIO(upset_png), format="png")
    plt.close(upset_img.fig)  # Free the source figure; we have the PNG.

    fig = plt.figure(figsize=(_PAGE_WIDTH, _PAGE_HEIGHT))
    ax_venn = fig.add_axes((_VENN_LEFT, _VENN_BOTTOM, _VENN_WIDTH, _VENN_HEIGHT))
    ax_venn.imshow(venn_arr)
    ax_venn.set_axis_off()

    ax_upset = fig.add_axes((_UPSET_LEFT, _UPSET_BOTTOM, _UPSET_WIDTH, _UPSET_HEIGHT))
    ax_upset.imshow(upset_arr)
    ax_upset.set_axis_off()

    return fig


# ---------------------------------------------------------------------------
# Statistics pages (Jaccard / Dice / Hypergeometric + BH-FDR)
# ---------------------------------------------------------------------------

# 2-6 sets fit on one page with all three tables; 7+ need a page per table.
_STATS_ONE_PAGE_MAX_SETS = 6

# FDR cell colors (match web tool).
_FDR_HIGHLY_SIG_BG = "#ffcccc"  # p_adjusted < 0.001
_FDR_SIG_BG = "#fff0f0"         # p_adjusted < 0.05
_FDR_NOT_SIG_BG = "#ffffff"     # not significant

_HIGHLY_SIG_THRESHOLD = 0.001
_SIG_THRESHOLD = 0.05

# Layout rectangles for the one-page combined layout (left=Jaccard, right=Dice, bottom=Hyp).
_COMBINED_JACCARD_RECT = (0.05, 0.65, 0.4, 0.25)
_COMBINED_DICE_RECT = (0.55, 0.65, 0.4, 0.25)
_COMBINED_HYP_RECT = (0.05, 0.05, 0.9, 0.55)

# Layout rectangle for the per-page (7+ sets) single-table layout.
_FULL_PAGE_RECT = (0.05, 0.05, 0.9, 0.85)


def _format_p(p: float) -> str:
    """Format a p-value: scientific notation if very small, else 3 decimal places."""
    if p < _HIGHLY_SIG_THRESHOLD:
        return f"{p:.2e}"
    return f"{p:.3f}"


def _build_table_axes(fig: Figure, rect: tuple[float, float, float, float], title: str):
    """Add a transparent axes at `rect` with the given title rendered above it."""
    ax = fig.add_axes(rect)
    ax.set_axis_off()
    ax.set_title(title, fontsize=12, fontweight="bold", loc="left")
    return ax


def _draw_square_metric_table(
    fig: Figure,
    df,
    *,
    rect: tuple[float, float, float, float],
    title: str,
) -> None:
    """Draw an N x N pairwise metric table (Jaccard or Dice) on the figure."""
    ax = _build_table_axes(fig, rect, title)
    rows = list(df.index)
    cols = list(df.columns)
    cell_text = []
    for r in rows:
        cell_text.append([
            f"{df.loc[r, c]:.3f}" if isinstance(df.loc[r, c], float) else str(df.loc[r, c])
            for c in cols
        ])
    table = ax.table(
        cellText=cell_text,
        rowLabels=rows,
        colLabels=cols,
        loc="center",
        cellLoc="center",
    )
    table.auto_set_font_size(False)
    table.set_fontsize(9)


def _draw_hypergeometric_table(
    fig: Figure,
    df,
    *,
    rect: tuple[float, float, float, float],
    title: str,
) -> None:
    """Draw the long-form hypergeometric pairwise table with FDR-based cell colors."""
    ax = _build_table_axes(fig, rect, title)
    columns = ["set_a", "set_b", "intersection", "expected", "p_value", "p_adjusted", "significant"]
    cell_text = []
    cell_colours = []
    for _, row in df.iterrows():
        cell_text.append([
            str(row["set_a"]),
            str(row["set_b"]),
            str(row["intersection"]),
            f"{row['expected']:.2f}",
            _format_p(row["p_value"]),
            _format_p(row["p_adjusted"]),
            "yes" if row["significant"] else "no",
        ])
        adj = row["p_adjusted"]
        if adj < _HIGHLY_SIG_THRESHOLD:
            bg = _FDR_HIGHLY_SIG_BG
        elif adj < _SIG_THRESHOLD:
            bg = _FDR_SIG_BG
        else:
            bg = _FDR_NOT_SIG_BG
        cell_colours.append([bg] * len(columns))
    table = ax.table(
        cellText=cell_text,
        colLabels=columns,
        cellColours=cell_colours,
        loc="center",
        cellLoc="center",
    )
    table.auto_set_font_size(False)
    table.set_fontsize(9)


# Layout rectangles for the network page (left = network image, right = edges list).
_NET_IMG_RECT = (0.02, 0.05, 0.55, 0.9)
_NET_LIST_RECT = (0.6, 0.05, 0.38, 0.9)

# Typography constants for the edges list.
_NET_HEADER_FONTSIZE = 12
_NET_LINE_FONTSIZE = 10
_NET_HEADER_Y = 0.97
_NET_NO_SIG_Y = 0.85
_NET_LINE_Y_START = 0.92
_NET_LINE_Y_STEP = 0.04
_NET_LINE_Y_MIN = 0.05

# FDR significance threshold for the edges list.
_NET_SIG_FDR = 0.05


def _build_network_page(result: RegionResult) -> Figure:
    """Page n-1: Network plot (left) + significant-edges list (right)."""
    net_img = result.render_network()
    net_png = _figure_to_png_bytes(net_img.fig, dpi=_DPI)
    net_arr = mpimg.imread(io.BytesIO(net_png), format="png")
    plt.close(net_img.fig)

    fig = plt.figure(figsize=(_PAGE_WIDTH, _PAGE_HEIGHT))
    fig.suptitle("Set Relationship Network", fontsize=14, fontweight="bold")

    ax_net = fig.add_axes(_NET_IMG_RECT)
    ax_net.imshow(net_arr)
    ax_net.set_axis_off()

    # Edges list (significant only).
    ax_list = fig.add_axes(_NET_LIST_RECT)
    ax_list.set_axis_off()
    ax_list.text(0.0, _NET_HEADER_Y, "Significant edges (FDR < 0.05)",
                 fontsize=_NET_HEADER_FONTSIZE, fontweight="bold", va="top")

    edges = result.statistics.hypergeometric
    sig_edges = edges[edges["significant"]].sort_values("p_adjusted")
    if len(sig_edges) == 0:
        ax_list.text(0.0, _NET_NO_SIG_Y, "No significant edges at FDR < 0.05",
                     fontsize=_NET_LINE_FONTSIZE, va="top")
    else:
        for i, (_, row) in enumerate(sig_edges.iterrows(), start=1):
            jaccard_val = result.statistics.jaccard.loc[row["set_a"], row["set_b"]]
            line = (
                f"{row['set_a']} <-> {row['set_b']}  |  "
                f"intersection={row['intersection']}  Jaccard={jaccard_val:.3f}  "
                f"FDR={_format_p(row['p_adjusted'])}"
            )
            y = _NET_LINE_Y_START - i * _NET_LINE_Y_STEP
            if y < _NET_LINE_Y_MIN:
                ax_list.text(0.0, y, "...", fontsize=_NET_LINE_FONTSIZE, va="top")
                break
            ax_list.text(0.0, y, line, fontsize=_NET_LINE_FONTSIZE, va="top")

    return fig


_ABOUT_TEXT = """About This Report

Venn diagrams visualise the membership of items across multiple sets. This report
combines a templated diagram, an UpSet plot, statistical significance tests, and a
relationship network into one document.

Set similarity metrics (Jaccard, Dice, Overlap Coefficient)
- Jaccard:        |A and B| / |A or B|. Range [0, 1]. 1 = identical sets.
- Dice:           2 * |A and B| / (|A| + |B|). Equivalent to F1 score for binary
                  classification.
- Overlap:        |A and B| / min(|A|, |B|). 1 means one set is fully inside the
                  other.

Hypergeometric over-representation test
For a universe of N items, sets of size K (the "population success") and n
(the "draws"), and an observed intersection of k items, the one-sided p-value is
P(X >= k) where X ~ Hypergeometric(N, K, n). Small p-values mean the overlap is
larger than expected by chance.

Benjamini-Hochberg FDR correction
Adjusts p-values across multiple comparisons to control the false discovery rate.
A p_adjusted < 0.05 is conventionally called "significant"; < 0.001 is "highly
significant".

UpSet plots
Show all 2^n - 1 intersections as bars (size) and a dot matrix (membership). Better
than a Venn diagram for high set counts (n > 5) where Venn regions become visually
indistinct.

Network plots
Each set is a node sized by membership; edges represent pairwise overlap. Edge
thickness = chosen metric (intersection / Jaccard / fold enrichment / overlap).
Edge color = significance (blue for FDR < 0.05, gray otherwise).

Area-proportional diagrams
For 2 sets, an analytical solver places two circles such that overlap area exactly
matches the requested intersection count. For 3 sets, exact area-proportionality
is not always achievable; the renderer reports `is_approximate=True` and adds an
"approximate" footnote to the diagram.

Generated by venn-diagram-lab - https://github.com/ZoliQua/Venn-Diagram-Lab
"""

# Layout constants for the About page.
_ABOUT_AX_LEFT = 0.05
_ABOUT_AX_BOTTOM = 0.05
_ABOUT_AX_WIDTH = 0.9
_ABOUT_AX_HEIGHT = 0.9
_ABOUT_TEXT_X = 0.0
_ABOUT_TEXT_Y = 1.0
_ABOUT_FONTSIZE = 10


def _build_about_page() -> Figure:
    """Final page: methodology / About This Report static text."""
    fig = plt.figure(figsize=(_PAGE_WIDTH, _PAGE_HEIGHT))
    ax = fig.add_axes((_ABOUT_AX_LEFT, _ABOUT_AX_BOTTOM, _ABOUT_AX_WIDTH, _ABOUT_AX_HEIGHT))
    ax.set_axis_off()
    ax.text(
        _ABOUT_TEXT_X, _ABOUT_TEXT_Y, _ABOUT_TEXT,
        fontsize=_ABOUT_FONTSIZE, fontfamily="monospace", va="top", wrap=True,
    )
    return fig


def _build_statistics_pages(result: RegionResult) -> list[Figure]:
    """Return one or three Figure objects carrying the pairwise statistics tables.

    For 2-6 sets: one combined page with Jaccard (top-left), Dice (top-right),
    and Hypergeometric+FDR (bottom) tables.
    For 7-9 sets: three separate pages, one per table, to avoid crowding.
    """
    stats = result.statistics
    n = len(result.dataset.set_names)
    pages: list[Figure] = []

    if n <= _STATS_ONE_PAGE_MAX_SETS:
        fig = plt.figure(figsize=(_PAGE_WIDTH, _PAGE_HEIGHT))
        fig.suptitle("Pairwise Statistics", fontsize=14, fontweight="bold")
        _draw_square_metric_table(fig, stats.jaccard, rect=_COMBINED_JACCARD_RECT, title="Jaccard")
        _draw_square_metric_table(fig, stats.dice, rect=_COMBINED_DICE_RECT, title="Dice")
        _draw_hypergeometric_table(
            fig, stats.hypergeometric, rect=_COMBINED_HYP_RECT, title="Hypergeometric (BH-FDR)"
        )
        pages.append(fig)
    else:
        for table_name, table_df, drawer in (
            ("Jaccard", stats.jaccard, _draw_square_metric_table),
            ("Dice", stats.dice, _draw_square_metric_table),
            ("Hypergeometric (BH-FDR)", stats.hypergeometric, _draw_hypergeometric_table),
        ):
            fig = plt.figure(figsize=(_PAGE_WIDTH, _PAGE_HEIGHT))
            fig.suptitle(f"Pairwise Statistics - {table_name}", fontsize=14, fontweight="bold")
            drawer(fig, table_df, rect=_FULL_PAGE_RECT, title=table_name)
            pages.append(fig)

    return pages


# ---------------------------------------------------------------------------
# Footer constants.
# ---------------------------------------------------------------------------

_FOOTER_X = 0.5
_FOOTER_Y = 0.02
_FOOTER_FONTSIZE = 7
_FOOTER_COLOR = "#888888"


def _add_footer(fig: Figure, page_num: int, total_pages: int) -> None:
    """Add the standard footer to a page figure."""
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    footer = (
        f"vdl {__version__}  -  Generated {timestamp}"
        f"  -  page {page_num} of {total_pages}"
    )
    fig.text(_FOOTER_X, _FOOTER_Y, footer, fontsize=_FOOTER_FONTSIZE,
             color=_FOOTER_COLOR, ha="center")


def render_pdf_report(
    result: RegionResult,
    path: Path | str,
    *,
    title: str | None = None,
    include_network: bool = True,
    include_about: bool = True,
) -> None:
    """Compose all pages into a multi-page PDF report.

    Parameters
    ----------
    result : RegionResult from analyze()
    path : output PDF path (str or Path)
    title : optional override for the page-1 title
    include_network : if False, skip the network page
    include_about : if False, skip the methodology page
    """
    from matplotlib.backends.backend_pdf import PdfPages  # noqa: PLC0415  # lazy, ~400 KB

    p = Path(path)
    pages: list[Figure] = []

    pages.append(_build_overview_page(result, title=title))
    pages.append(_build_venn_upset_page(result))
    pages.extend(_build_statistics_pages(result))
    if include_network:
        pages.append(_build_network_page(result))
    if include_about:
        pages.append(_build_about_page())

    total = len(pages)
    for i, fig in enumerate(pages, start=1):
        _add_footer(fig, page_num=i, total_pages=total)

    with PdfPages(str(p)) as pdf:
        for fig in pages:
            pdf.savefig(fig)
            plt.close(fig)
