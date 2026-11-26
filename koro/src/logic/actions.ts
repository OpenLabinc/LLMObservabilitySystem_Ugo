import { payLabel, naira } from '../lib/format'
import { quote, totalNgn } from '../lib/pricing'
import { parsePostal, postalError } from '../lib/postal'
import type { Deal, Graph, PayMethod, Person, ProofKind, Shipment, Status } from '../data/types'

export type Result = { ok: true; graph: Graph } | { ok: false; error: string }

function rid(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}

function now(): string {
  return new Date().toISOString()
}

function personOf(graph: Graph, id: string): Person | undefined {
  return graph.people.find((row) => row.id === id)
}

function shipmentOf(graph: Graph, id: string): Shipment | undefined {
  return graph.shipments.find((row) => row.id === id)
}

function replaceShipment(graph: Graph, next: Shipment): Graph {
  return { ...graph, shipments: graph.shipments.map((row) => (row.id === next.id ? next : row)) }
}

function replacePerson(graph: Graph, next: Person): Graph {
  return { ...graph, people: graph.people.map((row) => (row.id === next.id ? next : row)) }
}

const lockedStatuses: Status[] = ['locked', 'moving', 'delivered', 'disputed']

export function claimBlocker(graph: Graph, viewerId: string, shipmentId: string): string | null {
  const viewer = personOf(graph, viewerId)
  const shipment = shipmentOf(graph, shipmentId)
  if (!viewer || !shipment) return 'That drop is not on Koro.'
  if (viewer.role !== 'rider') return 'Only a rider can claim a drop.'
  if (shipment.authorId === viewer.id) return 'You posted this need.'
  if (shipment.status !== 'open') return 'This drop is no longer open.'
  const origin = parsePostal(shipment.originPostal)
  const dest = parsePostal(shipment.destPostal)
  if (!origin || !dest) return 'This drop has a bad postcode.'
  if (viewer.corridorFrom !== origin.state || viewer.corridorTo !== dest.state) {
    return 'You are not already going that way.'
  }
  return null
}

export function claim(graph: Graph, viewerId: string, shipmentId: string): Result {
  const error = claimBlocker(graph, viewerId, shipmentId)
  if (error) return { ok: false, error }
  const viewer = personOf(graph, viewerId)!
  const shipment = shipmentOf(graph, shipmentId)!
  const deal: Deal = {
    id: shipment.id,
    shipmentId: shipment.id,
    participantIds: [viewer.id, shipment.authorId],
    locked: false,
    pickupNgn: shipment.pickupNgn,
    distanceNgn: shipment.distanceNgn,
    hubNgn: shipment.hubNgn,
    platformFeeNgn: shipment.platformFeeNgn,
    payMethod: shipment.payMethod,
  }
  const stamp = now()
  return {
    ok: true,
    graph: {
      ...replaceShipment(graph, { ...shipment, status: 'claimed', riderId: viewer.id }),
      deals: [...graph.deals, deal],
      messages: [
        ...graph.messages,
        {
          id: `msg-${shipment.id}-claim`,
          dealId: shipment.id,
          authorId: null,
          kind: 'system',
          body: `${viewer.name} claimed this drop. The price below is the full price. Lock it before the goods move.`,
          createdAt: stamp,
        },
      ],
      notices: [
        {
          id: `nt-${rid()}`,
          personId: shipment.authorId,
          body: `${viewer.name} claimed your ${shipment.goods.toLowerCase()} drop.`,
          href: `/inbox/${shipment.id}`,
          read: false,
          createdAt: stamp,
        },
        ...graph.notices,
      ],
    },
  }
}

export function lockBlocker(graph: Graph, viewerId: string, dealId: string): string | null {
  const deal = graph.deals.find((row) => row.id === dealId)
  if (!deal) return 'Claim the drop before locking a price.'
  if (!deal.participantIds.includes(viewerId)) return 'You are not in this deal.'
  if (deal.locked) return 'The price is already locked.'
  return null
}

export function lockPrice(graph: Graph, viewerId: string, dealId: string): Result {
  const error = lockBlocker(graph, viewerId, dealId)
  if (error) return { ok: false, error }
  const deal = graph.deals.find((row) => row.id === dealId)!
  const shipment = shipmentOf(graph, deal.shipmentId)
  if (!shipment) return { ok: false, error: 'The drop for this deal is missing.' }
  const who = personOf(graph, viewerId)
  const stamp = now()
  const body = `Price locked at ${naira(totalNgn(deal))}. Pickup ${naira(deal.pickupNgn)}, distance ${naira(deal.distanceNgn)}, hub ${naira(deal.hubNgn)}, Koro fee ${naira(deal.platformFeeNgn)}. ${payLabel(deal.payMethod)}. No add-ons.`
  return {
    ok: true,
    graph: {
      ...replaceShipment(graph, {
        ...shipment,
        status: shipment.status === 'open' || shipment.status === 'claimed' ? 'locked' : shipment.status,
      }),
      deals: graph.deals.map((row) => (row.id === deal.id ? { ...row, locked: true } : row)),
      messages: [
        ...graph.messages,
        { id: `msg-${deal.id}-lock-${rid()}`, dealId: deal.id, authorId: null, kind: 'lock', body, createdAt: stamp },
      ],
      notices: [
        {
          id: `nt-${rid()}`,
          personId: deal.participantIds.find((id) => id !== viewerId) ?? viewerId,
          body: `${who?.name ?? 'Someone'} locked ${naira(totalNgn(deal))} on ${shipment.goods.toLowerCase()}.`,
          href: `/inbox/${deal.id}`,
          read: false,
          createdAt: stamp,
        },
        ...graph.notices,
      ],
    },
  }
}

export function storyBlocker(graph: Graph, viewerId: string, shipmentId: string): string | null {
  const shipment = shipmentOf(graph, shipmentId)
  if (!shipment) return 'That drop is not on Koro.'
  if (shipment.riderId !== viewerId) return 'Only the rider on this drop can post a live leg.'
  if (shipment.status === 'claimed') return 'Lock the price in the deal thread before posting a live leg.'
  if (!lockedStatuses.includes(shipment.status) && shipment.status !== 'locked') {
    return 'Lock the price before the goods move.'
  }
  if (shipment.status === 'delivered' || shipment.status === 'disputed') {
    return 'This drop is already public. Post a proof reel instead of a live leg.'
  }
  return null
}

export function addStory(graph: Graph, viewerId: string, shipmentId: string, caption: string): Result {
  const error = storyBlocker(graph, viewerId, shipmentId)
  if (error) return { ok: false, error }
  const shipment = shipmentOf(graph, shipmentId)!
  const text = caption.trim()
  if (!text) return { ok: false, error: 'Say where the goods are.' }
  const stamp = now()
  const story = {
    id: `leg-${shipment.id}-${rid()}`,
    authorId: viewerId,
    shipmentId: shipment.id,
    label: `${shipment.originLabel} → ${shipment.destLabel}`,
    caption: text,
    fromPostal: shipment.originPostal,
    toPostal: shipment.destPostal,
    createdAt: stamp,
  }
  return {
    ok: true,
    graph: {
      ...replaceShipment(graph, { ...shipment, status: 'moving' }),
      stories: [story, ...graph.stories],
      messages: graph.deals.some((row) => row.id === shipment.id)
        ? [
            ...graph.messages,
            {
              id: `msg-${shipment.id}-leg-${rid()}`,
              dealId: shipment.id,
              authorId: null,
              kind: 'system',
              body: `Live leg posted. ${shipment.originLabel} to ${shipment.destLabel}.`,
              createdAt: stamp,
            },
          ]
        : graph.messages,
    },
  }
}

export function addReel(graph: Graph, viewerId: string, shipmentId: string, title: string, caption: string): Result {
  const shipment = shipmentOf(graph, shipmentId)
  if (!shipment) return { ok: false, error: 'That drop is not on Koro.' }
  if (shipment.riderId !== viewerId) return { ok: false, error: 'Only the rider on this drop can post proof.' }
  if (shipment.status === 'open' || shipment.status === 'claimed') {
    return { ok: false, error: 'Lock the price before posting proof.' }
  }
  const text = caption.trim()
  if (!text) return { ok: false, error: 'Describe the proof.' }
  const stamp = now()
  return {
    ok: true,
    graph: {
      ...graph,
      reels: [
        {
          id: `proof-${shipment.id}-${rid()}`,
          authorId: viewerId,
          shipmentId: shipment.id,
          title: title.trim() || 'Packing proof',
          proof: shipment.proof,
          caption: text,
          createdAt: stamp,
        },
        ...graph.reels,
      ],
    },
  }
}

export function completeDrop(graph: Graph, viewerId: string, shipmentId: string): Result {
  const shipment = shipmentOf(graph, shipmentId)
  const rider = personOf(graph, viewerId)
  if (!shipment || !rider) return { ok: false, error: 'That drop is not on Koro.' }
  if (shipment.riderId !== viewerId) return { ok: false, error: 'Only the rider can mark this drop complete.' }
  if (shipment.status !== 'locked' && shipment.status !== 'moving') {
    return { ok: false, error: 'Lock the price before completing the drop.' }
  }
  if (!graph.stories.some((row) => row.shipmentId === shipment.id)) {
    return { ok: false, error: 'Post a live leg before you mark the drop complete.' }
  }
  const stamp = now()
  return {
    ok: true,
    graph: {
      ...replacePerson(replaceShipment(graph, { ...shipment, status: 'delivered' }), {
        ...rider,
        dropsCompleted: rider.dropsCompleted + 1,
        dropsOnTime: rider.dropsOnTime + 1,
      }),
      notices: [
        {
          id: `nt-${rid()}`,
          personId: shipment.authorId,
          body: `${rider.name} marked ${shipment.goods.toLowerCase()} complete. The drop is public proof.`,
          href: `/p/${shipment.id}`,
          read: false,
          createdAt: stamp,
        },
        ...graph.notices,
      ],
    },
  }
}

export function logDispute(graph: Graph, viewerId: string, shipmentId: string, note: string): Result {
  const shipment = shipmentOf(graph, shipmentId)
  if (!shipment) return { ok: false, error: 'That drop is not on Koro.' }
  if (shipment.authorId !== viewerId) return { ok: false, error: 'Only the person who posted the need can log a dispute.' }
  if (shipment.status !== 'moving' && shipment.status !== 'delivered') {
    return { ok: false, error: 'Log a dispute once the goods are moving or delivered.' }
  }
  if (!shipment.riderId) return { ok: false, error: 'There is no rider on this drop.' }
  const text = note.trim()
  if (!text) return { ok: false, error: 'Say what went wrong. The price will not change.' }
  const rider = personOf(graph, shipment.riderId)
  const stamp = now()
  const next = replaceShipment(graph, { ...shipment, status: 'disputed' })
  return {
    ok: true,
    graph: {
      ...(rider ? replacePerson(next, { ...rider, disputes: rider.disputes + 1 }) : next),
      comments: [
        ...next.comments,
        { id: `c-${rid()}`, shipmentId, authorId: viewerId, body: text, createdAt: stamp },
      ],
      messages: next.deals.some((row) => row.id === shipment.id)
        ? [
            ...next.messages,
            {
              id: `msg-${shipment.id}-dispute-${rid()}`,
              dealId: shipment.id,
              authorId: viewerId,
              kind: 'text',
              body: `${text} The locked price stays.`,
              createdAt: stamp,
            },
          ]
        : next.messages,
    },
  }
}

export function createNeed(
  graph: Graph,
  viewerId: string,
  input: {
    goods: string
    detail: string
    weightKg: number
    originPostal: string
    destPostal: string
    originLabel: string
    destLabel: string
    payMethod: PayMethod
    caption: string
  },
): Result {
  const viewer = personOf(graph, viewerId)
  if (!viewer) return { ok: false, error: 'Pick who is posting.' }
  if (viewer.role !== 'sender' && viewer.role !== 'shop' && viewer.role !== 'market') {
    return { ok: false, error: 'Riders claim drops. Switch to a shop or sender to post a need.' }
  }
  const originError = postalError(input.originPostal)
  const destError = postalError(input.destPostal)
  if (originError) return { ok: false, error: `Pickup: ${originError}` }
  if (destError) return { ok: false, error: `Drop-off: ${destError}` }
  if (!input.goods.trim()) return { ok: false, error: 'Say what is moving.' }
  if (!(input.weightKg > 0) || input.weightKg > 200) {
    return { ok: false, error: 'Weight must be between 0 and 200 kg. This is spare corridor space, not a truck.' }
  }
  let price
  try {
    price = quote(input.originPostal, input.destPostal, input.weightKg)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not price this drop.' }
  }
  const id = `need-${rid()}`
  const stamp = now()
  const shipment: Shipment = {
    id,
    authorId: viewer.id,
    status: 'open',
    goods: input.goods.trim(),
    detail: input.detail.trim() || input.goods.trim(),
    weightKg: input.weightKg,
    originPostal: parsePostal(input.originPostal)!.compact,
    destPostal: parsePostal(input.destPostal)!.compact,
    originLabel: input.originLabel.trim() || 'Pickup',
    destLabel: input.destLabel.trim() || 'Drop-off',
    payMethod: input.payMethod,
    proof: proofFor(input.goods),
    caption: input.caption.trim() || `${input.goods.trim()} needs a rider already going that way.`,
    onFeed: true,
    createdAt: stamp,
    ...price,
  }
  return { ok: true, graph: { ...graph, shipments: [shipment, ...graph.shipments] } }
}

function proofFor(goods: string): ProofKind {
  const text = goods.toLowerCase()
  if (text.includes('oil') || text.includes('fuel')) return 'jerrycan'
  if (text.includes('rice') || text.includes('grain') || text.includes('garri')) return 'sack'
  if (text.includes('crate') || text.includes('plantain')) return 'crate'
  if (text.includes('paper') || text.includes('envelope')) return 'parcel'
  if (text.includes('carton') || text.includes('box')) return 'cartons'
  return 'parcel'
}

export function addComment(graph: Graph, viewerId: string, shipmentId: string, body: string): Result {
  const text = body.trim()
  if (!text) return { ok: false, error: 'Write a comment.' }
  if (!shipmentOf(graph, shipmentId)) return { ok: false, error: 'That drop is not on Koro.' }
  return {
    ok: true,
    graph: {
      ...graph,
      comments: [
        ...graph.comments,
        { id: `c-${rid()}`, shipmentId, authorId: viewerId, body: text, createdAt: now() },
      ],
    },
  }
}

export function sendMessage(graph: Graph, viewerId: string, dealId: string, body: string): Result {
  const deal = graph.deals.find((row) => row.id === dealId)
  if (!deal) return { ok: false, error: 'This deal thread does not exist yet.' }
  if (!deal.participantIds.includes(viewerId)) return { ok: false, error: 'You are not in this deal.' }
  const text = body.trim()
  if (!text) return { ok: false, error: 'Write a message.' }
  return {
    ok: true,
    graph: {
      ...graph,
      messages: [
        ...graph.messages,
        { id: `msg-${rid()}`, dealId, authorId: viewerId, kind: 'text', body: text, createdAt: now() },
      ],
    },
  }
}

export function toggleFollow(graph: Graph, viewerId: string, followeeId: string): Result {
  if (viewerId === followeeId) return { ok: false, error: 'You cannot follow yourself.' }
  if (!personOf(graph, followeeId)) return { ok: false, error: 'That profile is not on Koro.' }
  const existing = graph.follows.find((row) => row.followerId === viewerId && row.followeeId === followeeId)
  return {
    ok: true,
    graph: {
      ...graph,
      follows: existing
        ? graph.follows.filter((row) => row.id !== existing.id)
        : [...graph.follows, { id: `${viewerId}-${followeeId}-${rid()}`, followerId: viewerId, followeeId }],
    },
  }
}

export function toggleSave(graph: Graph, viewerId: string, shipmentId: string): Result {
  if (!shipmentOf(graph, shipmentId)) return { ok: false, error: 'That drop is not on Koro.' }
  const existing = graph.saves.find((row) => row.personId === viewerId && row.shipmentId === shipmentId)
  return {
    ok: true,
    graph: {
      ...graph,
      saves: existing
        ? graph.saves.filter((row) => row.id !== existing.id)
        : [...graph.saves, { id: `${viewerId}-${shipmentId}`, personId: viewerId, shipmentId }],
    },
  }
}

export function markRead(graph: Graph, viewerId: string): Result {
  return {
    ok: true,
    graph: {
      ...graph,
      notices: graph.notices.map((row) => (row.personId === viewerId ? { ...row, read: true } : row)),
    },
  }
}
