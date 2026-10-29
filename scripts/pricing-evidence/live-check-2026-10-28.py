"""Writes data/pricing-evidence/live-check-2026-10-28.jsonl: Cashify quotes recorded live on 2026-10-28 (cashify.in, owner's logged-in
session, quote pages only, no order placed) while checking five randomly drawn iPhones and then isolating the deductions that disagreed.
Each row is in the Measurement shape of measurements.jsonl; `base` is the Base Price on Cashify's quote page, `variant_get_upto` the
flawless quote of the same variant that day (box and charger present where the form asks for them).

    python -I scripts/pricing-evidence/live-check-2026-10-28.py
"""
import hashlib, json, os

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'pricing-evidence', 'live-check-2026-10-28.jsonl')
# model, storage GB, flawless reference that day, recorded base, answers
# answers: codes, box, charger ('yes'/'no'/'not_asked'), warranty/bill/age, esim
ROWS = [
    # random draw, seed 19522
    ('iPhone 16 Plus', 256, 55680, 51540, dict(codes=['C02'], box='no', charger='not_asked', warranty='yes', bill='yes', age='Below 3 months', esim='not_asked')),
    ('iPhone 11 Pro Max', 256, 18740, 17260, dict(codes=['C04', 'F06'], box='yes', charger='no')),
    ('iPhone 14 Pro', 512, 46500, 33300, dict(codes=['C04', 'F08'], box='yes', charger='not_asked', esim='Single eSIM')),
    ('iPhone 8', 256, 6150, 4590, dict(codes=['C02', 'F01', 'F06', 'S04'], box='no', charger='no')),
    # iPhone 6S 16 GB flawless, box, no charger: 2,060 vs reference 2,080 - a INR 20 charger gap, documented but not fitted (the 6S
    # combination reports never recorded the charger, so one row would shift every 6S deduction by the same INR 20).
    # isolating follow-ups
    ('iPhone 11 Pro Max', 256, 18740, 17660, dict(codes=['C04', 'F06'], box='yes', charger='yes')),
    ('iPhone 11 Pro Max', 256, 18740, 18060, dict(codes=['C04'], box='yes', charger='yes')),
    ('iPhone 8', 256, 6150, 5950, dict(codes=['F06'], box='yes', charger='yes')),
    ('iPhone 8', 256, 6150, 5740, dict(codes=['S04'], box='yes', charger='yes')),
    ('iPhone 8', 256, 6150, 6150, dict(codes=['C02'], box='yes', charger='yes')),
    ('iPhone 14 Pro', 512, 46500, 34500, dict(codes=['F08'], box='yes', charger='not_asked', esim='Single eSIM')),
    ('iPhone 14 Pro', 512, 46500, 46500, dict(codes=[], box='yes', charger='not_asked', esim='Single eSIM')),
    # second random draw, seed 43871 (29 Oct); iPhone 17 / 17 Pro references are Cashify's Get Upto that day (17 Pro flawless confirmed)
    ('iPhone XS Max', 256, 12640, 11940, dict(codes=['F03'], box='no', charger='no', date='2026-10-29')),
    ('iPhone 17', 512, 68500, 49030, dict(codes=['C02', 'F02', 'S03'], box='yes', charger='not_asked', warranty='yes', bill='yes', age='Below 3 months', esim='Single eSIM', date='2026-10-29')),
    ('iPhone 14 Plus', 512, 31270, 21890, dict(codes=['C04', 'F08', 'F13'], box='yes', charger='not_asked', date='2026-10-29')),
    ('iPhone 7', 256, 4730, 3050, dict(codes=['C02', 'F06', 'F13', 'S03'], box='no', charger='no', date='2026-10-29')),
    ('iPhone 17 Pro', 256, 101500, 90820, dict(codes=['F13', 'F18', 'S03'], box='yes', charger='not_asked', warranty='yes', bill='yes', age='Below 3 months', esim='Single eSIM', date='2026-10-29')),
    # isolating follow-ups, 29 Oct
    ('iPhone 17 Pro', 256, 101500, 101500, dict(codes=[], box='yes', charger='not_asked', warranty='yes', bill='yes', age='Below 3 months', esim='Single eSIM', date='2026-10-29')),
    ('iPhone 17 Pro', 256, 101500, 92680, dict(codes=['S03'], box='yes', charger='not_asked', warranty='yes', bill='yes', age='Below 3 months', esim='Single eSIM', date='2026-10-29')),
    ('iPhone 17 Pro', 256, 101500, 100240, dict(codes=['F18'], box='yes', charger='not_asked', warranty='yes', bill='yes', age='Below 3 months', esim='Single eSIM', date='2026-10-29')),
    ('iPhone 7', 256, 4730, 4730, dict(codes=['C02'], box='yes', charger='yes', date='2026-10-29')),
    ('iPhone 14 Plus', 512, 31270, 30390, dict(codes=['C04'], box='yes', charger='not_asked', date='2026-10-29')),
    ('iPhone XS Max', 256, 12640, 12340, dict(codes=['F03'], box='yes', charger='yes', date='2026-10-29')),
    ('iPhone 17 Pro', 256, 101500, 100900, dict(codes=['F13'], box='yes', charger='not_asked', warranty='yes', bill='yes', age='Below 3 months', esim='Single eSIM', date='2026-10-29')),
]

def inp(v, basis='explicit'):
    return {'value': v, 'basis': basis if v not in ('not_asked', 'not_shown') else 'not_offered'}

out = []
for i, (model, gb, ref, base, a) in enumerate(ROWS):
    codes = sorted(a['codes'])
    dev = []
    if a.get('warranty') == 'no': dev.append('WARRANTY_NO')
    if a['box'] == 'no': dev.append('BOX_NO')
    if a['charger'] == 'no': dev.append('CHARGER_NO')
    dev += codes
    key = '|'.join([model, str(gb), 'yes', 'yes', 'yes', a.get('warranty', 'not_asked'), a.get('bill', 'not_asked'), a['box'], a['charger'], a.get('age', 'not_shown'), a.get('esim', 'not_asked'), ','.join(codes)])
    out.append({
        'measurement_id': hashlib.sha1(f'live-2026-10-28:{i}:{key}'.encode()).hexdigest()[:12], 'obs_id': f'live-2026-10-28-{i:02d}',
        'archive': 'live-check-2026-10-28', 'member': 'cashify.in quote page', 'case_id': str(i), 'family': 'new_live_check',
        'model_key': model, 'model_label': None, 'storage': f'{gb}GB', 'storage_gb': gb, 'ram_gb': None,
        'observed_date': a.get('date', '2026-10-28'), 'date_basis': 'recorded_live', 'variant_get_upto': ref, 'get_upto_basis': 'live_flawless_quote_same_day',
        'outcome': 'NUMERIC_QUOTE', 'selling': base - 20, 'base': base, 'payout': None, 'processing_fee': None, 'imei_fee': 20,
        'inputs': {'calls': inp('yes'), 'touch': inp('yes'), 'original_screen': inp('yes'), 'warranty': inp(a.get('warranty', 'not_asked')),
                   'bill': inp(a.get('bill', 'not_asked')), 'box': inp(a['box']), 'charger': inp(a['charger']), 'esim': inp(a.get('esim', 'not_asked')),
                   'age': inp(a.get('age', 'not_shown'))},
        'defect_codes': codes, 'deviations': dev, 'class': 'baseline' if not dev else 'single_defect' if len(dev) == 1 else 'combo',
        'n_dev': len(dev), 'config_key': key, 'config_id': hashlib.sha1(key.encode()).hexdigest()[:12], 'also_in': [], 'export_duplicate_count': 1, 'flags': [],
    })
with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
    for r in out: f.write(json.dumps(r) + '\n')
print(f'wrote {len(out)} live observations')
