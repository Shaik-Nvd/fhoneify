# Prospective evidence integration review — 2026-10-03

This review integrates Claude's committed prospective result fixture without changing pricing code or coefficients. Raw tester values and prior derived results remain in their original fixtures. The correction overlay is `scripts/pricing/fixtures/claude-prospective-correction-2026-10-03.json`.

## OnePlus Open 16 GB/512 GB

The frozen prediction for both lines and heavy-spots cases was ₹11,700 at Get Upto ₹51,650. `OPEN_TR_B` and `OPEN_TR_C` each reported ₹11,700, a ₹0 signed error. They are temporal repeats, not unseen-condition validation; both records reference the same screenshot SHA-256 (`e2faee…c5ab0a`), so the capture artifact is shared. `OPEN_TR_A` timed out in the questionnaire and has no price. Do not call it a successful clean control. The ₹40,310 clean observations are from 2026-10-02 at the same Get Upto, and remain the previous block's clean evidence.

## Apple iPhone 17 256 GB

The new completed control is `FM011_ESIM_TR_A`: clean final Selling ₹49,210 at Get Upto ₹65,000; warranty No, bill Yes, Single eSIM, box present; age, charger, and S Pen were not asked. Its screenshot hash is `406ac9…f3d30b`.

Tester A remains ₹46,750, but its recorded warranty answer is Yes. It is not a warranty-No baseline. Against that prior baseline, the workbook's B/C final prices yielded deductions ₹8,820 and ₹11,570. Recomputing from the new warranty-No clean control gives:

- Screen scratches: ₹49,210 − ₹37,930 = **₹11,280**.
- Screen plus body scratches: ₹49,210 − ₹35,180 = **₹14,030**.

Both derived amounts increase by ₹2,460, exactly the difference between the two clean prices. The exact variant and stated reference align. The workbook intent for warranty, bill, Single eSIM (after the owner correction), box, and charger is consistent with the control where those questions are asked; age is intended only where asked. However, B/C have no observation timestamps or verified Cashify traces/screenshots, so actual conditional question visibility and selected answers cannot be confirmed. They cannot establish same-day control comparability. Therefore the revised values are provisional same-reference arithmetic, not validated defect deductions. Preserve the earlier values as historical arithmetic; neither pair is fitted into the candidate.

## Reproduction

From the pricing worktree:

```powershell
$r = Get-Content scripts/pricing/fixtures/claude-prospective-results-2026-10-03.json -Raw | ConvertFrom-Json
$c = Get-Content scripts/pricing/fixtures/claude-prospective-correction-2026-10-03.json -Raw | ConvertFrom-Json
$raw = Get-Content scripts/pricing/fixtures/team-workbook-development-cases-2026-10-02.json -Raw | ConvertFrom-Json
$a = $raw | Where-Object caseId -eq 'FM011_A'
$b = $raw | Where-Object caseId -eq 'FM011_B'
$cc = $raw | Where-Object caseId -eq 'FM011_C'
[pscustomobject]@{ OpenBError = $r.rows[1].finalPrice - $r.rows[1].frozenPrediction; OpenCError = $r.rows[2].finalPrice - $r.rows[2].frozenPrediction; IPhone17Scratch = $c.iphone17_256.newVerifiedCleanControl.finalPrice - $b.observed; IPhone17Combined = $c.iphone17_256.newVerifiedCleanControl.finalPrice - $cc.observed; TesterAWarranty = $a.diagnostics.warranty }
```

Expected values: `0`, `0`, `11280`, `14030`, and `False`. The last value documents why tester A is not the warranty-No baseline. This arithmetic does not validate B/C route comparability. Validate patch formatting with `git diff --check`; no pricing-engine suite is affected by this evidence-only integration.
