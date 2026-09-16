import type { AiAgentKind, ChecklistItem, ListingKind } from '../types'
import { estimateFees, type FeeEstimateInput } from './fees'

export function defaultChecklist(kind: ListingKind): ChecklistItem[] {
  const base: ChecklistItem[] = [
    {
      id: 'c1',
      label: 'Confirm sole agency mandate letter',
      owner: 'agent',
      done: false,
      why: 'Prevents stacked commissions from multiple agents.',
    },
    {
      id: 'c2',
      label: 'Publish full fee sheet to both sides',
      owner: 'shared',
      done: false,
      why: 'Buyer/tenant must see every Naira before deposit.',
    },
    {
      id: 'c3',
      label: 'Lawyer issues fixed-fee engagement letter',
      owner: 'lawyer',
      done: false,
      why: 'Caps legal cost; defines search vs transfer scope.',
    },
  ]

  if (kind === 'sale' || kind === 'land') {
    return [
      ...base,
      {
        id: 'c4',
        label: 'Title search / C of O or Governor’s consent path',
        owner: 'lawyer',
        done: false,
        why: 'Avoids paying lawyers for work that cannot close.',
      },
      {
        id: 'c5',
        label: 'Survey plan & physical inspection',
        owner: 'buyer',
        done: false,
        why: 'Catch boundary and encroachment issues early.',
      },
      {
        id: 'c6',
        label: 'Escrow or staged payment schedule',
        owner: 'shared',
        done: false,
        why: 'Reduces fraud risk without inflating “facilitation” fees.',
      },
    ]
  }

  if (kind === 'rent') {
    return [
      ...base,
      {
        id: 'c4',
        label: 'Itemise rent + caution + service charge',
        owner: 'landlord',
        done: false,
        why: 'Stops packing/caution surprises at key handover.',
      },
      {
        id: 'c5',
        label: 'Inventory & meter readings on move-in',
        owner: 'shared',
        done: false,
        why: 'Protects caution refund later.',
      },
    ]
  }

  return [
    ...base.slice(0, 2),
    {
      id: 'c4',
      label: 'Show nightly + cleaning + deposit breakdown',
      owner: 'landlord',
      done: false,
      why: 'Short-lets often hide service fees until checkout.',
    },
  ]
}

export function runFeeAgent(input: FeeEstimateInput) {
  const breakdown = estimateFees(input)
  const tips: string[] = []

  if (breakdown.stackedAgentRisk) {
    tips.push(
      'Two agents are claiming commission. Ask both for the written mandate; keep only the sole agent.',
    )
  }

  const lawyer = breakdown.lines.find((l) => l.id === 'lawyer')
  if (lawyer?.note?.startsWith('Above')) {
    tips.push(
      'Lawyer quote is above Ile’s suggested band. Request a fixed fee for search + documentation only.',
    )
  }

  if (input.kind === 'rent' && (input.cautionMonths ?? 0) > 2) {
    tips.push('Caution above 2 months is uncommon — negotiate down or get it in writing as refundable.')
  }

  tips.push(
    'Share this fee sheet in the deal thread before any transfer. Cost efficiency starts with one source of truth.',
  )

  return { breakdown, tips }
}

export function runDocQa(question: string) {
  const q = question.toLowerCase()
  if (q.includes('c of o') || q.includes('certificate of occupancy')) {
    return {
      answer:
        'A Certificate of Occupancy (C of O) evidences statutory right of occupancy. Your lawyer should verify authenticity at the lands registry and confirm whether Governor’s consent is still required for transfer. Ile’s checklist agent will block “closing” until search notes are attached — that saves wasted legal hours.',
      citations: ['Deal checklist → Title search', 'Fee sheet → Gov. stamp estimate'],
    }
  }
  if (q.includes('agency') || q.includes('commission') || q.includes('agent fee')) {
    return {
      answer:
        'Agency fees should appear as a single percentage (or fixed Naira) tied to one mandate. If a second agent appears at viewing, do not pay both — ask for the mandate letter inside Ile messaging. Stacked fees are the top complaint we designed against.',
      citations: ['Fee estimator', 'Role guide → Agent'],
    }
  }
  if (q.includes('lawyer') || q.includes('legal fee')) {
    return {
      answer:
        'Prefer a written fixed fee with scope: searches, draft agreement, stamping/consent filing. Percentage-of-deal legal fees without a cap often inflate cost without adding protection. Use Ile’s fee estimator to compare quotes against the suggested band.',
      citations: ['Fee estimator → Lawyer line', 'Role guide → Lawyer'],
    }
  }
  return {
    answer:
      'I can help with C of O / consent, agency commissions, lawyer scope, caution deposits, and move-in totals. Ask a concrete question about your listing or paste a clause — I’ll map it to the fee sheet and checklist so you spend less on back-and-forth.',
    citations: ['Document Q&A', 'Deal checklist'],
  }
}

export function runDisputeHelper(complaint: string) {
  const c = complaint.toLowerCase()
  const steps: string[] = []
  let severity: 'low' | 'medium' | 'high' = 'medium'

  if (c.includes('stack') || c.includes('two agent') || c.includes('another agent')) {
    severity = 'high'
    steps.push('Request both parties upload mandate letters in the deal thread.')
    steps.push('Freeze payment of agency fees until a sole mandate is confirmed.')
    steps.push('If already paid under duress, log amounts in the fee sheet as disputed lines.')
  } else if (c.includes('lawyer') || c.includes('legal')) {
    severity = 'medium'
    steps.push('Ask the lawyer for a scoped invoice matching the engagement letter.')
    steps.push('Remove out-of-scope line items or renegotiate a fixed remaining fee.')
    steps.push('Attach the comparison from Ile’s fee estimator as your negotiation baseline.')
  } else if (c.includes('caution') || c.includes('packing') || c.includes('service')) {
    severity = 'medium'
    steps.push('Compare the demand to the published listing fee sheet.')
    steps.push('Refuse undocumented add-ons; pay only itemised, agreed lines.')
    steps.push('Use inventory photos to protect caution refunds at exit.')
  } else {
    steps.push('Describe the fee line, who charged it, and whether it was on the published sheet.')
    steps.push('Ile will draft a calm message to the other party citing the listing disclosure.')
  }

  steps.push('Keep all negotiation in-app so staff can mediate without extra “settlement” fees.')

  return {
    severity,
    summary:
      'Ile’s dispute helper focuses on cost recovery and prevention — not open-ended chat. Follow the steps, then escalate to a human moderator only if the other party refuses disclosure.',
    steps,
  }
}

export function agentTitle(kind: AiAgentKind) {
  switch (kind) {
    case 'fees':
      return 'Fee estimator'
    case 'docs':
      return 'Document Q&A'
    case 'checklist':
      return 'Deal checklist'
    case 'dispute':
      return 'Dispute helper'
  }
}
