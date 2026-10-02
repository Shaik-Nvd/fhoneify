-- PREPARED ONLY: production execution requires explicit approval.
-- Reads reference/profile metadata, no customer/auth/session tables.
-- Get Upto reference is not a clean final Selling price.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '15s';
WITH requested(id, brand, model, workbook_storage, storage) AS (VALUES
  ('FM001', 'Apple', 'Apple iPhone 8', '128 GB', '128GB'),
  ('FM002', 'Apple', 'Apple iPhone XS Max', '256 GB', '256GB'),
  ('FM003', 'Apple', 'Apple iPhone 11 Pro Max', '256 GB', '256GB'),
  ('FM004', 'Apple', 'Apple iPhone 12 Pro', '256 GB', '256GB'),
  ('FM005', 'Apple', 'Apple iPhone 14', '256 GB', '256GB'),
  ('FM006', 'Apple', 'Apple iPhone 14 Pro Max', '256 GB', '256GB'),
  ('FM007', 'Apple', 'Apple iPhone 15', '256 GB', '256GB'),
  ('FM008', 'Apple', 'Apple iPhone 15 Pro Max', '512 GB', '512GB'),
  ('FM009', 'Apple', 'Apple iPhone 16', '256 GB', '256GB'),
  ('FM010', 'Apple', 'Apple iPhone 16 Pro Max', '512 GB', '512GB'),
  ('FM011', 'Apple', 'Apple iPhone 17', '256 GB', '256GB'),
  ('FM012', 'Apple', 'Apple iPhone 17 Pro Max', '512 GB', '512GB'),
  ('FM013', 'Samsung', 'Samsung Galaxy M32', '4 GB/64 GB', '4 GB/64 GB'),
  ('FM014', 'Samsung', 'Samsung Galaxy A50s', '4 GB/128 GB', '4 GB/128 GB'),
  ('FM015', 'Samsung', 'Samsung Galaxy A72', '8 GB/128 GB', '8 GB/128 GB'),
  ('FM016', 'Samsung', 'Samsung Galaxy S21 Ultra 5G', '12 GB/256 GB', '12 GB/256 GB'),
  ('FM017', 'Samsung', 'Samsung Galaxy S23 FE 5G', '8 GB/128 GB', '8 GB/128 GB'),
  ('FM018', 'Samsung', 'Samsung Galaxy S25 Edge', '12 GB/256 GB', '12 GB/256 GB'),
  ('FM019', 'Samsung', 'Samsung Galaxy S26 Ultra', '12 GB/512 GB', '12 GB/512 GB'),
  ('FM020', 'Samsung', 'Samsung Galaxy Z Fold5', '12 GB/256 GB', '12 GB/256 GB'),
  ('FM021', 'Samsung', 'Samsung Galaxy Z Flip6 5G', '12 GB/256 GB', '12 GB/256 GB'),
  ('FM022', 'Samsung', 'Samsung Galaxy Note 10 Lite', '6 GB/128 GB', '6 GB/128 GB'),
  ('FM023', 'OnePlus', 'OnePlus 7 Pro', '8 GB/256 GB', '8 GB/256 GB'),
  ('FM024', 'OnePlus', 'OnePlus 9 5G', '8 GB/128 GB', '8 GB/128 GB'),
  ('FM025', 'OnePlus', 'OnePlus Nord', '8 GB/128 GB', '8 GB/128 GB'),
  ('FM026', 'OnePlus', 'OnePlus 8 Pro', '8 GB/128 GB', '8 GB/128 GB'),
  ('FM027', 'OnePlus', 'OnePlus 12', '12 GB/256 GB', '12 GB/256 GB'),
  ('FM028', 'OnePlus', 'OnePlus 13', '16 GB/512 GB', '16 GB/512 GB'),
  ('FM029', 'OnePlus', 'OnePlus 15', '12 GB/256 GB', '12 GB/256 GB'),
  ('FM030', 'OnePlus', 'OnePlus Nord 5', '12 GB/256 GB', '12 GB/256 GB'),
  ('FM031', 'OnePlus', 'OnePlus Nord CE 5', '8 GB/256 GB', '8 GB/256 GB'),
  ('FM032', 'OnePlus', 'Oneplus Open', '16 GB/512 GB', '16 GB/512 GB'),
  ('FM033', 'Xiaomi', 'Xiaomi Mi A2', '4 GB/64 GB', '4 GB/64 GB'),
  ('FM034', 'Xiaomi', 'Xiaomi 14 CIVI', '8 GB/256 GB', '8 GB/256 GB'),
  ('FM035', 'Xiaomi', 'Xiaomi Redmi 11 Prime', '4 GB/64 GB', '4 GB/64 GB'),
  ('FM036', 'Xiaomi', 'Xiaomi Redmi Note 9 Pro', '4 GB/128 GB', '4 GB/128 GB'),
  ('FM037', 'Xiaomi', 'Xiaomi Redmi Note 10 Pro Max', '6 GB/128 GB', '6 GB/128 GB'),
  ('FM038', 'Xiaomi', 'Xiaomi Redmi Note 12 Pro Plus 5G', '8 GB/256 GB', '8 GB/256 GB'),
  ('FM039', 'Xiaomi', 'Xiaomi Redmi Note 15 Pro 5G', '8 GB/128 GB', '8 GB/128 GB'),
  ('FM040', 'Xiaomi', 'Xiaomi Redmi 5', '3 GB/32 GB', '3 GB/32 GB'),
  ('FM041', 'Xiaomi', 'Xiaomi Redmi K50i 5G', '6 GB/128 GB', '6 GB/128 GB'),
  ('FM042', 'Xiaomi', 'Xiaomi 14', '12 GB/512 GB', '12 GB/512 GB'),
  ('FM043', 'Xiaomi', 'Xiaomi 14 Ultra', '16 GB/512 GB', '16 GB/512 GB'),
  ('FM044', 'Xiaomi', 'Xiaomi 15', '12 GB/512 GB', '12 GB/512 GB'),
  ('FM045', 'Xiaomi', 'Xiaomi 15 Ultra', '16 GB/512 GB', '16 GB/512 GB'),
  ('FM046', 'Xiaomi', 'Xiaomi 17', '12 GB/512 GB', '12 GB/512 GB'),
  ('FM047', 'Xiaomi', 'Xiaomi 17 Ultra', '16 GB/512 GB', '16 GB/512 GB'),
  ('FM048', 'Xiaomi', 'Xiaomi 17T', '12 GB/512 GB', '12 GB/512 GB'),
  ('FM049', 'Xiaomi', 'Xiaomi Redmi Turbo 5', '12 GB/256 GB', '12 GB/256 GB'),
  ('FM050', 'Xiaomi', 'Xiaomi Redmi Note 15 Pro Plus 5G', '12 GB/512 GB', '12 GB/512 GB')
)
SELECT q.id, q.brand, q.model, q.workbook_storage, q.storage AS application_storage,
  r."deviceKey", r."source", r."sourceUrl", r."currentPrice", r."matchConfidence", r."matchEvidence",
  r.status AS reference_status, r."lastVerifiedAt", r."lastAttemptedAt",
  r."lastFailureAt", r."consecutiveFailures", r."updatedAt" AS reference_updated_at,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - r."lastVerifiedAt"))/86400 AS reference_age_days,
  p."modelKey", p.status AS profile_status, p."warrantyMode", p."billMode", p."ageMode",
  p."questionLabels", p."variantsChecked", p."parserVersion", p."sourceUrl" AS profile_source_url,
  p."observedAt" AS profile_observed_at, p."updatedAt" AS profile_updated_at
FROM requested q
LEFT JOIN "ReferencePrice" r
  ON r."deviceKey" = lower(q.brand || '|' || q.model || '|' || q.storage)
LEFT JOIN "CashifyQuestionnaireProfile" p
  ON p."modelKey" = regexp_replace(lower(q.brand || '|' || q.model), '\s+', ' ', 'g')
ORDER BY q.id;
ROLLBACK;

-- No schema fields presently prove conditional box/charger/S Pen/eSIM
-- visibility or condition-specific warranty routing. Model-level modes
-- alone cannot substitute for fresh exact-variant questionnaire traces.
-- Apply lib/referencePricing/freshnessPolicy.ts using the deployment's
-- configured thresholds; the age column is diagnostic, not a cached verdict.
