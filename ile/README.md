# Ile

Transparent real estate marketplace for Nigeria — an Oja-structured product clone focused on
**fee transparency** and lower deal cost.

## Stack

- Vite + React + TypeScript + Tailwind CSS v4
- SurrealDB 3.x schema in `surreal/schema.surql` (SCHEMAFULL, PERMISSIONS, DEFINE ACCESS, COMPUTED)
- Cloudflare Worker stub in `worker/` (`ile-agents`) for fee/dispute HTTP helpers
- Local seed data when Surreal Cloud env is unset

## Develop

```bash
cd ile
npm install
npm run dev
```

Optional Surreal Cloud:

```bash
cp .env.example .env
# set VITE_SURREAL_URL to your Surreal Cloud WebSocket/HTTP endpoint
```

Apply schema (Cloud SQL editor or CLI):

```bash
# surreal sql --endpoint <url> --ns ile --db main < surreal/schema.surql
```

Worker (optional):

```bash
npx wrangler deploy
```

## Product

Brand proposal: **Ile** (Yoruba for home/house). Suggested subdomain: `ile.ada.ng`.

Core flows: listings grid → listing + fee sheet → deals → messaging → AI agents
(fee estimator, document Q&A, checklist, dispute helper).
