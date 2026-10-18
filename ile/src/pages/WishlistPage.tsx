import { useState } from 'react'
import { SiteHeader } from '../components/Header'
import { ListingCard } from '../components/ListingCard'
import { listings } from '../data/seed'
import { loadWishlist, toggleWishlist } from '../lib/wishlist'

export function WishlistPage() {
  const [wishes, setWishes] = useState(() => loadWishlist())
  const rows = listings.filter((l) => wishes.includes(l.id))

  return (
    <div>
      <SiteHeader />
      <div className="shell py-8">
        <h1 className="text-3xl font-bold">Wishlists</h1>
        <p className="mt-1 text-mute">Saved stays across Nigeria</p>
        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              wished
              onToggleWish={(id) => setWishes(toggleWishlist(id))}
            />
          ))}
        </div>
        {!rows.length && (
          <p className="mt-16 text-center text-mute">
            No saved homes yet. Tap the heart on any listing.
          </p>
        )}
      </div>
    </div>
  )
}
