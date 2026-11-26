import { Bookmark, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, PersonLine, PriceBlock, ProofArt, StatusPill } from '../components/ui'
import { formatPostalDisplay } from '../lib/postal'
import { stateByCode } from '../lib/states'
import { whenLabel } from '../lib/format'
import { corridorMatch, feed, isSaved, openOnCorridor, personById } from '../logic/select'
import { useKoro } from '../store'

export function FeedPage() {
  const { graph, viewer, toggleSave } = useKoro()
  const posts = feed(graph)
  const stories = graph.stories
    .slice()
    .sort((a, b) => {
      const aLive = graph.shipments.find((row) => row.id === a.shipmentId)?.status === 'moving' ? 1 : 0
      const bLive = graph.shipments.find((row) => row.id === b.shipmentId)?.status === 'moving' ? 1 : 0
      return bLive - aLive || b.createdAt.localeCompare(a.createdAt)
    })
  return (
    <div className="mx-auto grid max-w-[860px] gap-4 xl:grid-cols-[470px_300px]">
      <div>
        <div className="flex gap-3 overflow-x-auto px-4 py-2 md:px-0">
          {stories.map((story) => {
            const author = personById(graph, story.authorId)
            const shipment = graph.shipments.find((row) => row.id === story.shipmentId)
            if (!author) return null
            const live = shipment?.status === 'moving'
            return (
              <Link key={story.id} to={`/stories/${story.id}`} className="w-16 shrink-0 text-center">
                <span className={`inline-block rounded-full p-[2px] ${live ? 'bg-gradient-to-tr from-palm to-clay' : 'bg-line'}`}>
                  <span className="block rounded-full bg-paper p-[2px]">
                    <Avatar person={author} size={56} />
                  </span>
                </span>
                <span className="mt-1 block truncate text-[11px]">{author.name.split(' ')[0]}</span>
              </Link>
            )
          })}
        </div>
        <div className="xl:hidden">
          <CorridorHint />
        </div>
        <div className="grid gap-4">
          {posts.map((post) => {
            const author = personById(graph, post.authorId)
            const rider = personById(graph, post.riderId)
            if (!author) return null
            const saved = isSaved(graph, viewer.id, post.id)
            const comments = graph.comments.filter((row) => row.shipmentId === post.id).length
            return (
              <article key={post.id} className="border-y border-line bg-card md:rounded-2xl md:border">
                <header className="flex items-center gap-3 px-3 py-3">
                  <Link to={`/u/${author.handle}`}>
                    <Avatar person={author} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <PersonLine person={author} />
                    <p className="text-xs text-muted">
                      {post.originLabel} → {post.destLabel}
                      {rider ? ` · ${rider.name.split(' ')[0]}` : ''} · {whenLabel(post.createdAt)}
                    </p>
                  </div>
                  <StatusPill status={post.status} />
                </header>
                <Link to={`/p/${post.id}`} className="block">
                  <ProofArt kind={post.proof} title={post.goods} from={post.originPostal} to={post.destPostal} />
                </Link>
                <PriceBlock lines={post} pay={post.payMethod} compact />
                <div className="flex items-center gap-2 px-2 pb-2">
                  <Link to={`/p/${post.id}`} className="grid h-11 w-11 place-items-center" aria-label={`${comments} comments`}>
                    <MessageCircle size={22} />
                  </Link>
                  <button
                    type="button"
                    className="grid h-11 w-11 place-items-center"
                    aria-pressed={saved}
                    aria-label={saved ? 'Remove save' : 'Save drop'}
                    onClick={() => void toggleSave(post.id)}
                  >
                    <Bookmark size={22} fill={saved ? 'currentColor' : 'none'} />
                  </button>
                  {corridorMatch(viewer, post) && post.status === 'open' && (
                    <Link to={`/p/${post.id}`} className="ml-auto rounded-full bg-palm px-3 py-2 text-sm font-semibold text-white">
                      Claim
                    </Link>
                  )}
                </div>
                <p className="px-3 pb-4 text-sm">
                  <Link to={`/u/${author.handle}`} className="font-semibold">
                    {author.handle}
                  </Link>{' '}
                  {post.caption}
                </p>
              </article>
            )
          })}
        </div>
      </div>
      <aside className="sticky top-6 hidden h-fit xl:block">
        <CorridorHint />
      </aside>
    </div>
  )
}

function CorridorHint() {
  const { graph, viewer } = useKoro()
  const open = openOnCorridor(graph, viewer)
  if (viewer.role !== 'rider' || !viewer.corridorFrom || !viewer.corridorTo) {
    return (
      <div className="m-4 rounded-2xl border border-line bg-card p-4 md:m-0">
        <p className="text-sm font-semibold">Post a need, then wait for someone already going.</p>
        <Link to="/new" className="mt-3 inline-block text-sm font-semibold text-palm">
          Post a need
        </Link>
      </div>
    )
  }
  const from = stateByCode(viewer.corridorFrom)?.name
  const to = stateByCode(viewer.corridorTo)?.name
  return (
    <div className="m-4 rounded-2xl border border-line bg-card p-4 md:m-0">
      <p className="text-xs uppercase tracking-wide text-muted">Your corridor</p>
      <p className="mt-1 font-semibold">
        {from} → {to}
      </p>
      <p className="text-sm text-muted">
        {viewer.spareKg} kg spare · {viewer.leaves}
      </p>
      <p className="mt-1 text-xs text-muted">Base {formatPostalDisplay(viewer.postal)}</p>
      {open.length === 0 ? (
        <p className="mt-3 text-sm">No open need on this corridor right now.</p>
      ) : (
        open.map((row) => (
          <Link key={row.id} to={`/p/${row.id}`} className="mt-3 block rounded-xl bg-mist p-3">
            <p className="font-semibold">{row.goods}</p>
            <p className="text-sm text-muted">
              {row.originLabel} → {row.destLabel}
            </p>
          </Link>
        ))
      )}
    </div>
  )
}
