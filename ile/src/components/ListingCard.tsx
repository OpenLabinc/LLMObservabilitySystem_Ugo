import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Star } from 'lucide-react'
import type { Listing } from '../types'
import { formatNgn } from '../lib/pricing'

export function ListingCard({
  listing,
  onToggleWish,
  wished = false,
}: {
  listing: Listing
  onToggleWish?: (id: string) => void
  wished?: boolean
}) {
  const [img, setImg] = useState(0)

  return (
    <article className="group">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-soft">
        <Link to={`/rooms/${listing.slug}`}>
          <img
            src={listing.images[img]}
            alt={listing.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
            loading="lazy"
          />
        </Link>
        {listing.guestFavorite && (
          <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold shadow">
            Guest favourite
          </span>
        )}
        <button
          type="button"
          onClick={() => onToggleWish?.(listing.id)}
          className="absolute right-3 top-3 rounded-full p-1.5 text-white drop-shadow"
          aria-label="Save"
        >
          <Heart size={22} fill={wished ? '#FF385C' : 'rgba(0,0,0,0.35)'} stroke={wished ? '#FF385C' : '#fff'} />
        </button>
        {listing.images.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1">
            {listing.images.slice(0, 5).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setImg(i)}
                className={`h-1.5 w-1.5 rounded-full ${i === img ? 'bg-white' : 'bg-white/50'}`}
              />
            ))}
          </div>
        )}
      </div>
      <Link to={`/rooms/${listing.slug}`} className="mt-2 block">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-sm font-semibold">
            {listing.neighbourhood}, {listing.stateName}
          </h3>
          <span className="inline-flex shrink-0 items-center gap-1 text-sm">
            <Star size={12} fill="currentColor" />
            {listing.rating.toFixed(2)}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-1 text-sm text-mute">{listing.title}</p>
        <p className="mt-0.5 text-xs text-mute">{listing.postalDisplay}</p>
        <p className="mt-1 text-sm">
          <span className="font-semibold">{formatNgn(listing.pricePerNightNgn)}</span>
          <span className="text-mute"> night</span>
        </p>
      </Link>
    </article>
  )
}
