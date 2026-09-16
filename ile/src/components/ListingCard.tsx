import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { FeeBreakdown, Listing } from '../types'
import { formatNgn, kindLabel } from '../data/seed'
import { roleGuide } from '../lib/fees'

export function FeeSheet({ breakdown }: { breakdown: FeeBreakdown }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-panel/80">
      <div className="flex items-end justify-between gap-4 border-b border-line px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-mist">Fee sheet</p>
          <p className="mt-1 font-display text-xl text-paper">Transparent total</p>
        </div>
        {breakdown.stackedAgentRisk && (
          <span className="rounded-lg bg-bad/20 px-2 py-1 text-xs font-semibold text-bad">
            Stacked agent risk
          </span>
        )}
      </div>
      <ul className="divide-y divide-line/80">
        {breakdown.lines.map((line) => (
          <li key={line.id} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
            <div>
              <p className="font-medium text-paper">{line.label}</p>
              <p className="mt-0.5 text-xs text-muted">
                {line.party}
                {line.percentOfDeal != null ? ` · ${line.percentOfDeal}%` : ''}
                {!line.required ? ' · optional' : ''}
              </p>
              {line.note && <p className="mt-1 text-xs text-mist/90">{line.note}</p>}
            </div>
            <p className="shrink-0 font-semibold tabular-nums">{formatNgn(line.amountNgn)}</p>
          </li>
        ))}
      </ul>
      <div className="grid gap-2 border-t border-line bg-ink-soft/80 px-4 py-3 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted">Deal value</p>
          <p className="font-semibold tabular-nums">{formatNgn(breakdown.dealValueNgn)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">All fees</p>
          <p className="font-semibold tabular-nums text-laterite">
            {formatNgn(breakdown.totalFeesNgn)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Effective cost</p>
          <p className="font-semibold tabular-nums">{formatNgn(breakdown.effectiveCostNgn)}</p>
        </div>
      </div>
      {breakdown.lawyerCapHint && (
        <p className="border-t border-line px-4 py-3 text-xs text-muted">{breakdown.lawyerCapHint}</p>
      )}
    </div>
  )
}

export function ListingCard({ listing, index = 0 }: { listing: Listing; index?: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      className="group"
    >
      <Link to={`/listings/${listing.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-panel">
          <img
            src={listing.image}
            alt={listing.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
          <span className="absolute left-3 top-3 rounded-md bg-ink/70 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-paper backdrop-blur">
            {kindLabel(listing.kind)}
          </span>
          <div className="absolute inset-x-3 bottom-3">
            <p className="font-display text-lg leading-tight text-paper">{listing.title}</p>
            <p className="mt-1 text-sm text-mist">
              {listing.area}, {listing.city}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-base font-semibold tabular-nums">{formatNgn(listing.priceNgn)}</p>
            <p className="text-xs text-muted">
              Agency {listing.agentFeePercent}% · Lawyer from {formatNgn(listing.lawyerFeeSuggestedNgn)}
            </p>
          </div>
          <span className="rounded-lg bg-laterite px-3 py-2 text-xs font-bold text-ink transition group-hover:bg-laterite-deep">
            Open
          </span>
        </div>
      </Link>
    </motion.article>
  )
}

export function RoleStrip() {
  const roles = ['buyer', 'seller', 'landlord', 'tenant', 'agent', 'lawyer'] as const
  return (
    <section className="shell py-10">
      <p className="text-xs uppercase tracking-[0.18em] text-mist">Clear roles</p>
      <h2 className="mt-2 max-w-xl font-display text-3xl text-paper">
        Everyone knows who pays what
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <div key={role} className="border-l-2 border-laterite/70 pl-4">
            <p className="text-sm font-semibold capitalize text-paper">{role}</p>
            <p className="mt-1 text-sm text-muted">{roleGuide[role]}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
