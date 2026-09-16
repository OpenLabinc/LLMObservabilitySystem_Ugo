import { profiles } from '../data/seed'
import { roleGuide } from '../lib/fees'
import { dataMode } from '../lib/surreal'

export function ProfilePage() {
  const me = profiles[0]

  return (
    <div className="shell py-8">
      <p className="text-xs uppercase tracking-[0.18em] text-mist">Profile</p>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-paper">{me.name}</h1>
          <p className="mt-1 text-mist">@{me.handle} · {me.city}</p>
        </div>
        <span className="rounded-lg border border-mist/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-mist">
          {me.role}
          {me.verified ? ' · verified' : ''}
        </span>
      </div>
      <p className="mt-4 max-w-xl text-paper/90">{me.bio}</p>
      <p className="mt-2 text-sm text-muted">{roleGuide[me.role]}</p>
      <p className="mt-4 text-xs text-muted">
        Data mode: <span className="text-mist">{dataMode()}</span> (Surreal Cloud when configured)
      </p>

      <h2 className="mt-12 font-display text-2xl text-paper">People on Ile</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {profiles.map((p) => (
          <li key={p.id} className="rounded-2xl border border-line bg-panel/40 p-4">
            <p className="font-semibold text-paper">{p.name}</p>
            <p className="text-sm capitalize text-mist">
              {p.role} · {p.city}
            </p>
            <p className="mt-2 text-sm text-muted">{p.bio}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
