"""Tests for the top-level v2.2.2 shortcuts."""

from __future__ import annotations

from pathlib import Path

from typer.testing import CliRunner

from venn_diagram_lab.cli import app

runner = CliRunner()
SAMPLE = "dataset_real_cancer_drivers_4"


def test_share_dist_shortcut(tmp_path: Path) -> None:
    target = tmp_path / "share.svg"
    res = runner.invoke(
        app, ["share-dist", SAMPLE, "--out", str(target)],
    )
    assert res.exit_code == 0, res.output
    assert target.exists()
    assert 'class="sd-bar"' in target.read_text(encoding="utf-8")


def test_cluster_shortcut(tmp_path: Path) -> None:
    target = tmp_path / "cluster.svg"
    res = runner.invoke(
        app, ["cluster", SAMPLE, "--out", str(target)],
    )
    assert res.exit_code == 0, res.output
    assert target.exists()
    body = target.read_text(encoding="utf-8")
    assert "hm-dendro-col" in body
    assert "hm-dendro-row" in body


def test_share_dist_appears_in_help() -> None:
    res = runner.invoke(app, ["--help"])
    assert res.exit_code == 0
    assert "share-dist" in res.output


def test_cluster_appears_in_help() -> None:
    res = runner.invoke(app, ["--help"])
    assert res.exit_code == 0
    assert "cluster" in res.output


def test_share_dist_unknown_input() -> None:
    res = runner.invoke(app, ["share-dist", "nope_xyz"])
    assert res.exit_code == 1


def test_cluster_unknown_input() -> None:
    res = runner.invoke(app, ["cluster", "nope_xyz"])
    assert res.exit_code == 1
