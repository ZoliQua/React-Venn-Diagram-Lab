"""Tests for venn_diagram_lab.errors and venn_diagram_lab.io."""

from __future__ import annotations

import pytest

from venn_diagram_lab.errors import (
    IncompatibleModelError,
    InvalidDatasetError,
    UnknownModelError,
    VennDiagramError,
)
from venn_diagram_lab.io import (
    Dataset,
    _detect_delimiter,
    _split_line,
    load_csv,
    load_gmt,
    load_gmx,
    load_tsv,
)


class TestErrorHierarchy:
    def test_base_is_exception(self) -> None:
        assert issubclass(VennDiagramError, Exception)

    def test_subclasses_inherit_from_base(self) -> None:
        for cls in (InvalidDatasetError, UnknownModelError, IncompatibleModelError):
            msg = f"{cls.__name__} must inherit from VennDiagramError"
            assert issubclass(cls, VennDiagramError), msg

    def test_can_raise_and_catch_as_base(self) -> None:
        with pytest.raises(VennDiagramError, match="bad input"):
            raise InvalidDatasetError("bad input")


class TestDataset:
    def test_construction(self) -> None:
        ds = Dataset(
            set_names=["A", "B"],
            items={"A": {"x", "y"}, "B": {"y", "z"}},
            source_path=None,
            format="csv",
        )
        assert ds.set_names == ["A", "B"]
        assert ds.items["A"] == {"x", "y"}
        assert ds.format == "csv"

    def test_from_dict_basic(self) -> None:
        ds = Dataset.from_dict({"HS": {"BRCA1"}, "MM": {"Brca1"}})
        assert ds.set_names == ["HS", "MM"]
        assert ds.items["HS"] == {"BRCA1"}
        assert ds.items["MM"] == {"Brca1"}
        assert ds.source_path is None
        assert ds.format == "csv"  # default sentinel for in-memory data

    def test_from_dict_preserves_insertion_order(self) -> None:
        # Python 3.7+: dict preserves insertion order, so set_names follows that.
        ds = Dataset.from_dict({"Z": {"a"}, "A": {"a"}, "M": {"a"}})
        assert ds.set_names == ["Z", "A", "M"]

    def test_from_dict_rejects_too_few_sets(self) -> None:
        with pytest.raises(InvalidDatasetError, match="at least 2"):
            Dataset.from_dict({"A": {"x"}})

    def test_from_dict_rejects_too_many_sets(self) -> None:
        too_many = {chr(ord("A") + i): {"x"} for i in range(10)}  # 10 sets > max 9
        with pytest.raises(InvalidDatasetError, match="at most 9"):
            Dataset.from_dict(too_many)

    def test_from_dict_normalises_to_str_set(self) -> None:
        # Accept any iterable of items, store as set[str]
        ds = Dataset.from_dict({"A": ["x", "y", "x"], "B": ("y", "z")})
        assert ds.items["A"] == {"x", "y"}
        assert isinstance(next(iter(ds.items["A"])), str)


class TestSplitLine:
    """Mirror src/__tests__/csvParser.test.ts splitCsvLineWithDelimiter cases."""

    def test_comma(self) -> None:
        assert _split_line("a,b,c", ",") == ["a", "b", "c"]

    def test_semicolon(self) -> None:
        assert _split_line("a;b;c", ";") == ["a", "b", "c"]

    def test_tab(self) -> None:
        assert _split_line("a\tb\tc", "\t") == ["a", "b", "c"]

    def test_quoted_field_with_embedded_delimiter(self) -> None:
        assert _split_line('"a,b",c,d', ",") == ["a,b", "c", "d"]

    def test_escaped_quotes(self) -> None:
        assert _split_line('"say ""hello""",b', ",") == ['say "hello"', "b"]

    def test_trims_whitespace(self) -> None:
        assert _split_line(" a , b , c ", ",") == ["a", "b", "c"]


class TestDetectDelimiter:
    def test_comma(self) -> None:
        assert _detect_delimiter("a,b,c\n1,2,3\n4,5,6") == ","

    def test_tab(self) -> None:
        assert _detect_delimiter("a\tb\tc\n1\t2\t3") == "\t"

    def test_semicolon(self) -> None:
        assert _detect_delimiter("a;b;c\n1;2;3") == ";"

    def test_falls_back_to_comma_for_ambiguous(self) -> None:
        assert _detect_delimiter("abc") == ","


class TestLoadCsvBinary:
    """Mirror src/__tests__/csvParser.test.ts calculateVennCounts (binary) flows."""

    def test_basic_binary(self, tmp_path) -> None:
        path = tmp_path / "binary.csv"
        path.write_text(
            "Title,A,B\n"
            "g1,1,0\n"
            "g2,0,1\n"
            "g3,1,1\n"
            "g4,0,0\n"
        )
        ds = load_csv(path, binary=True)
        assert ds.format == "csv"
        assert ds.set_names == ["A", "B"]  # first column "Title" is the item id, not a set
        assert ds.items["A"] == {"g1", "g3"}
        assert ds.items["B"] == {"g2", "g3"}
        assert ds.source_path == str(path)

    def test_binary_accepts_true_yes(self, tmp_path) -> None:
        path = tmp_path / "binary.csv"
        path.write_text("Title,A,B\nx,true,no\ny,YES,FALSE")
        ds = load_csv(path, binary=True)
        assert ds.items["A"] == {"x", "y"}
        assert ds.items["B"] == set()

    def test_binary_rejects_invalid_value(self, tmp_path) -> None:
        path = tmp_path / "binary.csv"
        path.write_text("Title,A,B\nx,1,maybe")
        with pytest.raises(InvalidDatasetError, match="invalid value"):
            load_csv(path, binary=True)

    def test_binary_rejects_too_few_sets(self, tmp_path) -> None:
        path = tmp_path / "binary.csv"
        path.write_text("Title,A\nx,1\ny,0")  # only 1 data column
        with pytest.raises(InvalidDatasetError, match="at least 2"):
            load_csv(path, binary=True)

    def test_load_tsv_dispatches_to_tab(self, tmp_path) -> None:
        path = tmp_path / "binary.tsv"
        path.write_text("Title\tA\tB\nx\t1\t0\ny\t0\t1")
        ds = load_tsv(path, binary=True)
        assert ds.format == "tsv"
        assert ds.items["A"] == {"x"}
        assert ds.items["B"] == {"y"}


class TestLoadCsvAggregated:
    """Mirror src/__tests__/csvParser.test.ts calculateVennCountsFromAggregated cases."""

    def test_basic_aggregated(self, tmp_path) -> None:
        # SetA = {X, Y, Z}, SetB = {Y, Z, W}
        path = tmp_path / "agg.csv"
        path.write_text("SetA,SetB\nX,Y\nY,Z\nZ,W\n")
        ds = load_csv(path, binary=False)
        assert ds.set_names == ["SetA", "SetB"]
        assert ds.items["SetA"] == {"X", "Y", "Z"}
        assert ds.items["SetB"] == {"Y", "Z", "W"}

    def test_handles_empty_cells(self, tmp_path) -> None:
        path = tmp_path / "agg.csv"
        path.write_text("A,B\nX,\n,Y\n  ,  \n")
        ds = load_csv(path, binary=False)
        assert ds.items["A"] == {"X"}
        assert ds.items["B"] == {"Y"}

    def test_is_case_sensitive(self, tmp_path) -> None:
        path = tmp_path / "agg.csv"
        path.write_text("A,B\nGene1,gene1\ngene1,Gene1\n")
        ds = load_csv(path, binary=False)
        # No deduplication across case
        assert ds.items["A"] == {"Gene1", "gene1"}
        assert ds.items["B"] == {"gene1", "Gene1"}

    def test_rejects_too_few_columns(self, tmp_path) -> None:
        path = tmp_path / "agg.csv"
        path.write_text("OnlyOne\nX\nY\n")
        with pytest.raises(InvalidDatasetError, match="at least 2"):
            load_csv(path, binary=False)


class TestLoadGmt:
    """Mirror src/__tests__/csvParser.test.ts parseGmt cases."""

    def test_basic_two_set(self, tmp_path) -> None:
        path = tmp_path / "p.gmt"
        path.write_text(
            "SetA\thttp://example.com\tGene1\tGene2\tGene3\n"
            "SetB\tna\tGene2\tGene4\n"
        )
        ds = load_gmt(path)
        assert ds.format == "gmt"
        assert ds.set_names == ["SetA", "SetB"]
        assert ds.items["SetA"] == {"Gene1", "Gene2", "Gene3"}
        assert ds.items["SetB"] == {"Gene2", "Gene4"}

    def test_skips_empty_lines(self, tmp_path) -> None:
        path = tmp_path / "p.gmt"
        path.write_text("A\tdesc\tX\n\n\nB\tdesc\tY\n")
        ds = load_gmt(path)
        assert ds.set_names == ["A", "B"]

    def test_rejects_empty_file(self, tmp_path) -> None:
        path = tmp_path / "p.gmt"
        path.write_text("")
        with pytest.raises(InvalidDatasetError, match="empty"):
            load_gmt(path)

    def test_rejects_no_genes(self, tmp_path) -> None:
        # GMT line with only name + description (no gene columns) is invalid.
        path = tmp_path / "p.gmt"
        path.write_text("A\tdesc\nB\tdesc\n")
        with pytest.raises(InvalidDatasetError, match="no valid gene sets"):
            load_gmt(path)


class TestLoadGmx:
    """Mirror src/__tests__/csvParser.test.ts parseGmx cases."""

    def test_basic_two_set(self, tmp_path) -> None:
        path = tmp_path / "p.gmx"
        path.write_text(
            "SetA\tSetB\n"
            "http://a.com\thttp://b.com\n"
            "Gene1\tGene2\n"
            "Gene3\tGene4\n"
            "Gene5\t\n"
        )
        ds = load_gmx(path)
        assert ds.format == "gmx"
        assert ds.set_names == ["SetA", "SetB"]
        assert ds.items["SetA"] == {"Gene1", "Gene3", "Gene5"}
        assert ds.items["SetB"] == {"Gene2", "Gene4"}

    def test_rejects_too_few_lines(self, tmp_path) -> None:
        path = tmp_path / "p.gmx"
        path.write_text("A\tB\ndesc1\tdesc2\n")  # only 2 lines, need >=3
        with pytest.raises(InvalidDatasetError, match="at least 3"):
            load_gmx(path)
