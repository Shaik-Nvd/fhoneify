# Final iPhone evidence intake

Source ZIPs are private local inputs and are not required to price a device or run the committed model tests. The locally retained source-inventory.json records their immutable hashes and member names. Quote-level JSON/JSONL and bulk audit outputs are excluded from the public repository. The generated local source path in summary.json records where the owner supplied them; it is not a runtime dependency.

To repeat extraction with the original ZIPs, run these commands from the repository root, replacing YOUR_SOURCE_FOLDER with a path on your computer:

```powershell
python -I data/pricing-evidence/final-data-2026-10-30/audit.py "YOUR_SOURCE_FOLDER"
python -I data/pricing-evidence/final-data-2026-10-30/refine_status.py
python -I data/pricing-evidence/final-data-2026-10-30/enrich_amounts.py
python -I data/pricing-evidence/final-data-2026-10-30/refine_inputs.py
python -I data/pricing-evidence/final-data-2026-10-30/test_audit.py
python -I data/pricing-evidence/final-data-2026-10-30/test_refine_inputs.py
python -I data/pricing-evidence/final-data-2026-10-30/verify_audit.py
python -I data/pricing-evidence/final-data-2026-10-30/analyse.py
node --import tsx scripts/pricing-evidence/import-final-data.ts
```

The final status, amount and input passes are required. The case numbering systems are distinct and explicit absent questions are not false answers. `analyse.py` regenerates derived contrasts; do not count those comparisons as extra collected quotations. The parser is iPhone-specific: new-brand intake needs its own explicit model/question mapping and regression fixtures. Do not silently treat an unsupported brand as an empty successful import.

Fit/replay commands do not need the raw ZIP folder:

```powershell
node --import tsx scripts/pricing-evidence/fit-calibration.ts --write
node --import tsx scripts/pricing-evidence/replay-final-data.ts --label=current
node --import tsx scripts/test/pricing.apple-evidence-service-reconciliation.test.ts
```

References in imported observations are flagged flawless-base proxies, not verified historical database references. Runtime pricing still uses the current repository reference. The 192 identical 15 Pro measurement IDs already present in the previous intake are included only once by the combined loader.
