import { google } from 'googleapis'
import type { CalEvent } from '../shared/types.ts'
import { fromGoogleItem, toGoogleBody, type GoogleItem } from './google-map.ts'
import type { CalendarPort } from './ports.ts'
import { overlapsWindow } from './sync-engine.ts'

export type GoogleTokens = {
  refreshToken: string
  accessToken: string
  expiry: string
}

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

export function googleAuthUrl(): string {
  const client = oauth()
  if (!client) throw new Error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET before connecting Gmail.')
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar', 'openid', 'email'],
  })
}

export async function exchangeGoogleCode(code: string): Promise<{ email: string; tokens: GoogleTokens }> {
  const client = oauth()
  if (!client) throw new Error('Google OAuth is not configured.')
  const { tokens } = await client.getToken(code)
  if (!tokens.refresh_token) throw new Error('Google did not return a refresh token. Disconnect Supercal in your Google account and try again.')
  client.setCredentials(tokens)
  const profile = await google.oauth2({ version: 'v2', auth: client }).userinfo.get()
  return {
    email: profile.data.email || 'Gmail',
    tokens: {
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token || '',
      expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : '',
    },
  }
}

export function googlePort(tokens: GoogleTokens, onTokens?: (tokens: GoogleTokens) => void): CalendarPort {
  const auth = oauth()
  if (!auth) throw new Error('Google OAuth is not configured.')
  auth.setCredentials({
    refresh_token: tokens.refreshToken,
    access_token: tokens.accessToken || undefined,
    expiry_date: tokens.expiry ? Date.parse(tokens.expiry) : undefined,
  })
  auth.on('tokens', (next) => {
    onTokens?.({
      refreshToken: next.refresh_token || tokens.refreshToken,
      accessToken: next.access_token || tokens.accessToken,
      expiry: next.expiry_date ? new Date(next.expiry_date).toISOString() : tokens.expiry,
    })
  })
  const calendar = google.calendar({ version: 'v3', auth })
  const createEvent = async (event: CalEvent): Promise<CalEvent> => {
    try {
      const response = await calendar.events.insert({ calendarId: 'primary', requestBody: toGoogleBody(event) })
      return fromGoogleItem(response.data as GoogleItem) ?? event
    } catch (error) {
      const existing = await findByUid(calendar, event.uid)
      if (!existing) throw error
      const response = await calendar.events.patch({
        calendarId: 'primary',
        eventId: existing,
        requestBody: toGoogleBody(event),
      })
      return fromGoogleItem(response.data as GoogleItem) ?? event
    }
  }

  return {
    async list(window) {
      const events: CalEvent[] = []
      let pageToken: string | undefined
      do {
        const response = await calendar.events.list({
          calendarId: 'primary',
          timeMin: window.start,
          timeMax: window.end,
          singleEvents: false,
          showDeleted: true,
          maxResults: 250,
          pageToken,
        })
        for (const item of response.data.items ?? []) {
          const mapped = fromGoogleItem(item as GoogleItem)
          if (mapped && overlapsWindow(mapped, window)) events.push(mapped)
        }
        pageToken = response.data.nextPageToken ?? undefined
      } while (pageToken)
      return events
    },
    create: createEvent,
    async update(event) {
      const eventId = event.googleId || (await findByUid(calendar, event.uid))
      if (!eventId) return createEvent(event)
      const response = await calendar.events.patch({
        calendarId: 'primary',
        eventId,
        requestBody: toGoogleBody(event),
      })
      return fromGoogleItem(response.data as GoogleItem) ?? { ...event, googleId: eventId }
    },
    async remove(event) {
      const eventId = event.googleId || (await findByUid(calendar, event.uid))
      if (!eventId) return
      await calendar.events.delete({ calendarId: 'primary', eventId })
    },
  }
}

function oauth() {
  const id = process.env.GOOGLE_CLIENT_ID
  const secret = process.env.GOOGLE_CLIENT_SECRET
  if (!id || !secret) return null
  return new google.auth.OAuth2(id, secret, process.env.GOOGLE_REDIRECT_URI || 'http://127.0.0.1:8787/api/connect/google/callback')
}

async function findByUid(calendar: ReturnType<typeof google.calendar>, uid: string): Promise<string | undefined> {
  const response = await calendar.events.list({ calendarId: 'primary', iCalUID: uid, showDeleted: false, maxResults: 1 })
  return response.data.items?.[0]?.id ?? undefined
}
