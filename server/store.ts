import { spawn, type ChildProcess } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'
import { readFile } from 'node:fs/promises'
import { Surreal } from 'surrealdb'
import type { CalEvent, Link } from '../shared/types.ts'
import type { SyncRunView } from '../shared/types.ts'

export type AppleConn = {
  appleId: string
  appPasswordEnc: string
  calendarUrl: string
  calendarName: string
}

export type GoogleConn = {
  email: string
  secretEnc: string
  expiry: string
}

export type Persisted = {
  intervalSec: number
  nextSyncAt: string | null
  seeded: boolean
  apple: AppleConn | null
  google: GoogleConn | null
  practiceLinks: Link[]
  liveLinks: Link[]
  practiceApple: CalEvent[]
  practiceGoogle: CalEvent[]
  runs: SyncRunView[]
}

export interface Store {
  kind: 'surreal' | 'file'
  load(): Promise<Persisted>
  save(data: Persisted): Promise<void>
  close(): Promise<void>
}

export function emptyState(): Persisted {
  return {
    intervalSec: 900,
    nextSyncAt: null,
    seeded: false,
    apple: null,
    google: null,
    practiceLinks: [],
    liveLinks: [],
    practiceApple: [],
    practiceGoogle: [],
    runs: [],
  }
}

let surrealChild: ChildProcess | null = null

export async function openStore(opts?: { prefer?: 'file' | 'surreal'; filePath?: string; database?: string }): Promise<Store> {
  if (opts?.prefer === 'file') return new FileStore(opts.filePath ?? 'data/store.json')
  try {
    await ensureSurreal()
    return await SurrealStore.connect(opts?.database ?? process.env.SURREAL_DB ?? 'main')
  } catch (error) {
    console.warn(`SurrealDB is unavailable (${error instanceof Error ? error.message : error}). Using a file store.`)
    return new FileStore(opts?.filePath ?? 'data/store.json')
  }
}

export async function closeSurrealChild(): Promise<void> {
  if (!surrealChild) return
  surrealChild.kill('SIGTERM')
  surrealChild = null
}

class FileStore implements Store {
  kind = 'file' as const
  constructor(private path: string) {}
  async load(): Promise<Persisted> {
    if (!existsSync(this.path)) return emptyState()
    return { ...emptyState(), ...JSON.parse(readFileSync(this.path, 'utf8')) }
  }
  async save(data: Persisted): Promise<void> {
    mkdirSync(dirname(this.path), { recursive: true })
    writeFileSync(this.path, JSON.stringify(data, null, 2))
  }
  async close(): Promise<void> {}
}

class SurrealStore implements Store {
  kind = 'surreal' as const
  private constructor(private db: Surreal) {}

  static async connect(database: string): Promise<SurrealStore> {
    const db = new Surreal()
    const url = process.env.SURREAL_URL ?? 'ws://127.0.0.1:8000'
    await db.connect(url, {
      namespace: process.env.SURREAL_NS ?? 'calendar',
      database,
      authentication: {
        username: process.env.SURREAL_USER ?? 'root',
        password: process.env.SURREAL_PASS ?? 'root',
      },
      versionCheck: false,
    })
    const schema = await readFile(new URL('../surreal/schema.surql', import.meta.url), 'utf8')
    const directed = database === 'main' ? schema : schema.replaceAll('DB main', `DB ${database}`).replaceAll('DATABASE OVERWRITE main', `DATABASE OVERWRITE ${database}`)
    await db.query(directed)
    await db.use({ namespace: process.env.SURREAL_NS ?? 'calendar', database })
    return new SurrealStore(db)
  }

  async load(): Promise<Persisted> {
    const settings = await this.rows<{ interval_sec: number; next_sync_at?: string; seeded?: boolean }>('SELECT * FROM settings:app')
    if (!settings.length) return emptyState()
    const connections = await this.rows<ConnectionRow>('SELECT * FROM connection')
    const links = await this.rows<LinkRow>('SELECT * FROM link')
    const events = await this.rows<PracticeRow>('SELECT * FROM practice_event')
    const runs = await this.rows<RunRow>('SELECT * FROM sync_run ORDER BY started_at DESC LIMIT 12')
    const apple = connections.find((row) => row.provider === 'apple')
    const google = connections.find((row) => row.provider === 'google')
    const setting = settings[0]
    return {
      intervalSec: setting.interval_sec || 900,
      nextSyncAt: setting.next_sync_at ? asIso(setting.next_sync_at) : null,
      seeded: Boolean(setting.seeded),
      apple: apple
        ? {
            appleId: apple.label,
            appPasswordEnc: apple.secret_enc,
            calendarUrl: String(apple.detail?.calendarUrl ?? ''),
            calendarName: String(apple.detail?.calendarName ?? 'Calendar'),
          }
        : null,
      google: google
        ? {
            email: google.label,
            secretEnc: google.secret_enc,
            expiry: String(google.detail?.expiry ?? ''),
          }
        : null,
      practiceLinks: links.filter((row) => row.desk === 'practice').map(linkFromRow),
      liveLinks: links.filter((row) => row.desk === 'live').map(linkFromRow),
      practiceApple: events.filter((row) => row.side === 'apple').map(eventFromRow),
      practiceGoogle: events.filter((row) => row.side === 'google').map(eventFromRow),
      runs: runs.map(runFromRow),
    }
  }

  async save(data: Persisted): Promise<void> {
    const connections = [
      data.apple
        ? {
            provider: 'apple',
            label: data.apple.appleId,
            secret_enc: data.apple.appPasswordEnc,
            detail: { calendarUrl: data.apple.calendarUrl, calendarName: data.apple.calendarName },
          }
        : null,
      data.google
        ? {
            provider: 'google',
            label: data.google.email,
            secret_enc: data.google.secretEnc,
            detail: { expiry: data.google.expiry },
          }
        : null,
    ].filter((row) => row !== null)
    const links = [
      ...data.practiceLinks.map((link) => linkToRow(link, 'practice')),
      ...data.liveLinks.map((link) => linkToRow(link, 'live')),
    ]
    const events = [
      ...data.practiceApple.map((event) => eventToRow(event, 'apple')),
      ...data.practiceGoogle.map((event) => eventToRow(event, 'google')),
    ]
    const runs = data.runs.map((run) => ({
      run_id: run.id,
      trigger: run.trigger,
      mode: run.mode,
      started_at: run.startedAt,
      finished_at: run.finishedAt,
      created_n: run.created,
      updated_n: run.updated,
      deleted_n: run.deleted,
      messages: run.messages,
      errors: run.errors,
    }))
    await this.db.query(
      `
      UPSERT settings:app SET interval_sec = $interval, next_sync_at = <datetime>$next, seeded = $seeded;
      DELETE connection;
      DELETE link;
      DELETE practice_event;
      DELETE sync_run;
      FOR $row IN $connections {
        CREATE connection SET provider = $row.provider, label = $row.label, secret_enc = $row.secret_enc, detail = $row.detail, connected_at = time::now();
      };
      FOR $row IN $links {
        CREATE link SET
          desk = $row.desk,
          uid = $row.uid,
          hash = $row.hash,
          apple_href = IF $row.apple_href = '' THEN NONE ELSE $row.apple_href END,
          google_id = IF $row.google_id = '' THEN NONE ELSE $row.google_id END,
          starts_at = $row.starts_at,
          ends_at = $row.ends_at;
      };
      FOR $row IN $events {
        CREATE practice_event SET
          uid = $row.uid,
          side = $row.side,
          title = $row.title,
          description = $row.description,
          location = $row.location,
          starts_at = $row.starts_at,
          ends_at = $row.ends_at,
          all_day = $row.all_day,
          recurrence = $row.recurrence,
          updated_at = <datetime>$row.updated_at,
          status = $row.status,
          href = IF $row.href = '' THEN NONE ELSE $row.href END,
          google_id = IF $row.google_id = '' THEN NONE ELSE $row.google_id END,
          etag = IF $row.etag = '' THEN NONE ELSE $row.etag END;
      };
      FOR $row IN $runs {
        CREATE sync_run SET
          run_id = $row.run_id,
          trigger = $row.trigger,
          mode = $row.mode,
          started_at = <datetime>$row.started_at,
          finished_at = <datetime>$row.finished_at,
          created_n = $row.created_n,
          updated_n = $row.updated_n,
          deleted_n = $row.deleted_n,
          messages = $row.messages,
          errors = $row.errors;
      };
      `,
      {
        interval: data.intervalSec,
        next: data.nextSyncAt ?? new Date().toISOString(),
        seeded: data.seeded,
        connections,
        links,
        events,
        runs,
      },
    )
  }

  async close(): Promise<void> {
    await this.db.close()
  }

  private async rows<T>(sql: string): Promise<T[]> {
    const result = await this.db.query<[T[]]>(sql)
    const last = result[result.length - 1]
    return Array.isArray(last) ? last : []
  }
}

async function ensureSurreal(): Promise<void> {
  const http = httpBase(process.env.SURREAL_URL ?? 'ws://127.0.0.1:8000')
  if (await healthy(http)) return
  const bin = process.env.SURREAL_BIN || `${process.env.HOME}/.local/bin/surreal`
  mkdirSync('data', { recursive: true })
  const log = await import('node:fs').then((fs) => fs.openSync('data/surreal.log', 'a'))
  surrealChild = spawn(bin, ['start', '--no-banner', '--username', process.env.SURREAL_USER ?? 'root', '--password', process.env.SURREAL_PASS ?? 'root', '--bind', '127.0.0.1:8000', '--log', 'warn', 'surrealkv://data/surreal'], {
    stdio: ['ignore', log, log],
    env: { ...process.env, PATH: `${process.env.HOME}/.local/bin:${process.env.PATH ?? ''}` },
  })
  for (let i = 0; i < 40; i += 1) {
    if (await healthy(http)) return
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('SurrealDB did not start')
}

function httpBase(url: string): string {
  return url.replace(/^ws/, 'http').replace(/\/rpc$/, '')
}

async function healthy(http: string): Promise<boolean> {
  try {
    const response = await fetch(`${http}/health`)
    return response.ok
  } catch {
    return false
  }
}

type ConnectionRow = { provider: 'apple' | 'google'; label: string; secret_enc: string; detail?: Record<string, string> }
type LinkRow = { desk: 'practice' | 'live'; uid: string; hash: string; apple_href?: string; google_id?: string; starts_at: string; ends_at: string }
type PracticeRow = {
  uid: string
  side: 'apple' | 'google'
  title: string
  description?: string
  location?: string
  starts_at: string
  ends_at: string
  all_day: boolean
  recurrence?: string
  updated_at: string
  status: 'confirmed' | 'cancelled'
  href?: string
  google_id?: string
  etag?: string
}
type RunRow = {
  run_id?: string
  id?: string
  trigger: 'manual' | 'periodic'
  mode: 'practice' | 'live'
  started_at: string
  finished_at: string
  created_n: number
  updated_n: number
  deleted_n: number
  messages?: string[]
  errors?: string[]
}

function linkFromRow(row: LinkRow): Link {
  return {
    uid: row.uid,
    hash: row.hash,
    appleHref: row.apple_href || undefined,
    googleId: row.google_id || undefined,
    start: row.starts_at,
    end: row.ends_at,
  }
}

function linkToRow(link: Link, desk: 'practice' | 'live') {
  return {
    desk,
    uid: link.uid,
    hash: link.hash,
    apple_href: link.appleHref ?? '',
    google_id: link.googleId ?? '',
    starts_at: link.start,
    ends_at: link.end,
  }
}

function eventFromRow(row: PracticeRow): CalEvent {
  return {
    uid: row.uid,
    title: row.title,
    description: row.description ?? '',
    location: row.location ?? '',
    start: row.starts_at,
    end: row.ends_at,
    allDay: row.all_day,
    recurrence: row.recurrence ?? '',
    updated: asIso(row.updated_at),
    status: row.status,
    href: row.href || undefined,
    googleId: row.google_id || undefined,
    etag: row.etag || undefined,
  }
}

function eventToRow(event: CalEvent, side: 'apple' | 'google') {
  return {
    uid: event.uid,
    side,
    title: event.title,
    description: event.description,
    location: event.location,
    starts_at: event.start,
    ends_at: event.end,
    all_day: event.allDay,
    recurrence: event.recurrence,
    updated_at: event.updated,
    status: event.status,
    href: event.href ?? '',
    google_id: event.googleId ?? '',
    etag: event.etag ?? '',
  }
}

function runFromRow(row: RunRow): SyncRunView {
  return {
    id: row.run_id || String(row.id || row.started_at),
    trigger: row.trigger,
    mode: row.mode,
    startedAt: asIso(row.started_at),
    finishedAt: asIso(row.finished_at),
    created: row.created_n,
    updated: row.updated_n,
    deleted: row.deleted_n,
    messages: row.messages ?? [],
    errors: row.errors ?? [],
  }
}

function asIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  const time = Date.parse(String(value))
  return Number.isNaN(time) ? new Date().toISOString() : new Date(time).toISOString()
}
