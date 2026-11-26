import type { PayMethod, Role, Status } from '../data/types'

export function naira(value: number): string {
  return `₦${Math.round(value).toLocaleString('en-NG')}`
}

export function payLabel(method: PayMethod): string {
  if (method === 'cash') return 'Cash'
  if (method === 'transfer') return 'Transfer'
  return 'Pay on delivery'
}

export function roleLabel(role: Role): string {
  if (role === 'sender') return 'Sender'
  if (role === 'rider') return 'Rider'
  if (role === 'shop') return 'Shop'
  if (role === 'market') return 'Market'
  return 'Hub'
}

export function statusLabel(status: Status): string {
  if (status === 'open') return 'Open need'
  if (status === 'claimed') return 'Claimed'
  if (status === 'locked') return 'Price locked'
  if (status === 'moving') return 'On the road'
  if (status === 'delivered') return 'Delivered'
  return 'Disputed'
}

export function onTimePercent(dropsCompleted: number, dropsOnTime: number): number {
  if (dropsCompleted <= 0) return 0
  return Math.round((dropsOnTime / dropsCompleted) * 1000) / 10
}

export function whenLabel(iso: string, now = new Date()): string {
  const day = (value: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Lagos',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(value)
  const posted = day(new Date(iso))
  const today = day(now)
  const yesterday = day(new Date(now.getTime() - 86_400_000))
  if (posted === today) return 'Today'
  if (posted === yesterday) return 'Yesterday'
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso))
}
