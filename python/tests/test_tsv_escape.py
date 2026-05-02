"""Unit tests for the spreadsheet-formula escape and JS-style scientific formatter."""

from __future__ import annotations

import math

import pytest

from venn_diagram_lab._tsv_escape import (
    escape_spreadsheet_cell,
    js_to_exponential_2,
    js_to_fixed,
)


class TestEscapeSpreadsheetCell:
    @pytest.mark.parametrize("value", ["=SUM(A1)", "+CMD()", "-cmd", "@helo"])
    def test_prefixes_dangerous_starts(self, value: str) -> None:
        assert escape_spreadsheet_cell(value) == "'" + value

    @pytest.mark.parametrize("value", [
        " =leading_space_then_eq", "\t=tab_then_eq", "\r=cr_then_eq",
    ])
    def test_handles_leading_whitespace(self, value: str) -> None:
        assert escape_spreadsheet_cell(value) == "'" + value

    @pytest.mark.parametrize("value", ["safe", "1+1=2", ""])
    def test_passes_through_safe(self, value: str) -> None:
        assert escape_spreadsheet_cell(value) == value

    def test_hyphen_at_start_is_escaped(self) -> None:
        # A leading "-" still triggers the formula-prefix pattern, matching TS behaviour.
        value = "-already-prefixed-name=is-fine-mid"
        assert escape_spreadsheet_cell(value) == "'" + value


class TestJsToExponential2:
    """Mirror Number.prototype.toExponential(2) byte-for-byte."""

    @pytest.mark.parametrize(
        ("value", "expected"),
        [
            (1.234e-5, "1.23e-5"),
            (1.0e-7, "1.00e-7"),
            (9.99e-4, "9.99e-4"),
            (1.23e10, "1.23e+10"),
            (0.0, "0.00e+0"),
            (1.0, "1.00e+0"),
            (-2.5e-3, "-2.50e-3"),
        ],
    )
    def test_format_matches_js(self, value: float, expected: str) -> None:
        assert js_to_exponential_2(value) == expected

    def test_handles_nan(self) -> None:
        # JS: Number.NaN.toExponential(2) === "NaN"
        assert js_to_exponential_2(math.nan) == "NaN"


class TestJsToFixed:
    """Mirror Number.prototype.toFixed(N) byte-for-byte for non-negative values."""

    @pytest.mark.parametrize(
        ("value", "digits", "expected"),
        [
            # Round-half-up cases where Python banker's rounding diverges from JS.
            (0.03125, 4, "0.0313"),  # Python f"{0.03125:.4f}" -> "0.0312"
            (0.5, 0, "1"),           # Python round(0.5) -> 0; JS toFixed(0) -> "1"
            (1.5, 0, "2"),
            (2.5, 0, "3"),           # Python -> "2"; JS -> "3"
            # Standard cases.
            (1.0, 4, "1.0000"),
            (0.0, 2, "0.00"),
            (3.14159, 2, "3.14"),
            (3.14159, 3, "3.142"),
            (0.001234, 6, "0.001234"),
            (100.0, 0, "100"),
            # Already-rounded value (no change).
            (0.5000, 4, "0.5000"),
        ],
    )
    def test_format_matches_js(self, value: float, digits: int, expected: str) -> None:
        assert js_to_fixed(value, digits) == expected

    def test_handles_nan(self) -> None:
        assert js_to_fixed(math.nan, 4) == "NaN"
