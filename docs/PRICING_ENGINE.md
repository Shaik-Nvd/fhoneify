# Fhoneify Competitive Pricing Engine

This document outlines the exact mathematical logic used by the Fhoneify application to calculate both the "Get Upto" estimated price and the final quoted price after device diagnostics.

## 1. Competitive Markup Logic (The "Get Upto" Price)

When a customer selects their device model and storage variant, the application fetches the raw baseline market price (derived from real-time competitors like Cashify).

To ensure Fhoneify always offers a superior, competitive price, the system immediately applies a tiered percentage markup based on the baseline price:

* **Tier 1 (Budget / Entry):** `Baseline Price <= Rs. 20,000`
  * **Markup:** +8%
  * **Formula:** `Fhoneify Base Price = Baseline Price x 1.08`

* **Tier 2 (Mid-Range):** `Rs. 20,000 < Baseline Price <= Rs. 50,000`
  * **Markup:** +6%
  * **Formula:** `Fhoneify Base Price = Baseline Price x 1.06`

* **Tier 3 (Premium):** `Baseline Price > Rs. 50,000`
  * **Markup:** +4%
  * **Formula:** `Fhoneify Base Price = Baseline Price x 1.04`

### Example - iPhone 13
* **Competitor Baseline Price:** Rs. 23,950
* **Tier Applied:** Tier 2 (> 20K, <= 50K) => +6% Markup
* **Calculation:** `Rs. 23,950 x 1.06`
* **Customer Sees:** "Get Upto Rs. 25,387"

---

## 2. Final Price Calculation (Stage 8)

The "Get Upto" price assumes the device is in **absolutely flawless condition**. As the customer proceeds through the 7-stage diagnostic questionnaire, they declare any functional or cosmetic defects. Upon completing registration and OTP verification (Stage 7), they reach Stage 8 where the **Condition Multiplier** is applied to the Fhoneify Base Price.

### Condition Multiplier Tiers

**A. Flawless / Like New (1.0x -> 100% of value)**
* 0 defects, 0 hardware issues, original screen, perfect touch & cellular calls.

**B. Good Condition (0.85x -> 85% of value)**
* Minor cosmetic defects OR exactly 1 minor hardware issue, core functions perfect.

**C. Fair Condition (0.65x -> 65% of value)**
* Non-original screen, display glass broken, OR back glass broken.

**D. Poor Condition (0.40x -> 40% of value)**
* Touch screen failure, cannot make/receive calls, OR 2+ hardware component failures.

> **WARNING - Minimum Price Guarantee:** No matter how severe the device condition, the final quoted price will never drop below a hardcoded minimum of Rs. 500.

---

## 3. End-to-End Example Scenario
**Device:** Apple iPhone 15 Pro (128GB) | **Competitor Baseline:** Rs. 62,600

* **Tier Applied:** Tier 3 (> 50K) => +4% Markup
* **Step 1 - Markup Applied:** `Rs. 62,600 x 1.04 = Rs. 65,104`
* **Customer Sees:** "Get Upto Rs. 65,104"
* **Step 2 - Diagnostics:** Customer declares: Display is broken
* **Condition Evaluated:** Fair Condition => 0.65x Multiplier
* **Step 3 - Final Quote:** `Rs. 65,104 x 0.65 = Rs. 42,317.60`
* **Customer Sees at Stage 8:** Final Guaranteed Price: **Rs. 42,318**
