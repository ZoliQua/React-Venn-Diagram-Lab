"""Top-level v2.2.2 shortcuts (registered on root `app`, not as a subapp)."""

from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer

from venn_diagram_lab.analysis import analyze
from venn_diagram_lab.cli._common import (
    STDOUT_SENTINEL,
    exit_error,
    load_input,
    resolve_out,
    write_text_out,
)
from venn_diagram_lab.errors import VennDiagramError
from venn_diagram_lab.render.svg import (
    render_cluster_heatmap_svg,
    render_share_distribution_svg,
)


def register(app: typer.Typer) -> None:
    """Attach the share-dist + cluster commands to the given root app."""

    @app.command("share-dist")
    def cmd_share_dist(
        input: Annotated[str, typer.Argument()],
        *,
        out: Annotated[Path | None, typer.Option("--out", "-o")] = None,
    ) -> None:
        """Render Item Share Distribution histogram (shortcut for `render share-dist`)."""
        try:
            ds = load_input(input)
        except (VennDiagramError, OSError) as e:
            exit_error(str(e))
        img = render_share_distribution_svg(ds)
        target = resolve_out(out, input, "share-dist", "svg")
        if target is STDOUT_SENTINEL:
            write_text_out(target, img.content)
            return
        target.parent.mkdir(parents=True, exist_ok=True)
        img.save(target)
        typer.echo(f"Wrote {target}")

    @app.command("cluster")
    def cmd_cluster(
        input: Annotated[str, typer.Argument()],
        *,
        out: Annotated[Path | None, typer.Option("--out", "-o")] = None,
        model: Annotated[str, typer.Option()] = "auto",
        linkage: Annotated[str, typer.Option()] = "average",
    ) -> None:
        """Render cluster-rendered heatmap (shortcut for `render heatmap --cluster`)."""
        try:
            ds = load_input(input)
            result = analyze(ds, model=model)
        except (VennDiagramError, OSError) as e:
            exit_error(str(e))
        img = render_cluster_heatmap_svg(
            result,
            linkage=linkage,
            show_row_dendrogram=True,
            show_col_dendrogram=True,
        )
        target = resolve_out(out, input, "cluster", "svg")
        if target is STDOUT_SENTINEL:
            write_text_out(target, img.content)
            return
        target.parent.mkdir(parents=True, exist_ok=True)
        img.save(target)
        typer.echo(f"Wrote {target}")
