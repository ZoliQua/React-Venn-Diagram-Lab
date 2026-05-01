"""Data-loading and parsing for venn-diagram-lab.

Supports CSV / TSV (binary or aggregated mode), GMT, GMX. Always returns a
canonical `Dataset` so downstream modules don't care about the source format.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from venn_diagram_lab.errors import InvalidDatasetError

DatasetFormat = Literal["csv", "tsv", "gmt", "gmx"]

MIN_SETS = 2
MAX_SETS = 9


@dataclass(frozen=True)
class Dataset:
    """In-memory representation of a Venn-diagram input.

    Attributes
    ----------
    set_names : ordered set identifiers (preserving the order they appeared in the source).
    items : map set name -> set of item identifiers (e.g. gene symbols, titles).
    source_path : original file path if the dataset was loaded from disk; None for
        in-memory or sample-derived datasets.
    format : source format (csv / tsv / gmt / gmx). For in-memory datasets the
        default is "csv" -- callers that care about format may override.
    """

    set_names: list[str]
    items: dict[str, set[str]]
    source_path: str | None
    format: DatasetFormat

    @classmethod
    def from_dict(
        cls,
        data: Mapping[str, Iterable[str]],
        *,
        source_path: str | None = None,
        format: DatasetFormat = "csv",
    ) -> Dataset:
        """Build a Dataset from a plain dict of set_name -> iterable of items.

        Items are coerced to `str` and de-duplicated. Set count must be in [2, 9].
        """
        if len(data) < MIN_SETS:
            raise InvalidDatasetError(
                f"Dataset must have at least {MIN_SETS} sets, got {len(data)}"
            )
        if len(data) > MAX_SETS:
            raise InvalidDatasetError(
                f"Dataset must have at most {MAX_SETS} sets, got {len(data)}"
            )
        names = list(data.keys())
        items = {name: {str(x) for x in values} for name, values in data.items()}
        return cls(set_names=names, items=items, source_path=source_path, format=format)


def _split_line(line: str, delimiter: str) -> list[str]:
    """Split a CSV line respecting quoted fields and escaped quotes.

    Mirrors src/utils/csvParser.ts splitCsvLineWithDelimiter exactly so loaded
    datasets parse identically to the web tool.
    """
    result: list[str] = []
    current: list[str] = []
    in_quotes = False
    i = 0
    while i < len(line):
        ch = line[i]
        if ch == '"':
            if in_quotes and i + 1 < len(line) and line[i + 1] == '"':
                current.append('"')
                i += 2
                continue
            in_quotes = not in_quotes
        elif ch == delimiter and not in_quotes:
            result.append("".join(current).strip())
            current = []
        else:
            current.append(ch)
        i += 1
    result.append("".join(current).strip())
    return result


_TRUTHY = {"1", "true", "yes"}
_FALSY = {"0", "false", "no", ""}

_DELIMITER_CANDIDATES: tuple[str, ...] = (",", ";", "\t", " ")


def _detect_delimiter(text: str) -> str:
    """Auto-detect the delimiter by scoring consistency across the first 5 lines.

    Mirrors src/utils/csvParser.ts detectDelimiter. Falls back to ',' if no
    candidate scores above zero (single-token lines, etc.).
    """
    lines = text.replace("\r\n", "\n").replace("\r", "\n").strip().split("\n")[:5]
    if not lines:
        return ","

    best_delim = ","
    best_score = -1
    for d in _DELIMITER_CANDIDATES:
        counts = []
        for line in lines:
            count = 0
            in_quotes = False
            for ch in line:
                if ch == '"':
                    in_quotes = not in_quotes
                elif ch == d and not in_quotes:
                    count += 1
            counts.append(count)
        if not counts:
            continue
        lo, hi = min(counts), max(counts)
        if lo >= 1 and hi - lo <= 1:
            score = lo * 10 + (5 if hi == lo else 0)
            if score > best_score:
                best_score = score
                best_delim = d
    return best_delim


# ---------------------------------------------------------------------------
# File I/O helpers
# ---------------------------------------------------------------------------


def _read_text(path: Path | str) -> tuple[str, str]:
    """Read the file contents and return (text, str(path))."""
    p = Path(path)
    return p.read_text(encoding="utf-8"), str(p)


def _parse_table(text: str, delimiter: str) -> tuple[list[str], list[list[str]]]:
    """Low-level: parse a delimited file into (headers, rows)."""
    lines = [
        line
        for line in text.replace("\r\n", "\n").replace("\r", "\n").strip().split("\n")
        if line.strip()
    ]
    min_lines = 2  # 1 header + at least 1 data row
    if len(lines) < min_lines:
        raise InvalidDatasetError("File must have at least a header and one data row")
    headers = _split_line(lines[0], delimiter)
    rows = [_split_line(line, delimiter) for line in lines[1:]]
    return headers, rows


def _binary_columns_to_dataset(
    headers: list[str],
    rows: list[list[str]],
    source_path: str,
    fmt: DatasetFormat,
    prefix_cols: int = 1,
) -> Dataset:
    """Treat the first *prefix_cols* columns as item metadata, remaining as binary sets.

    Parameters
    ----------
    prefix_cols:
        Number of leading columns to treat as item metadata (default 1).
        Column 0 is always the item id used for set membership; columns
        1..(prefix_cols-1) are ignored metadata fields.
    """
    if len(headers) < prefix_cols + MIN_SETS:
        raise InvalidDatasetError(
            f"Binary file must have at least {MIN_SETS} data columns"
        )

    set_names = headers[prefix_cols:]
    items: dict[str, set[str]] = {name: set() for name in set_names}

    for row_idx, row in enumerate(rows, start=2):  # row 1 is the header
        if not row or not row[0].strip():
            continue
        item_id = row[0].strip()
        for col_offset, set_name in enumerate(set_names):
            col_idx = prefix_cols + col_offset
            cell = (row[col_idx] if col_idx < len(row) else "").strip().lower()
            if cell in _TRUTHY:
                items[set_name].add(item_id)
            elif cell in _FALSY:
                continue
            else:
                raw = row[col_idx] if col_idx < len(row) else ""
                raise InvalidDatasetError(
                    f"Column {set_name!r} row {row_idx} has invalid value {raw!r} "
                    "(expected 0/1/true/false/yes/no)"
                )

    return Dataset(set_names=set_names, items=items, source_path=source_path, format=fmt)


def _aggregated_columns_to_dataset(
    headers: list[str],
    rows: list[list[str]],
    source_path: str,
    format: DatasetFormat,
) -> Dataset:
    """Treat each column as a set; non-empty cells are item identifiers."""
    if len(headers) < MIN_SETS:
        raise InvalidDatasetError(f"Aggregated file must have at least {MIN_SETS} columns")

    set_names = list(headers)
    items: dict[str, set[str]] = {name: set() for name in set_names}

    for row in rows:
        for col_idx, set_name in enumerate(set_names):
            cell = (row[col_idx] if col_idx < len(row) else "").strip()
            if cell:
                items[set_name].add(cell)

    if not any(items.values()):
        raise InvalidDatasetError("Aggregated file has no non-empty cells")

    return Dataset(set_names=set_names, items=items, source_path=source_path, format=format)


# ---------------------------------------------------------------------------
# Public loaders
# ---------------------------------------------------------------------------


def load_csv(
    path: Path | str,
    *,
    binary: bool = True,
    delimiter: str | None = None,
    prefix_cols: int = 1,
) -> Dataset:
    """Load a CSV (or any delimited) file into a Dataset.

    Parameters
    ----------
    path:
        Path to the file.
    binary:
        True for one-row-per-item with 0/1 columns; False for the
        aggregated layout (each column is a set, cells contain item names).
    delimiter:
        Explicit delimiter override; if None, auto-detect.
    prefix_cols:
        Number of leading columns treated as item metadata in binary mode
        (default 1). Column 0 is the item id; extra prefix columns are skipped.
        Ignored in aggregated mode.
    """
    text, src = _read_text(path)
    delim = delimiter if delimiter is not None else _detect_delimiter(text)
    headers, rows = _parse_table(text, delim)
    fmt: DatasetFormat = "tsv" if delim == "\t" else "csv"
    if binary:
        return _binary_columns_to_dataset(headers, rows, src, fmt, prefix_cols=prefix_cols)
    return _aggregated_columns_to_dataset(headers, rows, src, fmt)


def load_tsv(path: Path | str, *, binary: bool = True, prefix_cols: int = 1) -> Dataset:
    """Load a tab-separated file (forces delimiter='\\t', format='tsv')."""
    return load_csv(path, binary=binary, delimiter="\t", prefix_cols=prefix_cols)


def load_gmt(path: Path | str) -> Dataset:
    """Load a GMT (Gene Matrix Transposed) file.

    GMT layout: one row per set, tab-separated:
        set_name<TAB>description<TAB>item1<TAB>item2<TAB>...
    """
    text, src = _read_text(path)
    lines = [
        line
        for line in text.replace("\r\n", "\n").replace("\r", "\n").strip().split("\n")
        if line.strip()
    ]
    if not lines:
        raise InvalidDatasetError("GMT file is empty")

    set_names: list[str] = []
    items: dict[str, set[str]] = {}

    gmt_min_cols = 3  # name, description, at least one gene
    for line in lines:
        parts = line.split("\t")
        if len(parts) < gmt_min_cols:
            continue  # need at least name, description, one gene
        name = parts[0].strip()
        if not name:
            continue
        genes = {p.strip() for p in parts[2:] if p.strip()}
        if not genes:
            continue
        set_names.append(name)
        items[name] = genes

    if not set_names:
        raise InvalidDatasetError("GMT file has no valid gene sets")
    if len(set_names) < MIN_SETS:
        raise InvalidDatasetError(
            f"GMT file must contain at least {MIN_SETS} sets, got {len(set_names)}"
        )
    if len(set_names) > MAX_SETS:
        raise InvalidDatasetError(
            f"GMT file has {len(set_names)} sets; max supported is {MAX_SETS}. "
            "Filter the file before loading."
        )

    return Dataset(set_names=set_names, items=items, source_path=src, format="gmt")


def load_gmx(path: Path | str) -> Dataset:
    """Load a GMX (Gene Matrix) file.

    GMX layout (tab-separated, column-oriented):
        Row 1: set names
        Row 2: descriptions (ignored for analysis)
        Row 3+: items, one per row, columns are sets; empty cells allowed.
    """
    text, src = _read_text(path)
    lines = [
        line
        for line in text.replace("\r\n", "\n").replace("\r", "\n").strip().split("\n")
        if line.strip()
    ]
    min_rows = 3
    if len(lines) < min_rows:
        raise InvalidDatasetError("GMX file must have at least 3 rows (names, descriptions, genes)")

    set_names = [h.strip() for h in lines[0].split("\t") if h.strip()]
    if len(set_names) < MIN_SETS:
        raise InvalidDatasetError(f"GMX file must have at least {MIN_SETS} columns")
    if len(set_names) > MAX_SETS:
        raise InvalidDatasetError(
            f"GMX file has {len(set_names)} sets; max supported is {MAX_SETS}."
        )

    items: dict[str, set[str]] = {name: set() for name in set_names}
    for line in lines[2:]:
        parts = [p.strip() for p in line.split("\t")]
        for col_idx, set_name in enumerate(set_names):
            cell = parts[col_idx] if col_idx < len(parts) else ""
            if cell:
                items[set_name].add(cell)

    return Dataset(set_names=set_names, items=items, source_path=src, format="gmx")
