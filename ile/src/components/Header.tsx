import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, Menu, Search, UserRound } from 'lucide-react'

export function IleLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2 text-rose">
      <svg width="32" height="32" viewBox="0 0 64 64" aria-hidden>
        <circle cx="32" cy="32" r="30" fill="currentColor" />
        <path
          d="M18 38 V26 L32 16 L46 26 V38 M26 38 V30 H38 V38"
          stroke="#fff"
          strokeWidth="3.2"
          fill="none"
          strokeLinejoin="round"
        />
      </svg>
      {!compact && (
        <span className="font-display text-2xl font-bold tracking-tight text-rose">ile</span>
      )}
    </Link>
  )
}

export function SearchBar({
  initial,
  large = false,
}: {
  initial?: { destination?: string; checkIn?: string; checkOut?: string; guests?: number }
  large?: boolean
}) {
  const navigate = useNavigate()
  const [destination, setDestination] = useState(initial?.destination ?? '')
  const [checkIn, setCheckIn] = useState(initial?.checkIn ?? '')
  const [checkOut, setCheckOut] = useState(initial?.checkOut ?? '')
  const [guests, setGuests] = useState(initial?.guests ?? 1)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const q = new URLSearchParams()
    if (destination) q.set('destination', destination)
    if (checkIn) q.set('checkIn', checkIn)
    if (checkOut) q.set('checkOut', checkOut)
    q.set('guests', String(guests))
    navigate(`/s/homes?${q.toString()}`)
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`flex flex-col divide-y divide-line overflow-hidden rounded-full border border-line bg-white shadow-[0_3px_12px_rgba(0,0,0,0.1)] md:flex-row md:divide-x md:divide-y-0 ${
        large ? 'md:scale-105' : ''
      }`}
    >
      <label className="flex min-w-0 flex-1 flex-col px-6 py-3">
        <span className="text-[10px] font-bold uppercase tracking-wide">Where</span>
        <input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Search states, cities, postcodes…"
          className="min-w-0 bg-transparent text-sm outline-none placeholder:text-mute"
        />
      </label>
      <label className="flex flex-col px-6 py-3 md:w-36">
        <span className="text-[10px] font-bold uppercase tracking-wide">Check in</span>
        <input
          type="date"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          className="bg-transparent text-sm outline-none"
        />
      </label>
      <label className="flex flex-col px-6 py-3 md:w-36">
        <span className="text-[10px] font-bold uppercase tracking-wide">Check out</span>
        <input
          type="date"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          className="bg-transparent text-sm outline-none"
        />
      </label>
      <div className="flex items-center gap-2 px-3 py-2 md:pl-4">
        <label className="flex flex-1 flex-col px-2">
          <span className="text-[10px] font-bold uppercase tracking-wide">Guests</span>
          <input
            type="number"
            min={1}
            max={16}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value) || 1)}
            className="w-16 bg-transparent text-sm outline-none"
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose text-white hover:bg-rose-deep"
          aria-label="Search"
        >
          <Search size={18} />
        </button>
      </div>
    </form>
  )
}

export function SiteHeader({ showSearch = true }: { showSearch?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-white/95 backdrop-blur">
      <div className="shell flex items-center justify-between gap-4 py-4">
        <IleLogo />
        {showSearch && (
          <div className="hidden max-w-3xl flex-1 lg:block">
            <SearchBar />
          </div>
        )}
        <div className="flex items-center gap-2">
          <Link to="/wishlists" className="rounded-full p-2 hover:bg-soft" aria-label="Wishlists">
            <Heart size={20} />
          </Link>
          <Link
            to="/wishlists"
            className="inline-flex items-center gap-2 rounded-full border border-line py-1.5 pl-3 pr-1.5 shadow-sm hover:shadow-md"
          >
            <Menu size={16} />
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white">
              <UserRound size={16} />
            </span>
          </Link>
        </div>
      </div>
      {showSearch && (
        <div className="shell pb-4 lg:hidden">
          <SearchBar />
        </div>
      )}
    </header>
  )
}
