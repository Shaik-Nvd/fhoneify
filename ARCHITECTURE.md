# Phoneify Architecture

## Overview

Phoneify is a modular monolith built with Next.js (frontend), Express (backend), PostgreSQL (database), Redis (cache), and BullMQ (job queue).

## Directory Structure

```
phoneify/
├── apps/
│   ├── frontend/          # Next.js 14+ with App Router
│   │   ├── app/           # App Router pages
│   │   ├── components/    # Reusable React components
│   │   ├── lib/           # Utilities, API client, stores
│   │   └── styles/        # Global CSS, Tailwind config
│   │
│   └── backend/           # Express API server
│       ├── src/
│       │   ├── db/        # Database connection, migrations, schema
│       │   ├── modules/   # Feature modules (auth, quote, sell, buy, etc.)
│       │   ├── middleware/# Express middleware
│       │   ├── utils/     # Shared utilities
│       │   └── config/    # Configuration
│       └── dist/          # Compiled output
│
├── packages/
│   └── shared/            # Shared types, constants, utilities
│       └── src/
│           ├── types.ts   # TypeScript types and enums
│           ├── constants.ts
│           └── utils.ts
│
└── docs/                  # Documentation
```

## Module Structure

Each backend module follows this structure:

```
modules/
└── {module-name}/
    ├── routes.ts         # Express routes
    ├── controller.ts     # Request handlers
    ├── service.ts        # Business logic
    ├── repository.ts     # Database queries
    └── schema.ts         # Input validation (Zod)
```

## Data Flow

```
Frontend (Next.js)
    ↓
API Client (axios)
    ↓
Express Routes
    ↓
Controllers (request validation)
    ↓
Services (business logic)
    ↓
Repositories (database queries)
    ↓
PostgreSQL
```

## Key Technologies

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14+ | Server-side rendering, routing, DX |
| Backend | Express.js | REST API, middleware, routing |
| Database | PostgreSQL | Relational data, ACID compliance |
| Cache | Redis | Session storage, caching, BullMQ |
| Queue | BullMQ | Async job processing |
| Validation | Zod | Type-safe input validation |
| Logging | Pino | Structured logging |
| Styling | Tailwind CSS | Utility-first CSS |

## Authentication Flow

1. User enters phone number
2. OTP sent via MSG91
3. User verifies OTP
4. JWT token issued (15m expiry)
5. Refresh token stored in Redis (7d expiry)
6. Token included in all subsequent requests

## Module Dependencies

- **Auth**: No dependencies (base module)
- **Quote**: Depends on Auth, Device data
- **Sell**: Depends on Auth, Quote, Listings
- **Buy**: Depends on Auth, Listings, Payments
- **Payments**: Depends on Auth, Orders
- **Notifications**: Depends on Auth (async via BullMQ)
- **Search**: Depends on Listings (async via BullMQ)

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│ Cloudflare / CDN (Static assets)        │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│ GCP Cloud Run (Frontend - Next.js)      │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│ GCP Cloud Run (Backend - Express)       │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
┌───────▼──┐ ┌────▼────┐ ┌──▼─────┐
│PostgreSQL│ │  Redis  │ │  GCS   │
└──────────┘ └─────────┘ └────────┘
```

## Security Considerations

- All secrets in environment variables
- JWT tokens for authentication
- RBAC (buyer, seller, admin roles)
- Input validation with Zod
- CORS enabled for frontend domain
- Helmet for security headers
- Rate limiting on auth endpoints
- SQL injection prevention via parameterized queries
- XSS prevention via React's built-in escaping

## Performance Optimization

- Redis caching for frequently accessed data
- Pagination on all list endpoints
- Database indexes on common queries
- BullMQ for async tasks (notifications, search sync)
- Elasticsearch for full-text search (Phase 2)
- Image optimization via GCS signed URLs
- Next.js static generation where possible

## Error Handling

- Custom error classes (AppError, ValidationError, etc.)
- Structured error responses
- Pino logging for debugging
- Graceful error recovery
- User-friendly error messages

## Testing Strategy

- Unit tests for services and utilities
- Integration tests for API endpoints
- Mock external services (MSG91, Razorpay, etc.)
- Database fixtures for consistent test data

## Monitoring & Logging

- Pino structured logging
- Request/response logging via pino-http
- Error tracking and alerting
- Performance monitoring
- Database query logging (development only)
