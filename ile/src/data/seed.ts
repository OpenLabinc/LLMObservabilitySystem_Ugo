import type { Deal, Listing, Profile, Thread } from '../types'
import { estimateFees } from '../lib/fees'

const img = (seed: string, w = 1200, h = 900) =>
  `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=${w}&h=${h}&q=80`

export const profiles: Profile[] = [
  {
    id: 'user:ada',
    handle: 'ada.okafor',
    name: 'Ada Okafor',
    role: 'buyer',
    city: 'Lagos',
    bio: 'Looking for a 3-bed in Lekki with transparent closing costs.',
    verified: true,
  },
  {
    id: 'user:kola',
    handle: 'kola.realty',
    name: 'Kola Realty',
    role: 'agent',
    city: 'Lagos',
    bio: 'Single-agent mandate only. No stacked commissions.',
    verified: true,
  },
  {
    id: 'user:chioma',
    handle: 'chioma.esq',
    name: 'Chioma Adeyemi, Esq.',
    role: 'lawyer',
    city: 'Abuja',
    bio: 'Fixed-fee conveyancing. Scope written before deposit.',
    verified: true,
  },
  {
    id: 'user:ibrahim',
    handle: 'ibrahim.landlord',
    name: 'Ibrahim Musa',
    role: 'landlord',
    city: 'Abuja',
    bio: 'Wuye flats. Agency fee capped in listing.',
    verified: true,
  },
]

export const listings: Listing[] = [
  {
    id: 'listing:lekki-3bed',
    slug: 'lekki-phase-1-3bed-terrace',
    title: '3-bed terrace, Lekki Phase 1',
    kind: 'sale',
    priceNgn: 185_000_000,
    currency: 'NGN',
    city: 'Lagos',
    area: 'Lekki Phase 1',
    state: 'Lagos',
    beds: 3,
    baths: 3,
    sqm: 210,
    image: img('photo-1600596542815-ffad4c1539a9'),
    blurb: 'Corner terrace with generator house. Single listing agent. Survey & C of O pack available.',
    agentId: 'user:kola',
    agentName: 'Kola Realty',
    agentFeePercent: 5,
    lawyerFeeSuggestedNgn: 750_000,
    status: 'live',
  },
  {
    id: 'listing:wuye-2bed',
    slug: 'wuye-2bed-rent',
    title: '2-bed serviced flat, Wuye',
    kind: 'rent',
    priceNgn: 4_500_000,
    currency: 'NGN',
    city: 'Abuja',
    area: 'Wuye',
    state: 'FCT',
    beds: 2,
    baths: 2,
    sqm: 95,
    image: img('photo-1502672260266-1c1ef2d93688'),
    blurb: 'Annual rent. Agency fee disclosed upfront. No “caution + packing” surprise stack.',
    agentId: 'user:kola',
    agentName: 'Kola Realty',
    agentFeePercent: 10,
    lawyerFeeSuggestedNgn: 150_000,
    status: 'live',
  },
  {
    id: 'listing:vi-shortlet',
    slug: 'vi-shortlet-studio',
    title: 'Studio short-let, Victoria Island',
    kind: 'shortlet',
    priceNgn: 85_000,
    currency: 'NGN',
    city: 'Lagos',
    area: 'Victoria Island',
    state: 'Lagos',
    beds: 1,
    baths: 1,
    sqm: 42,
    image: img('photo-1522708323590-d24dbb6b0267'),
    blurb: 'Nightly rate. Cleaning & service fees itemised — not buried in checkout.',
    agentId: 'user:kola',
    agentName: 'Kola Realty',
    agentFeePercent: 15,
    lawyerFeeSuggestedNgn: 0,
    status: 'live',
  },
  {
    id: 'listing:ibadan-land',
    slug: 'ibadan-half-plot-land',
    title: 'Half plot, Akobo (Ibadan)',
    kind: 'land',
    priceNgn: 12_500_000,
    currency: 'NGN',
    city: 'Ibadan',
    area: 'Akobo',
    state: 'Oyo',
    sqm: 300,
    image: img('photo-1500382017468-9049fed747ef'),
    blurb: 'Survey plan attached. Lawyer fee capped for search & transfer only.',
    agentId: 'user:kola',
    agentName: 'Kola Realty',
    agentFeePercent: 5,
    lawyerFeeSuggestedNgn: 350_000,
    status: 'under_offer',
  },
  {
    id: 'listing:ikeja-duplex',
    slug: 'ikeja-gra-4bed-duplex',
    title: '4-bed duplex, Ikeja GRA',
    kind: 'sale',
    priceNgn: 320_000_000,
    currency: 'NGN',
    city: 'Lagos',
    area: 'Ikeja GRA',
    state: 'Lagos',
    beds: 4,
    baths: 5,
    sqm: 380,
    image: img('photo-1613490493576-7fde63acd811'),
    blurb: 'Family compound. Mandate: one selling agent, buyer may bring own lawyer.',
    agentId: 'user:kola',
    agentName: 'Kola Realty',
    agentFeePercent: 5,
    lawyerFeeSuggestedNgn: 1_200_000,
    status: 'live',
  },
  {
    id: 'listing:ph-bungalow',
    slug: 'ph-gra-3bed-bungalow-rent',
    title: '3-bed bungalow rent, PH GRA',
    kind: 'rent',
    priceNgn: 6_000_000,
    currency: 'NGN',
    city: 'Port Harcourt',
    area: 'GRA Phase 2',
    state: 'Rivers',
    beds: 3,
    baths: 3,
    sqm: 180,
    image: img('photo-1564013799919-ab600027ffc6'),
    blurb: 'Rent + service charge split shown. No multi-agent kickbacks.',
    agentId: 'user:kola',
    agentName: 'Kola Realty',
    agentFeePercent: 10,
    lawyerFeeSuggestedNgn: 200_000,
    status: 'live',
  },
]

export const threads: Thread[] = [
  {
    id: 'thread:1',
    title: 'Lekki terrace — viewing Sun 11am',
    preview: 'Kola: I’ll send the fee sheet before we meet.',
    roleLabel: 'Buyer ↔ Agent',
    unread: 2,
    updatedAt: '2026-09-15T18:20:00Z',
  },
  {
    id: 'thread:2',
    title: 'Wuye lease — lawyer review',
    preview: 'Chioma: Fixed fee covers search + agreement only.',
    roleLabel: 'Tenant ↔ Lawyer',
    unread: 0,
    updatedAt: '2026-09-14T09:05:00Z',
  },
  {
    id: 'thread:3',
    title: 'Complaint: stacked agency on VI short-let',
    preview: 'Ile helper: Ask for the mandate letter…',
    roleLabel: 'Dispute helper',
    unread: 1,
    updatedAt: '2026-09-13T21:40:00Z',
  },
]

export const deals: Deal[] = [
  {
    id: 'deal:lekki',
    listingId: 'listing:lekki-3bed',
    listingTitle: '3-bed terrace, Lekki Phase 1',
    stage: 'docs',
    buyerName: 'Ada Okafor',
    sellerName: 'Estate of Okon',
    agentName: 'Kola Realty',
    lawyerName: 'Chioma Adeyemi, Esq.',
    feeBreakdown: estimateFees({
      kind: 'sale',
      dealValueNgn: 185_000_000,
      agentFeePercent: 5,
      lawyerFeeNgn: 750_000,
      includeGovTransfer: true,
    }),
    updatedAt: '2026-09-15T16:00:00Z',
  },
  {
    id: 'deal:wuye',
    listingId: 'listing:wuye-2bed',
    listingTitle: '2-bed serviced flat, Wuye',
    stage: 'offer',
    buyerName: 'Ada Okafor',
    sellerName: 'Ibrahim Musa',
    agentName: 'Kola Realty',
    lawyerName: 'Chioma Adeyemi, Esq.',
    feeBreakdown: estimateFees({
      kind: 'rent',
      dealValueNgn: 4_500_000,
      agentFeePercent: 10,
      lawyerFeeNgn: 150_000,
      cautionMonths: 1,
      serviceChargeNgn: 350_000,
    }),
    updatedAt: '2026-09-14T11:30:00Z',
  },
]

export function getListing(slugOrId: string) {
  return listings.find((l) => l.slug === slugOrId || l.id === slugOrId)
}

export function formatNgn(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function kindLabel(kind: Listing['kind']) {
  switch (kind) {
    case 'sale':
      return 'For sale'
    case 'rent':
      return 'For rent'
    case 'shortlet':
      return 'Short-let'
    case 'land':
      return 'Land'
  }
}
