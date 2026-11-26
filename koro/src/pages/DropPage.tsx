import { FormEvent, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar, PersonLine, PriceBlock, ProofArt, StatusPill, Stepper } from '../components/ui'
import { whenLabel } from '../lib/format'
import { claimBlocker, storyBlocker } from '../logic/actions'
import { isSaved, personById } from '../logic/select'
import { useKoro } from '../store'

export function DropPage() {
  const { id = '' } = useParams()
  const koro = useKoro()
  const post = koro.graph.shipments.find((row) => row.id === id)
  const [leg, setLeg] = useState('Leaving now. Goods are sealed.')
  const [proof, setProof] = useState('Sealed before pickup.')
  const [comment, setComment] = useState('')
  const [dispute, setDispute] = useState('')
  if (!post) return <p className="p-4">That drop is not on Koro.</p>
  const author = personById(koro.graph, post.authorId)
  const rider = personById(koro.graph, post.riderId)
  const comments = koro.graph.comments.filter((row) => row.shipmentId === post.id)
  const hasStory = koro.graph.stories.some((row) => row.shipmentId === post.id)
  const claimReason = claimBlocker(koro.graph, koro.viewer.id, post.id)
  const storyReason = storyBlocker(koro.graph, koro.viewer.id, post.id)
  const saved = isSaved(koro.graph, koro.viewer.id, post.id)
  const canComplete =
    post.riderId === koro.viewer.id &&
    (post.status === 'locked' || post.status === 'moving') &&
    hasStory
  const canDispute =
    post.authorId === koro.viewer.id && (post.status === 'moving' || post.status === 'delivered')

  function onComment(event: FormEvent) {
    event.preventDefault()
    void koro.comment(post!.id, comment).then(() => setComment(''))
  }

  return (
    <article className="mx-auto max-w-[470px]">
      <header className="flex items-center gap-3 px-4 py-3 md:px-0">
        {author && (
          <Link to={`/u/${author.handle}`}>
            <Avatar person={author} />
          </Link>
        )}
        <div className="min-w-0 flex-1">{author && <PersonLine person={author} />}</div>
        <StatusPill status={post.status} />
      </header>
      <ProofArt kind={post.proof} title={`${post.goods} · ${post.detail}`} from={post.originPostal} to={post.destPostal} />
      <div className="grid gap-3 p-4 md:px-0">
        <Stepper status={post.status} hasStory={hasStory} />
        <PriceBlock lines={post} pay={post.payMethod} />
        <p className="text-sm">
          <span className="font-semibold">{author?.handle}</span> {post.caption}
        </p>
        <p className="text-xs text-muted">
          {post.weightKg} kg · {whenLabel(post.createdAt)}
          {rider ? ` · Rider ${rider.name}` : ''}
        </p>
        {post.status === 'open' && (
          <div>
            <button
              type="button"
              disabled={Boolean(claimReason) || koro.pending}
              onClick={() => void koro.claim(post.id)}
              className="w-full rounded-full bg-palm px-4 py-3 font-semibold text-white disabled:bg-line disabled:text-muted"
            >
              Claim — I am already going
            </button>
            {claimReason && <p className="mt-2 text-sm text-muted">{claimReason}</p>}
          </div>
        )}
        {post.status === 'claimed' && koro.viewer.id === post.riderId && (
          <Link to={`/inbox/${post.id}`} className="rounded-full bg-clay px-4 py-3 text-center font-semibold text-white">
            Lock the price in the deal thread
          </Link>
        )}
        {(post.status === 'locked' || post.status === 'moving') && post.riderId === koro.viewer.id && (
          <form
            className="grid gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void koro.addStory(post.id, leg)
            }}
          >
            <label className="text-sm font-semibold">
              Live leg
              <input value={leg} onChange={(event) => setLeg(event.target.value)} className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-3" />
            </label>
            <button
              type="submit"
              disabled={Boolean(storyReason) || koro.pending}
              className="rounded-full bg-ink px-4 py-3 font-semibold text-white disabled:bg-line disabled:text-muted"
            >
              Share live leg
            </button>
            {storyReason && <p className="text-sm text-muted">{storyReason}</p>}
          </form>
        )}
        {post.riderId === koro.viewer.id && ['locked', 'moving', 'delivered', 'disputed'].includes(post.status) && (
          <form
            className="grid gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void koro.addReel(post.id, 'Packing proof', proof)
            }}
          >
            <label className="text-sm font-semibold">
              Packing or route proof
              <input value={proof} onChange={(event) => setProof(event.target.value)} className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-3" />
            </label>
            <button type="submit" disabled={koro.pending} className="rounded-full border border-ink px-4 py-3 font-semibold">
              Add proof
            </button>
          </form>
        )}
        {canComplete && (
          <button
            type="button"
            disabled={koro.pending}
            onClick={() => void koro.complete(post.id)}
            className="rounded-full bg-palm px-4 py-3 font-semibold text-white"
          >
            Mark drop complete
          </button>
        )}
        {canDispute && (
          <form
            className="grid gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void koro.dispute(post.id, dispute)
            }}
          >
            <label className="text-sm font-semibold">
              Log a dispute. The locked price stays.
              <input value={dispute} onChange={(event) => setDispute(event.target.value)} className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-3" />
            </label>
            <button type="submit" disabled={koro.pending} className="rounded-full border border-clay px-4 py-3 font-semibold text-clay">
              Log dispute
            </button>
          </form>
        )}
        <button type="button" onClick={() => void koro.toggleSave(post.id)} className="text-left text-sm font-semibold">
          {saved ? 'Saved' : 'Save this drop'}
        </button>
        <section className="grid gap-3">
          <h2 className="text-sm font-semibold">Comments</h2>
          {comments.map((row) => {
            const who = personById(koro.graph, row.authorId)
            return (
              <p key={row.id} className="text-sm">
                <Link to={`/u/${who?.handle ?? ''}`} className="font-semibold">
                  {who?.name}
                </Link>{' '}
                {row.body}
              </p>
            )
          })}
          {comments.length === 0 && <p className="text-sm text-muted">No comments yet.</p>}
          <form onSubmit={onComment} className="flex gap-2">
            <input
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Comment on the drop"
              className="min-w-0 flex-1 rounded-full border border-line bg-card px-4 py-3"
            />
            <button type="submit" className="font-semibold text-palm">
              Post
            </button>
          </form>
        </section>
      </div>
    </article>
  )
}
