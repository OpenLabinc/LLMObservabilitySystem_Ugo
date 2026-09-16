/**
 * Ile Agents Worker — HTTP surface for fee/docs/checklist/dispute helpers.
 * Deploy with: npx wrangler deploy (requires Cloudflare account).
 * Logic mirrors src/lib for edge use; Workers AI can replace heuristics later.
 */

export interface Env {
  AI?: Ai
}

type Kind = 'sale' | 'rent' | 'shortlet' | 'land'

function estimate(body: {
  kind: Kind
  dealValueNgn: number
  agentFeePercent: number
  secondAgentPercent?: number
  lawyerFeeNgn: number
}) {
  const lines = []
  const agent = Math.round((body.dealValueNgn * body.agentFeePercent) / 100)
  lines.push({ id: 'agent', label: 'Agency', amountNgn: agent })
  if (body.secondAgentPercent) {
    lines.push({
      id: 'agent2',
      label: 'Second agent',
      amountNgn: Math.round((body.dealValueNgn * body.secondAgentPercent) / 100),
      risk: 'stacked',
    })
  }
  if (body.lawyerFeeNgn) {
    lines.push({ id: 'lawyer', label: 'Lawyer', amountNgn: body.lawyerFeeNgn })
  }
  if (body.kind === 'sale' || body.kind === 'land') {
    lines.push({
      id: 'gov',
      label: 'Gov estimate',
      amountNgn: Math.round(body.dealValueNgn * 0.015),
    })
  }
  const totalFeesNgn = lines.reduce((s, l) => s + l.amountNgn, 0)
  return {
    lines,
    totalFeesNgn,
    effectiveCostNgn: body.dealValueNgn + totalFeesNgn,
    stackedAgentRisk: Boolean(body.secondAgentPercent),
  }
}

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url)
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors })
    }

    if (url.pathname === '/health') {
      return Response.json({ ok: true, service: 'ile-agents' }, { headers: cors })
    }

    if (url.pathname === '/fees' && request.method === 'POST') {
      const body = (await request.json()) as Parameters<typeof estimate>[0]
      return Response.json(estimate(body), { headers: cors })
    }

    if (url.pathname === '/dispute' && request.method === 'POST') {
      const { complaint } = (await request.json()) as { complaint: string }
      const stacked = /stack|two agent|another agent/i.test(complaint)
      return Response.json(
        {
          severity: stacked ? 'high' : 'medium',
          steps: stacked
            ? [
                'Request mandate letters from both agents',
                'Freeze agency payment until sole mandate confirmed',
                'Log disputed lines on the deal fee sheet',
              ]
            : [
                'Compare the charge to the published fee sheet',
                'Refuse undocumented add-ons',
                'Keep negotiation in the Ile thread',
              ],
        },
        { headers: cors },
      )
    }

    return Response.json({ error: 'not_found' }, { status: 404, headers: cors })
  },
}
