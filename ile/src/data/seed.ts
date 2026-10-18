import type { Host, Listing, StayCategory } from '../types'
import { NG_STATES, assertAllStatesCovered } from '../lib/states'
import { assertValidPostal, seedPostal } from '../lib/postal'

const imgs = [
  'photo-1502672260266-1c1ef2d93688',
  'photo-1522708323590-d24dbb6b0267',
  'photo-1560448204-e02f11c3d0e2',
  'photo-1493809842364-78817add7ffb',
  'photo-1600596542815-ffad4c1539a9',
  'photo-1600585154340-be6161a56a0c',
  'photo-1600607687939-ce8a6c25118c',
  'photo-1600566753190-17f0baa2a6c3',
  'photo-1613490493576-7fde63acd811',
  'photo-1564013799919-ab600027ffc6',
]

function photo(i: number, w = 1200) {
  return `https://images.unsplash.com/${imgs[i % imgs.length]}?auto=format&fit=crop&w=${w}&q=80`
}

const categories: StayCategory[] = [
  'rooms',
  'beach',
  'cabins',
  'cities',
  'countryside',
  'luxury',
  'family',
  'unique',
]

const streetNames = [
  'Adeniyi Jones Street',
  'Ahmadu Bello Way',
  'Nnamdi Azikiwe Road',
  'Awolowo Avenue',
  'Tafawa Balewa Crescent',
  'Herbert Macaulay Street',
  'Murtala Muhammed Way',
  'Independence Layout',
  'GRA Phase 1',
  'Unity Close',
]

const titles = [
  'Sunlit apartment near the market',
  'Quiet courtyard home with generator',
  'Modern loft for weekend escapes',
  'Family bungalow with mango trees',
  'Rooftop suite with city views',
  'Cosy studio steps from transport',
]

export const hosts: Host[] = [
  {
    id: 'host:amaka',
    name: 'Amaka Okoye',
    avatar: 'https://i.pravatar.cc/150?u=amaka',
    city: 'Enugu',
    stateCode: 'EN',
    joinedYear: 2019,
    superhost: true,
    responseRate: 98,
    bio: 'Hosts across the South-East. Clear nightly rates — no surprise agency stack.',
    listingsCount: 12,
  },
  {
    id: 'host:ibrahim',
    name: 'Ibrahim Musa',
    avatar: 'https://i.pravatar.cc/150?u=ibrahim',
    city: 'Abuja',
    stateCode: 'FC',
    joinedYear: 2020,
    superhost: true,
    responseRate: 97,
    bio: 'FCT & North-Central stays. Every home has a verified NIPOST building postcode.',
    listingsCount: 9,
  },
  {
    id: 'host:tunde',
    name: 'Tunde Adebayo',
    avatar: 'https://i.pravatar.cc/150?u=tunde',
    city: 'Lagos',
    stateCode: 'LA',
    joinedYear: 2018,
    superhost: false,
    responseRate: 94,
    bio: 'Lagos & South-West short-lets with itemised cleaning and service fees.',
    listingsCount: 15,
  },
  {
    id: 'host:halima',
    name: 'Halima Bello',
    avatar: 'https://i.pravatar.cc/150?u=halima',
    city: 'Kano',
    stateCode: 'KN',
    joinedYear: 2021,
    superhost: true,
    responseRate: 99,
    bio: 'Northern hospitality with transparent Naira totals before you book.',
    listingsCount: 8,
  },
]

function buildListings(): Listing[] {
  const out: Listing[] = []
  let n = 0

  for (const state of NG_STATES) {
    for (let variant = 0; variant < 2; variant++) {
      n += 1
      const host = hosts[n % hosts.length]
      const lga = ((n - 1) % 12) + 1
      const districtNum = ((n * 3) % 40) + 1
      const building = ((n * 7) % 40) + 1
      const area = ['DB', 'FK', 'GR', 'KA', 'MD', 'PL', 'UN', 'VW'][n % 8]
      const postalCompact = seedPostal(
        state.code,
        lga,
        String.fromCharCode(65 + (n % 12)),
        districtNum,
        area,
        building,
      )
      const parsed = assertValidPostal(postalCompact)
      const street = `${12 + (n % 80)} ${streetNames[n % streetNames.length]}`
      const category = categories[n % categories.length]
      const price = 35_000 + (n % 25) * 8_500 + (state.code === 'LA' || state.code === 'FC' ? 25_000 : 0)

      out.push({
        id: `listing:${state.code.toLowerCase()}-${variant + 1}`,
        slug: `${state.name.toLowerCase().replace(/\s+/g, '-')}-${state.capital.toLowerCase().replace(/\s+/g, '-')}-${variant + 1}`,
        title: `${titles[n % titles.length]} · ${state.capital}`,
        category,
        streetAddress: street,
        neighbourhood: variant === 0 ? `${state.capital} Central` : `${state.capital} Extension`,
        city: state.capital,
        stateCode: state.code,
        stateName: state.name === 'FCT' ? 'FCT (Abuja)' : state.name,
        postalCode: parsed.compact,
        postalDisplay: parsed.display,
        lat: state.lat + (variant === 0 ? 0.04 : -0.05) + (n % 5) * 0.01,
        lng: state.lng + (variant === 0 ? 0.03 : -0.04) - (n % 4) * 0.01,
        pricePerNightNgn: price,
        cleaningFeeNgn: 12_000 + (n % 5) * 2_000,
        serviceFeeNgn: Math.round(price * 0.12),
        hostServiceNote: 'Sole host listing — Ile blocks stacked agent fees on stays.',
        rating: Number((4.6 + (n % 4) * 0.1).toFixed(2)),
        reviewCount: 12 + (n % 90),
        guestFavorite: n % 3 === 0,
        beds: 1 + (n % 4),
        baths: 1 + (n % 3),
        guests: 2 + (n % 6),
        images: [photo(n), photo(n + 3), photo(n + 5), photo(n + 7)],
        amenities: [
          'Wifi',
          'Air conditioning',
          'Generator backup',
          'Kitchen',
          'Free parking',
          'Washer',
          'Workspace',
          'Self check-in',
        ].slice(0, 4 + (n % 4)),
        description: `A welcoming stay in ${state.capital}, ${state.name}. Street address and NIPOST building postcode ${parsed.display} are verified on Ile. Nightly rate, cleaning, and platform service fee are itemised — no hidden agency or lawyer stack on short stays.`,
        hostId: host.id,
      })
    }
  }

  const covered = assertAllStatesCovered([...new Set(out.map((l) => l.stateCode))])
  if (covered !== 37) throw new Error(`Expected 37 states, got ${covered}`)
  if (out.some((l) => !assertValidPostal(l.postalCode))) {
    throw new Error('Seed contains invalid postal codes')
  }
  return out
}

export const listings: Listing[] = buildListings()

export function getListing(slugOrId: string) {
  return listings.find((l) => l.slug === slugOrId || l.id === slugOrId)
}

export function getHost(id: string) {
  return hosts.find((h) => h.id === id)
}

export function listingsForHost(hostId: string) {
  return listings.filter((l) => l.hostId === hostId)
}

export function stateCoverageCount() {
  return new Set(listings.map((l) => l.stateCode)).size
}

export function searchListings(opts: {
  destination?: string
  category?: string
  guests?: number
}) {
  const dest = (opts.destination || '').trim().toLowerCase()
  const category = opts.category && opts.category !== 'all' ? opts.category : null
  const guests = opts.guests || 1

  return listings.filter((l) => {
    if (l.guests < guests) return false
    if (category && l.category !== category) return false
    if (!dest) return true
    const hay = `${l.city} ${l.stateName} ${l.stateCode} ${l.neighbourhood} ${l.streetAddress} ${l.postalCode} ${l.postalDisplay} ${l.title}`.toLowerCase()
    return hay.includes(dest)
  })
}
