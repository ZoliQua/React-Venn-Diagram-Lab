"""Bundled sample dataset loader.

Five curated datasets ship inside the wheel under `_data/samples/`. Three are
real biological datasets (cancer drivers, MSigDB cancer pathways, MSigDB immune
pathways); two are mock datasets (gene sets, streaming platforms) used for
demos and tests.

Reference files (e.g. .gmt MSigDB collections) are bundled too but excluded
from list_samples() -- call load_gmt(path) directly for those.
"""

from __future__ import annotations

from importlib import resources
from pathlib import Path

from venn_diagram_lab.io import Dataset, load_csv, load_tsv

# Per-sample metadata (format, mode). Keep this in sync with the files in data/.
_SAMPLE_REGISTRY: dict[str, dict] = {
    "dataset_mock_gene_sets": {"ext": "csv", "mode": "aggregated", "prefix_cols": 1},
    "dataset_mock_streaming_platforms": {"ext": "csv", "mode": "binary", "prefix_cols": 2},
    "dataset_real_cancer_drivers_4": {"ext": "tsv", "mode": "binary", "prefix_cols": 1},
    "dataset_real_msigdb_cancer_pathways": {"ext": "tsv", "mode": "binary", "prefix_cols": 1},
    "dataset_real_msigdb_immune_pathways": {"ext": "tsv", "mode": "binary", "prefix_cols": 1},
}


def _samples_dir() -> Path:
    """Resolve the bundled `_data/samples/` directory."""
    pkg_root = resources.files("venn_diagram_lab")
    return Path(str(pkg_root)) / "_data" / "samples"


def list_samples() -> list[str]:
    """Return the bundled sample identifiers (sorted)."""
    return sorted(_SAMPLE_REGISTRY.keys())


def load_sample(name: str) -> Dataset:
    """Load a bundled sample by name. Use list_samples() to see available IDs."""
    if name not in _SAMPLE_REGISTRY:
        raise KeyError(
            f"{name!r} is not a known sample. Available: {list_samples()}"
        )
    meta = _SAMPLE_REGISTRY[name]
    path = _samples_dir() / f"{name}.{meta['ext']}"
    if not path.is_file():
        raise FileNotFoundError(
            f"Sample file missing: {path}. "
            "Run `python python/scripts/sync_data.py` to populate _data/samples/."
        )
    binary = meta["mode"] == "binary"
    prefix_cols: int = meta.get("prefix_cols", 1)
    if meta["ext"] == "tsv":
        return load_tsv(path, binary=binary, prefix_cols=prefix_cols)
    return load_csv(path, binary=binary, prefix_cols=prefix_cols)
