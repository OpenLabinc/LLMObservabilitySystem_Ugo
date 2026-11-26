import { FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar, PersonLine, PostcodeField, PriceBlock, ProofArt } from '../components/ui'
import type { PayMethod } from '../data/types'
import { naira, onTimePercent, payLabel, roleLabel, whenLabel } from '../lib/format'
import { formatPostalDisplay, postalError } from '../lib/postal'
import { quote, totalNgn, PRICE_RULES } from '../lib/pricing'
import { stateByCode } from '../lib/states'
import { lockBlocker } from '../logic/actions'
import {
  followersOf,
  followingOf,
  isFollowing,
  isSaved,
  personByHandle,
  personById,
} from '../logic/select'
import { useKoro } from '../store'

export function SearchPage() {
  const { graph } = useKoro()
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const people = graph.people.filter((person) => {
    const desk = person.handle.startsWith('desk-')
    if (!query) return !desk
    const state = stateByCode(person.stateCode)
    return [person.name, person.handle, person.city, person.bio, state?.name, person.postal]
      .join(' ')
      .toLowerCase()
      .includes(query.replace(/\s/g, ''))
      || [person.name, person.handle, person.city, state?.name].join(' ').toLowerCase().includes(query)
  })
  const drops = graph.shipments.filter((row) => {
    if (!query) return false
    return [row.goods, row.caption, row.originLabel, row.destLabel, row.originPostal, row.destPostal]
      .join(' ')
      .toLowerCase()
      .includes(query.replace(/\s/g, '').slice(0, 11)) ||
      [row.goods, row.caption, row.originLabel, row.destLabel].join(' ').toLowerCase().includes(query)
  })
  return (
    <div className="px-4 md:px-0">
      <h1 className="mb-3 font-serif text-3xl italic">Find a drop</h1>
      <label className="block">
        <span className="sr-only">Search</span>
        <input
          autoFocus
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="People, goods, states, postcodes"
          className="w-full rounded-full border border-line bg-card px-4 py-3"
        />
      </label>
      <div className="mt-4 grid gap-3">
        {drops.map((row) => (
          <Link key={row.id} to={`/p/${row.id}`} className="rounded-2xl border border-line bg-card p-3">
            <p className="font-semibold">{row.goods}</p>
            <p className="text-sm text-muted">
              {row.originLabel} → {row.destLabel}
            </p>
          </Link>
        ))}
        {people.slice(0, 24).map((person) => (
          <Link key={person.id} to={`/u/${person.handle}`} className="flex items-center gap-3">
            <Avatar person={person} />
            <PersonLine person={person} linked={false} />
          </Link>
        ))}
        {query && people.length === 0 && drops.length === 0 && <p className="text-sm">Nothing matches that.</p>}
      </div>
    </div>
  )
}

export function ReelsPage() {
  const { graph } = useKoro()
  const reels = graph.reels.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return (
    <div className="mx-auto max-w-[470px]">
      {reels.map((reel) => {
        const author = personById(graph, reel.authorId)
        const drop = graph.shipments.find((row) => row.id === reel.shipmentId)
        if (!drop || !author) return null
        return (
          <section key={reel.id} className="mb-6 overflow-hidden bg-ink text-white md:rounded-3xl">
            <ProofArt kind={reel.proof} title={reel.title} from={drop.originPostal} to={drop.destPostal} tall />
            <div className="p-4">
              <p className="text-xs uppercase tracking-wide text-white/70">Proof, not a video file</p>
              <h2 className="mt-1 text-xl font-semibold">{reel.title}</h2>
              <p className="mt-2 text-sm">{reel.caption}</p>
              <p className="mt-2 text-sm text-white/80">{author.name}</p>
              <Link to={`/p/${drop.id}`} className="mt-3 inline-block rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink">
                Open the drop
              </Link>
            </div>
          </section>
        )
      })}
    </div>
  )
}

export function StoryPage() {
  const { id = '' } = useParams()
  const { graph } = useKoro()
  const navigate = useNavigate()
  const index = graph.stories.findIndex((row) => row.id === id)
  const story = graph.stories[index]
  if (!story) return <p className="p-4">That live leg is gone.</p>
  const author = personById(graph, story.authorId)
  const drop = graph.shipments.find((row) => row.id === story.shipmentId)
  const previous = graph.stories[index - 1]
  const next = graph.stories[index + 1]
  return (
    <div className="mx-auto max-w-[470px] overflow-hidden bg-ink text-paper md:rounded-3xl">
      <div className="flex items-center justify-between p-4">
        <button type="button" onClick={() => navigate(-1)} className="text-sm">
          Close
        </button>
        <p className="text-xs uppercase tracking-wide">{drop?.status === 'moving' ? 'Live leg' : 'Past leg'}</p>
      </div>
      <div className="px-4 pb-8">
        <p className="font-serif text-4xl italic">{story.label}</p>
        <p className="mt-4 text-lg">{story.caption}</p>
        <p className="mt-6 text-sm text-white/70">{author?.name}</p>
        {drop && (
          <Link to={`/p/${drop.id}`} className="mt-4 inline-block rounded-full bg-paper px-4 py-2 text-sm font-semibold text-ink">
            {drop.goods} · {drop.originLabel} → {drop.destLabel}
          </Link>
        )}
        <div className="mt-8 flex justify-between text-sm">
          {previous ? <Link to={`/stories/${previous.id}`}>Previous</Link> : <span />}
          {next && <Link to={`/stories/${next.id}`}>Next</Link>}
        </div>
      </div>
    </div>
  )
}

export function ProfilePage() {
  const { handle = '' } = useParams()
  const koro = useKoro()
  const person = personByHandle(koro.graph, handle)
  if (!person) return <p className="p-4">That profile is not on Koro.</p>
  const state = stateByCode(person.stateCode)
  const drops = koro.graph.shipments.filter((row) => row.authorId === person.id || row.riderId === person.id)
  const followers = followersOf(koro.graph, person.id)
  const following = followingOf(koro.graph, person.id)
  const mine = person.id === koro.viewer.id
  const followingThem = isFollowing(koro.graph, koro.viewer.id, person.id)
  const from = person.corridorFrom ? stateByCode(person.corridorFrom) : undefined
  const to = person.corridorTo ? stateByCode(person.corridorTo) : undefined
  return (
    <div className="mx-auto max-w-[640px] px-4 md:px-0">
      <div className="flex items-start gap-4">
        <Avatar person={person} size={84} />
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-3xl italic leading-none">{person.name}</h1>
          <p className="mt-1 text-sm text-muted">
            @{person.handle} · {roleLabel(person.role)}
          </p>
          <p className="mt-2 text-sm">{person.bio}</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Drops" value={String(person.dropsCompleted)} />
        <Stat label="On time" value={`${onTimePercent(person.dropsCompleted, person.dropsOnTime)}%`} />
        <Stat label="Disputes" value={String(person.disputes)} />
      </dl>
      <p className="mt-3 text-sm text-muted">
        {followers.length} followers · {following.length} following
      </p>
      <p className="mt-1 text-sm">
        {person.city}
        {state ? `, ${state.name}` : ''} · {formatPostalDisplay(person.postal)}
      </p>
      {from && to && (
        <p className="mt-1 text-sm">
          Corridor {from.name} → {to.name}
          {person.spareKg != null ? ` · ${person.spareKg} kg spare` : ''} {person.leaves ? `· ${person.leaves}` : ''}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        {!mine && (
          <button
            type="button"
            onClick={() => void koro.toggleFollow(person.id)}
            className="rounded-full bg-palm px-4 py-2 text-sm font-semibold text-white"
          >
            {followingThem ? 'Following' : 'Follow'}
          </button>
        )}
        {mine && (
          <Link to="/saved" className="rounded-full border border-ink px-4 py-2 text-sm font-semibold">
            Saved
          </Link>
        )}
      </div>
      <h2 className="mt-6 text-sm font-semibold">Public drops</h2>
      <div className="mt-2 grid grid-cols-3 gap-1">
        {drops.map((row) => (
          <Link key={row.id} to={`/p/${row.id}`} className="block">
            <ProofArt kind={row.proof} title={row.goods} from={row.originPostal} to={row.destPostal} compact />
          </Link>
        ))}
      </div>
      {drops.length === 0 && <p className="mt-2 text-sm text-muted">No public drops yet. Capacity is on Explore.</p>}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-mist px-2 py-3">
      <dt className="text-[11px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-lg font-semibold">{value}</dd>
    </div>
  )
}

export function InboxPage() {
  const { graph, viewer } = useKoro()
  const deals = graph.deals.filter((row) => row.participantIds.includes(viewer.id))
  return (
    <div className="mx-auto max-w-[560px] px-4 md:px-0">
      <h1 className="font-serif text-3xl italic">Deals</h1>
      <p className="mt-1 text-sm text-muted">A claim opens a thread. The price locks here. Nothing is added after that.</p>
      <div className="mt-4 grid gap-2">
        {deals
          .slice()
          .sort((a, b) => (a.locked === b.locked ? 0 : a.locked ? 1 : -1))
          .map((deal) => {
            const drop = graph.shipments.find((row) => row.id === deal.shipmentId)
            const other = personById(
              graph,
              deal.participantIds.find((id) => id !== viewer.id),
            )
            return (
              <Link key={deal.id} to={`/inbox/${deal.id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3">
                {other && <Avatar person={other} />}
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{drop?.goods ?? 'Drop'}</span>
                  <span className="block truncate text-sm text-muted">
                    {other?.name} · {deal.locked ? `Locked ${naira(totalNgn(deal))}` : 'Price not locked'}
                  </span>
                </span>
              </Link>
            )
          })}
      </div>
      {deals.length === 0 && (
        <p className="mt-6 text-sm">
          When you claim a drop, the deal lives here.{' '}
          <Link to="/p/oil" className="font-semibold text-palm">
            Engine oil is open on the Aba → Enugu corridor.
          </Link>
        </p>
      )}
    </div>
  )
}

export function ThreadPage() {
  const { id = '' } = useParams()
  const koro = useKoro()
  const deal = koro.graph.deals.find((row) => row.id === id)
  const [text, setText] = useState('')
  if (!deal) return <p className="p-4">Claim the drop before this thread exists.</p>
  if (!deal.participantIds.includes(koro.viewer.id)) return <p className="p-4">You are not in this deal.</p>
  const drop = koro.graph.shipments.find((row) => row.id === deal.shipmentId)
  const messages = koro.graph.messages
    .filter((row) => row.dealId === deal.id)
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const reason = lockBlocker(koro.graph, koro.viewer.id, deal.id)
  function onSend(event: FormEvent) {
    event.preventDefault()
    void koro.send(deal!.id, text).then(() => setText(''))
  }
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-[560px] flex-col px-4 md:px-0">
      <Link to={`/p/${deal.shipmentId}`} className="text-sm font-semibold text-palm">
        {drop?.goods} · {drop?.originLabel} → {drop?.destLabel}
      </Link>
      <div className="mt-3">
        <PriceBlock lines={deal} pay={deal.payMethod} />
      </div>
      {deal.locked ? (
        <p className="mt-3 rounded-xl bg-palm px-3 py-2 text-sm text-white">Price locked. This thread cannot add a fee.</p>
      ) : (
        <button
          type="button"
          disabled={Boolean(reason) || koro.pending}
          onClick={() => void koro.lock(deal.id)}
          className="mt-3 rounded-full bg-clay px-4 py-3 font-semibold text-white disabled:bg-line"
        >
          Lock {naira(totalNgn(deal))}
        </button>
      )}
      <div className="mt-4 grid flex-1 content-start gap-2">
        {messages.map((row) => {
          const mine = row.authorId === koro.viewer.id
          const who = personById(koro.graph, row.authorId ?? undefined)
          return (
            <div key={row.id} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${row.kind === 'text' && mine ? 'ml-auto bg-palm text-white' : 'bg-mist'}`}>
              <p className="text-[11px] uppercase tracking-wide opacity-70">
                {row.kind === 'lock' ? 'Locked price' : row.kind === 'system' ? 'Koro' : who?.name}
              </p>
              <p>{row.body}</p>
            </div>
          )
        })}
      </div>
      <form onSubmit={onSend} className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Message the deal"
          className="min-w-0 flex-1 rounded-full border border-line bg-card px-4 py-3"
        />
        <button type="submit" className="font-semibold text-palm">
          Send
        </button>
      </form>
    </div>
  )
}

export function SavedPage() {
  const { graph, viewer } = useKoro()
  const rows = graph.saves.filter((row) => row.personId === viewer.id)
  return (
    <div className="px-4 md:px-0">
      <h1 className="font-serif text-3xl italic">Saved</h1>
      <div className="mt-4 grid gap-3">
        {rows.map((row) => {
          const drop = graph.shipments.find((item) => item.id === row.shipmentId)
          if (!drop || !isSaved(graph, viewer.id, drop.id)) return null
          return (
            <Link key={row.id} to={`/p/${drop.id}`} className="rounded-2xl border border-line bg-card p-3">
              <p className="font-semibold">{drop.goods}</p>
              <p className="text-sm text-muted">
                {drop.originLabel} → {drop.destLabel} · {naira(totalNgn(drop))}
              </p>
            </Link>
          )
        })}
        {rows.length === 0 && <p className="text-sm">Save a drop from the feed when you want to come back to it.</p>}
      </div>
    </div>
  )
}

export function NotificationsPage() {
  const koro = useKoro()
  const rows = koro.graph.notices
    .filter((row) => row.personId === koro.viewer.id)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return (
    <div className="px-4 md:px-0">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl italic">Notifications</h1>
        <button type="button" onClick={() => void koro.markRead()} className="text-sm font-semibold text-palm">
          Mark read
        </button>
      </div>
      <div className="mt-4 grid gap-2">
        {rows.map((row) => (
          <Link key={row.id} to={row.href} className={`rounded-2xl border border-line px-3 py-3 text-sm ${row.read ? 'bg-card' : 'bg-mist'}`}>
            <span className="block">{row.body}</span>
            <span className="text-xs text-muted">{whenLabel(row.createdAt)}</span>
          </Link>
        ))}
        {rows.length === 0 && <p className="text-sm">No notifications for this profile.</p>}
      </div>
    </div>
  )
}

export function CreatePage() {
  const koro = useKoro()
  const navigate = useNavigate()
  const [goods, setGoods] = useState('')
  const [weight, setWeight] = useState('5')
  const [originPostal, setOrigin] = useState('')
  const [destPostal, setDest] = useState('')
  const [originLabel, setOriginLabel] = useState('')
  const [destLabel, setDestLabel] = useState('')
  const [pay, setPay] = useState<PayMethod>('pod')
  const [caption, setCaption] = useState('')
  const weightKg = Number(weight)
  const priced = useMemo(() => {
    if (postalError(originPostal) || postalError(destPostal)) return null
    if (!(weightKg > 0) || weightKg > 200) return null
    try {
      return quote(originPostal, destPostal, weightKg)
    } catch {
      return null
    }
  }, [destPostal, originPostal, weightKg])
  const blocked =
    koro.viewer.role !== 'sender' && koro.viewer.role !== 'shop' && koro.viewer.role !== 'market'

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const id = await koro.createNeed({
      goods,
      detail: goods,
      weightKg,
      originPostal,
      destPostal,
      originLabel,
      destLabel,
      payMethod: pay,
      caption,
    })
    if (id) navigate(`/p/${id}`)
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto grid max-w-[560px] gap-4 px-4 md:px-0">
      <div>
        <h1 className="font-serif text-3xl italic">Post a need</h1>
        <p className="mt-1 text-sm text-muted">The total is on this screen before you confirm. Koro does not add a fee later.</p>
      </div>
      {blocked && (
        <p className="rounded-xl bg-mist p-3 text-sm">
          You are viewing as {koro.viewer.name}, a rider. Riders claim drops. Switch to Nkechi or Adaeze to post a need.
        </p>
      )}
      <label className="block text-sm font-semibold">
        What is moving
        <input value={goods} onChange={(event) => setGoods(event.target.value)} className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-3" />
      </label>
      <label className="block text-sm font-semibold">
        Weight (kg)
        <input value={weight} onChange={(event) => setWeight(event.target.value)} inputMode="decimal" className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-3" />
      </label>
      <PostcodeField label="Pickup postcode" value={originPostal} onChange={setOrigin} />
      <label className="block text-sm font-semibold">
        Pickup place
        <input value={originLabel} onChange={(event) => setOriginLabel(event.target.value)} placeholder="Aba shop" className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-3" />
      </label>
      <PostcodeField label="Drop-off postcode" value={destPostal} onChange={setDest} />
      <label className="block text-sm font-semibold">
        Drop-off place
        <input value={destLabel} onChange={(event) => setDestLabel(event.target.value)} placeholder="Enugu" className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-3" />
      </label>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold">How they pay</legend>
        {(['cash', 'transfer', 'pod'] as const).map((method) => (
          <label key={method} className="flex items-center gap-2 text-sm">
            <input type="radio" name="pay" checked={pay === method} onChange={() => setPay(method)} />
            {payLabel(method)}
          </label>
        ))}
        <p className="text-xs text-muted">Pay on delivery uses the same total. It does not add a fee.</p>
      </fieldset>
      <label className="block text-sm font-semibold">
        Note
        <textarea value={caption} onChange={(event) => setCaption(event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-3" />
      </label>
      {priced ? (
        <PriceBlock lines={priced} pay={pay} />
      ) : (
        <p className="rounded-2xl bg-mist p-3 text-sm">Enter two valid postcodes and a weight to see the full price.</p>
      )}
      <ul className="grid gap-1 text-xs text-muted">
        {PRICE_RULES.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
      <button
        type="submit"
        disabled={!priced || blocked || !goods.trim() || koro.pending}
        className="rounded-full bg-palm px-4 py-3 font-semibold text-white disabled:bg-line disabled:text-muted"
      >
        Post this need
      </button>
    </form>
  )
}
