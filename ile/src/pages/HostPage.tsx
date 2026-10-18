import { useParams, Link } from 'react-router-dom'
import { SiteHeader } from '../components/Header'
import { ListingCard } from '../components/ListingCard'
import { getHost, listingsForHost } from '../data/seed'

export function HostPage() {
  const { id } = useParams()
  const host = id ? getHost(decodeURIComponent(id)) : undefined
  const rows = host ? listingsForHost(host.id) : []

  if (!host) {
    return (
      <div>
        <SiteHeader />
        <p className="shell py-16 text-mute">Host not found.</p>
      </div>
    )
  }

  return (
    <div>
      <SiteHeader />
      <div className="shell py-10">
        <div className="flex flex-wrap items-center gap-6 rounded-3xl border border-line p-6">
          <img src={host.avatar} alt="" className="h-28 w-28 rounded-full object-cover" />
          <div>
            <h1 className="text-3xl font-bold">Hi, I’m {host.name}</h1>
            <p className="mt-1 text-mute">
              {host.city} · Joined {host.joinedYear}
              {host.superhost ? ' · Superhost' : ''}
            </p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed">{host.bio}</p>
            <p className="mt-2 text-sm font-semibold">
              Response rate {host.responseRate}% · {rows.length} stays on Ile
            </p>
          </div>
        </div>
        <h2 className="mt-10 text-xl font-bold">{host.name}’s listings</h2>
        <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
        <Link to="/s/homes" className="mt-8 inline-block text-sm font-semibold underline">
          Explore all Nigeria stays
        </Link>
      </div>
    </div>
  )
}
