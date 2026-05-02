"""Helpers shared by the three TSV writer methods on RegionResult.

Mirrors the webapp's `escapeSpreadsheetCell` (src/utils/exportData.ts), JS
`Number.prototype.toExponential(2)`, and JS `Number.prototype.toFixed(N)`
byte-for-byte. Kept private (leading underscore) because it's tightly coupled
to the webapp's export format and not part of the public API.
"""

from __future__ import annotations

import math
import re
from decimal import ROUND_HALF_UP, Decimal

_FORMULA_PREFIX_RE = re.compile(r"^[\t\r ]*[=+\-@]")


def escape_spreadsheet_cell(value: str) -> str:
    """Prepend a single quote if `value` would be interpreted as a spreadsheet formula.

    Mirrors src/utils/exportData.ts FORMULA_PREFIX_RE exactly.
    """
    return "'" + value if _FORMULA_PREFIX_RE.match(value) else value


def js_to_fixed(value: float, digits: int) -> str:
    """Format `value` like JS `Number.prototype.toFixed(digits)`.

    JS ``toFixed`` rounds at the *exact* IEEE 754 binary value (not at the
    shortest decimal representation). For example, the literal ``2.795`` is
    actually stored as ``2.7949999...``, so JS yields ``"2.79"`` rather than
    the seemingly-obvious ``"2.80"``. Python's ``format`` uses banker's
    rounding on the same exact binary value, but the rounding direction
    differs at exact halves — JS rounds half toward +inf
    (``(0.03125).toFixed(4) === "0.0313"``) while Python rounds half to even
    (``f"{0.03125:.4f}" == "0.0312"``).

    We initialise the ``Decimal`` from the float (capturing the exact IEEE
    754 value), then quantise with ``ROUND_HALF_UP`` to match JS for
    non-negative values (the only kind passed to TSV writers — counts,
    p-values, jaccard, dice, etc.). NaN renders as "NaN" (JS string).
    """
    if math.isnan(value):
        return "NaN"
    quant = Decimal(1).scaleb(-digits) if digits > 0 else Decimal(1)
    rounded = Decimal(value).quantize(quant, rounding=ROUND_HALF_UP)
    return f"{rounded:.{digits}f}"


def js_to_exponential_2(value: float) -> str:
    """Format `value` like JS `Number.prototype.toExponential(2)`.

    Differences from Python's f"{x:.2e}":
      * exponent has no leading zero (e.g. "1.23e-5", not "1.23e-05")
      * positive exponents are explicitly signed ("1.23e+10")
      * mantissa rounding follows JS (round half toward +inf for positive
        values), matching ``js_to_fixed`` semantics.
      * NaN renders as "NaN" (JS string) rather than "nan"
    """
    if math.isnan(value):
        return "NaN"
    if value == 0.0:
        return "0.00e+0"
    # Compute exponent and mantissa using Decimal initialised from the float
    # to capture the exact IEEE 754 value (matches JS) and ROUND_HALF_UP
    # (matches JS's "pick the larger n" tie-break).
    sign = "-" if value < 0 else ""
    abs_val = abs(value)
    exp = math.floor(math.log10(abs_val))
    mantissa_value = Decimal(abs_val) / Decimal(10) ** exp
    quant = Decimal("0.01")
    mantissa = mantissa_value.quantize(quant, rounding=ROUND_HALF_UP)
    # If mantissa rounded up to 10.00, normalise (e.g. 9.999 -> 10.00 -> 1.00e+next)
    if mantissa >= Decimal(10):
        mantissa = mantissa / Decimal(10)
        exp += 1
    sign_exp = "+" if exp >= 0 else "-"
    return f"{sign}{mantissa:.2f}e{sign_exp}{abs(exp)}"
