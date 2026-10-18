# Ile — Nigeria stays (Airbnb-style)

Stays marketplace covering all **37** Nigerian states + FCT, with mandatory
**NIPOST 11-character alphanumeric building postcodes** and transparent Naira totals.

## Develop

```bash
cd ile
npm install
npm run dev
```

## Postal code rule

Canonical compact form: `SSLLDDDAABB` (11 chars), e.g. `FC02A09DB09`.  
Display: `FC 02 A09 DB 09`. Listings without a valid code are rejected.

## Stack

Vite + React + Tailwind · SurrealDB schema in `surreal/schema.surql` · Cloudflare Pages-ready static build.
