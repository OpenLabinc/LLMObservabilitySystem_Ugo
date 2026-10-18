import type { Listing } from '../types'
import { formatNgn } from '../lib/pricing'

/** Lightweight Nigeria-relative map (no Mapbox key required). */
export function MapPanel({
  listings,
  activeId,
  onSelect,
}: {
  listings: Listing[]
  activeId?: string
  onSelect?: (id: string) => void
}) {
  // Nigeria approx bounds
  const minLat = 4.2
  const maxLat = 13.9
  const minLng = 2.7
  const maxLng = 14.7

  function pos(lat: number, lng: number) {
    const x = ((lng - minLng) / (maxLng - minLng)) * 100
    const y = ((maxLat - lat) / (maxLat - minLat)) * 100
    return { left: `${Math.min(98, Math.max(2, x))}%`, top: `${Math.min(98, Math.max(2, y))}%` }
  }

  return (
    <div className="relative h-full min-h-[420px] overflow-hidden rounded-2xl border border-line bg-map">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, #cfe3d4 0, transparent 40%), radial-gradient(circle at 70% 60%, #b7d4c4 0, transparent 45%), linear-gradient(180deg,#d9ebe0,#c5dccf)',
        }}
      />
      <p className="absolute left-3 top-3 z-10 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold shadow">
        Nigeria · {listings.length} stays
      </p>
      {listings.map((l) => {
        const p = pos(l.lat, l.lng)
        const active = l.id === activeId
        return (
          <button
            key={l.id}
            type="button"
            onClick={() => onSelect?.(l.id)}
            style={{ left: p.left, top: p.top }}
            className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full px-2.5 py-1 text-xs font-bold shadow-md transition ${
              active ? 'scale-110 bg-ink text-white' : 'bg-white text-ink hover:scale-105'
            }`}
            title={`${l.city}, ${l.stateName}`}
          >
            {formatNgn(l.pricePerNightNgn).replace('NGN', '₦').replace(/\s/g, '')}
          </button>
        )
      })}
    </div>
  )
}
