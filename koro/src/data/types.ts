export type Role = 'sender' | 'rider' | 'shop' | 'market' | 'hub'
export type Status = 'open' | 'claimed' | 'locked' | 'moving' | 'delivered' | 'disputed'
export type PayMethod = 'cash' | 'transfer' | 'pod'
export type ProofKind = 'cartons' | 'jerrycan' | 'sack' | 'parcel' | 'crate' | 'hub'

export interface Person {
  id: string
  handle: string
  name: string
  role: Role
  bio: string
  city: string
  stateCode: string
  postal: string
  dropsCompleted: number
  dropsOnTime: number
  disputes: number
  corridorFrom?: string
  corridorTo?: string
  spareKg?: number
  leaves?: string
}

export interface Shipment {
  id: string
  authorId: string
  riderId?: string
  status: Status
  goods: string
  detail: string
  weightKg: number
  originPostal: string
  destPostal: string
  originLabel: string
  destLabel: string
  pickupNgn: number
  distanceNgn: number
  hubNgn: number
  platformFeeNgn: number
  distanceKm: number
  payMethod: PayMethod
  proof: ProofKind
  caption: string
  onFeed: boolean
  createdAt: string
}

export interface Story {
  id: string
  authorId: string
  shipmentId: string
  label: string
  caption: string
  fromPostal: string
  toPostal: string
  createdAt: string
}

export interface Reel {
  id: string
  authorId: string
  shipmentId: string
  title: string
  proof: ProofKind
  caption: string
  createdAt: string
}

export interface Comment {
  id: string
  shipmentId: string
  authorId: string
  body: string
  createdAt: string
}

export interface Follow {
  id: string
  followerId: string
  followeeId: string
}

export interface Save {
  id: string
  personId: string
  shipmentId: string
}

export interface Deal {
  id: string
  shipmentId: string
  participantIds: string[]
  locked: boolean
  pickupNgn: number
  distanceNgn: number
  hubNgn: number
  platformFeeNgn: number
  payMethod: PayMethod
}

export interface Message {
  id: string
  dealId: string
  authorId: string | null
  body: string
  kind: 'text' | 'lock' | 'system'
  createdAt: string
}

export interface Notice {
  id: string
  personId: string
  body: string
  href: string
  read: boolean
  createdAt: string
}

export interface Capacity {
  id: string
  riderId: string
  fromState: string
  toState: string
  spareKg: number
  leaves: string
  note: string
}

export interface Graph {
  people: Person[]
  shipments: Shipment[]
  stories: Story[]
  reels: Reel[]
  comments: Comment[]
  follows: Follow[]
  saves: Save[]
  deals: Deal[]
  messages: Message[]
  notices: Notice[]
  capacities: Capacity[]
  viewerId: string
}

export const DEMO_VIEWERS = ['seyi', 'nkechi', 'adaeze'] as const
