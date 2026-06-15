# 🚀 Fhoneify

**Fhoneify** is a Cashify-style used smartphone resale platform for India. It's a production-grade web app built as a modular monolith with Next.js, Express, PostgreSQL, Redis, BullMQ, and GCS.

## 📋 Project Structure

```
fhoneify/
├── apps/
│   ├── frontend/          # Next.js app (port 3000)
│   └── backend/           # Express API (port 5000)
├── packages/
│   └── shared/            # Shared types, utilities, constants
├── docs/                  # Module documentation
└── migrations/            # Database migrations
```

## 🏗️ Architecture

- **Frontend:** Next.js 14+ with App Router
- **Backend:** Express.js with modular structure
- **Database:** PostgreSQL with migrations
- **Cache:** Redis (sessions, cache, BullMQ)
- **Search:** Elasticsearch (full-text + filters)
- **Media:** Google Cloud Storage (GCS)
- **Queue:** BullMQ (async jobs)
- **Payments:** Razorpay (buy side), UPI/bank (seller payout)

## 🧩 Modules (Phase 1)

- **Auth:** OTP login (MSG91) + JWT + refresh tokens
- **Quote:** Device condition form → price estimate
- **Sell:** Create listing, basic seller endpoints
- **Buy:** Browse listings, place orders
- **Admin:** Order management, pricing rules, analytics

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (package manager)
- PostgreSQL 14+
- Redis 6+

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Run database migrations
cd apps/backend && pnpm run migrate

# Start development servers
pnpm run dev
```

### Environment Variables

See `.env.example` for all required environment variables.

## 📚 Module Documentation

See `docs/` directory for detailed module documentation:
- `docs/auth.md` — Authentication flow
- `docs/quote.md` — Quote engine
- `docs/sell.md` — Seller flow
- `docs/buy.md` — Buyer flow

## 🧪 Testing

```bash
pnpm run test
```

## 🚀 Deployment

See `docs/deployment.md` for deployment instructions.

## 📝 License

MIT
