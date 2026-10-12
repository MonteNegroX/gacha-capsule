# Capsule

Open one graded card pack for 25 USDG on Robinhood Chain, or 25 USDC on Hyperliquid. Take the buyback, or Double a Common.

The public site is [capsulepull.xyz](https://www.capsulepull.xyz). This repository is the Next.js site and the pack worker. It is not a published library.

Last reviewed: 12 October 2026.

## Overview

A player pays for the $25 pack (`pokemon_25`). The vault opens the card and shows the insured value and the buyback quote. Within 24 hours the player takes the buyback or, on a Common, Doubles. No choice in that window and the vault buys the card back.

The Solana NFT stays in the Capsule vault. A win or a buyback does not send it to the player. A loan default can send it to the funder who asks for it.

Packs priced above $25 stay on the floor as Coming soon. They do not take payment.

### Dependencies

- **Site:** Next.js 16 on Vercel, Privy for sign-in, Prisma against the shared Supabase Postgres.
- **Payments:** Robinhood Chain (id 4663) for USDG. Hyperliquid (id 999) for Circle USDC. Buybacks and refunds are Robinhood USDG to the same 0x payer.
- **Opener:** the Collector Crypt bot in `opener/`, invoked by the Railway worker. The worker is the only process that should open packs and pay.

## What a player does

1. Connect the wallet that will pay.
2. Open the $25 pack. Leave the network on Robinhood unless you mean to pay USDC on Hyperliquid.
3. After the reveal, take the buyback or Double a Common.
4. To fund a listed card, or to list one from a Solana wallet, open [/lend](https://www.capsulepull.xyz/lend).

Double rolls 0 through 99. Below 49 is a win: 2× the buyback quote locked at open, and the card is listed for 7 days. If that winning loan is still unfunded after 2 days, the vault sells the card to Collector Crypt. A loss pays nothing. A loss is not sold on that 2-day timer.

On a repaid loan the funder earns 3% of principal and Capsule earns 1% of principal, for that 7-day term. That is not an annual yield. An unfunded loan or a default does not pay those percents.

## Local development

### Prerequisites

- Node.js 22
- pnpm 11.24.0 (`corepack enable`, then `corepack prepare pnpm@11.24.0 --activate`)
- A `.env` from someone who already runs the site. Do not invent a database URL.

### Environment

Copy names from [`.env.example`](.env.example). Values stay out of git.

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | Shared Supabase session pooler. Local and production use the same database. |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy app id. Safe to expose in the browser. |
| `PRIVY_APP_SECRET` | Privy server secret. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key. |
| `GACHA_TREASURY_ADDRESS` | Robinhood address that receives pack payments. Empty disables payment checks. |
| `GACHA_LAB_SECRET` | Password for `/lab`. Empty keeps the lab closed. |
| `GACHA_LAB_LIVE` | Must stay `false`. `true` spends the Collector Crypt bot's USDC. |
| `GACHA_BOT_DIR` | Folder of the opener. The Docker image sets this to `/bot`. |

Payout keys (`ROBINHOOD_TREASURY_PRIVATE_KEY` and the Solana opener key) belong in the worker environment, not in a committed file and not in this README.

### Run the site

```bash
pnpm install
pnpm dev
```

`pnpm install` runs `prisma generate`. Open [http://localhost:3000](http://localhost:3000).

Do not run `prisma db push`. It writes to the shared production database.

### Tests

There is no `pnpm test` script. Domain checks are `node:test` files next to the modules:

```bash
pnpm exec tsx --test lib/gacha/robinhood-transfer.test.ts
```

Run the other `*.test.ts` files the same way. Pass each path yourself. The shell will not expand the glob.

## Architecture

```
Browser  →  Next.js (Vercel)  →  POST /api/open/pay
                │
                ▼
         Supabase (Prisma)
                ▲
                │
     capsule-worker (Railway)  →  opener/  →  Collector Crypt
     ripcars-worker (Railway)  →  Rip Cars Garage Pack, same Solana key
                │
                ▼
         Robinhood USDG payout or refund
```

| Path | Purpose |
| --- | --- |
| `app/page.tsx` | Homepage: hero, pack floor, how it works |
| `app/lend/page.tsx` | Fund a listing, or list a Solana card |
| `app/api/open/pay/route.ts` | Verify a pack payment. Hyperliquid only when `network` is `hyperliquid`. |
| `scripts/capsule-worker.ts` | Production worker for Collector Crypt packs. Opens packs and sends USDG. |
| `scripts/ripcars-worker.ts` | Production worker for the Garage Pack. Same image, different start command. |
| `opener/` | Collector Crypt open, buyback, and held-card sale. Copied into the worker image. |
| `lib/capsule/` | Pack, choice, and lend rules that do not touch the network. |
| `documentation/` | GitBook draft. Not published. |
| `gacha-backend/` | Old draft. It is not the live opener and it is not committed. |

## Deployment

| Environment | Where | Notes |
| --- | --- | --- |
| Local | `pnpm dev` on port 3000 | Same database as production. |
| Site | Vercel project `gacha-capsule` | Manual deploy. The Git webhook often does not fire. |
| Worker | Railway, image from the `Dockerfile` | One replica of `capsule-worker`. The Garage Pack needs a second service running `ripcars-worker`. |

The `Dockerfile` installs with `pnpm install --frozen-lockfile`. If you add a dependency, commit the lockfile with it.

## Gotchas

- A second copy of the same worker on this database double-opens packs and double-pays. Do not start `scripts/capsule-worker.ts` or `scripts/ripcars-worker.ts` locally while that Railway service is running. The two Railway services are different: one ignores Garage Pack rows, the other handles only those rows.
- Restarting the worker while a row is `OPENING` leaves that row for manual review.
- `GACHA_LAB_LIVE` stays false. `/lab` is not linked from the site.
- Hyperliquid USDC is a way to pay for a pack. The refund and the buyback are still Robinhood USDG.
- Do not commit `.env`, `.env.local`, opener keys, or `gacha-backend/`.

## Related docs

- [documentation/README.md](documentation/README.md) — product draft for a future GitBook
- [documentation/buyback-and-double.md](documentation/buyback-and-double.md) — the choice rules
- [documentation/money.md](documentation/money.md) — what is a fee and what is not
- [documentation/contracts.md](documentation/contracts.md) — Robinhood addresses. That page was written before Hyperliquid payment existed in the site.
