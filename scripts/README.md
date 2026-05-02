# scripts/

Tooling that doesn't ship in the wheel or the React build, but is committed for
reproducibility.

## `generate-parity-fixtures.mts`

Regenerates the golden TSV fixtures used by
`python/tests/test_parity_with_webapp.py`. Imports the actual webapp TS modules
(`src/utils/csvParser.ts`, `src/utils/exportData.ts`, `src/utils/statistics.ts`)
so the fixtures are exactly what the live web tool would emit if you clicked
"Export Region Summary" / "Export Matrix" / "Export Statistics" on each
bundled sample.

### When to run

* After modifying `csvParser.ts`, `exportData.ts`, or `statistics.ts`.
* After adding or replacing a bundled sample in `python/src/venn_diagram_lab/_data/samples/`.
* After updating the `SAMPLES` table inside the script itself.

### How

```bash
npm run fixtures:parity
```

Then re-run the parity test suite to confirm Python still matches:

```bash
.venv/bin/pytest python/tests/test_parity_with_webapp.py -v
```

If the parity tests now fail, decide whether the webapp change was intentional
(update Python to match) or accidental (revert the webapp change).
