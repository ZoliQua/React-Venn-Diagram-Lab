"""End-to-end Phase 1 integration tests: sample -> analyze -> statistics access."""

from __future__ import annotations

import pytest

import venn_diagram_lab as vdl

STREAMING_SET_COUNT = 8
CANCER_DRIVERS_SET_COUNT = 4
CANCER_DRIVERS_PAIR_COUNT = 28  # C(8, 2) = 28
CANCER_DRIVERS_MAX_REGIONS = 15  # 2^4 - 1
JACCARD_DIAGONAL = 1.0


class TestSampleToStatistics:
    def test_streaming_platforms_pipeline(self) -> None:
        # Real bundled sample, binary CSV, 8 sets
        ds = vdl.load_sample("dataset_mock_streaming_platforms")
        assert len(ds.set_names) == STREAMING_SET_COUNT

        result = vdl.analyze(ds, model="auto")
        assert result.model.startswith("venn-8")
        assert isinstance(result.regions, dict)
        assert all(isinstance(r, vdl.RegionData) for r in result.regions.values())

        stats = result.statistics
        assert stats.jaccard.shape == (STREAMING_SET_COUNT, STREAMING_SET_COUNT)
        assert len(stats.hypergeometric) == CANCER_DRIVERS_PAIR_COUNT  # C(8, 2) = 28

    def test_cancer_drivers_pipeline(self) -> None:
        ds = vdl.load_sample("dataset_real_cancer_drivers_4")
        assert len(ds.set_names) == CANCER_DRIVERS_SET_COUNT

        result = vdl.analyze(ds, model="venn-4-set")
        assert result.model == "venn-4-set"
        # 4 sets -> up to 2^4 - 1 = 15 regions; some may be empty
        assert 1 <= len(result.regions) <= CANCER_DRIVERS_MAX_REGIONS
        # All set sizes must be positive (real data)
        assert all(v > 0 for v in result.set_sizes.values())

        stats = result.statistics
        # Jaccard symmetric
        for a in ds.set_names:
            for b in ds.set_names:
                assert stats.jaccard.loc[a, b] == pytest.approx(stats.jaccard.loc[b, a])
        # Diagonal = 1.0
        for a in ds.set_names:
            assert stats.jaccard.loc[a, a] == pytest.approx(JACCARD_DIAGONAL)

    def test_aggregated_sample_pipeline(self) -> None:
        ds = vdl.load_sample("dataset_mock_gene_sets")
        result = vdl.analyze(ds, model="auto")
        # Compute the universe size from regions and verify against direct dataset count
        universe_from_regions = sum(r.exclusive_count for r in result.regions.values())
        universe_from_dataset = len(set().union(*ds.items.values()))
        assert universe_from_regions == universe_from_dataset


class TestErrorPaths:
    def test_unknown_model_via_public_api(self) -> None:
        ds = vdl.Dataset.from_dict({"A": {"x"}, "B": {"y"}})
        with pytest.raises(vdl.UnknownModelError):
            vdl.analyze(ds, model="not-a-real-model")

    def test_incompatible_model_via_public_api(self) -> None:
        ds = vdl.Dataset.from_dict({"A": {"x"}, "B": {"y"}})  # 2 sets
        with pytest.raises(vdl.IncompatibleModelError):
            vdl.analyze(ds, model="venn-7-set-grunbaum")
