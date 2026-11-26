import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../components/ui'
import { formatPostalDisplay } from '../lib/postal'
import { NG_STATES, stateByCode } from '../lib/states'
import { personById } from '../logic/select'
import { useKoro } from '../store'

export function ExplorePage() {
  const { graph, viewer } = useKoro()
  const initial = viewer.role === 'rider' && viewer.corridorFrom ? 'corridor' : viewer.stateCode
  const [filter, setFilter] = useState(initial)
  const cards = useMemo(() => {
    return graph.capacities.filter((row) => {
      if (filter === 'all') return true
      if (filter === 'corridor') return row.fromState === viewer.corridorFrom || row.toState === viewer.corridorTo
      return row.fromState === filter || row.toState === filter
    })
  }, [filter, graph.capacities, viewer.corridorFrom, viewer.corridorTo])

  return (
    <div className="px-4 md:px-0">
      <h1 className="font-serif text-3xl italic">Already going</h1>
      <p className="mt-1 max-w-md text-sm text-muted">
        Spare weight on a corridor. This is not a truck board. If nobody is already going, the need waits.
      </p>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
        <Chip active={filter === 'corridor'} onClick={() => setFilter('corridor')}>
          Your corridor
        </Chip>
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
          All 37
        </Chip>
        {NG_STATES.map((state) => (
          <Chip key={state.code} active={filter === state.code} onClick={() => setFilter(state.code)}>
            {state.name}
          </Chip>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {cards.map((row) => {
          const rider = personById(graph, row.riderId)
          if (!rider) return null
          const from = stateByCode(row.fromState)
          const to = stateByCode(row.toState)
          const needs = graph.shipments.filter((shipment) => {
            if (shipment.status !== 'open') return false
            return shipment.originPostal.startsWith(row.fromState) && shipment.destPostal.startsWith(row.toState)
          })
          return (
            <article key={row.id} className="flex min-h-40 flex-col rounded-2xl border border-line bg-card p-3">
              <div className="flex items-center gap-2">
                <Avatar person={rider} size={28} />
                <Link to={`/u/${rider.handle}`} className="truncate text-sm font-semibold">
                  {rider.name}
                </Link>
              </div>
              <p className="mt-3 font-serif text-lg leading-tight">
                {from?.name} → {to?.name}
              </p>
              <p className="mt-1 text-xs text-muted">
                {row.spareKg} kg spare · {row.leaves}
              </p>
              <p className="text-xs text-muted">{formatPostalDisplay(rider.postal)}</p>
              <p className="mt-2 line-clamp-3 text-xs">{row.note}</p>
              {needs[0] && (
                <Link to={`/p/${needs[0].id}`} className="mt-auto pt-3 text-xs font-semibold text-palm">
                  Open need · {needs[0].goods}
                </Link>
              )}
            </article>
          )
        })}
      </div>
      {cards.length === 0 && <p className="mt-6 text-sm">Nobody is publishing spare weight for that filter.</p>}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-2 text-sm ${active ? 'bg-ink text-white' : 'bg-card text-ink border border-line'}`}
    >
      {children}
    </button>
  )
}
