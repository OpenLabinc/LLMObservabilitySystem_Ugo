import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Star, BadgeCheck, MapPin } from 'lucide-react'
import { SiteHeader } from '../components/Header'
import { getHost, getListing } from '../data/seed'
import { formatNgn, stayPriceBreakdown } from '../lib/pricing'
import { formatPostalDisplay, isValidPostal } from '../lib/postal'

export function ListingPage() {
  const { slug } = useParams()
  const listing = slug ? getListing(slug) : undefined
  const host = listing ? getHost(listing.hostId) : undefined
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [checkIn, setCheckIn] = useState(params.get('checkIn') || '')
  const [checkOut, setCheckOut] = useState(params.get('checkOut') || '')
  const [guests, setGuests] = useState(Number(params.get('guests') || 1))

  const breakdown = useMemo(
    () => (listing ? stayPriceBreakdown(listing, checkIn, checkOut) : null),
    [listing, checkIn, checkOut],
  )

  if (!listing || !isValidPostal(listing.postalCode)) {
    return (
      <div>
        <SiteHeader />
        <div className="shell-narrow py-16">
          <p className="font-semibold">Listing unavailable</p>
          <p className="mt-2 text-mute">
            Ile rejects stays without a valid 11-character NIPOST building postcode.
          </p>
          <Link to="/s/homes" className="mt-4 inline-block text-rose underline">
            Back to search
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <SiteHeader />
      <div className="shell-narrow py-6">
        <h1 className="text-2xl font-bold md:text-3xl">{listing.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1 font-semibold">
            <Star size={14} fill="currentColor" /> {listing.rating.toFixed(2)}
          </span>
          <span className="underline">{listing.reviewCount} reviews</span>
          {listing.guestFavorite && (
            <span className="rounded-full bg-soft px-2 py-0.5 text-xs font-bold">Guest favourite</span>
          )}
          <span className="inline-flex items-center gap-1 text-mute">
            <MapPin size={14} />
            {listing.neighbourhood}, {listing.city}, {listing.stateName}
          </span>
        </div>

        <div className="mt-6 grid gap-2 overflow-hidden rounded-2xl md:grid-cols-4 md:grid-rows-2 md:h-[420px]">
          <img
            src={listing.images[0]}
            alt=""
            className="h-64 w-full object-cover md:col-span-2 md:row-span-2 md:h-full"
          />
          {listing.images.slice(1, 5).map((src) => (
            <img key={src} src={src} alt="" className="hidden h-full w-full object-cover md:block" />
          ))}
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="flex items-start justify-between gap-4 border-b border-line pb-6">
              <div>
                <h2 className="text-xl font-bold">
                  Entire stay hosted by {host?.name ?? 'Host'}
                </h2>
                <p className="mt-1 text-mute">
                  {listing.guests} guests · {listing.beds} beds · {listing.baths} baths
                </p>
              </div>
              {host && (
                <Link to={`/hosts/${host.id}`}>
                  <img src={host.avatar} alt="" className="h-14 w-14 rounded-full object-cover" />
                </Link>
              )}
            </div>

            <div className="border-b border-line py-6">
              <h3 className="font-bold">Street address & NIPOST postcode</h3>
              <p className="mt-2 text-sm">{listing.streetAddress}</p>
              <p className="text-sm text-mute">
                {listing.neighbourhood}, {listing.city}, {listing.stateName}
              </p>
              <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-soft px-3 py-2 font-mono text-sm font-semibold tracking-wide">
                <BadgeCheck size={16} className="text-good" />
                {formatPostalDisplay(listing.postalCode)}
              </p>
              <p className="mt-2 text-xs text-mute">
                Official 11-character National Digital Alphanumeric Postcode (building-level).
                Required on every Ile listing.
              </p>
            </div>

            <div className="border-b border-line py-6">
              <p className="leading-relaxed text-ink/90">{listing.description}</p>
              <p className="mt-3 text-sm text-mute">{listing.hostServiceNote}</p>
            </div>

            <div className="py-6">
              <h3 className="font-bold">What this place offers</h3>
              <ul className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {listing.amenities.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          </div>

          <aside className="h-fit rounded-2xl border border-line p-6 shadow-[0_6px_16px_rgba(0,0,0,0.12)]">
            <p className="text-xl font-bold">
              {formatNgn(listing.pricePerNightNgn)}{' '}
              <span className="text-base font-normal text-mute">night</span>
            </p>
            <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-xl border border-line text-sm">
              <label className="border-b border-r border-line p-3">
                <span className="text-[10px] font-bold uppercase">Check-in</span>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="mt-1 w-full outline-none"
                />
              </label>
              <label className="border-b border-line p-3">
                <span className="text-[10px] font-bold uppercase">Checkout</span>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="mt-1 w-full outline-none"
                />
              </label>
              <label className="col-span-2 p-3">
                <span className="text-[10px] font-bold uppercase">Guests</span>
                <input
                  type="number"
                  min={1}
                  max={listing.guests}
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value) || 1)}
                  className="mt-1 w-full outline-none"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => {
                const q = new URLSearchParams({
                  checkIn,
                  checkOut,
                  guests: String(guests),
                })
                navigate(`/book/${listing.slug}?${q}`)
              }}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-rose to-rose-deep py-3.5 text-sm font-bold text-white"
            >
              Reserve
            </button>
            <p className="mt-2 text-center text-xs text-mute">You won’t be charged yet</p>
            {breakdown && (
              <ul className="mt-6 space-y-3 border-t border-line pt-4 text-sm">
                {breakdown.lines.map((line) => (
                  <li key={line.label} className="flex justify-between gap-4">
                    <span>
                      <span className="underline decoration-mute/50">{line.label}</span>
                      {line.note && <span className="mt-0.5 block text-xs text-mute">{line.note}</span>}
                    </span>
                    <span className="tabular-nums">{formatNgn(line.amountNgn)}</span>
                  </li>
                ))}
                <li className="flex justify-between border-t border-line pt-3 text-base font-bold">
                  <span>Total</span>
                  <span className="tabular-nums">{formatNgn(breakdown.totalNgn)}</span>
                </li>
              </ul>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
