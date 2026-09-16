/**
 * SurrealDB client — uses Cloud when VITE_SURREAL_* is set, otherwise seed data.
 * Never put secrets in VITE_*; only public endpoint + ns/db + optional anonymous access.
 */
import { Surreal } from 'surrealdb'
import { deals, listings, profiles, threads } from '../data/seed'
import type { Deal, Listing, Profile, Thread } from '../types'

const endpoint = import.meta.env.VITE_SURREAL_URL as string | undefined
const namespace = (import.meta.env.VITE_SURREAL_NS as string) || 'ile'
const database = (import.meta.env.VITE_SURREAL_DB as string) || 'main'

let db: Surreal | null = null
let mode: 'cloud' | 'seed' = 'seed'

export function dataMode() {
  return mode
}

export async function connectSurreal() {
  if (!endpoint) {
    mode = 'seed'
    return null
  }
  try {
    db = new Surreal()
    await db.connect(endpoint)
    await db.use({ namespace, database })
    mode = 'cloud'
    return db
  } catch (err) {
    console.warn('Surreal connect failed; using local seed.', err)
    mode = 'seed'
    db = null
    return null
  }
}

export async function listListings(): Promise<Listing[]> {
  if (db && mode === 'cloud') {
    try {
      const rows = await db.query<[Listing[]]>('SELECT * FROM listing WHERE status != "closed"')
      const first = rows[0]
      if (Array.isArray(first) && first.length) return first
    } catch {
      /* fall through */
    }
  }
  return listings
}

export async function listProfiles(): Promise<Profile[]> {
  return profiles
}

export async function listDeals(): Promise<Deal[]> {
  return deals
}

export async function listThreads(): Promise<Thread[]> {
  return threads
}
