import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getListing, formatNgn, kindLabel } from '../data/seed'
import { estimateFees } from '../lib/fees'
import { FeeSheet } from '../components/ListingCard'

export function ListingDetailPage() {
  const { slug } = useParams()
  const listing = slug ? getListing(slug) : undefined

  if (!listing) {
    return (
      <div className="shell py-16">
        <p className="text-muted">Listing not found.</p>
        <Link to="/listings" className="mt-4 inline-block text-laterite">
          Back to listings
        </Link>
      </div>
    )
  }

  const fees = estimateFees({
    kind: listing.kind,
    dealValueNgn: listing.priceNgn,
    agentFeePercent: listing.agentFeePercent,
    lawyerFeeNgn: listing.lawyerFeeSuggestedNgn,
    cautionMonths: listing.kind === 'rent' ? 1 : 0,
    serviceChargeNgn: listing.kind === 'rent' ? 350_000 : 0,
    includeGovTransfer: listing.kind === 'sale' || listing.kind === 'land',
  })

  return (
    <div>
      <div className="relative min-h-[48vh] overflow-hidden md:min-h-[56vh]">
        <img
          src={listing.image}
          alt={listing.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/20" />
        <div className="relative shell flex min-h-[48vh] flex-col justify-end pb-10 pt-24 md:min-h-[56vh]">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-fit rounded-md bg-ink/60 px-2 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur"
          >
            {kindLabel(listing.kind)} · {listing.status.replace('_', ' ')}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 max-w-3xl font-display text-4xl text-paper md:text-5xl"
            style={{ fontWeight: 700 }}
          >
            {listing.title}
          </motion.h1>
          <p className="mt-2 text-mist">
            {listing.area}, {listing.city}, {listing.state}
          </p>
          <p className="mt-4 font-display text-3xl tabular-nums text-laterite">
            {formatNgn(listing.priceNgn)}
            {listing.kind === 'rent' ? <span className="text-base text-muted"> / year</span> : null}
            {listing.kind === 'shortlet' ? <span className="text-base text-muted"> / night</span> : null}
          </p>
        </div>
      </div>

      <div className="shell grid gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-base leading-relaxed text-paper/90">{listing.blurb}</p>
          <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {listing.beds != null && (
              <div>
                <dt className="text-xs text-muted">Beds</dt>
                <dd className="text-lg font-semibold">{listing.beds}</dd>
              </div>
            )}
            {listing.baths != null && (
              <div>
                <dt className="text-xs text-muted">Baths</dt>
                <dd className="text-lg font-semibold">{listing.baths}</dd>
              </div>
            )}
            {listing.sqm != null && (
              <div>
                <dt className="text-xs text-muted">Size</dt>
                <dd className="text-lg font-semibold">{listing.sqm} m²</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-muted">Agent</dt>
              <dd className="text-lg font-semibold">{listing.agentName}</dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/messages"
              className="rounded-xl bg-laterite px-4 py-3 text-sm font-bold text-ink hover:bg-laterite-deep"
            >
              Message agent
            </Link>
            <Link
              to="/deals"
              className="rounded-xl border border-line px-4 py-3 text-sm font-semibold text-paper hover:border-mist"
            >
              Start deal
            </Link>
            <Link
              to="/agents?tab=fees"
              className="rounded-xl border border-line px-4 py-3 text-sm font-semibold text-mist hover:border-mist"
            >
              Estimate my fees
            </Link>
          </div>
        </div>

        <FeeSheet breakdown={fees} />
      </div>
    </div>
  )
}
