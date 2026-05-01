"""Verify the documented public API is importable from the top-level package."""

from __future__ import annotations

import venn_diagram_lab as vdl


def test_top_level_imports() -> None:
    # Loaders
    assert callable(vdl.load_csv)
    assert callable(vdl.load_tsv)
    assert callable(vdl.load_gmt)
    assert callable(vdl.load_gmx)
    assert callable(vdl.load_sample)
    assert callable(vdl.list_samples)
    assert callable(vdl.list_models)
    assert callable(vdl.analyze)

    # Data classes
    assert vdl.Dataset
    assert vdl.RegionResult
    assert vdl.RegionData
    assert vdl.StatisticsResult
    assert vdl.ModelInfo

    # Errors
    assert issubclass(vdl.InvalidDatasetError, vdl.VennDiagramError)
    assert issubclass(vdl.UnknownModelError, vdl.VennDiagramError)
    assert issubclass(vdl.IncompatibleModelError, vdl.VennDiagramError)

    # Version
    assert isinstance(vdl.__version__, str)


def test_dunder_all_lists_public_symbols() -> None:
    expected = {
        "Dataset", "RegionResult", "RegionData", "StatisticsResult", "ModelInfo",
        "load_csv", "load_tsv", "load_gmt", "load_gmx",
        "load_sample", "list_samples", "list_models", "analyze",
        "VennDiagramError", "InvalidDatasetError",
        "UnknownModelError", "IncompatibleModelError",
        "__version__",
    }
    assert expected.issubset(set(vdl.__all__))
