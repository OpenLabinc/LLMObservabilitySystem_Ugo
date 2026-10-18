import type { Listing, PriceBreakdown } from '../types'

export function formatNgn(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 1
  const a = new Date(checkIn)
  const b = new Date(checkOut)
  const ms = b.getTime() - a.getTime()
  const n = Math.round(ms / (1000 * 60 * 60 * 24))
  return Math.max(1, n)
}

/**
 * Transparent stay pricing — mirrors Airbnb's breakdown UX but enforces
 * Ile's cost-efficiency rule: no stacked agent/lawyer fees on short stays.
 */
export function stayPriceBreakdown(
  listing: Listing,
  checkIn: string,
  checkOut: string,
): PriceBreakdown {
  const nights = nightsBetween(checkIn, checkOut)
  const nightlyTotalNgn = listing.pricePerNightNgn * nights
  const cleaningFeeNgn = listing.cleaningFeeNgn
  const serviceFeeNgn = listing.serviceFeeNgn
  const hiddenAgentFeeNgn = 0
  const totalNgn = nightlyTotalNgn + cleaningFeeNgn + serviceFeeNgn + hiddenAgentFeeNgn

  return {
    nights,
    nightlyTotalNgn,
    cleaningFeeNgn,
    serviceFeeNgn,
    hiddenAgentFeeNgn,
    totalNgn,
    lines: [
      {
        label: `${formatNgn(listing.pricePerNightNgn)} × ${nights} night${nights === 1 ? '' : 's'}`,
        amountNgn: nightlyTotalNgn,
      },
      {
        label: 'Cleaning fee',
        amountNgn: cleaningFeeNgn,
        note: 'One-time, disclosed upfront',
      },
      {
        label: 'Ile service fee',
        amountNgn: serviceFeeNgn,
        note: 'Platform only — no stacked agent or lawyer cut',
      },
      {
        label: 'Stacked agent / lawyer fees',
        amountNgn: 0,
        note: 'Blocked by Ile policy for stays',
      },
    ],
  }
}
