# Koro

Social logistics for Nigeria. The surface is a feed, stories, reels, explore, profiles, follows, DMs, comments, saves, search, and notifications. Underneath, a post is a shipment, a story is a live leg, a reel is packing or route proof, a follow is trust, and a DM is the deal thread where the price locks.

## Run without cloud credentials

```bash
cd koro
npm install
npm run dev
```

`npm run dev` downloads SurrealDB 3.3.5 if needed, starts it in memory on `127.0.0.1:8000` with no login, applies `surreal/schema.surql`, and loads the seed through the JS SDK. The dev server is http://127.0.0.1:5173.

`npm run check` does the same against a throwaway memory process and asserts:

- all 37 states are present
- invalid NIPOST codes are rejected, including LGA `00`, building `00`, and old 6-digit codes
- a locked price and a hidden fee cannot be written
- the clickable loop (claim → lock → live leg → proof → completed drop) lands in SurrealDB

A production build with no `VITE_SURREAL_URL` stays in seed mode in the browser. Do not put a database URL or token in a `VITE_` variable. A Worker secret named `SURREAL_URL` is optional and is only reported as configured or not from `/api/mode`.

Restarting `npm run dev` resets local memory to the seed.

## Click path

Viewing as **Seyi** (rider, Aba → Enugu):

1. Home shows Nkechi’s open engine-oil need with pickup, distance, hub, and the Koro fee.
2. Open that drop and choose **Claim — I am already going**.
3. Open Messages and **Lock** the total.
4. Back on the drop, **Share live leg**, **Add proof**, then **Mark drop complete**.
5. Seyi’s profile counts the drop. The price lines do not change.

Switch to **Adaeze** to read the delivered garri proof and its locked thread. Switch to **Nkechi** to post a new need. A bad postcode never shows a price. Pay on delivery does not add a fee.

Explore lists spare weight for all 37 states. Search accepts a postcode with or without spaces.
