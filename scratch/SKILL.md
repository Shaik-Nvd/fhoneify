---
name: pricing-reverse-engineering
description: "Systematic workflow for reverse-engineering pricing algorithms on e-commerce, trade-in, or service platforms. Use for: identifying price determinants, calculating condition-based deductions, and comparing pricing logic across different product generations."
---

# Pricing Reverse-Engineering

This skill provides a systematic workflow to identify how online platforms calculate prices, particularly for trade-in services (like Cashify, Gazelle) or dynamic pricing engines.

## Workflow

### 1. Baseline Establishment
Identify the "Perfect" or "Flawless" state to find the maximum possible price (the anchor).
- Navigate to the product page.
- Select all "Best" options (e.g., Flawless condition, Original Box, In Warranty).
- Record the baseline price for all storage/color/spec variants.

### 2. Single-Variable Testing (Deduction Mapping)
Test one defect at a time to measure its specific impact on the baseline.
- **Functional Defects**: Test "No Power", "No Calls", "Touch Issue".
- **Physical Defects**: Test "Cracked Screen", "Body Dents", "Scratches".
- **Administrative Defects**: Test "Out of Warranty", "No Bill", "No Box".

### 3. Edge Case Matrix
Identify "Critical Failure" points where the price drops significantly or the platform refuses the trade-in.
- **Combined Defects**: Test if multiple defects have an additive effect (Fixed Deduction) or a multiplicative effect (Percentage Drop).
- **Extreme Conditions**: Test the oldest/lowest-spec vs. newest/highest-spec models.

### 4. Algorithmic Modeling
Determine the type of algorithm used based on the data patterns:
- **Linear/Additive**: Price = Base - (Defect A + Defect B).
- **Multiplicative**: Price = Base * (Condition Multiplier).
- **Hybrid (Most Common)**: Base price determined by storage, then multiplied by a condition factor, then fixed deductions for missing accessories.

## Analysis Patterns

### Storage Delta
Compare the price difference between storage tiers (e.g., 128GB to 256GB). 
- If the delta is constant across conditions, it's **Additive**.
- If the delta shrinks for poor conditions, it's **Multiplicative**.

### Recency Weighting
Check if the platform values "Warranty" or "Originality" more for newer models.
- **Current Gen**: Higher weight on warranty/bill.
- **Legacy Gen**: Higher weight on functional parts.

## Deliverables
Always provide:
1. **The Base Price Table**: Exact values for all variants.
2. **The Deduction Matrix**: Percentage or fixed drops for each condition.
3. **The Algorithm Hypothesis**: Explanation of the underlying logic.
4. **Comparative Analysis**: If testing multiple generations.
