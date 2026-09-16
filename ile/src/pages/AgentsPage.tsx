import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { AiAgentKind, ListingKind } from '../types'
import {
  agentTitle,
  defaultChecklist,
  runDisputeHelper,
  runDocQa,
  runFeeAgent,
} from '../lib/ai'
import { FeeSheet } from '../components/ListingCard'
import { formatNgn } from '../data/seed'

const tabs: AiAgentKind[] = ['fees', 'docs', 'checklist', 'dispute']

export function AgentsPage() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as AiAgentKind) || 'fees'

  function setTab(next: AiAgentKind) {
    setParams({ tab: next })
  }

  return (
    <div className="shell py-8">
      <p className="text-xs uppercase tracking-[0.18em] text-mist">AI agents</p>
      <h1 className="mt-2 font-display text-4xl text-paper">Cut friction, not corners</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Four agents that change deal economics: estimate fees, answer document questions, drive
        checklists, and de-escalate fee complaints — before costs compound.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === t ? 'bg-laterite text-ink' : 'border border-line text-muted hover:text-paper'
            }`}
          >
            {agentTitle(t)}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === 'fees' && <FeeAgentPanel />}
        {tab === 'docs' && <DocAgentPanel />}
        {tab === 'checklist' && <ChecklistAgentPanel />}
        {tab === 'dispute' && <DisputeAgentPanel />}
      </div>
    </div>
  )
}

function FeeAgentPanel() {
  const [kind, setKind] = useState<ListingKind>('sale')
  const [dealValue, setDealValue] = useState(185_000_000)
  const [agentPct, setAgentPct] = useState(5)
  const [secondPct, setSecondPct] = useState(0)
  const [lawyerFee, setLawyerFee] = useState(750_000)

  const result = useMemo(
    () =>
      runFeeAgent({
        kind,
        dealValueNgn: dealValue,
        agentFeePercent: agentPct,
        secondAgentPercent: secondPct,
        lawyerFeeNgn: lawyerFee,
        cautionMonths: kind === 'rent' ? 1 : 0,
        serviceChargeNgn: kind === 'rent' ? 350_000 : 0,
        includeGovTransfer: kind === 'sale' || kind === 'land',
      }),
    [kind, dealValue, agentPct, secondPct, lawyerFee],
  )

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form className="space-y-4 rounded-2xl border border-line bg-panel/40 p-5" onSubmit={(e) => e.preventDefault()}>
        <h2 className="font-display text-2xl">Inputs</h2>
        <label className="block text-sm">
          <span className="text-muted">Deal kind</span>
          <select
            className="mt-1 w-full rounded-xl border border-line bg-ink-soft px-3 py-2"
            value={kind}
            onChange={(e) => setKind(e.target.value as ListingKind)}
          >
            <option value="sale">Sale</option>
            <option value="rent">Rent</option>
            <option value="shortlet">Short-let</option>
            <option value="land">Land</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-muted">Deal value (NGN)</span>
          <input
            type="number"
            className="mt-1 w-full rounded-xl border border-line bg-ink-soft px-3 py-2"
            value={dealValue}
            onChange={(e) => setDealValue(Number(e.target.value) || 0)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Sole agent %</span>
          <input
            type="number"
            className="mt-1 w-full rounded-xl border border-line bg-ink-soft px-3 py-2"
            value={agentPct}
            onChange={(e) => setAgentPct(Number(e.target.value) || 0)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Second agent % (stacked risk)</span>
          <input
            type="number"
            className="mt-1 w-full rounded-xl border border-line bg-ink-soft px-3 py-2"
            value={secondPct}
            onChange={(e) => setSecondPct(Number(e.target.value) || 0)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Lawyer quote (NGN)</span>
          <input
            type="number"
            className="mt-1 w-full rounded-xl border border-line bg-ink-soft px-3 py-2"
            value={lawyerFee}
            onChange={(e) => setLawyerFee(Number(e.target.value) || 0)}
          />
        </label>
        <p className="text-xs text-muted">
          Live estimate updates as you type. Effective cost:{' '}
          <span className="text-laterite">{formatNgn(result.breakdown.effectiveCostNgn)}</span>
        </p>
      </form>
      <div className="space-y-4">
        <FeeSheet breakdown={result.breakdown} />
        <ul className="space-y-2 rounded-2xl border border-line bg-ink-soft/70 p-4 text-sm text-mist">
          {result.tips.map((tip) => (
            <li key={tip}>• {tip}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function DocAgentPanel() {
  const [q, setQ] = useState('What should I check on a C of O before paying a lawyer?')
  const [answer, setAnswer] = useState(() => runDocQa(q))

  function onAsk(e: FormEvent) {
    e.preventDefault()
    setAnswer(runDocQa(q))
  }

  return (
    <div className="mx-auto max-w-2xl">
      <form onSubmit={onAsk} className="space-y-3">
        <textarea
          value={q}
          onChange={(e) => setQ(e.target.value)}
          rows={4}
          className="w-full rounded-2xl border border-line bg-panel/50 px-4 py-3 outline-none focus:border-mist"
        />
        <button type="submit" className="rounded-xl bg-laterite px-4 py-2.5 text-sm font-bold text-ink">
          Ask document agent
        </button>
      </form>
      <div className="mt-6 rounded-2xl border border-line bg-panel/40 p-5">
        <p className="text-sm leading-relaxed text-paper">{answer.answer}</p>
        <p className="mt-4 text-xs uppercase tracking-wide text-mist">Tied to</p>
        <ul className="mt-1 text-sm text-muted">
          {answer.citations.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function ChecklistAgentPanel() {
  const [kind, setKind] = useState<ListingKind>('sale')
  const [items, setItems] = useState(() => defaultChecklist('sale'))

  function changeKind(next: ListingKind) {
    setKind(next)
    setItems(defaultChecklist(next))
  }

  const done = items.filter((i) => i.done).length

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={kind}
          onChange={(e) => changeKind(e.target.value as ListingKind)}
          className="rounded-xl border border-line bg-panel/50 px-3 py-2 text-sm"
        >
          <option value="sale">Sale</option>
          <option value="rent">Rent</option>
          <option value="land">Land</option>
          <option value="shortlet">Short-let</option>
        </select>
        <p className="text-sm text-muted">
          {done}/{items.length} done — unfinished items block “closing” in production.
        </p>
      </div>
      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex gap-3 rounded-2xl border border-line bg-panel/40 p-4">
            <input
              type="checkbox"
              checked={item.done}
              onChange={() =>
                setItems((prev) =>
                  prev.map((p) => (p.id === item.id ? { ...p, done: !p.done } : p)),
                )
              }
              className="mt-1"
            />
            <div>
              <p className="font-semibold text-paper">{item.label}</p>
              <p className="text-xs capitalize text-mist">Owner: {item.owner}</p>
              <p className="mt-1 text-sm text-muted">{item.why}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DisputeAgentPanel() {
  const [complaint, setComplaint] = useState(
    'A second agent showed up at the viewing and wants 2.5% on top of the listing agent.',
  )
  const [result, setResult] = useState(() => runDisputeHelper(complaint))

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setResult(runDisputeHelper(complaint))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={onSubmit} className="space-y-3">
        <textarea
          value={complaint}
          onChange={(e) => setComplaint(e.target.value)}
          rows={6}
          className="w-full rounded-2xl border border-line bg-panel/50 px-4 py-3 outline-none focus:border-mist"
        />
        <button type="submit" className="rounded-xl bg-laterite px-4 py-2.5 text-sm font-bold text-ink">
          Get resolution steps
        </button>
      </form>
      <div className="rounded-2xl border border-line bg-panel/40 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-laterite">
          Severity: {result.severity}
        </p>
        <p className="mt-2 text-sm text-paper">{result.summary}</p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-mist">
          {result.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </div>
    </div>
  )
}
