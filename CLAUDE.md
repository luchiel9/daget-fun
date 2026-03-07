# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Daget.fun is a role-gated onchain giveaway platform. Discord admins distribute tokens (SOL, USDC, USDT) to community members verified by Discord role membership on the Solana blockchain. Claims are processed asynchronously by a background worker.

## Commands

```bash
pnpm dev              # Next.js dev server with Turbopack
pnpm build            # Production build
pnpm start            # Run migrations + start production server
pnpm lint             # ESLint
pnpm test             # Vitest in watch mode
pnpm test:run         # Vitest single run (CI)
pnpm test:coverage    # Vitest with coverage
pnpm db:generate      # Generate Drizzle migrations from schema changes
pnpm db:migrate       # Run pending migrations
pnpm db:push          # Push schema directly to database (dev)
pnpm db:studio        # Drizzle Studio GUI
pnpm worker           # Run background claim processor
pnpm dev:worker       # Run worker with .env loaded
```

Run a single test file: `pnpm vitest run src/app/api/claims/__tests__/random-mode-claim.test.ts`

## Tech Stack

- **Framework:** Next.js 16 (App Router, React 19) with TypeScript strict mode
- **Styling:** Tailwind CSS 3 with custom arcade theme (Inter, Space Mono, Press Start 2P fonts)
- **Database:** PostgreSQL via Drizzle ORM — schema in `src/db/schema.ts`, migrations in `drizzle/`
- **Cache/Rate Limiting:** Redis via ioredis
- **Auth:** Discord OAuth 2.0, JWT sessions in HTTP-only cookies (`src/lib/session.ts`, `src/lib/auth.ts`)
- **Blockchain:** Solana Web3.js + SPL Token for transfers
- **Encryption:** libsodium for wallet private key encryption with key versioning
- **Testing:** Vitest + happy-dom + @testing-library/react
- **Path alias:** `@/*` → `./src/*`

## Architecture

### Request Flow

API routes live in `src/app/api/`. All mutating endpoints require an `Idempotency-Key` header (24h cache in DB). Redis-backed rate limiting applies per-user and per-IP. Auth is checked via JWT cookie → `src/lib/auth.ts`.

### Claim Processing Pipeline

1. User calls `POST /api/claims` → claim row inserted with status `created`
2. Background worker (`src/worker/`) polls every 3 seconds, acquires claims via `FOR UPDATE SKIP LOCKED`
3. `src/worker/processor.ts` builds and submits Solana transaction → status becomes `submitted`
4. Worker polls for confirmation → status becomes `confirmed` or retries with exponential backoff (10s, 30s, 60s, 2min, 5min, max 5 attempts)
5. Failed claims go to `failed_retryable` or `failed_permanent`

### Database Layer

- Singleton connection pool in `src/db/index.ts` (important for serverless)
- Schema: `src/db/schema.ts`, Relations: `src/db/relations.ts`
- Key constraint: one active wallet per user, one active daget per creator, one claim per user per daget
- Atomic claim counting uses row-level locks to prevent overclaims

### Key Modules

| Module | Purpose |
|--------|---------|
| `src/lib/solana.ts` | Transaction building, signing, ATA creation |
| `src/lib/crypto.ts` | Wallet encryption/decryption (libsodium) |
| `src/lib/discord-verify.ts` | Discord role membership verification |
| `src/lib/validation.ts` | Zod schemas for API input validation |
| `src/lib/rate-limit.ts` | Redis rate limiting |
| `src/lib/idempotency.ts` | Idempotency key handling |
| `src/lib/cursor.ts` | Cursor-based pagination encoding |
| `src/lib/random-distribution.ts` | Random amount allocation (basis points) |
| `src/worker/reconciliation.ts` | Transaction consistency checks |

### Route Groups

- `src/app/(dashboard)/` — Protected dashboard pages (create, dagets, claims, wallet, notifications)
- `src/app/open/` — Public claim pages (no auth required)
- `src/app/auth/` — Discord OAuth login/callback flows
- `src/app/api/` — REST API endpoints

### Daget Types

- **Fixed:** Each claimer gets the same amount
- **Random:** Amount varies per claim using min/max basis points configuration

### Supported Tokens

SOL (native), USDC, USDT — metadata and mint addresses in `src/lib/tokens.ts`

## Environment

Requires `.env` file — see `.env.example`. Key variables: `DATABASE_URL`, `REDIS_URL`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `SESSION_SECRET`, `WALLET_ENC_KEY_V1`, `SOLANA_CLUSTER`, `NEXT_PUBLIC_APP_URL`.

## Deployment

Two Docker images: `Dockerfile.web.pnpm` (Next.js standalone + auto-migration) and `Dockerfile.worker` (background processor). Both use Node 22-alpine with pnpm.
