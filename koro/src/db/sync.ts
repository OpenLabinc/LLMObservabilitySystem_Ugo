import type {
  Capacity,
  Comment,
  Deal,
  Follow,
  Graph,
  Message,
  Notice,
  Person,
  Reel,
  Save,
  Shipment,
  Story,
} from '../data/types'
import { emptyGraph } from '../data/seed'

export interface Queryable {
  query(sql: string, vars?: Record<string, unknown>): Promise<unknown>
}

const TABLES = [
  'message',
  'notice',
  'saved_drop',
  'follow',
  'comment',
  'reel',
  'story',
  'deal',
  'capacity',
  'shipment',
  'person',
] as const

function strId(value: unknown): string {
  const text = typeof value === 'string' ? value : String(value ?? '')
  const index = text.lastIndexOf(':')
  return index >= 0 ? text.slice(index + 1) : text
}

function num(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  if (value && typeof value === 'object') return Number(String(value))
  return 0
}

function asTime(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'toISOString' in value) {
    const fn = (value as { toISOString?: () => string }).toISOString
    if (typeof fn === 'function') return fn.call(value)
  }
  return String(value ?? '')
}

function opt(value: unknown): string | undefined {
  if (value == null || value === 'NONE') return undefined
  const text = String(value)
  return text.length ? text : undefined
}

function rowsOf(result: unknown, index: number): Record<string, unknown>[] {
  if (!Array.isArray(result)) return []
  const block = result[index]
  if (!Array.isArray(block)) return []
  return block.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
}

async function upsert(db: Queryable, table: string, id: string, setSql: string, vars: Record<string, unknown>) {
  await db.query(`UPSERT type::record($table, $id) SET ${setSql}`, { table, id, ...vars })
}

async function remove(db: Queryable, table: string, id: string) {
  await db.query('DELETE type::record($table, $id)', { table, id })
}

async function diff<T extends { id: string }>(
  db: Queryable,
  table: string,
  prev: T[],
  next: T[],
  write: (db: Queryable, row: T) => Promise<void>,
) {
  const nextIds = new Set(next.map((row) => row.id))
  for (const row of prev) {
    if (!nextIds.has(row.id)) await remove(db, table, row.id)
  }
  for (const row of next) {
    const old = prev.find((item) => item.id === row.id)
    if (!old || JSON.stringify(old) !== JSON.stringify(row)) await write(db, row)
  }
}

async function upsertPerson(db: Queryable, row: Person) {
  const vars: Record<string, unknown> = {
    handle: row.handle,
    name: row.name,
    role: row.role,
    bio: row.bio,
    city: row.city,
    state_code: row.stateCode,
    postal_code: row.postal,
    drops_completed: row.dropsCompleted,
    drops_on_time: row.dropsOnTime,
    disputes: row.disputes,
  }
  const optional = [
    clause('corridor_from', row.corridorFrom, vars),
    clause('corridor_to', row.corridorTo, vars),
    clause('spare_kg', row.spareKg, vars),
    clause('leaves', row.leaves, vars),
  ].join(', ')
  await upsert(
    db,
    'person',
    row.id,
    `handle = $handle, name = $name, role = $role, bio = $bio, city = $city, state_code = $state_code,
     postal_code = $postal_code, drops_completed = $drops_completed, drops_on_time = $drops_on_time,
     disputes = $disputes, ${optional}`,
    vars,
  )
}

function clause(name: string, value: string | number | undefined, vars: Record<string, unknown>): string {
  if (value === undefined) return `${name} = NONE`
  vars[name] = value
  return `${name} = $${name}`
}

async function upsertShipment(db: Queryable, row: Shipment) {
  const riderSql = row.riderId ? 'rider = type::record("person", $rider)' : 'rider = NONE'
  await upsert(
    db,
    'shipment',
    row.id,
    `author = type::record("person", $author), ${riderSql}, status = $status, goods = $goods, detail = $detail,
     weight_kg = $weight_kg, origin_postal = $origin_postal, dest_postal = $dest_postal,
     origin_label = $origin_label, dest_label = $dest_label, pickup_ngn = $pickup_ngn,
     distance_ngn = $distance_ngn, hub_ngn = $hub_ngn, platform_fee_ngn = $platform_fee_ngn,
     hidden_fee_ngn = 0, distance_km = $distance_km, pay_method = $pay_method, proof = $proof,
     caption = $caption, on_feed = $on_feed, formula = 'koro-v1', created_at = <datetime>$created_at`,
    {
      author: row.authorId,
      rider: row.riderId ?? null,
      status: row.status,
      goods: row.goods,
      detail: row.detail,
      weight_kg: row.weightKg,
      origin_postal: row.originPostal,
      dest_postal: row.destPostal,
      origin_label: row.originLabel,
      dest_label: row.destLabel,
      pickup_ngn: row.pickupNgn,
      distance_ngn: row.distanceNgn,
      hub_ngn: row.hubNgn,
      platform_fee_ngn: row.platformFeeNgn,
      distance_km: row.distanceKm,
      pay_method: row.payMethod,
      proof: row.proof,
      caption: row.caption,
      on_feed: row.onFeed,
      created_at: row.createdAt,
    },
  )
}

async function upsertStory(db: Queryable, row: Story) {
  await upsert(
    db,
    'story',
    row.id,
    `author = type::record("person", $author), shipment = type::record("shipment", $shipment),
     label = $label, caption = $caption, from_postal = $from_postal, to_postal = $to_postal,
     created_at = <datetime>$created_at`,
    {
      author: row.authorId,
      shipment: row.shipmentId,
      label: row.label,
      caption: row.caption,
      from_postal: row.fromPostal,
      to_postal: row.toPostal,
      created_at: row.createdAt,
    },
  )
}

async function upsertReel(db: Queryable, row: Reel) {
  await upsert(
    db,
    'reel',
    row.id,
    `author = type::record("person", $author), shipment = type::record("shipment", $shipment),
     title = $title, proof = $proof, caption = $caption, created_at = <datetime>$created_at`,
    {
      author: row.authorId,
      shipment: row.shipmentId,
      title: row.title,
      proof: row.proof,
      caption: row.caption,
      created_at: row.createdAt,
    },
  )
}

async function upsertComment(db: Queryable, row: Comment) {
  await upsert(
    db,
    'comment',
    row.id,
    `shipment = type::record("shipment", $shipment), author = type::record("person", $author),
     body = $body, created_at = <datetime>$created_at`,
    {
      shipment: row.shipmentId,
      author: row.authorId,
      body: row.body,
      created_at: row.createdAt,
    },
  )
}

async function upsertFollow(db: Queryable, row: Follow) {
  await upsert(
    db,
    'follow',
    row.id,
    'follower = type::record("person", $follower), followee = type::record("person", $followee)',
    { follower: row.followerId, followee: row.followeeId },
  )
}

async function upsertSave(db: Queryable, row: Save) {
  await upsert(
    db,
    'saved_drop',
    row.id,
    'person = type::record("person", $person), shipment = type::record("shipment", $shipment)',
    { person: row.personId, shipment: row.shipmentId },
  )
}

async function upsertDeal(db: Queryable, row: Deal) {
  const list = row.participantIds.map((_, index) => `type::record("person", $p${index})`).join(', ')
  const vars: Record<string, unknown> = {
    shipment: row.shipmentId,
    locked: row.locked,
    pickup_ngn: row.pickupNgn,
    distance_ngn: row.distanceNgn,
    hub_ngn: row.hubNgn,
    platform_fee_ngn: row.platformFeeNgn,
    pay_method: row.payMethod,
  }
  row.participantIds.forEach((id, index) => {
    vars[`p${index}`] = id
  })
  await upsert(
    db,
    'deal',
    row.id,
    `shipment = type::record("shipment", $shipment), participants = [${list}], locked = $locked,
     pickup_ngn = $pickup_ngn, distance_ngn = $distance_ngn, hub_ngn = $hub_ngn,
     platform_fee_ngn = $platform_fee_ngn, hidden_fee_ngn = 0, pay_method = $pay_method, formula = 'koro-v1'`,
    vars,
  )
}

async function upsertMessage(db: Queryable, row: Message) {
  const authorSql = row.authorId ? 'author = type::record("person", $author)' : 'author = NONE'
  await upsert(
    db,
    'message',
    row.id,
    `thread = type::record("deal", $thread), ${authorSql}, body = $body, kind = $kind, created_at = <datetime>$created_at`,
    {
      thread: row.dealId,
      author: row.authorId,
      body: row.body,
      kind: row.kind,
      created_at: row.createdAt,
    },
  )
}

async function upsertNotice(db: Queryable, row: Notice) {
  await upsert(
    db,
    'notice',
    row.id,
    `person = type::record("person", $person), body = $body, href = $href, read = $read, created_at = <datetime>$created_at`,
    {
      person: row.personId,
      body: row.body,
      href: row.href,
      read: row.read,
      created_at: row.createdAt,
    },
  )
}

async function upsertCapacity(db: Queryable, row: Capacity) {
  await upsert(
    db,
    'capacity',
    row.id,
    `rider = type::record("person", $rider), from_state = $from_state, to_state = $to_state,
     spare_kg = $spare_kg, leaves = $leaves, note = $note`,
    {
      rider: row.riderId,
      from_state: row.fromState,
      to_state: row.toState,
      spare_kg: row.spareKg,
      leaves: row.leaves,
      note: row.note,
    },
  )
}

export async function syncGraph(db: Queryable, prev: Graph, next: Graph) {
  await diff(db, 'person', prev.people, next.people, upsertPerson)
  await diff(db, 'capacity', prev.capacities, next.capacities, upsertCapacity)
  await diff(db, 'shipment', prev.shipments, next.shipments, upsertShipment)
  await diff(db, 'story', prev.stories, next.stories, upsertStory)
  await diff(db, 'reel', prev.reels, next.reels, upsertReel)
  await diff(db, 'comment', prev.comments, next.comments, upsertComment)
  await diff(db, 'follow', prev.follows, next.follows, upsertFollow)
  await diff(db, 'saved_drop', prev.saves, next.saves, upsertSave)
  await diff(db, 'deal', prev.deals, next.deals, upsertDeal)
  await diff(db, 'message', prev.messages, next.messages, upsertMessage)
  await diff(db, 'notice', prev.notices, next.notices, upsertNotice)
}

export async function wipe(db: Queryable) {
  for (const table of TABLES) await db.query(`DELETE ${table}`)
}

export async function loadGraph(db: Queryable, viewerId = 'seyi'): Promise<Graph> {
  const result = await db.query(`
    SELECT * FROM person;
    SELECT * FROM shipment;
    SELECT * FROM story;
    SELECT * FROM reel;
    SELECT * FROM comment;
    SELECT * FROM follow;
    SELECT * FROM saved_drop;
    SELECT * FROM deal;
    SELECT * FROM message;
    SELECT * FROM notice;
    SELECT * FROM capacity;
  `)
  const people = rowsOf(result, 0).map(mapPerson)
  const known = new Set(people.map((row) => row.id))
  const viewer = known.has(viewerId) ? viewerId : 'seyi'
  const base = emptyGraph()
  return {
    ...base,
    viewerId: known.has(viewer) ? viewer : people[0]?.id ?? 'seyi',
    people,
    shipments: rowsOf(result, 1).map(mapShipment),
    stories: rowsOf(result, 2).map(mapStory),
    reels: rowsOf(result, 3).map(mapReel),
    comments: rowsOf(result, 4).map(mapComment),
    follows: rowsOf(result, 5).map(mapFollow),
    saves: rowsOf(result, 6).map(mapSave),
    deals: rowsOf(result, 7).map(mapDeal),
    messages: rowsOf(result, 8).map(mapMessage),
    notices: rowsOf(result, 9).map(mapNotice),
    capacities: rowsOf(result, 10).map(mapCapacity),
  }
}

function mapPerson(row: Record<string, unknown>): Person {
  return {
    id: strId(row.id),
    handle: String(row.handle ?? ''),
    name: String(row.name ?? ''),
    role: row.role as Person['role'],
    bio: String(row.bio ?? ''),
    city: String(row.city ?? ''),
    stateCode: String(row.state_code ?? ''),
    postal: String(row.postal_code ?? ''),
    dropsCompleted: num(row.drops_completed),
    dropsOnTime: num(row.drops_on_time),
    disputes: num(row.disputes),
    corridorFrom: opt(row.corridor_from),
    corridorTo: opt(row.corridor_to),
    spareKg: row.spare_kg == null ? undefined : num(row.spare_kg),
    leaves: opt(row.leaves),
  }
}

function mapShipment(row: Record<string, unknown>): Shipment {
  return {
    id: strId(row.id),
    authorId: strId(row.author),
    riderId: row.rider == null ? undefined : strId(row.rider),
    status: row.status as Shipment['status'],
    goods: String(row.goods ?? ''),
    detail: String(row.detail ?? ''),
    weightKg: num(row.weight_kg),
    originPostal: String(row.origin_postal ?? ''),
    destPostal: String(row.dest_postal ?? ''),
    originLabel: String(row.origin_label ?? ''),
    destLabel: String(row.dest_label ?? ''),
    pickupNgn: num(row.pickup_ngn),
    distanceNgn: num(row.distance_ngn),
    hubNgn: num(row.hub_ngn),
    platformFeeNgn: num(row.platform_fee_ngn),
    distanceKm: num(row.distance_km),
    payMethod: row.pay_method as Shipment['payMethod'],
    proof: row.proof as Shipment['proof'],
    caption: String(row.caption ?? ''),
    onFeed: Boolean(row.on_feed),
    createdAt: asTime(row.created_at),
  }
}

function mapStory(row: Record<string, unknown>): Story {
  return {
    id: strId(row.id),
    authorId: strId(row.author),
    shipmentId: strId(row.shipment),
    label: String(row.label ?? ''),
    caption: String(row.caption ?? ''),
    fromPostal: String(row.from_postal ?? ''),
    toPostal: String(row.to_postal ?? ''),
    createdAt: asTime(row.created_at),
  }
}

function mapReel(row: Record<string, unknown>): Reel {
  return {
    id: strId(row.id),
    authorId: strId(row.author),
    shipmentId: strId(row.shipment),
    title: String(row.title ?? ''),
    proof: row.proof as Reel['proof'],
    caption: String(row.caption ?? ''),
    createdAt: asTime(row.created_at),
  }
}

function mapComment(row: Record<string, unknown>): Comment {
  return {
    id: strId(row.id),
    shipmentId: strId(row.shipment),
    authorId: strId(row.author),
    body: String(row.body ?? ''),
    createdAt: asTime(row.created_at),
  }
}

function mapFollow(row: Record<string, unknown>): Follow {
  return { id: strId(row.id), followerId: strId(row.follower), followeeId: strId(row.followee) }
}

function mapSave(row: Record<string, unknown>): Save {
  return { id: strId(row.id), personId: strId(row.person), shipmentId: strId(row.shipment) }
}

function mapDeal(row: Record<string, unknown>): Deal {
  const participants = Array.isArray(row.participants) ? row.participants.map((item) => strId(item)) : []
  return {
    id: strId(row.id),
    shipmentId: strId(row.shipment),
    participantIds: participants,
    locked: Boolean(row.locked),
    pickupNgn: num(row.pickup_ngn),
    distanceNgn: num(row.distance_ngn),
    hubNgn: num(row.hub_ngn),
    platformFeeNgn: num(row.platform_fee_ngn),
    payMethod: row.pay_method as Deal['payMethod'],
  }
}

function mapMessage(row: Record<string, unknown>): Message {
  return {
    id: strId(row.id),
    dealId: strId(row.thread),
    authorId: row.author == null ? null : strId(row.author),
    body: String(row.body ?? ''),
    kind: row.kind as Message['kind'],
    createdAt: asTime(row.created_at),
  }
}

function mapNotice(row: Record<string, unknown>): Notice {
  return {
    id: strId(row.id),
    personId: strId(row.person),
    body: String(row.body ?? ''),
    href: String(row.href ?? ''),
    read: Boolean(row.read),
    createdAt: asTime(row.created_at),
  }
}

function mapCapacity(row: Record<string, unknown>): Capacity {
  return {
    id: strId(row.id),
    riderId: strId(row.rider),
    fromState: String(row.from_state ?? ''),
    toState: String(row.to_state ?? ''),
    spareKg: num(row.spare_kg),
    leaves: String(row.leaves ?? ''),
    note: String(row.note ?? ''),
  }
}
