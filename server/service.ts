import { randomUUID } from 'node:crypto'
import type { CalEvent, Link, PublicState, Side, SyncRunView } from '../shared/types.ts'
import { applePort, connectApple } from './apple.ts'
import { open as unseal, publicError, seal } from './crypto.ts'
import { exchangeGoogleCode, googleAuthUrl, googleConfigured, googlePort, type GoogleTokens } from './google.ts'
import { practicePort, type CalendarPort } from './ports.ts'
import { practiceSeed } from './practice.ts'
import { planSync, projectEvents, rebuildLinks, syncWindow, groupEvents } from './sync-engine.ts'
import { emptyState, openStore, type Persisted, type Store } from './store.ts'

const intervals = new Set([30, 300, 900, 1800, 3600, 21600])

export class HttpError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message)
  }
}

export type EventInput = {
  title: string
  description?: string
  location?: string
  start: string
  end: string
  allDay?: boolean
  recurrence?: string
  side?: Side | 'both'
}

export class Service {
  private persist: Persisted = emptyState()
  private listed: { apple: CalEvent[]; google: CalEvent[] } | null = null
  private syncing = false
  private timer: NodeJS.Timeout | null = null
  private chain: Promise<unknown> = Promise.resolve()
  private listError = ''

  private constructor(private store: Store) {}

  static async create(opts?: { prefer?: 'file' | 'surreal'; filePath?: string; database?: string }): Promise<Service> {
    const store = await openStore(opts)
    return new Service(store)
  }

  get storeKind(): 'surreal' | 'file' {
    return this.store.kind
  }

  async init(): Promise<void> {
    this.persist = await this.store.load()
    if (!intervals.has(this.persist.intervalSec)) this.persist.intervalSec = 900
    if (!this.persist.seeded) {
      const seed = practiceSeed()
      this.persist.practiceApple = seed.apple
      this.persist.practiceGoogle = seed.google
      this.persist.seeded = true
    }
    this.persist.nextSyncAt = new Date(Date.now() + this.persist.intervalSec * 1000).toISOString()
    await this.store.save(this.persist)
    this.arm()
  }

  async close(): Promise<void> {
    if (this.timer) clearInterval(this.timer)
    await this.store.close()
  }

  async getState(): Promise<PublicState> {
    const lists = await this.lists()
    return this.view(lists.apple, lists.google, lists.error)
  }

  async sync(trigger: 'manual' | 'periodic'): Promise<PublicState> {
    return this.lock(() => this.syncUnlocked(trigger))
  }

  async setIntervalSec(intervalSec: number): Promise<PublicState> {
    if (!intervals.has(intervalSec)) throw new HttpError('Choose 30 seconds, 5 minutes, 15 minutes, 30 minutes, 1 hour, or 6 hours.')
    return this.lock(async () => {
      this.persist.intervalSec = intervalSec
      this.persist.nextSyncAt = new Date(Date.now() + intervalSec * 1000).toISOString()
      await this.store.save(this.persist)
      this.arm()
      const lists = await this.lists()
      return this.view(lists.apple, lists.google, lists.error)
    })
  }

  async addEvent(input: EventInput): Promise<PublicState> {
    const side = input.side === 'google' ? 'google' : 'apple'
    const event = this.eventFromInput(input, `supercal-${randomUUID()}`)
    return this.lock(async () => {
      if (this.mode() === 'practice') {
        const draft = structuredClone(this.persist)
        const list = side === 'apple' ? draft.practiceApple : draft.practiceGoogle
        if (side === 'apple') event.href = `practice://apple/${event.uid}`
        else event.googleId = `practice_${event.uid}`
        list.push(event)
        await this.commit(draft)
        return this.view(draft.practiceApple, draft.practiceGoogle)
      }
      const port = await this.port(side, this.persist)
      await port.create(event)
      this.listed = null
      const lists = await this.lists()
      return this.view(lists.apple, lists.google, lists.error)
    })
  }

  async patchEvent(uid: string, input: EventInput): Promise<PublicState> {
    return this.lock(async () => {
      const lists = await this.lists()
      const group = groupEvents(lists.apple, lists.google, this.links()) .get(uid)
      if (!group || (!group.apple && !group.google)) throw new HttpError('That event is no longer on the calendar.', 404)
      const basis = group.apple ?? group.google!
      const next = this.eventFromInput(input, uid, basis)
      if (this.mode() === 'practice') {
        const draft = structuredClone(this.persist)
        for (const side of ['apple', 'google'] as const) {
          const list = side === 'apple' ? draft.practiceApple : draft.practiceGoogle
          const index = list.findIndex((event) => event.uid === uid)
          if (index < 0) continue
          list[index] = { ...list[index], ...next, href: list[index].href, googleId: list[index].googleId, updated: next.updated }
        }
        await this.commit(draft)
        return this.view(draft.practiceApple, draft.practiceGoogle)
      }
      if (group.apple) await (await this.port('apple', this.persist)).update({ ...next, href: group.apple.href, etag: group.apple.etag })
      if (group.google) await (await this.port('google', this.persist)).update({ ...next, googleId: group.google.googleId })
      this.listed = null
      const fresh = await this.lists()
      return this.view(fresh.apple, fresh.google, fresh.error)
    })
  }

  async deleteEvent(uid: string, side: Side | 'both'): Promise<PublicState> {
    return this.lock(async () => {
      if (this.mode() === 'practice') {
        const draft = structuredClone(this.persist)
        if (side !== 'google') draft.practiceApple = draft.practiceApple.filter((event) => event.uid !== uid)
        if (side !== 'apple') draft.practiceGoogle = draft.practiceGoogle.filter((event) => event.uid !== uid)
        if (side === 'both') draft.practiceLinks = draft.practiceLinks.filter((link) => link.uid !== uid)
        await this.commit(draft)
        return this.view(draft.practiceApple, draft.practiceGoogle)
      }
      const lists = await this.fetchLive(this.persist)
      const group = groupEvents(lists.apple, lists.google, this.persist.liveLinks).get(uid)
      if (side !== 'google' && group?.apple) await (await this.port('apple', this.persist)).remove(group.apple)
      if (side !== 'apple' && group?.google) await (await this.port('google', this.persist)).remove(group.google)
      if (side === 'both') this.persist.liveLinks = this.persist.liveLinks.filter((link) => link.uid !== uid)
      await this.store.save(this.persist)
      this.listed = null
      const fresh = await this.lists()
      return this.view(fresh.apple, fresh.google, fresh.error)
    })
  }

  async connectAppleAccount(appleId: string, appPassword: string): Promise<PublicState> {
    const id = appleId.trim()
    const password = appPassword.replace(/\s+/g, '')
    if (!id.includes('@')) throw new HttpError('Enter the Apple ID email address for this calendar.')
    if (password.length < 8) throw new HttpError('Enter the app-specific password from appleid.apple.com.')
    let remote: { calendarUrl: string; calendarName: string }
    try {
      remote = await connectApple(id, password)
    } catch (error) {
      throw new HttpError(`Apple Calendar refused the sign-in. ${publicError(error)}`)
    }
    return this.lock(async () => {
      this.persist.apple = { appleId: id, appPasswordEnc: seal(password), ...remote }
      this.listed = null
      await this.store.save(this.persist)
      if (this.mode() === 'live') return this.syncUnlocked('manual')
      const lists = await this.lists()
      return this.view(lists.apple, lists.google, lists.error)
    })
  }

  async connectGoogleAccount(code: string): Promise<PublicState> {
    const exchanged = await exchangeGoogleCode(code)
    return this.lock(async () => {
      this.persist.google = {
        email: exchanged.email,
        secretEnc: seal(JSON.stringify(exchanged.tokens)),
        expiry: exchanged.tokens.expiry,
      }
      this.listed = null
      await this.store.save(this.persist)
      if (this.mode() === 'live') return this.syncUnlocked('manual')
      const lists = await this.lists()
      return this.view(lists.apple, lists.google, lists.error)
    })
  }

  googleRedirect(): string {
    return googleAuthUrl()
  }

  async disconnect(provider: Side): Promise<PublicState> {
    return this.lock(async () => {
      if (provider === 'apple') this.persist.apple = null
      else this.persist.google = null
      this.listed = null
      await this.store.save(this.persist)
      const lists = await this.lists()
      return this.view(lists.apple, lists.google, lists.error)
    })
  }

  private async syncUnlocked(trigger: 'manual' | 'periodic'): Promise<PublicState> {
    this.syncing = true
    const started = new Date().toISOString()
    const mode = this.mode()
    const draft = structuredClone(this.persist)
    const window = syncWindow()
    try {
      const appleEvents = mode === 'practice' ? draft.practiceApple : undefined
      const googleEvents = mode === 'practice' ? draft.practiceGoogle : undefined
      const apple = mode === 'practice' ? practicePort(appleEvents!, 'apple') : await this.port('apple', draft)
      const google = mode === 'practice' ? practicePort(googleEvents!, 'google') : await this.port('google', draft)
      const beforeApple = await apple.list(window)
      const beforeGoogle = await google.list(window)
      const links = mode === 'practice' ? draft.practiceLinks : draft.liveLinks
      const { ops, outsideLinks } = planSync({ apple: beforeApple, google: beforeGoogle, links, window })
      const messages: string[] = []
      const errors: string[] = []
      let created = 0
      let updated = 0
      let deleted = 0
      for (const op of ops) {
        const port = op.target === 'apple' ? apple : google
        try {
          await applyOp(port, op)
          if (op.kind === 'create') created += 1
          else if (op.kind === 'update') updated += 1
          else deleted += 1
          messages.push(op.message)
        } catch (error) {
          errors.push(`${op.message}: ${publicError(error)}`)
        }
      }
      let afterApple = beforeApple
      let afterGoogle = beforeGoogle
      try {
        afterApple = await apple.list(window)
        afterGoogle = await google.list(window)
      } catch (error) {
        errors.push(`Could not re-read calendars: ${publicError(error)}`)
      }
      const nextLinks = rebuildLinks(afterApple, afterGoogle, outsideLinks, links)
      if (mode === 'practice') {
        draft.practiceLinks = nextLinks
      } else {
        draft.liveLinks = nextLinks
        this.listed = { apple: afterApple, google: afterGoogle }
      }
      draft.runs = [run(trigger, mode, started, created, updated, deleted, messages, errors), ...draft.runs].slice(0, 12)
      draft.nextSyncAt = new Date(Date.now() + draft.intervalSec * 1000).toISOString()
      await this.commit(draft)
      this.arm()
      const viewApple = mode === 'practice' ? draft.practiceApple : afterApple
      const viewGoogle = mode === 'practice' ? draft.practiceGoogle : afterGoogle
      return this.view(viewApple, viewGoogle)
    } catch (error) {
      draft.runs = [run(trigger, mode, started, 0, 0, 0, [], [publicError(error)]), ...draft.runs].slice(0, 12)
      await this.commit(draft)
      return this.view(draft.practiceApple, draft.practiceGoogle, publicError(error))
    } finally {
      this.syncing = false
    }
  }

  private async lists(): Promise<{ apple: CalEvent[]; google: CalEvent[]; error?: string }> {
    if (this.mode() === 'practice') return { apple: this.persist.practiceApple, google: this.persist.practiceGoogle }
    if (this.listed) return { ...this.listed, error: this.listError || undefined }
    try {
      const fresh = await this.fetchLive(this.persist)
      this.listed = fresh
      this.listError = ''
      return fresh
    } catch (error) {
      this.listError = publicError(error)
      return { apple: [], google: [], error: this.listError }
    }
  }

  private async fetchLive(data: Persisted): Promise<{ apple: CalEvent[]; google: CalEvent[] }> {
    const window = syncWindow()
    const [apple, google] = await Promise.all([
      (await this.port('apple', data)).list(window),
      (await this.port('google', data)).list(window),
    ])
    return { apple, google }
  }

  private async port(side: Side, data: Persisted): Promise<CalendarPort> {
    if (side === 'apple') {
      if (!data.apple) throw new HttpError('Connect Apple Calendar first.')
      return applePort(data.apple.appleId, unseal(data.apple.appPasswordEnc), data.apple.calendarUrl)
    }
    if (!data.google) throw new HttpError('Connect the Gmail calendar first.')
    const tokens = JSON.parse(unseal(data.google.secretEnc)) as GoogleTokens
    return googlePort(tokens, (next) => {
      if (!this.persist.google) return
      this.persist.google.secretEnc = seal(JSON.stringify(next))
      this.persist.google.expiry = next.expiry
      void this.store.save(this.persist)
    })
  }

  private mode(): 'practice' | 'live' {
    return this.persist.apple && this.persist.google ? 'live' : 'practice'
  }

  private links(): Link[] {
    return this.mode() === 'live' ? this.persist.liveLinks : this.persist.practiceLinks
  }

  private view(apple: CalEvent[], google: CalEvent[], error?: string): PublicState {
    return {
      mode: this.mode(),
      store: this.store.kind,
      intervalSec: this.persist.intervalSec,
      nextSyncAt: this.persist.nextSyncAt,
      syncing: this.syncing,
      googleConfigured: googleConfigured(),
      accounts: {
        apple: { connected: Boolean(this.persist.apple), label: this.persist.apple?.appleId ?? '' },
        google: { connected: Boolean(this.persist.google), label: this.persist.google?.email ?? '' },
      },
      events: projectEvents(apple, google, this.links()),
      runs: this.persist.runs,
      error,
    }
  }

  private eventFromInput(input: EventInput, uid: string, existing?: CalEvent): CalEvent {
    const title = input.title?.trim() ?? ''
    if (!title) throw new HttpError('Give the event a title.')
    const allDay = Boolean(input.allDay)
    const start = allDay ? input.start.slice(0, 10) : new Date(input.start).toISOString()
    const end = allDay ? input.end.slice(0, 10) : new Date(input.end).toISOString()
    if (!input.start || !input.end || Number.isNaN(allDay ? Date.parse(start) : Date.parse(start))) {
      throw new HttpError('Choose a start and end.')
    }
    const startCmp = allDay ? start : Date.parse(start)
    const endCmp = allDay ? end : Date.parse(end)
    if (startCmp >= endCmp) throw new HttpError('The end must be after the start.')
    return {
      uid,
      title,
      description: input.description?.trim() ?? existing?.description ?? '',
      location: input.location?.trim() ?? existing?.location ?? '',
      start,
      end,
      allDay,
      recurrence: input.recurrence?.trim() ?? existing?.recurrence ?? '',
      updated: new Date().toISOString(),
      status: 'confirmed',
    }
  }

  private async commit(draft: Persisted): Promise<void> {
    this.persist = draft
    await this.store.save(draft)
  }

  private arm(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = setInterval(() => {
      void this.sync('periodic')
    }, this.persist.intervalSec * 1000)
  }

  private lock<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn, fn)
    this.chain = run.then(() => undefined, () => undefined)
    return run
  }
}

function applyOp(port: CalendarPort, op: { kind: 'create' | 'update' | 'delete'; event: CalEvent }): Promise<unknown> {
  if (op.kind === 'create') return port.create(op.event)
  if (op.kind === 'update') return port.update(op.event)
  return port.remove(op.event)
}

function run(
  trigger: 'manual' | 'periodic',
  mode: 'practice' | 'live',
  started: string,
  created: number,
  updated: number,
  deleted: number,
  messages: string[],
  errors: string[],
): SyncRunView {
  return {
    id: randomUUID(),
    trigger,
    mode,
    startedAt: started,
    finishedAt: new Date().toISOString(),
    created,
    updated,
    deleted,
    messages,
    errors,
  }
}
