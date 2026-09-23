# Pricing Condition Engine

This record compares the engine immediately before and after `f1034f4`. Status describes the code as found before the 2026-09-20 repair; the final column records the repair.

| Condition | Old input field | Old deduction | Current input field | Deduction after `f1034f4` | Existing constant | Status | Resolution |
|---|---|---:|---|---:|---:|---|---|
| Age | `mobileAge` | age table/model multiplier | `mobileAge` | model multiplier | per brand/family | WORKING | Preserved |
| Warranty | `warranty` | model multiplier | `warranty` | model multiplier | per brand/family | FIELD_MISMATCH | Current UI fields now void warranty and select `above11` |
| Valid bill | `validBill`/`accessories.bill` | model GST/bill factor | same | same | per brand/family | WORKING | Preserved |
| Cracked/glass-broken screen | `defects.screen_scratch` + `screenCondition` | 35% × scale | same | ₹0 on most Android paths | 35% | REMOVED | Restored |
| Original/replaced screen | `originalScreen` | model retention | same | ignored outside Apple | `originalScreenPenalty` | DISCONNECTED | Reconnected |
| Touch | `touch` | model retention | same | ignored outside Apple | `touchPenalty` | DISCONNECTED | Reconnected |
| Screen spots | `defects.screen_spot` | 25% × scale; detail ignored | `screenSpots` | ₹0 on most paths | historical 15%/25% | REMOVED | Granular rule restored |
| Screen lines | `defects.screen_spot` | 25% × scale; detail ignored | `screenLines` | ₹0 on most paths | historical 20%/30% | REMOVED | Granular rule restored |
| Discoloration | `defects.screen_spot` | 25% × scale; detail ignored | `screenDiscoloration` | ₹0 on most paths | historical 10%/25% | REMOVED | Granular rule restored |
| Panel | `defects.panel_missing` | 20% × scale; detail ignored | `bodyPanel` | ₹0 | historical 15%/20% | REMOVED | Granular rule restored |
| Screen scratches | `screenCondition` | 8%/15% × scale | same | Apple only | 8%/15% | DISCONNECTED | Shared across brands |
| Body scratches | `bodyScratches` | 2%/5% × body scale | same | ₹0 | historical 3%/8% | REMOVED | Granular rule restored |
| Dents | `bodyDents` | 2% light; major ignored | same | ₹0 | historical 5%/12% | REMOVED | Granular rule restored |
| Bent frame/body | `defects.panel_missing` | 20% × scale; detail ignored | `bodyBent` | ₹0; `Phone not bent` also matched naive substring checks | historical 15%/25% | FIELD_MISMATCH | Granular rule restored; negative option handled exactly |
| Front camera | `hardware.front_camera` | ₹0; map disconnected | same | selected-brand overrides only | 12.53% | DISCONNECTED | Shared map with preserved overrides |
| Back camera | `hardware.back_camera` | ₹0; map disconnected | same | selected-brand overrides only | 22.3% | DISCONNECTED | Shared map with preserved overrides |
| Speaker | `hardware.speaker` | ₹0; map disconnected | same | ₹0 | 10% | DISCONNECTED | Reconnected |
| Microphone | `hardware.microphone` | ₹0; map disconnected | same | ₹0 | 10% | DISCONNECTED | Reconnected |
| Charging | `hardware.charging` | ₹0; map disconnected | same | ₹0 | 10% | DISCONNECTED | Reconnected |
| Battery | `hardware.battery_*` | ₹0; map disconnected | same | selected-brand overrides only | 5%/15% | DISCONNECTED | Shared map with preserved overrides |
| Buttons | `hardware.volume/power/silent` | ₹0; map disconnected | same | ₹0 | 2%/5% | DISCONNECTED | Reconnected |
| Sensors | `hardware.fingerprint/face/proximity` | ₹0; map disconnected | same | Apple Face ID only; iPhone 14 override was negative | shared map/model override | DISCONNECTED | Reconnected; non-positive override cannot reward damage |
| Wi-Fi | `hardware.wifi` | ₹0; map disconnected | same | ₹0 | 12% | DISCONNECTED | Reconnected |
| Bluetooth | `hardware.bluetooth` | ₹0; map disconnected | same | ₹0 | 5% | DISCONNECTED | Reconnected |
| SIM/network | `calls` | scrap value | `calls` | ₹200/₹1,200 scrap value | existing scrap rules | WORKING | Preserved |
| Other hardware | `hardware.camera_glass/vibrator/s_pen/hinge` | ₹0; map disconnected | same | ₹0 | 2%–20% shared map | DISCONNECTED | Reconnected |
| Box | `accessories.box`/`box` | +₹380/model override | same | same | `COMMON_BONUSES.box` | WORKING | Preserved |
| Charger/accessories | `accessories.charger`/`charger` | Samsung/Vivo model effect | same | same | ₹80/₹280 rules | WORKING | Preserved; broader effects need calibration evidence |

## Rule hierarchy

The engine uses global condition values, then brand/family scales from `ModelParams`, then existing model-family overrides for age, bill, battery, camera, screen, or accessory behavior. A model-specific rule is retained only where repository history contains calibration evidence. It does not create per-device formulas.

The server pipeline is:

`reference price → age/bill/warranty → screen → body → functional → accessories → Cashify-equivalent → existing 8%/6%/4% uplift (₹2,000 cap) → final quote`

Screen-replacement conditions use the largest applicable screen-repair deduction, and a dead touch screen waives cosmetic/replacement overlap. Other distinct condition groups use the historical penalty-summation model. The signed server result remains the only final quote source.

## Calibration

Run `npm run pricing:compare-cashify` with manually verified, same-variant observations. Compare `fhoneifyCashifyEquivalent` with Cashify's actual condition quote before evaluating uplift. New numeric rules require grouped evidence and approval; absent evidence is `NEEDS_CALIBRATION`.

The 2026-09-20 calibration uses eight standardized observations and six
condition-isolation controls. Values are centralized in
`lib/pricing/calibration.ts` and affect only the measured heavy-screen-scratch
condition; other screen, body, functional, accessory, and uplift rules retain
their historical values.

| Group | Parameter | Previous | Calibrated | Evidence |
|---|---|---:|---:|---|
| OnePlus standard/Nord | out-of-warranty age multiplier | 0.7966 | 0.725 | Three devices plus OnePlus 13 old/no-screen control |
| OnePlus standard/Nord | heavy-scratch scale | 0.80 | 1.00 | OnePlus 13 young/old isolation pair and three standardized quotes |
| Apple Pro/Pro Max | screen-scratch scale | 1.05 to 1.25 | 0.50 | Three standardized heavy-scratch quotes, iPhone 15 Pro screen isolation, and catalog-wide light/heavy ordering |
| iPhone 15 Pro generation | young/in-warranty multiplier | 0.745160 | 0.912 | Live young control plus the existing 14 Pro/16 Pro sequence |
| Samsung S-series slab | heavy-scratch scale | 1.10 | 0.75 | S24 isolation pair and the pre-`f1034f4` historical scale |
| Samsung foldable | heavy-scratch scale | 1.10 | 1.50 | Fold6 isolation pair plus the historical foldable screen multiplier |

### Documented calibration outlier: iPhone 14 Pro Max 256GB

The standardized historical profile (old/out of warranty, valid bill, box,
heavy screen scratches) has a Cashify quote of ₹38,730 against an engine
Cashify-equivalent of ₹31,354 using its then-fresh ₹44,670 reference price.

On 2026-09-20, Cashify's current calculator produced ₹42,690 for the matching
256GB variant with calls, touch, original screen, Dual eSIM, no screen/body or
functional faults, and the original box. Its current public reference was
₹45,080; the engine's no-screen equivalent at that reference is ₹34,173.
Cashify did not ask for age, warranty, or bill in that flow, so the control
cannot safely establish an old/out-of-warranty multiplier. It demonstrates a
material Apple 14 Pro Max generation/family gap, but does not justify a
model-specific override or a new Apple-wide numeric rule.

Status: `DOCUMENTED_OUTLIER`. Keep the calibrated production rule unchanged
until a Cashify observation exposes equivalent age/warranty semantics or a
second supported Apple 14 Pro Max observation confirms a generation-level rule.

## Reference semantics (2026-09-23)

`ReferencePrice.currentPrice` is Cashify's live public "Get Upto" (refreshed weekly).

- **Fhoneify Get Upto** (`startingPrice`, the figure on the homepage cards and
  the quote page before any answer) = `computeFhoneifyGetUpto(reference)` =
  `applyCompetitorUplift(reference, reference)`: 8% / 6% / 4%, extra capped at
  ₹2,000. No age, warranty, bill, box, charger or condition rule runs.
- **Final offer** (after the questions) is unchanged: brand condition rules on
  the reference → Cashify condition equivalent → the same uplift.
- `lib/cashify_prices.json` (the DB-down fallback) is regenerated from
  ReferencePrice with `npm run reference-prices:export`, then copying
  `cashify_prices.generated.json` over it. Before 2026-09-23 it held a base
  pre-inflated to Get Upto ÷ model multiplier (commit `cbc344a`).

Root cause of Fhoneify's Get Upto starting below Cashify: the quote page showed
the perfect-condition *final offer* as Get Upto, so the brand age multiplier
(0.7496 for iPhone 14/15) and Android 0.98/+₹380 ran on a figure that was
already Cashify's Get Upto. Guarded by `npm run test:pricing:get-upto`.
