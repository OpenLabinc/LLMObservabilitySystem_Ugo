import type { PublicState, Side } from '../shared/types.ts'

export type EventBody = {
  title: string
  description?: string
  location?: string
  start: string
  end: string
  allDay?: boolean
  side?: Side | 'both'
}

async function request(url: string, init?: RequestInit): Promise<PublicState> {
  const response = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  })
  const body = await response.json() as PublicState & { error?: string }
  if (!response.ok) throw new Error(body.error || 'Request failed')
  return body
}

export const api = {
  state: () => request('/api/state'),
  sync: () => request('/api/sync', { method: 'POST' }),
  settings: (intervalSec: number) => request('/api/settings', { method: 'PUT', body: JSON.stringify({ intervalSec }) }),
  add: (event: EventBody) => request('/api/events', { method: 'POST', body: JSON.stringify(event) }),
  patch: (uid: string, event: EventBody) => request(`/api/events/${uid}`, { method: 'PATCH', body: JSON.stringify(event) }),
  remove: (uid: string, side: Side | 'both') => request(`/api/events/${encodeURIComponent(uid)}?side=${side}`, { method: 'DELETE' }),
  apple: (appleId: string, appPassword: string) => request('/api/connect/apple', { method: 'POST', body: JSON.stringify({ appleId, appPassword }) }),
  disconnect: (provider: Side) => request('/api/disconnect', { method: 'POST', body: JSON.stringify({ provider }) }),
}
