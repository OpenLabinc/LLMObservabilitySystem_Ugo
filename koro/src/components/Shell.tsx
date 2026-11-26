import type { ReactNode } from 'react'
import { Bell, Clapperboard, Compass, Home, MessageCircle, Plus, Search, UserRound } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { DEMO_VIEWERS } from '../data/types'
import { personById, unreadCount } from '../logic/select'
import { useKoro } from '../store'

const item =
  'flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-mist aria-[current=page]:bg-mist aria-[current=page]:font-semibold'

export function Shell() {
  const { mode, error, clearError, viewer, setViewer, graph } = useKoro()
  const unread = unreadCount(graph, viewer.id)
  const navigate = useNavigate()
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[1100px] md:grid md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col px-3 py-6 md:flex">
        <NavLink to="/" className="px-3 font-serif text-4xl italic leading-none">
          Koro
        </NavLink>
        <p className="mt-1 px-3 text-xs text-muted">Already going that way</p>
        <nav className="mt-6 grid gap-1">
          <NavLink to="/" end className={item}>
            <Home size={22} /> Home
          </NavLink>
          <NavLink to="/explore" className={item}>
            <Compass size={22} /> Explore
          </NavLink>
          <NavLink to="/reels" className={item}>
            <Clapperboard size={22} /> Reels
          </NavLink>
          <NavLink to="/search" className={item}>
            <Search size={22} /> Search
          </NavLink>
          <NavLink to="/inbox" className={item}>
            <MessageCircle size={22} /> Messages
          </NavLink>
          <NavLink to="/notifications" className={item}>
            <Bell size={22} /> Notifications{unread > 0 ? ` (${unread})` : ''}
          </NavLink>
          <NavLink to="/new" className={item}>
            <Plus size={22} /> Post a need
          </NavLink>
          <NavLink to={`/u/${viewer.handle}`} className={item}>
            <UserRound size={22} /> Profile
          </NavLink>
        </nav>
        <label className="mt-auto block px-3 text-xs text-muted">
          Viewing as
          <select
            value={viewer.id}
            onChange={(event) => setViewer(event.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-card px-2 py-2 text-sm text-ink"
          >
            {DEMO_VIEWERS.map((id) => {
              const person = personById(graph, id)
              return (
                <option key={id} value={id}>
                  {person?.name} · {person?.role}
                </option>
              )
            })}
          </select>
          <span className="mt-2 block">{mode}</span>
        </label>
      </aside>
      <div className="min-w-0 pb-20 md:pb-6">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-paper/95 px-4 py-3 backdrop-blur md:hidden">
          <button type="button" onClick={() => navigate('/')} className="font-serif text-3xl italic">
            Koro
          </button>
          <div className="flex items-center gap-1">
            <IconLink to="/search" label="Search">
              <Search size={22} />
            </IconLink>
            <IconLink to="/new" label="Post a need">
              <Plus size={22} />
            </IconLink>
            <IconLink to="/notifications" label={unread ? `${unread} notifications` : 'Notifications'}>
              <Bell size={22} />
            </IconLink>
          </div>
        </header>
        <div className="flex items-center justify-between gap-3 px-4 py-2 text-xs text-muted md:hidden">
          <p>{mode}</p>
          <label className="md:hidden">
            <span className="sr-only">Viewing as</span>
            <select
              value={viewer.id}
              onChange={(event) => setViewer(event.target.value)}
              className="rounded-lg border border-line bg-card px-2 py-1 text-ink"
            >
              {DEMO_VIEWERS.map((id) => {
                const person = personById(graph, id)
                return (
                  <option key={id} value={id}>
                    {person?.name}
                  </option>
                )
              })}
            </select>
          </label>
        </div>
        {error && (
          <div className="mx-4 mb-3 flex items-start justify-between gap-3 rounded-xl bg-clay px-3 py-2 text-sm text-white md:mx-0">
            <p>{error}</p>
            <button type="button" onClick={clearError} className="font-semibold">
              Close
            </button>
          </div>
        )}
        <Outlet />
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-card md:hidden">
        <Tab to="/" label="Home">
          <Home size={22} />
        </Tab>
        <Tab to="/explore" label="Explore">
          <Compass size={22} />
        </Tab>
        <Tab to="/reels" label="Reels">
          <Clapperboard size={22} />
        </Tab>
        <Tab to="/inbox" label="Messages">
          <MessageCircle size={22} />
        </Tab>
        <Tab to={`/u/${viewer.handle}`} label="Profile">
          <UserRound size={22} />
        </Tab>
      </nav>
    </div>
  )
}

function IconLink({ to, label, children }: { to: string; label: string; children: ReactNode }) {
  return (
    <NavLink to={to} aria-label={label} className="grid h-11 w-11 place-items-center rounded-full">
      {children}
    </NavLink>
  )
}

function Tab({ to, label, children }: { to: string; label: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className="grid h-14 place-items-center text-[10px] aria-[current=page]:text-palm"
    >
      <span className="grid justify-items-center gap-0.5">
        {children}
        {label}
      </span>
    </NavLink>
  )
}
