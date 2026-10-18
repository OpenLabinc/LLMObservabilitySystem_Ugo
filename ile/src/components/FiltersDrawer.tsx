import { NG_STATES } from '../lib/states'

export function FiltersDrawer({
  open,
  onClose,
  maxPrice,
  setMaxPrice,
  stateFilter,
  setStateFilter,
  guestFavoriteOnly,
  setGuestFavoriteOnly,
}: {
  open: boolean
  onClose: () => void
  maxPrice: number
  setMaxPrice: (n: number) => void
  stateFilter: string
  setStateFilter: (s: string) => void
  guestFavoriteOnly: boolean
  setGuestFavoriteOnly: (v: boolean) => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[90dvh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Filters</h2>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-mute">
            Close
          </button>
        </div>
        <label className="mt-6 block text-sm font-semibold">
          Max price / night (₦)
          <input
            type="range"
            min={30000}
            max={400000}
            step={5000}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="mt-2 w-full"
          />
          <span className="text-mute">{maxPrice.toLocaleString('en-NG')}</span>
        </label>
        <label className="mt-6 block text-sm font-semibold">
          State / FCT
          <select
            className="mt-2 w-full rounded-xl border border-line px-3 py-2"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
          >
            <option value="">All 37</option>
            {NG_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </label>
        <label className="mt-6 flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={guestFavoriteOnly}
            onChange={(e) => setGuestFavoriteOnly(e.target.checked)}
          />
          Guest favourites only
        </label>
        <button
          type="button"
          onClick={onClose}
          className="mt-8 w-full rounded-xl bg-ink py-3 text-sm font-bold text-white"
        >
          Show stays
        </button>
      </div>
    </div>
  )
}
