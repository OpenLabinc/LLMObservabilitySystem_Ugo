export type Role =
  | 'buyer'
  | 'seller'
  | 'landlord'
  | 'tenant'
  | 'agent'
  | 'lawyer'
  | 'admin'

export type ListingKind = 'sale' | 'rent' | 'shortlet' | 'land'

export type FeeParty = Role | 'platform' | 'government'

export interface FeeLine {
  id: string
  label: string
  party: FeeParty
  amountNgn: number
  percentOfDeal?: number
  required: boolean
  note?: string
}

export interface FeeBreakdown {
  dealValueNgn: number
  lines: FeeLine[]
  totalFeesNgn: number
  effectiveCostNgn: number
  stackedAgentRisk: boolean
  lawyerCapHint?: string
}

export interface Listing {
  id: string
  slug: string
  title: string
  kind: ListingKind
  priceNgn: number
  currency: 'NGN'
  city: string
  area: string
  state: string
  beds?: number
  baths?: number
  sqm?: number
  image: string
  blurb: string
  agentId: string
  agentName: string
  agentFeePercent: number
  lawyerFeeSuggestedNgn: number
  status: 'live' | 'under_offer' | 'closed'
}

export interface Profile {
  id: string
  handle: string
  name: string
  role: Role
  city: string
  bio: string
  verified: boolean
}

export interface Deal {
  id: string
  listingId: string
  listingTitle: string
  stage: 'inquiry' | 'viewing' | 'offer' | 'docs' | 'closing' | 'done'
  buyerName: string
  sellerName: string
  agentName: string
  lawyerName?: string
  feeBreakdown: FeeBreakdown
  updatedAt: string
}

export interface Thread {
  id: string
  title: string
  preview: string
  roleLabel: string
  unread: number
  updatedAt: string
}

export interface ChecklistItem {
  id: string
  label: string
  owner: Role | 'shared'
  done: boolean
  why: string
}

export type AiAgentKind = 'fees' | 'docs' | 'checklist' | 'dispute'
