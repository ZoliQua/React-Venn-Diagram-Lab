"""Verify deprecation warnings on the legacy swiss-army commands."""

from __future__ import annotations

from pathlib import Path

from typer.testing import CliRunner

from venn_diagram_lab.cli import app

runner = CliRunner()
SAMPLE = "dataset_real_cancer_drivers_4"
DATA_TSV = Path(__file__).resolve().parents[2] / "data" / f"{SAMPLE}.tsv"


def test_analyze_emits_deprecation_warning(tmp_path: Path) -> None:
    """`vdl analyze ... --venn x.svg` runs but prints deprecation banner to stderr."""
    target = tmp_path / "v.svg"
    res = runner.invoke(
        app, ["analyze", str(DATA_TSV), "--venn", str(target)],
    )
    # CliRunner's `output` includes both stdout and stderr by default.
    assert res.exit_code == 0, res.output
    assert "deprecated" in res.output.lower()
    assert "render" in res.output.lower()   # mentions migration hint


def test_render_sample_emits_deprecation_warning(tmp_path: Path) -> None:
    """`vdl render-sample ... --venn x.svg` prints deprecation banner."""
    target = tmp_path / "v.svg"
    res = runner.invoke(
        app, ["render-sample", SAMPLE, "--venn", str(target)],
    )
    assert res.exit_code == 0, res.output
    assert "deprecated" in res.output.lower()


def test_no_deprecation_warning_flag_on_analyze(tmp_path: Path) -> None:
    """--no-deprecation-warning suppresses the banner."""
    target = tmp_path / "v.svg"
    res = runner.invoke(
        app,
        ["analyze", str(DATA_TSV), "--venn", str(target),
         "--no-deprecation-warning"],
    )
    assert res.exit_code == 0
    assert "deprecated" not in res.output.lower()


def test_no_deprecation_warning_flag_on_render_sample(tmp_path: Path) -> None:
    target = tmp_path / "v.svg"
    res = runner.invoke(
        app,
        ["render-sample", SAMPLE, "--venn", str(target),
         "--no-deprecation-warning"],
    )
    assert res.exit_code == 0
    assert "deprecated" not in res.output.lower()
