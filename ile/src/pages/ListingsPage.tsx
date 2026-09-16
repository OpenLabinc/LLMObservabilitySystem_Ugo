import { useMemo, useState } from 'react'
import { listings } from '../data/seed'
import type { ListingKind } from '../types'
import { ListingCard } from '../components/ListingCard'

const filters: Array<{ id: 'all' | ListingKind; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'sale', label: 'For sale' },
  { id: 'rent', label: 'For rent' },
  { id: 'shortlet', label: 'Short-let' },
  { id: 'land', label: 'Land' },
]

export function ListingsPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('all')
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    return listings.filter((l) => {
      if (filter !== 'all' && l.kind !== filter) return false
      if (!q.trim()) return true
      const hay = `${l.title} ${l.area} ${l.city} ${l.state}`.toLowerCase()
      return hay.includes(q.trim().toLowerCase())
    })
  }, [filter, q])

  return (
    <div className="shell py-8">
      <p className="text-xs uppercase tracking-[0.18em] text-mist">Listings</p>
      <h1 className="mt-2 font-display text-4xl text-paper">One grid. Every deal kind.</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Sale, rent, short-let, and land — each with agency % and suggested lawyer fee on the card.
      </p>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                filter === f.id
                  ? 'bg-laterite text-ink'
                  : 'border border-line bg-panel/40 text-muted hover:text-paper'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Lekki, Wuye, Ikeja…"
          className="w-full rounded-xl border border-line bg-panel/50 px-3 py-2 text-sm text-paper outline-none placeholder:text-muted focus:border-mist sm:max-w-xs"
        />
      </div>

      <div className="mt-8 grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((listing, i) => (
          <ListingCard key={listing.id} listing={listing} index={i} />
        ))}
      </div>
      {!rows.length && (
        <p className="mt-10 text-center text-muted">No listings match that filter.</p>
      )}
    </div>
  )
}
