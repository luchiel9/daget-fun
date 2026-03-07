# Daget.fun
Daget.fun is built for everyone from discord admins and community managers to any members. People love sharing their wins with their communities through tools like raffles, Jupiter Mobile's Magic Links, or Binance Red Packets. 

While these methods work, they have some pain points:
- Raffles: Require manually collecting addresses and sending tokens one by one.
- Magic Links & Red Packets:Can easily be gamed by people who have the link to claim multiple times.

Daget.fun solves this by verifying each claim using Discord role IDs, completely preventing duplicate claims from the same person. Every single claim is transparent and can be fully audited both within the app and onchain.

For creators, the process is completely effortless. Just set up the Daget, share the link, and let the system handle the rest with total peace of mind.

Built with Next.js, Drizzle ORM, PostgreSQL, and Solana Web3. 

## Roadmap
1. Security & Reliability: Enhancing overall platform security while bulletproofing the live transaction execution engine to handle high-concurrency claims flawlessly.
2. Feature Expansion:
   - Enabling creators to run multiple active Dagets simultaneously.
   - Expanding support for arbitrary custom SPL tokens (beyond just SOL/USDC/USDT).
   - Introducing a native "Raffle Mode" that automatically settles transactions securely onchain when the timer expires.
3. Analytics & Dashboards: Building comprehensive audit trails and analytics so creators can easily track community engagement and distribution metrics.
4. Discord Bot Integration: Developing a native Discord bot that allows admins to create and manage Dagets (including Raffle modes) directly from their servers.

## Getting Started

First, install the dependencies using pnpm:

```bash
pnpm install
```

Then, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Available Scripts

- `pnpm dev` - Start the Next.js development server with Turbopack
- `pnpm build` - Build the application for production
- `pnpm start` - Run database migrations and start the Next.js production server
- `pnpm worker` - Run the worker service (`src/worker/index.ts`)
- `pnpm db:generate` - Generate database migrations using Drizzle
- `pnpm db:migrate` - Run database migrations
- `pnpm db:studio` - Open Drizzle Studio to explore the database
- `pnpm test` - Run tests using Vitest
