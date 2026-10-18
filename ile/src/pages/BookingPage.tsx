import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { SiteHeader } from '../components/Header'
import { getListing } from '../data/seed'
import { formatNgn, stayPriceBreakdown } from '../lib/pricing'
import { isValidPostal } from '../lib/postal'

export function BookingPage() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const listing = slug ? getListing(slug) : undefined
  const checkIn = params.get('checkIn') || ''
  const checkOut = params.get('checkOut') || ''
  const guests = Number(params.get('guests') || 1)
  const [done, setDone] = useState(false)

  const breakdown = useMemo(
    () => (listing ? stayPriceBreakdown(listing, checkIn, checkOut) : null),
    [listing, checkIn, checkOut],
  )

  if (!listing || !isValidPostal(listing.postalCode) || !breakdown) {
    return (
      <div>
        <SiteHeader />
        <p className="shell py-16 text-mute">Booking requires a valid listed stay with NIPOST postcode.</p>
      </div>
    )
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setDone(true)
  }

  if (done) {
    return (
      <div>
        <SiteHeader showSearch={false} />
        <div className="shell-narrow py-16 text-center">
          <h1 className="text-3xl font-bold">Request sent</h1>
          <p className="mt-3 text-mute">
            Your host will confirm. Total requested:{' '}
            <strong className="text-ink">{formatNgn(breakdown.totalNgn)}</strong> — no stacked
            agent fees.
          </p>
          <Link to="/" className="mt-6 inline-block text-rose font-semibold underline">
            Back home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <SiteHeader showSearch={false} />
      <div className="shell-narrow grid gap-10 py-10 lg:grid-cols-2">
        <form onSubmit={onSubmit} className="space-y-4">
          <button type="button" onClick={() => navigate(-1)} className="text-sm font-semibold">
            ← Back
          </button>
          <h1 className="text-3xl font-bold">Request to book</h1>
          <p className="text-mute">
            {checkIn || 'Flexible'} → {checkOut || 'Flexible'} · {guests} guest
            {guests === 1 ? '' : 's'}
          </p>
          <label className="block text-sm font-semibold">
            Full name
            <input required className="mt-1 w-full rounded-xl border border-line px-3 py-2.5" />
          </label>
          <label className="block text-sm font-semibold">
            Email
            <input
              required
              type="email"
              className="mt-1 w-full rounded-xl border border-line px-3 py-2.5"
            />
          </label>
          <label className="block text-sm font-semibold">
            Message to host
            <textarea
              rows={4}
              className="mt-1 w-full rounded-xl border border-line px-3 py-2.5"
              placeholder="Travel plans, arrival time…"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-xl bg-rose py-3.5 text-sm font-bold text-white hover:bg-rose-deep"
          >
            Request to book
          </button>
        </form>

        <aside className="h-fit rounded-2xl border border-line p-5">
          <div className="flex gap-3">
            <img
              src={listing.images[0]}
              alt=""
              className="h-24 w-28 rounded-xl object-cover"
            />
            <div>
              <p className="font-semibold">{listing.title}</p>
              <p className="text-sm text-mute">
                {listing.city}, {listing.stateName}
              </p>
              <p className="mt-1 font-mono text-xs">{listing.postalDisplay}</p>
            </div>
          </div>
          <h2 className="mt-6 font-bold">Price details</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {breakdown.lines.map((line) => (
              <li key={line.label} className="flex justify-between gap-3">
                <span>
                  {line.label}
                  {line.note && <span className="block text-xs text-mute">{line.note}</span>}
                </span>
                <span>{formatNgn(line.amountNgn)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-line pt-4 text-base font-bold">
            <span>Total (NGN)</span>
            <span>{formatNgn(breakdown.totalNgn)}</span>
          </div>
        </aside>
      </div>
    </div>
  )
}
