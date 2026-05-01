"""Tests for venn_diagram_lab.samples."""

from __future__ import annotations

import pytest

from venn_diagram_lab.samples import list_samples, load_sample

EXPECTED_SAMPLE_COUNT = 5


class TestListSamples:
    def test_returns_five_samples(self) -> None:
        samples = list_samples()
        assert len(samples) == EXPECTED_SAMPLE_COUNT

    def test_contains_known_samples(self) -> None:
        samples = set(list_samples())
        assert "dataset_mock_gene_sets" in samples
        assert "dataset_mock_streaming_platforms" in samples
        assert "dataset_real_cancer_drivers_4" in samples
        assert "dataset_real_msigdb_cancer_pathways" in samples
        assert "dataset_real_msigdb_immune_pathways" in samples

    def test_does_not_include_gmt_reference_files(self) -> None:
        # .gmt files in data/ are reference, not samples
        samples = list_samples()
        for s in samples:
            assert "h.all" not in s
            assert "c5.go" not in s

    def test_returns_sorted_list(self) -> None:
        samples = list_samples()
        assert samples == sorted(samples)


MIN_ONCOKB_GENES = 100


class TestLoadSample:
    def test_load_streaming_platforms_binary(self) -> None:
        ds = load_sample("dataset_mock_streaming_platforms")
        # First column is "Title"; the binary set columns are the platforms.
        assert "Netflix" in ds.set_names
        assert "HBO_Max" in ds.set_names
        assert ds.format == "csv"
        # All platforms have at least one truthy row
        for name in ds.set_names:
            assert len(ds.items[name]) > 0

    def test_load_gene_sets_aggregated(self) -> None:
        ds = load_sample("dataset_mock_gene_sets")
        # Aggregated CSV with 6 set columns Pathway_A..F
        assert "Pathway_A" in ds.set_names
        assert "Pathway_F" in ds.set_names
        assert ds.format == "csv"
        # AKT1 should appear in multiple pathways (verifying parser works)
        assert "AKT1" in ds.items["Pathway_B"]

    def test_load_cancer_drivers_tsv_binary(self) -> None:
        ds = load_sample("dataset_real_cancer_drivers_4")
        assert ds.format == "tsv"
        assert ds.set_names == ["Vogelstein", "COSMIC_CGC", "OncoKB", "IntOGen"]
        # OncoKB should have many genes (it's the broadest catalog)
        assert len(ds.items["OncoKB"]) > MIN_ONCOKB_GENES

    def test_unknown_sample_raises(self) -> None:
        with pytest.raises(KeyError, match="not a known sample"):
            load_sample("nonexistent")
