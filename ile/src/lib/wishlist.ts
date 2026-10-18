const KEY = 'ile-wishlists'

export function loadWishlist(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as string[]
  } catch {
    return []
  }
}

export function saveWishlist(ids: string[]) {
  localStorage.setItem(KEY, JSON.stringify(ids))
}

export function toggleWishlist(id: string): string[] {
  const cur = loadWishlist()
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
  saveWishlist(next)
  return next
}
