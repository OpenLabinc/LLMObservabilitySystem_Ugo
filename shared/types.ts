export type Side = 'apple' | 'google'

export type CalEvent = {
  uid: string
  title: string
  description: string
  location: string
  start: string
  end: string
  allDay: boolean
  recurrence: string
  updated: string
  status: 'confirmed' | 'cancelled'
  href?: string
  googleId?: string
  etag?: string
}

export type Link = {
  uid: string
  hash: string
  appleHref?: string
  googleId?: string
  start: string
  end: string
}

export type SyncOp = {
  kind: 'create' | 'update' | 'delete'
  target: Side
  event: CalEvent
  message: string
}

export type SideSnap = {
  title: string
  description: string
  location: string
  start: string
  end: string
  allDay: boolean
  updated: string
}

export type PublicEvent = {
  uid: string
  title: string
  description: string
  location: string
  start: string
  end: string
  allDay: boolean
  recurrence: string
  onApple: boolean
  onGoogle: boolean
  diverged: boolean
  apple?: SideSnap
  google?: SideSnap
}

export type SyncRunView = {
  id: string
  trigger: 'manual' | 'periodic'
  mode: 'practice' | 'live'
  startedAt: string
  finishedAt: string
  created: number
  updated: number
  deleted: number
  messages: string[]
  errors: string[]
}

export type PublicState = {
  mode: 'practice' | 'live'
  store: 'surreal' | 'file'
  intervalSec: number
  nextSyncAt: string | null
  syncing: boolean
  googleConfigured: boolean
  accounts: {
    apple: { connected: boolean; label: string }
    google: { connected: boolean; label: string }
  }
  events: PublicEvent[]
  runs: SyncRunView[]
  error?: string
}
