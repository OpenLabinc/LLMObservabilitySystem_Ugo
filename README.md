# Supercal

Supercal keeps **Apple Calendar** and the **Google Calendar on your Gmail account** on the same clock. A timer in the server reads both, copies anything that exists on only one side, and when the two copies differ it keeps the one that was edited more recently.

Until both accounts are connected, the same timer runs against a **practice desk** so you can watch the sync without writing to your real calendars.

## Run

SurrealDB 3.x is the system of record (`calendar` / `main`). If it is not already running, `npm run dev` starts a local `surrealkv` database.

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173. The API listens on http://127.0.0.1:8787.

Leave that process running. The sync period defaults to 15 minutes. You can change it in the app (30 seconds through 6 hours). **Sync now** runs a pass immediately.

```bash
npm test
npm run typecheck
```

## Connect Apple Calendar

1. At [appleid.apple.com](https://appleid.apple.com), create an app-specific password.
2. In Supercal, enter your Apple ID and that password.

Supercal signs in to iCloud CalDAV (`https://caldav.icloud.com`) and uses the calendar named Calendar or Home, otherwise the first calendar of events. Your normal Apple ID password will not work.

## Connect the Gmail calendar

1. In Google Cloud, enable the Google Calendar API.
2. Create an OAuth client. Authorized redirect URI:

   `http://127.0.0.1:8787/api/connect/google/callback`

3. Copy `.env.example` to `.env` and set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
4. Restart the server and choose **Connect Gmail**.

The granted scope is Google Calendar plus email, so Supercal can name the account. It does not read mail.

Live sync starts only when **both** accounts are connected. A one-sided connection never writes practice events into a real calendar.

## What a sync pass does

For events from 90 days ago through the next year:

- Present on only one calendar: create it on the other, using the same iCalendar UID.
- Present on both, same details: leave them.
- Present on both, different details: write the newer copy over the older one.
- Cancelled or missing from one side after it had been linked: delete it on the other side.
- A weekly, daily, monthly, or yearly series is copied as the series. Single edited occurrences are not reconciled separately.

Apple app passwords and Google refresh tokens are encrypted at rest (AES-256-GCM). The key is `TOKEN_KEY` or `data/token.key`, which is not committed.

## Schema

`surreal/schema.surql` defines the `calendar` namespace: record access, settings, connections, sync links (with a computed `mirrored` field), practice events, and sync runs.
