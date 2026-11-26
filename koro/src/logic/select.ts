import { parsePostal } from '../lib/postal'
import { stateByCode } from '../lib/states'
import type { Graph, Person, Shipment } from '../data/types'

export function viewer(graph: Graph): Person {
  return graph.people.find((row) => row.id === graph.viewerId) ?? graph.people[0]
}

export function personById(graph: Graph, id: string | undefined): Person | undefined {
  if (!id) return undefined
  return graph.people.find((row) => row.id === id)
}

export function personByHandle(graph: Graph, handle: string): Person | undefined {
  const key = handle.toLowerCase()
  return graph.people.find((row) => row.handle.toLowerCase() === key)
}

export function feed(graph: Graph): Shipment[] {
  return graph.shipments
    .filter((row) => row.onFeed)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function followersOf(graph: Graph, id: string): Person[] {
  return graph.follows
    .filter((row) => row.followeeId === id)
    .map((row) => personById(graph, row.followerId))
    .filter((row): row is Person => Boolean(row))
}

export function followingOf(graph: Graph, id: string): Person[] {
  return graph.follows
    .filter((row) => row.followerId === id)
    .map((row) => personById(graph, row.followeeId))
    .filter((row): row is Person => Boolean(row))
}

export function isFollowing(graph: Graph, followerId: string, followeeId: string): boolean {
  return graph.follows.some((row) => row.followerId === followerId && row.followeeId === followeeId)
}

export function isSaved(graph: Graph, personId: string, shipmentId: string): boolean {
  return graph.saves.some((row) => row.personId === personId && row.shipmentId === shipmentId)
}

export function corridorMatch(person: Person, shipment: Shipment): boolean {
  if (person.role !== 'rider' || !person.corridorFrom || !person.corridorTo) return false
  const origin = parsePostal(shipment.originPostal)
  const dest = parsePostal(shipment.destPostal)
  if (!origin || !dest) return false
  return person.corridorFrom === origin.state && person.corridorTo === dest.state
}

export function openOnCorridor(graph: Graph, person: Person): Shipment[] {
  return feed(graph).filter((row) => row.status === 'open' && corridorMatch(person, row))
}

export function placeLabel(postal: string): string {
  const parsed = parsePostal(postal)
  if (!parsed) return postal
  const state = stateByCode(parsed.state)
  return state ? `${state.name}` : parsed.state
}

export function unreadCount(graph: Graph, personId: string): number {
  return graph.notices.filter((row) => row.personId === personId && !row.read).length
}
