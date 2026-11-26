import { Link } from 'react-router-dom'
import type { Person, ProofKind, Shipment } from '../data/types'
import { formatPostalDisplay, postalError } from '../lib/postal'
import { naira, payLabel, roleLabel, statusLabel } from '../lib/format'
import { totalNgn, type PriceLines } from '../lib/pricing'
import { stateByCode } from '../lib/states'

const roleColor: Record<Person['role'], string> = {
  sender: '#c24d24',
  rider: '#0e6b52',
  shop: '#a15c07',
  market: '#1c1915',
  hub: '#3d5a80',
}

const wash: Record<ProofKind, string> = {
  cartons: 'bg-[#f4e3c6]',
  jerrycan: 'bg-[#dcead7]',
  sack: 'bg-[#f3d5c8]',
  parcel: 'bg-[#e4dff4]',
  crate: 'bg-[#d7eee4]',
  hub: 'bg-[#e7e2d6]',
}

export function Avatar({ person, size = 36 }: { person: Person; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: roleColor[person.role], fontSize: size * 0.38 }}
      aria-hidden
    >
      {person.name.slice(0, 1)}
    </span>
  )
}

export function ProofArt({
  kind,
  title,
  from,
  to,
  tall = false,
  compact = false,
}: {
  kind: ProofKind
  title: string
  from: string
  to: string
  tall?: boolean
  compact?: boolean
}) {
  return (
    <div className={`grid ${tall ? 'min-h-[70dvh]' : compact ? 'aspect-square' : 'aspect-[4/5] max-h-[460px]'} ${wash[kind]}`}>
      <div className={`flex h-full flex-col justify-between ${compact ? 'p-2' : 'p-4'}`}>
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-ink/70">
          <span className="truncate">{title}</span>
          {!compact && <Mark kind={kind} />}
        </div>
        <div>
          <p className={`font-serif leading-none text-ink ${compact ? 'text-sm' : 'text-3xl'}`}>{formatPostalDisplay(from)}</p>
          <p className={`text-muted ${compact ? 'my-1 text-[10px]' : 'my-2 text-sm'}`}>to</p>
          <p className={`font-serif leading-none text-ink ${compact ? 'text-sm' : 'text-3xl'}`}>{formatPostalDisplay(to)}</p>
        </div>
      </div>
    </div>
  )
}

function Mark({ kind }: { kind: ProofKind }) {
  return (
    <svg viewBox="0 0 64 40" className="h-8 w-12" aria-hidden>
      {kind === 'jerrycan' && <rect x="18" y="8" width="22" height="26" rx="3" fill="#0e6b52" />}
      {kind === 'sack' && <path d="M20 8h24l-4 26H24L20 8z" fill="#c24d24" />}
      {kind === 'cartons' && (
        <>
          <rect x="8" y="14" width="22" height="16" fill="#1c1915" />
          <rect x="32" y="10" width="22" height="20" fill="#0e6b52" />
        </>
      )}
      {kind === 'parcel' && <rect x="14" y="10" width="36" height="22" rx="2" fill="#3d5a80" />}
      {kind === 'crate' && <path d="M10 12h44v18H10zM10 18h44M24 12v18M40 12v18" stroke="#0e6b52" strokeWidth="2" fill="none" />}
      {kind === 'hub' && <circle cx="32" cy="20" r="10" fill="#3d5a80" />}
    </svg>
  )
}

export function PriceBlock({
  lines,
  pay,
  compact = false,
}: {
  lines: Omit<PriceLines, 'distanceKm'> & { distanceKm?: number }
  pay?: Shipment['payMethod']
  compact?: boolean
}) {
  const rows = [
    ['Pickup', lines.pickupNgn],
    ['Distance', lines.distanceNgn],
    ['Hub', lines.hubNgn],
    ['Koro fee', lines.platformFeeNgn],
  ] as const
  if (compact) {
    return (
      <div className="px-3 py-2">
        <p className="text-lg font-semibold">{naira(totalNgn(lines))}</p>
        <p className="text-xs text-muted">
          {rows.map(([label, value]) => `${label} ${naira(value)}`).join(' · ')}
        </p>
      </div>
    )
  }
  return (
    <div className="rounded-2xl border border-line bg-mist p-3">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between py-1 text-sm">
          <span>{label}</span>
          <span>{naira(value)}</span>
        </div>
      ))}
      <div className="mt-1 flex justify-between border-t border-line pt-2 text-base font-semibold">
        <span>Total</span>
        <span>{naira(totalNgn(lines))}</span>
      </div>
      {pay && <p className="mt-1 text-xs text-muted">{payLabel(pay)} · same total, no add-on</p>}
      {lines.distanceKm != null && lines.distanceKm > 0 && (
        <p className="text-xs text-muted">Distance uses {lines.distanceKm} km between capitals, plus weight.</p>
      )}
    </div>
  )
}

export function StatusPill({ status }: { status: Shipment['status'] }) {
  const tone =
    status === 'delivered'
      ? 'bg-palm text-white'
      : status === 'disputed'
        ? 'bg-ink text-white'
        : status === 'open'
          ? 'bg-clay text-white'
          : 'bg-mist text-ink'
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{statusLabel(status)}</span>
}

export function PersonLine({ person, linked = true }: { person: Person; linked?: boolean }) {
  const state = stateByCode(person.stateCode)
  const name = linked ? (
    <Link to={`/u/${person.handle}`} className="truncate font-semibold">
      {person.name}
    </Link>
  ) : (
    <span className="truncate font-semibold">{person.name}</span>
  )
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        {name}
        <span className="text-[11px] uppercase tracking-wide text-muted">{roleLabel(person.role)}</span>
      </div>
      <p className="truncate text-xs text-muted">
        {person.city}
        {state ? `, ${state.name}` : ''} · {formatPostalDisplay(person.postal)}
      </p>
    </div>
  )
}

export function Stepper({
  status,
  hasStory,
}: {
  status: Shipment['status']
  hasStory: boolean
}) {
  const steps = [
    { label: 'Need posted', done: true },
    { label: 'Rider claimed', done: status !== 'open' },
    { label: 'Price locked', done: ['locked', 'moving', 'delivered', 'disputed'].includes(status) },
    { label: 'Live leg', done: hasStory },
    { label: 'Public proof', done: status === 'delivered' || status === 'disputed' },
  ]
  return (
    <ol className="grid grid-cols-5 gap-1 text-[10px] leading-tight">
      {steps.map((step) => (
        <li key={step.label} className={`rounded-lg px-1 py-2 text-center ${step.done ? 'bg-palm text-white' : 'bg-mist text-muted'}`}>
          {step.label}
        </li>
      ))}
    </ol>
  )
}

export function PostcodeField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const message = value.trim() ? postalError(value) : null
  const parsed = message || !value.trim() ? null : formatPostalDisplay(value)
  const state = parsed ? stateByCode(parsed.slice(0, 2)) : undefined
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="FC 02 A09 DB 09"
        autoCapitalize="characters"
        aria-invalid={Boolean(message)}
        className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-3"
      />
      {message && <span className="mt-1 block text-xs text-clay">{message}</span>}
      {!message && parsed && (
        <span className="mt-1 block text-xs text-palm">
          {parsed}
          {state ? ` · ${state.name}` : ''}
        </span>
      )}
    </label>
  )
}
