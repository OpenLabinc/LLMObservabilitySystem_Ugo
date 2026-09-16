import { NavLink } from 'react-router-dom'
import {
  Home,
  Search,
  Building2,
  Handshake,
  MessageCircle,
  Sparkles,
  UserRound,
} from 'lucide-react'

const items = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/listings', label: 'Listings', icon: Building2 },
  { to: '/deals', label: 'Deals', icon: Handshake },
  { to: '/messages', label: 'Inbox', icon: MessageCircle },
  { to: '/agents', label: 'AI', icon: Sparkles },
  { to: '/profile', label: 'Profile', icon: UserRound },
]

export function BrandMark({ large = false }: { large?: boolean }) {
  return (
    <NavLink to="/" className="group inline-flex items-baseline gap-2">
      <span
        className={`font-display font-800 tracking-tight text-paper ${
          large ? 'text-4xl md:text-6xl' : 'text-2xl'
        }`}
        style={{ fontWeight: 800 }}
      >
        Ile
      </span>
      {!large && (
        <span className="hidden text-xs uppercase tracking-[0.18em] text-mist sm:inline">
          clear fees
        </span>
      )}
    </NavLink>
  )
}

export function DesktopNav() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-line/80 bg-ink/40 px-4 py-6 backdrop-blur-md lg:flex">
      <BrandMark />
      <nav className="mt-10 flex flex-1 flex-col gap-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                isActive
                  ? 'bg-panel text-paper'
                  : 'text-muted hover:bg-panel/60 hover:text-paper'
              }`
            }
          >
            <Icon size={18} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>
      <NavLink
        to="/login"
        className="mt-auto rounded-xl bg-laterite px-3 py-2.5 text-center text-sm font-semibold text-ink transition hover:bg-laterite-deep"
      >
        Log in
      </NavLink>
      <NavLink
        to="/listings?q="
        className="mt-2 flex items-center gap-2 px-3 py-2 text-xs text-muted hover:text-mist"
      >
        <Search size={14} /> Search areas
      </NavLink>
    </aside>
  )
}

export function MobileTabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-ink/90 backdrop-blur-md lg:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)] pt-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-1 py-2 text-[10px] ${
                  isActive ? 'text-laterite' : 'text-muted'
                }`
              }
            >
              <Icon size={20} strokeWidth={1.75} />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <DesktopNav />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line/60 bg-ink/70 px-4 py-3 backdrop-blur-md lg:hidden">
          <BrandMark />
          <NavLink to="/login" className="text-sm font-semibold text-laterite">
            Log in
          </NavLink>
        </header>
        <main className="tabbar-safe flex-1 lg:pb-8">{children}</main>
        <MobileTabBar />
      </div>
    </div>
  )
}
