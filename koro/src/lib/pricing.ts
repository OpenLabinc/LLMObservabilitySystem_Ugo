import { parsePostal } from './postal'
import { stateByCode } from './states'

/** Published formula. Locked deals store the naira lines, not a fresh calculation. */
export const FORMULA = 'koro-v1'

export const PRICE_RULES = [
  'Pickup is ₦700 on every job.',
  'Distance is ₦12 per kilometre between state capitals, plus ₦40 per kg, and at least ₦400. This is not a road toll.',
  'Hub is ₦450 when the drop crosses states, and ₦0 inside one state.',
  'The Koro fee is 4% of those three lines, rounded to the nearest ₦10.',
  'Cash, transfer, and pay on delivery all use this same total. Nothing is added later.',
] as const

export interface PriceLines {
  pickupNgn: number
  distanceNgn: number
  hubNgn: number
  platformFeeNgn: number
  distanceKm: number
}

export function totalNgn(lines: Pick<PriceLines, 'pickupNgn' | 'distanceNgn' | 'hubNgn' | 'platformFeeNgn'>): number {
  return lines.pickupNgn + lines.distanceNgn + lines.hubNgn + lines.platformFeeNgn
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * r * Math.asin(Math.sqrt(a))
}

export function quote(originPostal: string, destPostal: string, weightKg: number): PriceLines {
  const origin = parsePostal(originPostal)
  const dest = parsePostal(destPostal)
  if (!origin || !dest) throw new Error('Quote needs two valid NIPOST postcodes.')
  if (!(weightKg > 0) || weightKg > 200) throw new Error('Weight must be between 0 and 200 kg.')
  const from = stateByCode(origin.state)
  const to = stateByCode(dest.state)
  if (!from || !to) throw new Error('Postcode state is not a Nigerian state.')
  const km = haversineKm(from.lat, from.lng, to.lat, to.lng)
  const pickupNgn = 700
  const distanceNgn = Math.max(400, Math.round(km * 12 + weightKg * 40))
  const hubNgn = origin.state === dest.state ? 0 : 450
  const platformFeeNgn = Math.round(((pickupNgn + distanceNgn + hubNgn) * 0.04) / 10) * 10
  return {
    pickupNgn,
    distanceNgn,
    hubNgn,
    platformFeeNgn,
    distanceKm: Math.round(km),
  }
}
