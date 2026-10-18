export type StayCategory =
  | 'rooms'
  | 'beach'
  | 'cabins'
  | 'cities'
  | 'countryside'
  | 'luxury'
  | 'family'
  | 'unique'

export interface Host {
  id: string
  name: string
  avatar: string
  city: string
  stateCode: string
  joinedYear: number
  superhost: boolean
  responseRate: number
  bio: string
  listingsCount: number
}

export interface Listing {
  id: string
  slug: string
  title: string
  category: StayCategory
  /** Street-level Nigerian address line */
  streetAddress: string
  neighbourhood: string
  city: string
  stateCode: string
  stateName: string
  /** Canonical NIPOST 11-char compact postcode (required) */
  postalCode: string
  /** Spaced display form */
  postalDisplay: string
  lat: number
  lng: number
  pricePerNightNgn: number
  cleaningFeeNgn: number
  serviceFeeNgn: number
  /** Disclosed sole-host fee only — no stacked agent cut */
  hostServiceNote: string
  rating: number
  reviewCount: number
  guestFavorite: boolean
  beds: number
  baths: number
  guests: number
  images: string[]
  amenities: string[]
  description: string
  hostId: string
}

export interface PriceBreakdown {
  nights: number
  nightlyTotalNgn: number
  cleaningFeeNgn: number
  serviceFeeNgn: number
  /** Always 0 in Ile — we refuse stacked agent/lawyer add-ons on stays */
  hiddenAgentFeeNgn: number
  totalNgn: number
  lines: Array<{ label: string; amountNgn: number; note?: string }>
}

export interface SearchParams {
  destination: string
  checkIn: string
  checkOut: string
  guests: number
  category?: StayCategory | 'all'
}
