"""Tests for the `vdl model ...` subapp."""

from __future__ import annotations

from pathlib import Path

from typer.testing import CliRunner

from venn_diagram_lab.cli import app

runner = CliRunner()


def test_model_list() -> None:
    res = runner.invoke(app, ["model", "list"])
    assert res.exit_code == 0, res.output
    assert "venn-4-set" in res.output


def test_model_info_known_name() -> None:
    res = runner.invoke(app, ["model", "info", "venn-4e-set-euler"])
    assert res.exit_code == 0, res.output
    out = res.output.lower()
    assert "venn-4e-set-euler" in out


def test_model_info_unknown_name() -> None:
    res = runner.invoke(app, ["model", "info", "nope"])
    assert res.exit_code == 1


def test_model_svg_writes_template(tmp_path: Path) -> None:
    target = tmp_path / "tpl.svg"
    res = runner.invoke(
        app, ["model", "svg", "venn-4e-set-euler", "--out", str(target)],
    )
    assert res.exit_code == 0, res.output
    assert target.exists()
    body = target.read_text(encoding="utf-8")
    assert body.lstrip().startswith("<svg") or body.lstrip().startswith("<?xml")


def test_model_svg_default_out_to_cwd(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.chdir(tmp_path)
    res = runner.invoke(app, ["model", "svg", "venn-4e-set-euler"])
    assert res.exit_code == 0, res.output
    assert (tmp_path / "venn-4e-set-euler.svg").exists()


def test_model_svg_unknown_name() -> None:
    res = runner.invoke(app, ["model", "svg", "nope"])
    assert res.exit_code == 1
