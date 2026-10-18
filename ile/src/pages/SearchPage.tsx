import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { SiteHeader } from '../components/Header'
import { CategoryChips } from '../components/CategoryChips'
import { ListingCard } from '../components/ListingCard'
import { MapPanel } from '../components/MapPanel'
import { FiltersDrawer } from '../components/FiltersDrawer'
import { searchListings } from '../data/seed'
import { loadWishlist, toggleWishlist } from '../lib/wishlist'

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const destination = params.get('destination') || ''
  const guests = Number(params.get('guests') || 1)
  const category = params.get('category') || 'all'
  const [activeId, setActiveId] = useState<string>()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [maxPrice, setMaxPrice] = useState(400000)
  const [stateFilter, setStateFilter] = useState('')
  const [guestFavoriteOnly, setGuestFavoriteOnly] = useState(false)
  const [wishes, setWishes] = useState(() => loadWishlist())
  const [showMap, setShowMap] = useState(true)

  const results = useMemo(() => {
    return searchListings({ destination, category, guests }).filter((l) => {
      if (l.pricePerNightNgn > maxPrice) return false
      if (stateFilter && l.stateCode !== stateFilter) return false
      if (guestFavoriteOnly && !l.guestFavorite) return false
      return true
    })
  }, [destination, category, guests, maxPrice, stateFilter, guestFavoriteOnly])

  const statesHit = new Set(results.map((r) => r.stateCode)).size

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <div className="shell py-4">
        <CategoryChips
          value={category}
          onChange={(v) => {
            const next = new URLSearchParams(params)
            if (v === 'all') next.delete('category')
            else next.set('category', v)
            setParams(next)
          }}
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold">
            {results.length} stays
            {destination ? ` in “${destination}”` : ' across Nigeria'} · {statesHit} states
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold"
            >
              <SlidersHorizontal size={16} /> Filters
            </button>
            <button
              type="button"
              onClick={() => setShowMap((s) => !s)}
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold lg:hidden"
            >
              {showMap ? 'Hide map' : 'Show map'}
            </button>
          </div>
        </div>
      </div>

      <div className="shell grid flex-1 gap-6 pb-10 lg:grid-cols-2">
        <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2">
          {results.map((l) => (
            <div
              key={l.id}
              onMouseEnter={() => setActiveId(l.id)}
              className={activeId === l.id ? 'ring-2 ring-ink rounded-xl' : ''}
            >
              <ListingCard
                listing={l}
                wished={wishes.includes(l.id)}
                onToggleWish={(id) => setWishes(toggleWishlist(id))}
              />
            </div>
          ))}
          {!results.length && (
            <p className="col-span-full py-16 text-center text-mute">
              No stays match. Try another state, city, or NIPOST postcode.
            </p>
          )}
        </div>
        <div className={`sticky top-28 h-[calc(100dvh-8rem)] ${showMap ? '' : 'hidden lg:block'}`}>
          <MapPanel listings={results} activeId={activeId} onSelect={setActiveId} />
        </div>
      </div>

      <FiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        maxPrice={maxPrice}
        setMaxPrice={setMaxPrice}
        stateFilter={stateFilter}
        setStateFilter={setStateFilter}
        guestFavoriteOnly={guestFavoriteOnly}
        setGuestFavoriteOnly={setGuestFavoriteOnly}
      />
    </div>
  )
}
