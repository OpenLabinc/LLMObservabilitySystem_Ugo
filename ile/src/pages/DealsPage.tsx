import { Link } from 'react-router-dom'
import { deals, formatNgn } from '../data/seed'
import { FeeSheet } from '../components/ListingCard'

const stages = ['inquiry', 'viewing', 'offer', 'docs', 'closing', 'done'] as const

export function DealsPage() {
  return (
    <div className="shell py-8">
      <p className="text-xs uppercase tracking-[0.18em] text-mist">Deals</p>
      <h1 className="mt-2 font-display text-4xl text-paper">Cost-efficient closings</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Each deal carries a living fee sheet and stage checklist so complaints about stacked fees
        surface before money moves.
      </p>

      <div className="mt-10 space-y-10">
        {deals.map((deal) => {
          const stageIndex = stages.indexOf(deal.stage)
          return (
            <article key={deal.id} className="rounded-2xl border border-line bg-panel/40 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl text-paper">{deal.listingTitle}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {deal.buyerName} · {deal.agentName}
                    {deal.lawyerName ? ` · ${deal.lawyerName}` : ''}
                  </p>
                </div>
                <Link to="/agents?tab=checklist" className="text-sm font-semibold text-laterite">
                  Open checklist agent
                </Link>
              </div>

              <ol className="mt-6 flex flex-wrap gap-2">
                {stages.map((s, i) => (
                  <li
                    key={s}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${
                      i <= stageIndex
                        ? 'bg-mist/20 text-mist'
                        : 'border border-line text-muted'
                    }`}
                  >
                    {s}
                  </li>
                ))}
              </ol>

              <div className="mt-6">
                <FeeSheet breakdown={deal.feeBreakdown} />
              </div>
              <p className="mt-3 text-xs text-muted">
                Effective cost {formatNgn(deal.feeBreakdown.effectiveCostNgn)} · updated{' '}
                {new Date(deal.updatedAt).toLocaleString('en-NG')}
              </p>
            </article>
          )
        })}
      </div>
    </div>
  )
}
