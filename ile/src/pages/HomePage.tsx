import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SiteHeader, SearchBar } from '../components/Header'
import { CategoryChips } from '../components/CategoryChips'
import { ListingCard } from '../components/ListingCard'
import { listings, stateCoverageCount } from '../data/seed'
import { loadWishlist, toggleWishlist } from '../lib/wishlist'
import { NG_STATES } from '../lib/states'

export function HomePage() {
  const [category, setCategory] = useState('all')
  const [wishes, setWishes] = useState(() => loadWishlist())

  const featured = useMemo(() => {
    const pool =
      category === 'all' ? listings : listings.filter((l) => l.category === category)
    // Spread across states for the home grid
    const byState = new Map<string, typeof listings>()
    for (const l of pool) {
      if (!byState.has(l.stateCode)) byState.set(l.stateCode, [])
      byState.get(l.stateCode)!.push(l)
    }
    const picked: typeof listings = []
    for (const state of NG_STATES) {
      const rows = byState.get(state.code)
      if (rows?.[0]) picked.push(rows[0])
    }
    return picked.slice(0, 24)
  }, [category])

  return (
    <div>
      <SiteHeader showSearch={false} />
      <section className="relative overflow-hidden border-b border-line bg-soft">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-90"
          style={{
            backgroundImage:
              "linear-gradient(105deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.55) 42%, rgba(255,255,255,0.2) 100%), url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=80')",
          }}
        />
        <div className="relative shell flex min-h-[70dvh] flex-col items-center justify-center py-16 text-center">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-5xl font-bold text-rose md:text-7xl"
          >
            ile
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="mt-4 max-w-2xl text-3xl font-bold tracking-tight md:text-5xl"
          >
            Stays across all {stateCoverageCount()} Nigerian states
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mt-3 max-w-xl text-mute md:text-lg"
          >
            Airbnb-style search with Naira totals you can trust — every home carries a street
            address and an official 11-character NIPOST building postcode.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mt-8 w-full max-w-4xl"
          >
            <SearchBar large />
          </motion.div>
        </div>
      </section>

      <div className="shell py-6">
        <CategoryChips value={category} onChange={setCategory} />
        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Popular homes nationwide</h2>
            <p className="text-sm text-mute">
              Showing one stay per state when available · {featured.length} of {listings.length}{' '}
              seeded homes
            </p>
          </div>
          <Link to="/s/homes" className="text-sm font-semibold underline">
            Show map
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {featured.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              wished={wishes.includes(l.id)}
              onToggleWish={(id) => setWishes(toggleWishlist(id))}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
