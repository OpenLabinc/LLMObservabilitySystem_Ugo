import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { buildSeed } from './data/seed'
import type { Graph, PayMethod } from './data/types'
import {
  addComment,
  addReel,
  addStory,
  claim,
  completeDrop,
  createNeed,
  lockPrice,
  logDispute,
  markRead,
  sendMessage,
  toggleFollow,
  toggleSave,
  type Result,
} from './logic/actions'
import { viewer as viewerOf } from './logic/select'

const KEY = 'koro-graph-v1'

interface KoroContextValue {
  graph: Graph
  mode: string
  error: string | null
  pending: boolean
  viewer: ReturnType<typeof viewerOf>
  setViewer: (id: string) => void
  claim: (shipmentId: string) => Promise<void>
  lock: (dealId: string) => Promise<void>
  complete: (shipmentId: string) => Promise<void>
  dispute: (shipmentId: string, note: string) => Promise<void>
  addStory: (shipmentId: string, caption: string) => Promise<void>
  addReel: (shipmentId: string, title: string, caption: string) => Promise<void>
  createNeed: (input: Parameters<typeof createNeed>[2]) => Promise<string | null>
  comment: (shipmentId: string, body: string) => Promise<void>
  send: (dealId: string, body: string) => Promise<void>
  toggleFollow: (personId: string) => Promise<void>
  toggleSave: (shipmentId: string) => Promise<void>
  markRead: () => Promise<void>
  clearError: () => void
}

const KoroContext = createContext<KoroContextValue | null>(null)

function readSession(): Graph | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Graph
    if (!Array.isArray(parsed.people) || parsed.people.length < 37) return null
    return parsed
  } catch {
    return null
  }
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'The database rejected that.'
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [graph, setGraph] = useState<Graph>(() => readSession() ?? buildSeed())
  const [mode, setMode] = useState('Seed mode · on this device')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const graphRef = useRef(graph)
  const dbRef = useRef<{ query: (sql: string, vars?: Record<string, unknown>) => Promise<unknown> } | null>(null)
  const remoteRef = useRef(false)
  graphRef.current = graph

  useEffect(() => {
    let cancelled = false
    const url = import.meta.env.VITE_SURREAL_URL || (import.meta.env.DEV ? 'ws://127.0.0.1:8000/rpc' : '')
    if (!url) {
      setMode('Seed mode · on this device')
      return
    }
    void (async () => {
      try {
        const { Surreal } = await import('surrealdb')
        const db = new Surreal()
        await Promise.race([
          db.connect(url, { reconnect: false }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500)),
        ])
        await db.use({
          namespace: import.meta.env.VITE_SURREAL_NS || 'koro',
          database: import.meta.env.VITE_SURREAL_DB || 'network',
        })
        const { loadGraph } = await import('./db/sync')
        const loaded = await loadGraph(db, sessionStorage.getItem('koro-viewer') || 'seyi')
        if (cancelled) return
        if (loaded.people.length >= 37) {
          dbRef.current = db
          remoteRef.current = true
          graphRef.current = loaded
          setGraph(loaded)
          const local = /127\.0\.0\.1|localhost/.test(url)
          setMode(local ? 'SurrealDB · local memory' : 'SurrealDB · remote')
        } else {
          setMode('Seed mode · database empty')
        }
      } catch {
        if (!cancelled) setMode('Seed mode · database unreachable')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function commit(recipe: (current: Graph) => Result) {
    if (pending) return
    setPending(true)
    const prev = graphRef.current
    const result = recipe(prev)
    if (!result.ok) {
      setError(result.error)
      setPending(false)
      return
    }
    graphRef.current = result.graph
    setGraph(result.graph)
    setError(null)
    try {
      if (dbRef.current) {
        const { syncGraph } = await import('./db/sync')
        await syncGraph(dbRef.current, prev, result.graph)
      } else {
        sessionStorage.setItem(KEY, JSON.stringify(result.graph))
      }
    } catch (caught) {
      graphRef.current = prev
      setGraph(prev)
      setError(errorText(caught))
    } finally {
      setPending(false)
    }
  }

  const value = useMemo<KoroContextValue>(() => {
    const person = viewerOf(graph)
    return {
      graph,
      mode,
      error,
      pending,
      viewer: person,
      setViewer: (id: string) => {
        const next = { ...graphRef.current, viewerId: id }
        graphRef.current = next
        setGraph(next)
        sessionStorage.setItem('koro-viewer', id)
        if (!remoteRef.current) sessionStorage.setItem(KEY, JSON.stringify(next))
      },
      claim: (shipmentId) => commit((current) => claim(current, current.viewerId, shipmentId)),
      lock: (dealId) => commit((current) => lockPrice(current, current.viewerId, dealId)),
      complete: (shipmentId) => commit((current) => completeDrop(current, current.viewerId, shipmentId)),
      dispute: (shipmentId, note) => commit((current) => logDispute(current, current.viewerId, shipmentId, note)),
      addStory: (shipmentId, caption) => commit((current) => addStory(current, current.viewerId, shipmentId, caption)),
      addReel: (shipmentId, title, caption) =>
        commit((current) => addReel(current, current.viewerId, shipmentId, title, caption)),
      createNeed: async (input) => {
        const before = new Set(graphRef.current.shipments.map((row) => row.id))
        await commit((current) => createNeed(current, current.viewerId, input))
        const created = graphRef.current.shipments.find((row) => !before.has(row.id))
        return created?.id ?? null
      },
      comment: (shipmentId, body) => commit((current) => addComment(current, current.viewerId, shipmentId, body)),
      send: (dealId, body) => commit((current) => sendMessage(current, current.viewerId, dealId, body)),
      toggleFollow: (personId) => commit((current) => toggleFollow(current, current.viewerId, personId)),
      toggleSave: (shipmentId) => commit((current) => toggleSave(current, current.viewerId, shipmentId)),
      markRead: () => commit((current) => markRead(current, current.viewerId)),
      clearError: () => setError(null),
    }
  }, [graph, mode, error, pending])

  return <KoroContext.Provider value={value}>{children}</KoroContext.Provider>
}

export function useKoro() {
  const context = useContext(KoroContext)
  if (!context) throw new Error('Koro store is missing')
  return context
}

export type NeedInput = {
  goods: string
  detail: string
  weightKg: number
  originPostal: string
  destPostal: string
  originLabel: string
  destLabel: string
  payMethod: PayMethod
  caption: string
}
