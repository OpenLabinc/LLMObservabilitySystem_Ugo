import { naira, payLabel } from '../lib/format'
import { quote, totalNgn } from '../lib/pricing'
import { parsePostal, seedPostal } from '../lib/postal'
import { NG_STATES, stateByCode } from '../lib/states'
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
} from './types'

const code = {
  mile12: seedPostal('LA', 12, 'M', 12, 'KS', 3),
  adaeze: seedPostal('LA', 8, 'S', 4, 'IK', 12),
  chinedu: seedPostal('LA', 3, 'I', 1, 'VI', 7),
  onitsha: seedPostal('AN', 3, 'O', 1, 'MM', 8),
  asaba: seedPostal('DE', 1, 'A', 2, 'HB', 1),
  nkechi: seedPostal('AB', 7, 'A', 1, 'AR', 15),
  seyi: seedPostal('AB', 4, 'A', 2, 'UM', 9),
  enugu: seedPostal('EN', 4, 'E', 2, 'NK', 6),
  musa: seedPostal('KN', 2, 'K', 1, 'BR', 11),
  hauwa: seedPostal('KN', 5, 'N', 3, 'DA', 4),
  kaduna: seedPostal('KD', 3, 'K', 2, 'KA', 8),
  ife: seedPostal('FC', 2, 'A', 9, 'DB', 9),
  garki: seedPostal('FC', 2, 'G', 4, 'GW', 12),
  zainab: seedPostal('RI', 5, 'P', 2, 'TR', 4),
  tunde: seedPostal('OY', 6, 'I', 2, 'BD', 8),
  bimpe: seedPostal('OY', 6, 'I', 2, 'BD', 2),
  ilorin: seedPostal('KW', 3, 'I', 1, 'LR', 5),
}

function person(row: Person): Person {
  if (parsePostal(row.postal)?.state !== row.stateCode) {
    throw new Error(`Seed person ${row.id} postcode does not match ${row.stateCode}`)
  }
  return row
}

const named: Person[] = [
  person({
    id: 'adaeze',
    handle: 'adaeze',
    name: 'Adaeze Okonkwo',
    role: 'sender',
    bio: 'Sends foodstuff from Lagos toward the east. Pays the price on the card.',
    city: 'Surulere',
    stateCode: 'LA',
    postal: code.adaeze,
    dropsCompleted: 6,
    dropsOnTime: 6,
    disputes: 0,
  }),
  person({
    id: 'chinedu',
    handle: 'chinedu',
    name: 'Chinedu Balogun',
    role: 'rider',
    bio: 'Lagos to Anambra, most dawns. I publish spare weight before I roll.',
    city: 'Ikeja',
    stateCode: 'LA',
    postal: code.chinedu,
    dropsCompleted: 128,
    dropsOnTime: 121,
    disputes: 0,
    corridorFrom: 'LA',
    corridorTo: 'AN',
    spareKg: 40,
    leaves: 'Most dawns',
  }),
  person({
    id: 'mile12',
    handle: 'mile12',
    name: 'Mile 12 Market',
    role: 'market',
    bio: 'Stall cluster at Mile 12. We hand goods to riders already leaving.',
    city: 'Ketu',
    stateCode: 'LA',
    postal: code.mile12,
    dropsCompleted: 80,
    dropsOnTime: 80,
    disputes: 0,
  }),
  person({
    id: 'onitsha',
    handle: 'onitsha',
    name: 'Onitsha Main Market',
    role: 'market',
    bio: 'Receiving desk. We confirm seals in public.',
    city: 'Onitsha',
    stateCode: 'AN',
    postal: code.onitsha,
    dropsCompleted: 90,
    dropsOnTime: 88,
    disputes: 0,
  }),
  person({
    id: 'asaba',
    handle: 'asaba-hub',
    name: 'Asaba Hub',
    role: 'hub',
    bio: 'One published hub fee, then the goods move on.',
    city: 'Asaba',
    stateCode: 'DE',
    postal: code.asaba,
    dropsCompleted: 420,
    dropsOnTime: 401,
    disputes: 2,
  }),
  person({
    id: 'nkechi',
    handle: 'nkechi',
    name: 'Nkechi Eze',
    role: 'shop',
    bio: 'Provisions shop in Aba. I post what I need and wait for a rider already going.',
    city: 'Aba',
    stateCode: 'AB',
    postal: code.nkechi,
    dropsCompleted: 11,
    dropsOnTime: 11,
    disputes: 0,
  }),
  person({
    id: 'seyi',
    handle: 'seyi',
    name: 'Seyi Adeyemi',
    role: 'rider',
    bio: 'Aba to Enugu. I claim only what is already on my way.',
    city: 'Aba',
    stateCode: 'AB',
    postal: code.seyi,
    dropsCompleted: 41,
    dropsOnTime: 40,
    disputes: 0,
    corridorFrom: 'AB',
    corridorTo: 'EN',
    spareKg: 25,
    leaves: 'Tomorrow, dawn',
  }),
  person({
    id: 'musa',
    handle: 'musa',
    name: 'Musa Danladi',
    role: 'rider',
    bio: 'Kano to Kaduna. One dispute on a split sack. The price did not change.',
    city: 'Kano',
    stateCode: 'KN',
    postal: code.musa,
    dropsCompleted: 57,
    dropsOnTime: 49,
    disputes: 1,
    corridorFrom: 'KN',
    corridorTo: 'KD',
    spareKg: 10,
    leaves: 'Next week',
  }),
  person({
    id: 'hauwa',
    handle: 'hauwa',
    name: 'Hauwa Bello',
    role: 'sender',
    bio: 'Sends grain from Kano. Logs a dispute without opening the price.',
    city: 'Kano',
    stateCode: 'KN',
    postal: code.hauwa,
    dropsCompleted: 4,
    dropsOnTime: 4,
    disputes: 0,
  }),
  person({
    id: 'ife',
    handle: 'ife',
    name: 'Ife Adewale',
    role: 'sender',
    bio: 'Moves papers inside Abuja. Same-state drops have no hub fee.',
    city: 'Wuse',
    stateCode: 'FC',
    postal: code.ife,
    dropsCompleted: 2,
    dropsOnTime: 2,
    disputes: 0,
  }),
  person({
    id: 'zainab',
    handle: 'ph-hub',
    name: 'Zainab Cole',
    role: 'hub',
    bio: 'Port Harcourt hub. Evening space toward the east corridor.',
    city: 'Port Harcourt',
    stateCode: 'RI',
    postal: code.zainab,
    dropsCompleted: 210,
    dropsOnTime: 198,
    disputes: 0,
  }),
  person({
    id: 'tunde',
    handle: 'tunde',
    name: 'Tunde Ajayi',
    role: 'rider',
    bio: 'Ibadan to Ilorin. The live leg goes up when the crate is on the bike.',
    city: 'Ibadan',
    stateCode: 'OY',
    postal: code.tunde,
    dropsCompleted: 36,
    dropsOnTime: 35,
    disputes: 0,
    corridorFrom: 'OY',
    corridorTo: 'KW',
    spareKg: 15,
    leaves: 'Today, afternoon',
  }),
  person({
    id: 'bimpe',
    handle: 'bimpe',
    name: 'Bimpe Alao',
    role: 'sender',
    bio: 'Sends food out of Ibadan. Locks the price before the rider leaves.',
    city: 'Ibadan',
    stateCode: 'OY',
    postal: code.bimpe,
    dropsCompleted: 5,
    dropsOnTime: 5,
    disputes: 0,
  }),
]

const covered = new Set(named.map((row) => row.stateCode))
const desks: Person[] = []
for (let index = 0; index < NG_STATES.length; index += 1) {
  const state = NG_STATES[index]
  if (covered.has(state.code)) continue
  const next = NG_STATES[(index + 1) % NG_STATES.length]
  desks.push(
    person({
      id: `desk-${state.code.toLowerCase()}`,
      handle: `desk-${state.code.toLowerCase()}`,
      name: `${state.name} desk`,
      role: 'rider',
      bio: `Publishes spare weight out of ${state.capital}. Not a fleet.`,
      city: state.capital,
      stateCode: state.code,
      postal: seedPostal(state.code, 1, 'A', 1, 'AA', 1),
      dropsCompleted: 12,
      dropsOnTime: 11,
      disputes: 0,
      corridorFrom: state.code,
      corridorTo: next.code,
      spareKg: 20,
      leaves: 'This week',
    }),
  )
}

function shipment(draft: Omit<Shipment, 'pickupNgn' | 'distanceNgn' | 'hubNgn' | 'platformFeeNgn' | 'distanceKm'>): Shipment {
  return { ...draft, ...quote(draft.originPostal, draft.destPostal, draft.weightKg) }
}

const shipments: Shipment[] = [
  shipment({
    id: 'oil',
    authorId: 'nkechi',
    status: 'open',
    goods: 'Engine oil',
    detail: '8kg keg, sealed',
    weightKg: 8,
    originPostal: code.nkechi,
    destPostal: code.enugu,
    originLabel: 'Aba shop',
    destLabel: 'Enugu',
    payMethod: 'pod',
    proof: 'jerrycan',
    caption: '8kg engine oil, Aba shop to Enugu. I only want a rider already going that way. The lines below are the whole price.',
    onFeed: true,
    createdAt: '2026-11-26T13:00:00.000Z',
  }),
  shipment({
    id: 'plantain',
    authorId: 'bimpe',
    riderId: 'tunde',
    status: 'moving',
    goods: 'Plantain',
    detail: 'Two crates',
    weightKg: 18,
    originPostal: code.bimpe,
    destPostal: code.ilorin,
    originLabel: 'Ibadan',
    destLabel: 'Ilorin',
    payMethod: 'transfer',
    proof: 'crate',
    caption: 'Two crates of plantain, Ibadan to Ilorin. Price is locked. Tunde is on the road.',
    onFeed: true,
    createdAt: '2026-11-26T10:00:00.000Z',
  }),
  shipment({
    id: 'papers',
    authorId: 'ife',
    status: 'open',
    goods: 'Land papers',
    detail: 'Flat envelope',
    weightKg: 1,
    originPostal: code.ife,
    destPostal: code.garki,
    originLabel: 'Wuse',
    destLabel: 'Garki',
    payMethod: 'cash',
    proof: 'parcel',
    caption: 'Envelope of land papers, Wuse to Garki. Same city, so the hub line is ₦0.',
    onFeed: true,
    createdAt: '2026-11-25T14:00:00.000Z',
  }),
  shipment({
    id: 'garri',
    authorId: 'adaeze',
    riderId: 'chinedu',
    status: 'delivered',
    goods: 'Garri',
    detail: '12 sealed cartons',
    weightKg: 60,
    originPostal: code.mile12,
    destPostal: code.onitsha,
    originLabel: 'Mile 12',
    destLabel: 'Onitsha Main Market',
    payMethod: 'pod',
    proof: 'cartons',
    caption: '12 cartons of garri, Mile 12 to Onitsha Main Market. Handed over with the seals intact. The buyer paid the locked total. Nothing else was added.',
    onFeed: true,
    createdAt: '2026-11-24T15:00:00.000Z',
  }),
  shipment({
    id: 'rice',
    authorId: 'hauwa',
    riderId: 'musa',
    status: 'disputed',
    goods: 'Rice',
    detail: 'One sack',
    weightKg: 25,
    originPostal: code.hauwa,
    destPostal: code.kaduna,
    originLabel: 'Kano',
    destLabel: 'Kaduna',
    payMethod: 'transfer',
    proof: 'sack',
    caption: 'Rice sack, Kano to Kaduna. The sack split. The dispute is public. The locked price did not move.',
    onFeed: true,
    createdAt: '2026-11-22T09:00:00.000Z',
  }),
]

function dealFor(shipmentId: string): Deal {
  const row = shipments.find((item) => item.id === shipmentId)
  if (!row?.riderId) throw new Error(`Missing deal shipment ${shipmentId}`)
  return {
    id: shipmentId,
    shipmentId,
    participantIds: [row.authorId, row.riderId],
    locked: true,
    pickupNgn: row.pickupNgn,
    distanceNgn: row.distanceNgn,
    hubNgn: row.hubNgn,
    platformFeeNgn: row.platformFeeNgn,
    payMethod: row.payMethod,
  }
}

function lockText(row: Shipment): string {
  return `Price locked at ${naira(totalNgn(row))}. Pickup ${naira(row.pickupNgn)}, distance ${naira(row.distanceNgn)}, hub ${naira(row.hubNgn)}, Koro fee ${naira(row.platformFeeNgn)}. ${payLabel(row.payMethod)}. No add-ons.`
}

const deals = [dealFor('garri'), dealFor('rice'), dealFor('plantain')]

const messages: Message[] = [
  { id: 'msg-garri-1', dealId: 'garri', authorId: 'adaeze', kind: 'text', body: 'Can you take 12 cartons on your usual Onitsha run?', createdAt: '2026-11-24T07:00:00.000Z' },
  { id: 'msg-garri-2', dealId: 'garri', authorId: 'chinedu', kind: 'text', body: 'Yes. I am already going. I will carry them for the price on the card.', createdAt: '2026-11-24T07:05:00.000Z' },
  { id: 'msg-garri-3', dealId: 'garri', authorId: null, kind: 'lock', body: lockText(shipments.find((row) => row.id === 'garri')!), createdAt: '2026-11-24T07:06:00.000Z' },
  { id: 'msg-garri-4', dealId: 'garri', authorId: 'adaeze', kind: 'text', body: 'Locked. I will pay on delivery.', createdAt: '2026-11-24T07:10:00.000Z' },
  { id: 'msg-rice-1', dealId: 'rice', authorId: 'hauwa', kind: 'text', body: 'One sack of rice to Kaduna, the price on the card.', createdAt: '2026-11-22T08:00:00.000Z' },
  { id: 'msg-rice-2', dealId: 'rice', authorId: 'musa', kind: 'text', body: 'I will take it. Lock it so the number cannot move.', createdAt: '2026-11-22T08:04:00.000Z' },
  { id: 'msg-rice-3', dealId: 'rice', authorId: null, kind: 'lock', body: lockText(shipments.find((row) => row.id === 'rice')!), createdAt: '2026-11-22T08:05:00.000Z' },
  { id: 'msg-rice-4', dealId: 'rice', authorId: 'hauwa', kind: 'text', body: 'The sack split on arrival. About two mudu short.', createdAt: '2026-11-22T18:12:00.000Z' },
  { id: 'msg-rice-5', dealId: 'rice', authorId: 'musa', kind: 'text', body: 'Dispute logged. I am not adding a fee.', createdAt: '2026-11-22T18:20:00.000Z' },
  { id: 'msg-plantain-1', dealId: 'plantain', authorId: 'bimpe', kind: 'text', body: 'Two crates are ready at the gate.', createdAt: '2026-11-26T09:00:00.000Z' },
  { id: 'msg-plantain-2', dealId: 'plantain', authorId: 'tunde', kind: 'text', body: 'I am already going through. Lock the price and I will load them.', createdAt: '2026-11-26T09:06:00.000Z' },
  { id: 'msg-plantain-3', dealId: 'plantain', authorId: null, kind: 'lock', body: lockText(shipments.find((row) => row.id === 'plantain')!), createdAt: '2026-11-26T09:07:00.000Z' },
  { id: 'msg-plantain-4', dealId: 'plantain', authorId: null, kind: 'system', body: 'Live leg posted. Ibadan to Ilorin.', createdAt: '2026-11-26T10:30:00.000Z' },
]

const stories: Story[] = [
  {
    id: 'leg-plantain',
    authorId: 'tunde',
    shipmentId: 'plantain',
    label: 'Ibadan → Ilorin',
    caption: 'On the road with two crates. The price is already locked.',
    fromPostal: code.bimpe,
    toPostal: code.ilorin,
    createdAt: '2026-11-26T10:30:00.000Z',
  },
  {
    id: 'leg-garri',
    authorId: 'chinedu',
    shipmentId: 'garri',
    label: 'Mile 12 → Onitsha',
    caption: 'Left Mile 12 with 12 sealed cartons. They arrived intact.',
    fromPostal: code.mile12,
    toPostal: code.onitsha,
    createdAt: '2026-11-24T12:00:00.000Z',
  },
]

const reels: Reel[] = [
  {
    id: 'reel-garri',
    authorId: 'chinedu',
    shipmentId: 'garri',
    title: 'Packing proof · 12 cartons',
    proof: 'cartons',
    caption: 'Cartons taped and marked before Mile 12. This is the public proof for the delivered drop.',
    createdAt: '2026-11-24T08:00:00.000Z',
  },
  {
    id: 'reel-plantain',
    authorId: 'tunde',
    shipmentId: 'plantain',
    title: 'Route proof · Ibadan to Ilorin',
    proof: 'crate',
    caption: 'Crates strapped. The live leg matches this proof.',
    createdAt: '2026-11-26T10:40:00.000Z',
  },
  {
    id: 'reel-rice',
    authorId: 'musa',
    shipmentId: 'rice',
    title: 'Handover · split sack',
    proof: 'sack',
    caption: 'The sack split. The dispute is on the drop. The locked price is unchanged.',
    createdAt: '2026-11-22T18:00:00.000Z',
  },
]

const comments: Comment[] = [
  { id: 'c-garri-1', shipmentId: 'garri', authorId: 'onitsha', body: '12 cartons received at the market gate. Seals intact.', createdAt: '2026-11-24T16:10:00.000Z' },
  { id: 'c-garri-2', shipmentId: 'garri', authorId: 'adaeze', body: 'Paid the locked total on delivery. Nothing else was asked.', createdAt: '2026-11-24T16:20:00.000Z' },
  { id: 'c-rice-1', shipmentId: 'rice', authorId: 'hauwa', body: 'Sack split. About two mudu short.', createdAt: '2026-11-22T18:12:00.000Z' },
  { id: 'c-rice-2', shipmentId: 'rice', authorId: 'musa', body: 'Dispute logged. The locked price stays.', createdAt: '2026-11-22T18:20:00.000Z' },
  { id: 'c-plantain-1', shipmentId: 'plantain', authorId: 'bimpe', body: 'Crates collected from the gate.', createdAt: '2026-11-26T10:10:00.000Z' },
]

const follows: Follow[] = [
  { id: 'seyi-nkechi', followerId: 'seyi', followeeId: 'nkechi' },
  { id: 'seyi-chinedu', followerId: 'seyi', followeeId: 'chinedu' },
  { id: 'seyi-mile12', followerId: 'seyi', followeeId: 'mile12' },
  { id: 'adaeze-chinedu', followerId: 'adaeze', followeeId: 'chinedu' },
  { id: 'adaeze-onitsha', followerId: 'adaeze', followeeId: 'onitsha' },
  { id: 'adaeze-mile12', followerId: 'adaeze', followeeId: 'mile12' },
  { id: 'nkechi-seyi', followerId: 'nkechi', followeeId: 'seyi' },
  { id: 'bimpe-tunde', followerId: 'bimpe', followeeId: 'tunde' },
  { id: 'hauwa-musa', followerId: 'hauwa', followeeId: 'musa' },
]

const saves: Save[] = [{ id: 'seyi-garri', personId: 'seyi', shipmentId: 'garri' }]

const notices: Notice[] = [
  {
    id: 'nt-seyi-oil',
    personId: 'seyi',
    body: 'Nkechi posted engine oil on your Aba → Enugu corridor.',
    href: '/p/oil',
    read: false,
    createdAt: '2026-11-26T13:00:00.000Z',
  },
  {
    id: 'nt-seyi-garri',
    personId: 'seyi',
    body: 'Chinedu’s Lagos → Onitsha drop is public proof.',
    href: '/p/garri',
    read: true,
    createdAt: '2026-11-24T16:30:00.000Z',
  },
  {
    id: 'nt-ada-garri',
    personId: 'adaeze',
    body: 'Chinedu marked the garri drop complete.',
    href: '/p/garri',
    read: true,
    createdAt: '2026-11-24T16:00:00.000Z',
  },
]

const capacities: Capacity[] = []
for (const rider of [...named, ...desks]) {
  if (rider.role !== 'rider' || !rider.corridorFrom || !rider.corridorTo) continue
  const from = stateByCode(rider.corridorFrom)
  const to = stateByCode(rider.corridorTo)
  capacities.push({
    id: `cap-${rider.id}`,
    riderId: rider.id,
    fromState: rider.corridorFrom,
    toState: rider.corridorTo,
    spareKg: rider.spareKg ?? 0,
    leaves: rider.leaves ?? 'This week',
    note:
      rider.id.startsWith('desk-')
        ? `Spare weight out of ${from?.capital ?? rider.city}, heading to ${to?.name ?? rider.corridorTo}.`
        : rider.id === 'seyi'
          ? 'Already going Enugu tomorrow. 25kg spare beside the usual shop load.'
          : rider.id === 'chinedu'
            ? 'Runs this corridor most dawns. 40kg spare after the market load.'
            : rider.id === 'tunde'
              ? 'On this road today. 15kg spare beside the plantain crates.'
              : rider.id === 'musa'
                ? 'Kano to Kaduna next week. 10kg spare.'
                : `Spare weight from ${from?.name ?? rider.corridorFrom} to ${to?.name ?? rider.corridorTo}.`,
  })
}

export function emptyGraph(): Graph {
  return {
    people: [],
    shipments: [],
    stories: [],
    reels: [],
    comments: [],
    follows: [],
    saves: [],
    deals: [],
    messages: [],
    notices: [],
    capacities: [],
    viewerId: 'seyi',
  }
}

export function buildSeed(): Graph {
  return {
    people: [...named, ...desks],
    shipments,
    stories,
    reels,
    comments,
    follows,
    saves,
    deals,
    messages,
    notices,
    capacities,
    viewerId: 'seyi',
  }
}
