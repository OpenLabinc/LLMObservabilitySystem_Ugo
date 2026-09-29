import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { PublicEvent, PublicState } from '../shared/types.ts'
import { recurrenceLabel } from '../shared/recur.ts'
import { api } from './api.ts'
import { addMonths, eventsOnDay, formatSpan, monthCells, sameDay, startOfMonth, whereLabel } from './dates.ts'

const intervals: Array<[number, string]> = [
  [30, 'Every 30 seconds'],
  [300, 'Every 5 minutes'],
  [900, 'Every 15 minutes'],
  [1800, 'Every 30 minutes'],
  [3600, 'Every hour'],
  [21600, 'Every 6 hours'],
]

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function App() {
  const [state, setState] = useState<PublicState | null>(null)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState(() => new Date())
  const [openUid, setOpenUid] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  async function refresh(next?: PublicState) {
    const data = next ?? await api.state()
    setState(data)
    setLoadError('')
    return data
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'google') setNotice('Gmail calendar connected.')
    const googleError = params.get('google_error')
    if (googleError === 'missing') setNotice('Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the server environment, then try again.')
    else if (googleError) setNotice(googleError)
    if (params.size) window.history.replaceState({}, '', window.location.pathname)
    void refresh().catch((error: Error) => setLoadError(error.message))
    const poll = window.setInterval(() => {
      void refresh().catch((error: Error) => setLoadError(error.message))
    }, 3000)
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => {
      window.clearInterval(poll)
      window.clearInterval(tick)
    }
  }, [])

  const cells = useMemo(() => monthCells(cursor), [cursor])
  const open = state?.events.find((event) => event.uid === openUid) ?? null
  const agenda = state ? eventsOnDay(state.events, selected) : []
  const countdown = state?.nextSyncAt ? Math.max(0, Math.ceil((Date.parse(state.nextSyncAt) - now) / 1000)) : null

  async function run(action: () => Promise<PublicState>, success?: string) {
    setBusy(true)
    setNotice('')
    try {
      await refresh(await action())
      if (success) setNotice(success)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <header className="top">
        <div>
          <p className="brand">Supercal</p>
          <h1>Apple Calendar and Gmail, on one clock.</h1>
        </div>
        <div className="syncbox">
          <p className={state?.syncing || busy ? 'pulse' : ''}>
            {state?.mode === 'live' ? 'Live sync' : 'Practice desk'}
            {countdown !== null && ` · next pass in ${formatCountdown(countdown)}`}
          </p>
          <button className="btn" type="button" disabled={busy} onClick={() => void run(() => api.sync(), 'Sync finished.')}>
            {busy ? 'Working…' : 'Sync now'}
          </button>
        </div>
      </header>

      {loadError && <p className="banner bad" role="alert">{loadError}</p>}
      {notice && <p className="banner" role="status">{notice}</p>}
      {state?.error && <p className="banner bad" role="alert">{state.error}</p>}

      <main className="layout">
        <section className="calendar" aria-label="Month">
          <div className="monthbar">
            <h2>{cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</h2>
            <div className="nav">
              <button type="button" onClick={() => setCursor(addMonths(cursor, -1))} aria-label="Previous month">‹</button>
              <button type="button" onClick={() => { const today = new Date(); setCursor(startOfMonth(today)); setSelected(today) }}>Today</button>
              <button type="button" onClick={() => setCursor(addMonths(cursor, 1))} aria-label="Next month">›</button>
            </div>
          </div>
          <div className="weekdays" aria-hidden="true">
            {weekdays.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="grid">
            {cells.map((day) => {
              const items = state ? eventsOnDay(state.events, day) : []
              const outside = day.getMonth() !== cursor.getMonth()
              return (
                <div
                  key={day.toISOString()}
                  className="day"
                  data-out={outside || undefined}
                  data-selected={sameDay(day, selected) || undefined}
                  data-today={sameDay(day, new Date()) || undefined}
                >
                  <button type="button" className="num" onClick={() => setSelected(day)}>
                    {day.getDate()}
                  </button>
                  {items.slice(0, 3).map((event) => (
                    <button
                      key={event.uid}
                      type="button"
                      className="pill"
                      data-where={event.diverged ? 'diff' : event.onApple && event.onGoogle ? 'both' : event.onApple ? 'apple' : 'google'}
                      onClick={() => { setSelected(day); setOpenUid(event.uid) }}
                    >
                      {event.title}
                    </button>
                  ))}
                  {items.length > 3 && <button type="button" className="more" onClick={() => setSelected(day)}>+{items.length - 3}</button>}
                </div>
              )
            })}
          </div>
        </section>

        <aside className="side">
          {state && (
            <>
              <section>
                <h3>{state.mode === 'live' ? 'Your calendars' : 'Practice desk'}</h3>
                <p className="quiet">
                  {state.mode === 'live'
                    ? 'Both accounts are connected. Supercal reads and writes the Apple calendar and the Google Calendar on this Gmail account.'
                    : 'These events stay inside Supercal until you connect both accounts. The timer and the sync rules are the same ones used for the real calendars.'}
                </p>
                <label className="field">
                  Sync period
                  <select
                    value={state.intervalSec}
                    disabled={busy}
                    onChange={(event) => void run(() => api.settings(Number(event.target.value)))}
                  >
                    {intervals.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                {state.mode === 'live' && state.intervalSec === 30 && (
                  <p className="quiet">30 seconds is fast enough to trip Apple or Google rate limits. 15 minutes is the usual pace.</p>
                )}
                <p className="store">{state.store === 'surreal' ? 'Saved in SurrealDB' : 'Saved in a local file'}</p>
              </section>

              <Accounts state={state} busy={busy} onRun={run} />

              <section>
                <h3>{selected.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                {agenda.length === 0 && <p className="quiet">Nothing scheduled.</p>}
                <ul className="agenda">
                  {agenda.map((event) => (
                    <li key={event.uid}>
                      <button type="button" onClick={() => setOpenUid(event.uid)}>
                        <strong>{event.title}</strong>
                        <span>{formatSpan(event)} · {whereLabel(event)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>

              <AddForm selected={selected} busy={busy} onRun={run} />

              {state.runs[0] && (
                <section>
                  <h3>Last sync</h3>
                  <p className="quiet">
                    {state.runs[0].trigger === 'periodic' ? 'Timer' : 'Manual'} · {state.runs[0].created} copied · {state.runs[0].updated} updated · {state.runs[0].deleted} removed
                  </p>
                  <ul className="log">
                    {state.runs[0].messages.slice(0, 6).map((message) => <li key={message}>{message}</li>)}
                    {state.runs[0].errors.map((message) => <li key={message} className="bad">{message}</li>)}
                  </ul>
                </section>
              )}
            </>
          )}
        </aside>
      </main>

      {open && (
        <EventDialog
          event={open}
          busy={busy}
          onClose={() => setOpenUid(null)}
          onRun={run}
        />
      )}
    </div>
  )
}

function Accounts({ state, busy, onRun }: { state: PublicState; busy: boolean; onRun: (action: () => Promise<PublicState>, success?: string) => Promise<void> }) {
  const [appleId, setAppleId] = useState('')
  const [appPassword, setAppPassword] = useState('')

  return (
    <section>
      <h3>Accounts</h3>
      <div className="account">
        <div>
          <strong>Apple Calendar</strong>
          <p>{state.accounts.apple.connected ? state.accounts.apple.label : 'Not connected'}</p>
        </div>
        {state.accounts.apple.connected
          ? <button type="button" className="btn secondary" disabled={busy} onClick={() => void onRun(() => api.disconnect('apple'), 'Apple Calendar disconnected.')}>Disconnect</button>
          : null}
      </div>
      {!state.accounts.apple.connected && (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void onRun(() => api.apple(appleId, appPassword), 'Apple Calendar connected.')
          }}
        >
          <label className="field">Apple ID
            <input value={appleId} onChange={(event) => setAppleId(event.target.value)} autoComplete="username" inputMode="email" required />
          </label>
          <label className="field">App-specific password
            <input value={appPassword} onChange={(event) => setAppPassword(event.target.value)} type="password" autoComplete="current-password" required />
          </label>
          <p className="quiet">Create one at appleid.apple.com. Your normal Apple ID password will not work. Supercal talks to iCloud over CalDAV.</p>
          <button className="btn" type="submit" disabled={busy}>Connect Apple</button>
        </form>
      )}

      <div className="account">
        <div>
          <strong>Gmail calendar</strong>
          <p>{state.accounts.google.connected ? state.accounts.google.label : 'Not connected'}</p>
        </div>
        {state.accounts.google.connected
          ? <button type="button" className="btn secondary" disabled={busy} onClick={() => void onRun(() => api.disconnect('google'), 'Gmail calendar disconnected.')}>Disconnect</button>
          : state.googleConfigured
            ? <a className="btn" href="/api/connect/google">Connect Gmail</a>
            : <p className="quiet">Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, then restart the server.</p>}
      </div>
    </section>
  )
}

function AddForm({ selected, busy, onRun }: { selected: Date; busy: boolean; onRun: (action: () => Promise<PublicState>, success?: string) => Promise<void> }) {
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [allDay, setAllDay] = useState(false)
  const [location, setLocation] = useState('')
  const [side, setSide] = useState<'apple' | 'google'>('apple')

  function submit(event: FormEvent) {
    event.preventDefault()
    const date = isoDay(selected)
    const body = allDay
      ? { title, location, allDay: true, side, start: date, end: nextDay(date) }
      : {
          title,
          location,
          allDay: false,
          side,
          start: localIso(selected, startTime),
          end: localIso(selected, endTime),
        }
    void onRun(() => api.add(body), 'Event added. It reaches the other calendar on the next sync.')
    setTitle('')
    setLocation('')
  }

  return (
    <section>
      <h3>Add an event</h3>
      <form onSubmit={submit}>
        <label className="field">Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        <label className="check">
          <input type="checkbox" checked={allDay} onChange={(event) => setAllDay(event.target.checked)} />
          All day
        </label>
        {!allDay && (
          <div className="times">
            <label className="field">Start
              <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
            </label>
            <label className="field">End
              <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} required />
            </label>
          </div>
        )}
        <label className="field">Place
          <input value={location} onChange={(event) => setLocation(event.target.value)} />
        </label>
        <label className="field">Write it first on
          <select value={side} onChange={(event) => setSide(event.target.value as 'apple' | 'google')}>
            <option value="apple">Apple Calendar</option>
            <option value="google">Gmail calendar</option>
          </select>
        </label>
        <button className="btn" type="submit" disabled={busy}>Add event</button>
      </form>
    </section>
  )
}

function EventDialog({ event, busy, onClose, onRun }: { event: PublicEvent; busy: boolean; onClose: () => void; onRun: (action: () => Promise<PublicState>, success?: string) => Promise<void> }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [title, setTitle] = useState(event.title)
  const [location, setLocation] = useState(event.location)
  const [description, setDescription] = useState(event.description)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => { if (dialog?.open) dialog.close() }
  }, [])

  useEffect(() => {
    setTitle(event.title)
    setLocation(event.location)
    setDescription(event.description)
  }, [event])

  return (
    <dialog className="sheet" ref={dialogRef} onClick={(click) => { if (click.target === click.currentTarget) onClose() }}>
      <form
        onSubmit={(submit) => {
          submit.preventDefault()
          void onRun(async () => {
            const next = await api.patch(event.uid, {
              title,
              location,
              description,
              start: event.start,
              end: event.end,
              allDay: event.allDay,
              side: 'both',
            })
            onClose()
            return next
          }, 'Event saved on every calendar that already has it.')
        }}
      >
        <header>
          <p>{whereLabel(event)}</p>
          <button type="button" className="btn secondary" onClick={onClose}>Close</button>
        </header>
        <label className="field">Title
          <input value={title} onChange={(change) => setTitle(change.target.value)} required />
        </label>
        <p className="quiet">{formatSpan(event)}{event.recurrence ? ` · ${recurrenceLabel(event.recurrence)}` : ''}</p>
        <label className="field">Place
          <input value={location} onChange={(change) => setLocation(change.target.value)} />
        </label>
        <label className="field">Notes
          <textarea value={description} onChange={(change) => setDescription(change.target.value)} rows={3} />
        </label>
        {event.diverged && event.apple && event.google && (
          <div className="diff">
            <p><strong>Apple:</strong> {event.apple.title} · {formatSpan(event.apple)}</p>
            <p><strong>Gmail:</strong> {event.google.title} · {formatSpan(event.google)}</p>
            <p className="quiet">Sync keeps the copy that was edited more recently. Saving here writes this form to both.</p>
          </div>
        )}
        <div className="actions">
          <button className="btn" type="submit" disabled={busy}>Save</button>
          <button type="button" className="btn secondary" disabled={busy} onClick={() => void onRun(async () => { const next = await api.remove(event.uid, 'both'); onClose(); return next }, 'Removed from both calendars.')}>Delete both</button>
          <button type="button" className="btn secondary" disabled={busy} onClick={() => void onRun(async () => { const next = await api.remove(event.uid, 'apple'); onClose(); return next })}>Delete on Apple only</button>
          <button type="button" className="btn secondary" disabled={busy} onClick={() => void onRun(async () => { const next = await api.remove(event.uid, 'google'); onClose(); return next })}>Delete on Gmail only</button>
        </div>
      </form>
    </dialog>
  )
}

function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) return `${minutes}m ${String(rest).padStart(2, '0')}s`
  return `${rest}s`
}

function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function nextDay(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year, month - 1, day + 1)
  return isoDay(date)
}

function localIso(date: Date, time: string): string {
  const [hour, minute] = time.split(':').map(Number)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0, 0).toISOString()
}
