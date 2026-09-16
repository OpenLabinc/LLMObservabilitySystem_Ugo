import type { FeeBreakdown, FeeLine, ListingKind } from '../types'

export interface FeeEstimateInput {
  kind: ListingKind
  dealValueNgn: number
  agentFeePercent: number
  /** Extra agent claiming a cut — flags stacked-fee risk */
  secondAgentPercent?: number
  lawyerFeeNgn: number
  cautionMonths?: number
  serviceChargeNgn?: number
  includeGovTransfer?: boolean
  platformFeeNgn?: number
}

function line(
  partial: Omit<FeeLine, 'id'> & { id?: string },
): FeeLine {
  return {
    id: partial.id ?? crypto.randomUUID(),
    ...partial,
  }
}

/**
 * Transparent fee model for Nigerian residential deals.
 * Caps and defaults are product policy (not legal advice) — shown clearly in UI.
 */
export function estimateFees(input: FeeEstimateInput): FeeBreakdown {
  const lines: FeeLine[] = []
  const {
    kind,
    dealValueNgn,
    agentFeePercent,
    secondAgentPercent = 0,
    lawyerFeeNgn,
    cautionMonths = 0,
    serviceChargeNgn = 0,
    includeGovTransfer = kind === 'sale' || kind === 'land',
    platformFeeNgn = 25_000,
  } = input

  const agentAmount = Math.round((dealValueNgn * agentFeePercent) / 100)
  lines.push(
    line({
      id: 'agent',
      label: kind === 'rent' ? 'Agency fee (rent)' : 'Agency commission',
      party: 'agent',
      amountNgn: agentAmount,
      percentOfDeal: agentFeePercent,
      required: true,
      note: 'Must match the signed sole-mandate. Ile blocks stacked agents by default.',
    }),
  )

  if (secondAgentPercent > 0) {
    lines.push(
      line({
        id: 'agent2',
        label: 'Second agent claim',
        party: 'agent',
        amountNgn: Math.round((dealValueNgn * secondAgentPercent) / 100),
        percentOfDeal: secondAgentPercent,
        required: false,
        note: 'Flagged: stacked agency. Ask for one mandate letter.',
      }),
    )
  }

  if (lawyerFeeNgn > 0) {
    const cap =
      kind === 'rent'
        ? Math.min(250_000, Math.round(dealValueNgn * 0.05))
        : Math.min(2_500_000, Math.round(dealValueNgn * 0.01))
    lines.push(
      line({
        id: 'lawyer',
        label: 'Lawyer / conveyancing (quoted)',
        party: 'lawyer',
        amountNgn: lawyerFeeNgn,
        required: kind !== 'shortlet',
        note:
          lawyerFeeNgn > cap
            ? `Above Ile suggested cap (~${cap.toLocaleString('en-NG')} NGN for this deal size). Request a scoped fixed fee.`
            : 'Within Ile suggested fixed-fee band for this deal type.',
      }),
    )
  }

  if (kind === 'rent' && cautionMonths > 0) {
    lines.push(
      line({
        id: 'caution',
        label: `Caution deposit (${cautionMonths} mo)`,
        party: 'landlord',
        amountNgn: Math.round((dealValueNgn / 12) * cautionMonths),
        required: true,
        note: 'Refundable per agreement — not an agent fee.',
      }),
    )
  }

  if (serviceChargeNgn > 0) {
    lines.push(
      line({
        id: 'service',
        label: 'Service charge (year)',
        party: 'landlord',
        amountNgn: serviceChargeNgn,
        required: true,
      }),
    )
  }

  if (includeGovTransfer) {
    const stamp = Math.round(dealValueNgn * 0.015)
    lines.push(
      line({
        id: 'gov',
        label: 'Gov. stamp / consent estimate',
        party: 'government',
        amountNgn: stamp,
        percentOfDeal: 1.5,
        required: true,
        note: 'Estimate only — varies by state. Lawyer confirms actual schedule.',
      }),
    )
  }

  if (kind === 'shortlet') {
    lines.push(
      line({
        id: 'cleaning',
        label: 'Cleaning & linen',
        party: 'landlord',
        amountNgn: 15_000,
        required: true,
      }),
    )
  }

  lines.push(
    line({
      id: 'platform',
      label: 'Ile deal desk (optional escrow assist)',
      party: 'platform',
      amountNgn: platformFeeNgn,
      required: false,
      note: 'Waived on transparent sole-mandate listings in beta.',
    }),
  )

  const totalFeesNgn = lines.reduce((s, l) => s + l.amountNgn, 0)
  const stackedAgentRisk = secondAgentPercent > 0

  return {
    dealValueNgn,
    lines,
    totalFeesNgn,
    effectiveCostNgn: dealValueNgn + totalFeesNgn,
    stackedAgentRisk,
    lawyerCapHint:
      kind === 'rent'
        ? 'Prefer fixed-fee lease review; avoid % of annual rent without scope.'
        : 'Prefer fixed-fee search + transfer; avoid open-ended hourly without cap.',
  }
}

export const roleGuide: Record<string, string> = {
  buyer: 'Pays purchase price + disclosed closing costs. May appoint own lawyer.',
  seller: 'Pays agreed agency commission unless contract says otherwise.',
  landlord: 'Discloses rent, caution, service charge, and agency % on listing.',
  tenant: 'Sees full move-in total before paying. Challenges stacked fees in-app.',
  agent: 'One mandate per listing. Commission % locked and visible.',
  lawyer: 'Publishes fixed fee + scope. No surprise “professional fees” add-ons.',
  platform: 'Optional facilitation; never a hidden cut of the property price.',
}
