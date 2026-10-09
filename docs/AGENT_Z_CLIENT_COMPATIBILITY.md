# Z release client compatibility

## First party quote and pickup callers

| Caller | Request | Purpose | Pickup capable |
|---|---|---|---|
| `app/quote/page.tsx` | `POST /api/quote/price` | Gets a signed quote for the selected device and exact diagnostics. | No |
| `app/quote/page.tsx` | `POST /api/quote/leads` | Schedules pickup; sends the accepted quote token, the token-bound diagnostics, and the displayed price. | Yes |
| `components/TopSellingModels.tsx` | `POST /api/quote/get-upto` | Displays homepage starting-price cards. | No |
| `app/quote/page.tsx` | `POST /api/quote/cashify-price` | Localhost-only experimental comparison display. | No |

No first-party code calls legacy `POST /api/quote` (`createQuote`) or submits a lead without a quote token. The quote page is the only first-party lead caller. Repository inspection cannot establish whether external API clients exist. The server schema still makes `quoteToken` optional for wire compatibility; any external client must obtain `/api/quote/price` first, retain its token, and submit that token with the same device and answers. The server now rejects tokenless/recomputed pickup submissions in every mode, so clients cannot rely on legacy fallback when rolling back pricing behavior. Confirm external consumers are migrated before release.

## Reload and changed-quote behavior

On reload, a saved final quote is re-requested from the authoritative endpoint. The page retains the old signed offer only when device, displayed price, Get Upto amount, and pricing version all match. If any of those change, it installs the current signed quote and navigates to step 11 so the customer can review it. The pickup form remains a separate step reached by the customer's Schedule Pickup click. A `QUOTE_CHANGED` response during submit also returns to step 11, obtains a new signed quote, and never retries or submits automatically.

Expired saved tokens are discarded by `loadQuoteSession`; a direct pickup URL first returns to price review and then requests a fresh quote. At review/pickup, the session preserves the quote-bound answers, including the Get Upto shortcut answers. If a token expires after revalidation but before pickup submit, the server's changed-quote response follows the same review flow.

## Local browser journey, no production lead writes

The API fixture overrides `DATABASE_URL` and `DIRECT_URL` with an unreachable sentinel before importing the server, replaces Prisma lead creation with an in-memory collector, and exposes only its local listener at `127.0.0.1:5007` in hybrid mode. Quotes in `--serve` use the current clock so browser token expiry works. It includes a deterministic OTP endpoint strictly inside this test harness. No production OTP route or auth code is changed.

In PowerShell terminal A, start the local API fixture:

```powershell
npx tsx scripts/test/pricing.release-flow.test.ts --serve
```

In terminal B, point the Next.js browser client at the fixture and start the UI:

```powershell
$env:NEXT_PUBLIC_API_URL = 'http://127.0.0.1:5007'
npm run dev:web
```

Open `http://localhost:3001/quote?brand=OnePlus&model=OnePlus%20Nord&storage=8%20GB%2F128%20GB&stage=storage&step=2`, complete the condition questions, and use test phone `9999999999` with OTP `000000` when prompted. Finish the pickup form and submit. `/health` reports `database: "disabled"` and the in-memory `leadCount`; `/fixture/state` returns the active mode, Nord reference amount, and the last lead's device, stored quote, and pricing audit without personal data. To simulate a changed reference between display and submission, POST `{"delta": 100}` to `http://127.0.0.1:5007/fixture/reference`; it changes only the Nord row in fixture memory. Use the exact local URL above so quote and OTP requests do not fall back to the API on port 5000.

Focused regression command:

```powershell
npx tsx scripts/test/pricing.release-flow.test.ts
```

This suite uses a sentinel database URL and in-memory lead spy.

After starting those two local services, run the portable browser regression:

```sh
node --import tsx scripts/test/pricing.agent-z-browser.test.ts
```

For POSIX shells, start Next with `NEXT_PUBLIC_API_URL=http://127.0.0.1:5007 npm run dev:web`. The browser blocks non-loopback requests and exercises questionnaire unchanged/changed direct pickup reload, coupon shortcut with mounted-token expiry409, and already-expired shortcut-token direct pickup reload. Every scenario checks zero persistence before fresh acceptance and displayed/stored payout equality. Valid same-version fallback offers retain the existing price lock; the fixture clock endpoint advances only test time.
