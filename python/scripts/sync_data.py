#!/usr/bin/env python3
"""Sync repo-root models/ and data/ into the Python package's _data/ tree.

The Python package's wheel build uses Hatchling's `force-include` to pull these
fixtures from the repo root. For development (editable installs), the wheel
isn't built — so this script provides the same effect by copying or symlinking
the source-of-truth files into `python/src/venn_diagram_lab/_data/`.

Usage:
    python python/scripts/sync_data.py            # copy mode (default, safer)
    python python/scripts/sync_data.py --symlink  # symlink mode (less disk, Windows needs care)

The destination directory is gitignored.
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path


def repo_root() -> Path:
    """Resolve the repo root assuming this script lives at python/scripts/sync_data.py."""
    return Path(__file__).resolve().parent.parent.parent


# Dataset files shipped with the Python package. Keep this list in sync with
# the `force-include` block for `../data/...` in pyproject.toml.
SAMPLE_FILES = (
    "dataset_mock_gene_sets.csv",
    "dataset_mock_streaming_platforms.csv",
    "dataset_real_cancer_drivers_4.tsv",
    "dataset_real_msigdb_cancer_pathways.tsv",
    "dataset_real_msigdb_immune_pathways.tsv",
)


def _replace_dir(dest: Path) -> None:
    if dest.is_symlink():
        dest.unlink()
    elif dest.is_dir():
        shutil.rmtree(dest)
    elif dest.exists():
        raise RuntimeError(f"unexpected file at destination: {dest}")


def sync(use_symlinks: bool = False) -> None:
    root = repo_root()
    pkg_data = root / "python" / "src" / "venn_diagram_lab" / "_data"

    folder_pairs = [
        (root / "models" / "svg", pkg_data / "models" / "svg"),
        (root / "models" / "json", pkg_data / "models" / "json"),
    ]
    for src, dest in folder_pairs:
        if not src.exists():
            print(f"WARN: source missing: {src}", file=sys.stderr)
            continue
        _replace_dir(dest)
        dest.parent.mkdir(parents=True, exist_ok=True)
        if use_symlinks:
            dest.symlink_to(src, target_is_directory=True)
            print(f"symlink: {dest} -> {src}")
        else:
            shutil.copytree(src, dest)
            print(f"copy:    {src} -> {dest}")

    samples_dest = pkg_data / "samples"
    _replace_dir(samples_dest)
    samples_dest.mkdir(parents=True, exist_ok=True)
    for name in SAMPLE_FILES:
        src = root / "data" / name
        dest = samples_dest / name
        if not src.exists():
            print(f"WARN: source missing: {src}", file=sys.stderr)
            continue
        if use_symlinks:
            dest.symlink_to(src)
            print(f"symlink: {dest} -> {src}")
        else:
            shutil.copy2(src, dest)
            print(f"copy:    {src} -> {dest}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--symlink", action="store_true", help="Use symlinks instead of copying")
    args = parser.parse_args()
    sync(use_symlinks=args.symlink)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
