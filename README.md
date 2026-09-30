# 🚀 Fhoneify

India's modern smartphone resale platform built to make selling and buying pre-owned smartphones simple, transparent, and reliable.

Fhoneify is a production-ready, Cashify-inspired smartphone resale platform designed for the Indian market. The platform supports the complete device resale lifecycle — from authentication and device valuation to seller listings, buyer orders, payments, payouts, and administration.

The application is built as a modular monolith with a clear separation between frontend, backend, shared packages, infrastructure, and business modules.

## ✨ Features

### 👤 Authentication
- OTP-based mobile authentication
- JWT access tokens
- Refresh token mechanism
- Secure session management
- Role-based access control

### 📱 Device Valuation
- Device/model selection
- Condition-based questionnaires
- Dynamic pricing rules
- Warranty adjustments
- Device-age adjustments
- Variant-specific pricing
- Automated quote calculation

### 💰 Sell Your Phone
- Create a device listing
- Submit device condition
- Get an instant estimated price
- Seller information management
- Order/trade-in tracking
- Seller payout processing

### 🛒 Buy Smartphones
- Browse available devices
- Search and filter listings
- Device details
- Order placement
- Payment processing
- Order tracking

### 🛠️ Admin Panel
- Device/model management
- Pricing rule management
- Order management
- Seller management
- Buyer management
- Analytics and reporting
- Quote/pricing configuration

### ⚡ Infrastructure
- Redis caching
- Background jobs with BullMQ
- Elasticsearch-powered search
- Google Cloud Storage for media
- PostgreSQL persistence
- Razorpay payment integration

## 🏗️ Tech Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | Next.js 14+ / App Router |
| **Backend** | Node.js + Express.js |
| **Language** | TypeScript |
| **Database** | PostgreSQL 14+ |
| **Cache** | Redis 6+ |
| **Search** | Elasticsearch |
| **Queue** | BullMQ |
| **Object Storage** | Google Cloud Storage |
| **Authentication** | JWT + OTP |
| **OTP Provider** | MSG91 |
| **Payments** | Razorpay |
| **Package Manager**| pnpm |
| **Architecture** | Modular Monolith |

## 📐 Architecture

Fhoneify follows a modular monolith architecture.
This allows the application to maintain strong module boundaries while keeping deployment and development simpler than a microservices architecture.

```text
┌──────────────────────┐
│     User / Admin     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│       Next.js        │
│       Frontend       │
└──────────┬───────────┘
       REST / API
           ▼
┌──────────────────────┐
│     Express API      │
│       Backend        │
└──────────┬───────────┘
           │
 ┌─────────┴──────────────┬────────────────────────┐
 │                        │                        │
 ▼                        ▼                        ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  PostgreSQL  │ │    Redis     │ │ Elasticsearch│
│              │ │              │ │              │
│  Core Data   │ │ Cache/Queue  │ │    Search    │
└──────────────┘ └──────┬───────┘ └──────────────┘
                        │
                        ▼
                 ┌──────────────┐
                 │    BullMQ    │
                 │  Background  │
                 │     Jobs     │
                 └──────┬───────┘
                        │
       ┌────────────────┼────────────────┐
       ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│    MSG91     │ │     GCS      │ │   Razorpay   │
│     OTP      │ │    Media     │ │   Payments   │
└──────────────┘ └──────────────┘ └──────────────┘
```

## 📁 Project Structure

```text
fhoneify/
├── apps/
│   ├── frontend/
│   │   ├── app/            # Next.js App Router
│   │   ├── components/     # Reusable UI components
│   │   ├── features/       # Feature-specific frontend modules
│   │   ├── lib/            # API clients and utilities
│   │   └── public/         # Static assets
│   │
│   └── backend/
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── quote/
│       │   │   ├── sell/
│       │   │   ├── buy/
│       │   │   ├── orders/
│       │   │   ├── payments/
│       │   │   └── admin/
│       │   │
│       │   ├── middleware/
│       │   ├── config/
│       │   ├── jobs/
│       │   ├── routes/
│       │   └── server.ts
│       │
│       └── migrations/
├── packages/
│   └── shared/
│       ├── types/
│       ├── constants/
│       ├── schemas/
│       └── utils/
├── docs/
│   ├── architecture.md
│   ├── auth.md
│   ├── quote.md
│   ├── sell.md
│   ├── buy.md
│   ├── admin.md
│   └── deployment.md
├── .env.example
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## 🧩 Core Modules

### 🔐 Authentication
Responsible for user authentication and authorization.
**Flow:** Mobile Number ↓ Request OTP ↓ OTP Provider ↓ Verify OTP ↓ Create / Login User ↓ Issue Access + Refresh Tokens

### 💵 Quote Engine
The Quote Engine is one of the core business components of Fhoneify.
**Flow:** Device ↓ Model / Variant ↓ Condition Questions ↓ Warranty ↓ Device Age ↓ Other Adjustments ↓ Pricing Rules ↓ Final Quote

*Example: Base Price × Condition Adjustment × Age Adjustment × Warranty Adjustment × Other Adjustments = Final Quote*
This allows pricing rules to be changed without rebuilding the entire frontend application.

### 📱 Sell Module
Handles the seller-side device resale workflow.
**Flow:** Select Device ↓ Answer Condition Questions ↓ Calculate Quote ↓ Seller Details ↓ Pickup / Delivery Details ↓ Order Creation ↓ Device Verification ↓ Final Price ↓ Seller Payout

### 🛒 Buy Module
Handles the buyer-side marketplace experience.
**Flow:** Browse Devices ↓ Search / Filter ↓ View Device ↓ Add / Checkout ↓ Payment ↓ Order Confirmation ↓ Fulfillment

### 🛠️ Admin Module
The admin system provides operational control over the platform.
- **Device Management:** Brands, Models, Variants, Storage configurations, Device images, Device metadata
- **Pricing Management:** Base prices, Condition adjustments, Age adjustments, Warranty adjustments, Variant adjustments, Pricing rules
- **Order Management:** Buy orders, Sell orders, Order status, Seller information, Buyer information, Payment status, Payout status
- **Analytics:** Sales, Orders, Quotes, Conversion rates, Revenue, Seller payouts, Device demand

## 🗄️ Data & Infrastructure

- **PostgreSQL:** Primary relational database (Users, Devices, Models, Variants, Quotes, Orders, Payments, Payouts, Pricing rules)
- **Redis:** Caching, Session-related data, Rate limiting, BullMQ infrastructure, Temporary application state
- **Elasticsearch:** Device search, Full-text search, Filtering, Sorting, Search suggestions
- **Google Cloud Storage:** Device images, Seller-uploaded media, Documents, Other application assets
- **BullMQ:** Asynchronous processing (Notifications, Image processing, Search indexing, Payment-related jobs, Analytics processing, Other long-running tasks)

## 🚀 Getting Started

### Prerequisites
Make sure the following are installed:
- Node.js 18+
- pnpm
- PostgreSQL 14+
- Redis 6+
- Elasticsearch 8+ (if search functionality is enabled)

Verify your installation:
```bash
node --version
pnpm --version
psql --version
redis-server --version
```

### 📦 Installation

Clone the repository:
```bash
git clone <repository-url>
cd fhoneify
```

Install dependencies:
```bash
pnpm install
```

### ⚙️ Environment Configuration

Create your local environment file:
```bash
cp .env.example .env
```

Configure the required services. Example:
```env
# Application
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/fhoneify

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret

# OTP
MSG91_AUTH_KEY=your-msg91-key

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200

# Google Cloud Storage
GCS_PROJECT_ID=your-project-id
GCS_BUCKET_NAME=your-bucket
GCS_CLIENT_EMAIL=your-client-email
GCS_PRIVATE_KEY=your-private-key

# Razorpay
RAZORPAY_KEY_ID=your-key
RAZORPAY_KEY_SECRET=your-secret
```
> ⚠️ Never commit `.env` files, API keys, private keys, or production credentials to Git.

### 🗃️ Database Setup

Run the database migrations:
```bash
cd apps/backend
pnpm run migrate
```
If your project includes database seeding:
```bash
pnpm run seed
```

### ▶️ Running the Application

From the project root:
```bash
pnpm run dev
```
- Frontend → http://localhost:3000
- Backend → http://localhost:5000

### 🧪 Testing
```bash
# Run the complete test suite
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Run linting
pnpm run lint

# Run type checking
pnpm run typecheck
```

## 🔄 Development Workflow

**Recommended development flow:**
1. Create / update feature
2. Update shared types
3. Implement backend module
4. Add database migration
5. Implement frontend flow
6. Add tests
7. Run lint + typecheck
8. Test locally
9. Create Pull Request
10. Deploy

## 📚 Documentation
Detailed technical documentation is available in the `docs/` directory.

| Document | Description |
| --- | --- |
| `architecture.md` | System architecture |
| `auth.md` | Authentication and OTP |
| `quote.md` | Device valuation and pricing engine |
| `sell.md` | Seller/trade-in workflow |
| `buy.md` | Buyer marketplace workflow |
| `admin.md` | Admin operations |
| `deployment.md` | Production deployment |

## 🔌 API Structure
The backend API follows a modular REST architecture.

```text
/api/v1
├── /auth
│   ├── POST /otp/request
│   ├── POST /otp/verify
│   └── POST /refresh
├── /devices
│   ├── GET /
│   ├── GET /:id
│   └── GET /:id/variants
├── /quotes
│   ├── POST /
│   └── GET /:id
├── /sell
│   ├── POST /
│   └── GET /:id
├── /orders
│   ├── POST /
│   ├── GET /
│   └── GET /:id
├── /payments
│   └── POST /
└── /admin
    ├── /devices
    ├── /pricing
    ├── /orders
    └── /analytics
```

## 🔒 Security
Fhoneify follows production-oriented security practices, including:
- JWT-based authentication
- Refresh token rotation
- Password/secret protection
- API rate limiting
- OTP rate limiting
- Input validation
- Request sanitization
- Role-based authorization
- Secure HTTP headers
- Environment-based secrets
- Database parameterization
- Payment verification
- Audit logging

*Production secrets should always be stored using a secure secrets-management solution.*

## 📊 Business Flow
The complete Fhoneify resale ecosystem can be represented as:

```text
       ┌───────────────┐
       │     USER      │
       └───────┬───────┘
               │
      ┌────────┴────────┐
      │                 │
      ▼                 ▼
┌───────────┐     ┌───────────┐
│   SELL    │     │    BUY    │
└─────┬─────┘     └─────┬─────┘
      │                 │
      ▼                 ▼
 Select Device     Browse Devices
      │                 │
      ▼                 ▼
Device Questions   Search / Filter
      │                 │
      ▼                 ▼
 Quote Engine       Product Page
      │                 │
      ▼                 ▼
 Final Quote          Checkout
      │                 │
      ▼                 ▼
 Sell Order           Payment
      │                 │
      ▼                 ▼
Verification         Buy Order
      │                 │
      ▼                 ▼
Seller Payout       Fulfillment
```

## 🗺️ Development Roadmap

**Phase 1 — Core Platform**
- Project architecture
- Authentication
- Device catalog
- Quote engine
- Sell workflow
- Buy workflow
- Order management
- Admin panel
- Basic analytics

**Phase 2 — Production Infrastructure**
- Redis caching
- BullMQ workers
- Elasticsearch
- GCS media storage
- Payment integration
- Seller payouts
- Notification system
- Monitoring and logging

**Phase 3 — Scale**
- Advanced pricing engine
- Automated pricing updates
- Advanced search
- Recommendation engine
- Fraud detection
- Advanced analytics
- Performance optimization
- Automated deployment pipeline

## 🌍 Production Deployment
Production deployment should include:

```text
       ┌──────────────┐
       │  CDN / WAF   │
       └──────┬───────┘
              │
      ┌───────┴───────┐
      │               │
      ▼               ▼
┌────────────┐ ┌────────────┐
│  Next.js   │ │Express API │
│  Frontend  │ │  Backend   │
└────────────┘ └──────┬─────┘
                      │
     ┌────────────────┼──────────────────┐
     │                │                  │
     ▼                ▼                  ▼
┌──────────┐   ┌────────────┐     ┌─────────────┐
│PostgreSQL│   │   Redis    │     │Elasticsearch│
└──────────┘   └──────┬─────┘     └─────────────┘
                      │
                      ▼
               ┌────────────┐
               │   BullMQ   │
               │  Workers   │
               └────────────┘
```
See `docs/deployment.md` for complete deployment instructions.

## 🤝 Contributing
Contributions should follow the project's development standards.

Create a feature branch:
```bash
git checkout -b feature/device-pricing
```

Implement the feature. Add or update tests. Run validation:
```bash
pnpm run lint
pnpm run typecheck
pnpm run test
```

Commit your changes:
```bash
git commit -m "feat: add device pricing rules"
```

Push the branch and create a Pull Request.

## 📌 Engineering Principles
Fhoneify follows these core engineering principles:
- **Modular architecture** — keep business domains isolated.
- **Type safety** — use TypeScript across the stack.
- **API-first design** — frontend and backend communicate through well-defined APIs.
- **Configuration over hard-coding** — business rules should be configurable.
- **Secure by default** — protect authentication, payments, and user data.
- **Observable systems** — logs, metrics, and error tracking should be built into production services.
- **Scalable infrastructure** — asynchronous workloads should use queues where appropriate.
- **Testable business logic** — pricing and order logic should be independently testable.

## 📄 License
This project is proprietary software. All rights reserved.
Unauthorized copying, distribution, modification, or commercial use is prohibited unless explicitly permitted by the project owner.

---
**Fhoneify** - A modern smartphone resale platform built for the Indian market.
*Frontend → Next.js | Backend → Express.js | Database → PostgreSQL | Cache → Redis | Search → Elasticsearch | Queue → BullMQ | Storage → Google Cloud Storage | Payments → Razorpay | Authentication → OTP + JWT*

Built for scale. 🚀
