"""Tests for venn_diagram_lab.analysis."""

from __future__ import annotations

import pytest

from venn_diagram_lab.analysis import (
    ModelInfo,
    RegionData,
    RegionResult,
    _enumerate_regions,
    analyze,
    list_models,
)
from venn_diagram_lab.errors import IncompatibleModelError, UnknownModelError
from venn_diagram_lab.io import Dataset
from venn_diagram_lab.statistics import StatisticsResult

BITMASK_AC = 0b101  # sets 0 and 2
BITMASK_A = 1  # set 0 only
EXCLUSIVE_AC_COUNT = 2
INCLUSIVE_AC_COUNT = 3
INCLUSIVE_A_COUNT = 3


class TestRegionData:
    def test_construction_basic(self) -> None:
        rd = RegionData(
            bitmask=BITMASK_AC,
            label="AC",
            set_indices=(0, 2),
            set_names=("SetA", "SetC"),
            exclusive_items=frozenset({"x", "y"}),
            inclusive_items=frozenset({"x", "y", "z"}),
        )
        assert rd.bitmask == BITMASK_AC
        assert rd.label == "AC"
        assert rd.exclusive_count == EXCLUSIVE_AC_COUNT
        assert rd.inclusive_count == INCLUSIVE_AC_COUNT

    def test_counts_are_derived_from_items(self) -> None:
        rd = RegionData(
            bitmask=BITMASK_A,
            label="A",
            set_indices=(0,),
            set_names=("SetA",),
            exclusive_items=frozenset(),
            inclusive_items=frozenset({"a", "b", "c"}),
        )
        assert rd.exclusive_count == 0
        assert rd.inclusive_count == INCLUSIVE_A_COUNT


EXPECTED_MODEL_COUNT = 44
EXPECTED_FIVE_SET_COUNT = 8
FIVE_SET = 5
VALID_SET_COUNT_MIN = 2
VALID_SET_COUNT_MAX = 9


class TestListModels:
    def test_returns_44_models(self) -> None:
        # Phase 0 sync_data.py copies all 44 JSONs into _data/models/json/
        models = list_models()
        assert len(models) == EXPECTED_MODEL_COUNT

    def test_each_entry_has_required_fields(self) -> None:
        models = list_models()
        for m in models:
            assert isinstance(m, ModelInfo)
            assert m.name  # filename stem, non-empty
            assert m.set_count in range(VALID_SET_COUNT_MIN, VALID_SET_COUNT_MAX + 1)
            assert m.display_name  # JSON 'name' field, non-empty

    def test_filter_by_set_count(self) -> None:
        five_set = [m for m in list_models() if m.set_count == FIVE_SET]
        # MODEL_LIST has 8 five-set models per src/models.ts
        assert len(five_set) == EXPECTED_FIVE_SET_COUNT

    def test_includes_known_model(self) -> None:
        names = {m.name for m in list_models()}
        assert "venn-3-set" in names
        assert "venn-5a-set-edwards" in names


BITMASK_ONLY_A = 1
BITMASK_ONLY_B = 2
BITMASK_AB = 3
BITMASK_ONLY_C = 4
BITMASK_AC = 5
BITMASK_BC = 6
BITMASK_ABC = 7
NINE_SETS = 9


class TestEnumerateRegions:
    def test_two_set_partition(self) -> None:
        # SetA = {X, Y, Z}, SetB = {Y, Z, W}
        ds = Dataset.from_dict({"SetA": {"X", "Y", "Z"}, "SetB": {"Y", "Z", "W"}})
        regions = _enumerate_regions(ds)

        # Three non-empty regions: A only (0b01=1), B only (0b10=2), AB (0b11=3)
        assert set(regions.keys()) == {BITMASK_ONLY_A, BITMASK_ONLY_B, BITMASK_AB}

        only_a = regions[BITMASK_ONLY_A]
        assert only_a.label == "A"
        assert only_a.exclusive_items == frozenset({"X"})
        assert only_a.inclusive_items == frozenset({"X", "Y", "Z"})

        only_b = regions[BITMASK_ONLY_B]
        assert only_b.label == "B"
        assert only_b.exclusive_items == frozenset({"W"})
        assert only_b.inclusive_items == frozenset({"Y", "Z", "W"})

        both = regions[BITMASK_AB]
        assert both.label == "AB"
        assert both.exclusive_items == frozenset({"Y", "Z"})
        assert both.inclusive_items == frozenset({"Y", "Z"})

    def test_three_set(self) -> None:
        # X in all 3, Y in A&B, Z in A&C, W in A only
        ds = Dataset.from_dict({"A": {"X", "Y", "Z", "W"}, "B": {"X", "Y"}, "C": {"X", "Z"}})
        regions = _enumerate_regions(ds)

        # Bitmasks: A=1, B=2, AB=3, C=4, AC=5, BC=6, ABC=7
        assert regions[BITMASK_ABC].exclusive_items == frozenset({"X"})   # ABC
        assert regions[BITMASK_AB].exclusive_items == frozenset({"Y"})    # AB only
        assert regions[BITMASK_AC].exclusive_items == frozenset({"Z"})    # AC only
        assert regions[BITMASK_ONLY_A].exclusive_items == frozenset({"W"})  # A only
        assert regions[BITMASK_ONLY_B].exclusive_items == frozenset()     # B only
        assert regions[BITMASK_ONLY_C].exclusive_items == frozenset()     # C only
        assert regions[BITMASK_BC].exclusive_items == frozenset()         # BC only

    def test_label_format_uses_letters_a_to_i(self) -> None:
        # Each set has a unique item plus a shared item so the full-intersection
        # region (ABCDEFGHI) is non-empty and appears in the output.
        ds = Dataset.from_dict(
            {chr(ord("A") + i): {"shared", f"item{i}"} for i in range(NINE_SETS)}
        )
        regions = _enumerate_regions(ds)
        full_mask = (1 << NINE_SETS) - 1
        assert regions[full_mask].label == "ABCDEFGHI"

    def test_empty_regions_omitted(self) -> None:
        # If no items fall into a region, that bitmask key should not appear in the output.
        ds = Dataset.from_dict({"A": {"x"}, "B": {"y"}})  # disjoint
        regions = _enumerate_regions(ds)
        assert BITMASK_AB not in regions  # AB is empty
        assert regions[BITMASK_ONLY_A].exclusive_count == 1  # A only
        assert regions[BITMASK_ONLY_B].exclusive_count == 1  # B only


BITMASK_AB_TWO_SET = 3  # bitmask for region containing both sets in a 2-set diagram
EXPECTED_SET_SIZE_A = 3  # |A| = {X, Y, Z}
EXPECTED_SET_SIZE_B = 3  # |B| = {Y, Z, W}
MAX_ALTERNATIVES_SHOWN = 5


class TestAnalyze:
    def _two_set(self) -> Dataset:
        return Dataset.from_dict({"A": {"X", "Y", "Z"}, "B": {"Y", "Z", "W"}})

    def test_returns_region_result(self) -> None:
        ds = self._two_set()
        result = analyze(ds, model="venn-2-set")
        assert isinstance(result, RegionResult)
        assert result.dataset is ds
        assert result.model == "venn-2-set"
        assert result.is_approximate is False

    def test_set_sizes_match_inclusive_counts(self) -> None:
        ds = self._two_set()
        result = analyze(ds, model="venn-2-set")
        # |A| inclusive = 3 (X, Y, Z), |B| = 3 (Y, Z, W)
        assert result.set_sizes == {"A": EXPECTED_SET_SIZE_A, "B": EXPECTED_SET_SIZE_B}

    def test_regions_populated(self) -> None:
        ds = self._two_set()
        result = analyze(ds, model="venn-2-set")
        assert result.regions[BITMASK_AB_TWO_SET].exclusive_items == frozenset({"Y", "Z"})

    def test_auto_model_selection(self) -> None:
        ds = self._two_set()
        result = analyze(ds, model="auto")
        # 'auto' picks the first 2-set model in alphabetical order
        # Among {"venn-2-set", "venn-2a-set-edwards", "venn-2e-set-carroll-triangle",
        # "venn-2e-set-rectangle"} alphabetical first is "venn-2-set"
        assert result.model == "venn-2-set"

    def test_unknown_model_raises(self) -> None:
        ds = self._two_set()
        with pytest.raises(UnknownModelError, match="not found"):
            analyze(ds, model="not-a-real-model")

    def test_incompatible_model_raises_with_alternatives(self) -> None:
        ds = self._two_set()  # 2 sets
        with pytest.raises(IncompatibleModelError) as exc:
            analyze(ds, model="venn-5a-set-edwards")  # requires 5 sets
        assert "2" in str(exc.value)
        assert "5" in str(exc.value)
        assert exc.value.alternatives  # non-empty
        for alt in exc.value.alternatives:
            assert alt.startswith("venn-2")  # all alternatives are 2-set models


THREE_SETS = 3
EXPECTED_MATRIX_SHAPE = (3, 3)
EXPECTED_PAIR_COUNT = 3  # C(3, 2) = 3 pairs
EXPECTED_JACCARD_AB = 0.25  # |A&B|=10, |A|=30, |B|=20 => 10/40


class TestRegionResultStatistics:
    def test_statistics_property_returns_statistics_result(self) -> None:
        ds = Dataset.from_dict({"A": {"x", "y", "z"}, "B": {"y", "z", "w"}})
        result = analyze(ds, model="venn-2-set")
        stats = result.statistics
        assert isinstance(stats, StatisticsResult)

    def test_statistics_dataframes_have_expected_shape(self) -> None:
        ds = Dataset.from_dict(
            {"A": {"x", "y", "z"}, "B": {"y", "z", "w"}, "C": {"z", "w", "v"}}
        )
        result = analyze(ds, model="venn-3-set")
        stats = result.statistics
        assert stats.jaccard.shape == EXPECTED_MATRIX_SHAPE
        assert stats.dice.shape == EXPECTED_MATRIX_SHAPE
        assert stats.overlap_coefficient.shape == EXPECTED_MATRIX_SHAPE
        assert stats.fold_enrichment.shape == EXPECTED_MATRIX_SHAPE
        assert len(stats.hypergeometric) == EXPECTED_PAIR_COUNT

    def test_statistics_is_cached(self) -> None:
        ds = Dataset.from_dict({"A": {"x"}, "B": {"x"}})
        result = analyze(ds, model="venn-2-set")
        first = result.statistics
        second = result.statistics
        assert first is second  # cached_property returns the same object

    def test_jaccard_value_matches_manual_computation(self) -> None:
        # Build a dataset where |A| = 30, |B| = 20, |A & B| = 10
        # Jaccard = 10 / (30 + 20 - 10) = 10/40 = 0.25
        a_only = {f"a{i}" for i in range(20)}
        b_only = {f"b{i}" for i in range(10)}
        both = {f"both{i}" for i in range(10)}
        ds = Dataset.from_dict({"A": a_only | both, "B": b_only | both})
        result = analyze(ds, model="venn-2-set")
        assert result.statistics.jaccard.loc["A", "B"] == pytest.approx(EXPECTED_JACCARD_AB)
