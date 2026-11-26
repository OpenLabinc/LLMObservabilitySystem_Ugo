import { STATE_CODES } from './states'

/**
 * NIPOST National Digital Alphanumeric Postcode (1 Oct 2026).
 *
 * 11 characters, five segments. Canonical storage is compact uppercase.
 * Display inserts spaces: `FC 02 A09 DB 09`.
 *
 *   SS  LL  DDD  AA  BB
 *   state  LGA  district  area  building
 *   letters  01–99  letter+2 digits  letters  01–99
 *
 * `00` is never a valid LGA or building. Legacy 6-digit codes are rejected.
 */

export const POSTAL_SEGMENT =
  /^(?<state>[A-Z]{2})(?<lga>0[1-9]|[1-9][0-9])(?<district>[A-Z][0-9]{2})(?<area>[A-Z]{2})(?<building>0[1-9]|[1-9][0-9])$/

export function normalizePostal(raw: string): string {
  return raw.normalize('NFKC').replace(/[\s.\-–—]/g, '').toUpperCase()
}

export interface PostalParse {
  compact: string
  display: string
  state: string
  lga: string
  district: string
  area: string
  building: string
}

export function parsePostal(raw: string): PostalParse | null {
  const compact = normalizePostal(raw)
  if (compact.length !== 11) return null
  const match = POSTAL_SEGMENT.exec(compact)
  if (!match?.groups) return null
  const { state, lga, district, area, building } = match.groups
  if (!STATE_CODES.has(state)) return null
  return {
    compact,
    display: `${state} ${lga} ${district} ${area} ${building}`,
    state,
    lga,
    district,
    area,
    building,
  }
}

export function isValidPostal(raw: string): boolean {
  return parsePostal(raw) !== null
}

export function assertValidPostal(raw: string, context = 'address'): PostalParse {
  const parsed = parsePostal(raw)
  if (!parsed) {
    throw new Error(
      `Rejected ${context}: invalid NIPOST postcode "${raw}". Expected SSLLDDDAABB (example FC 02 A09 DB 09).`,
    )
  }
  return parsed
}

export function formatPostalDisplay(raw: string): string {
  return parsePostal(raw)?.display ?? raw
}

export function postalError(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return 'Enter the 11-character NIPOST postcode.'
  const compact = normalizePostal(trimmed)
  if (/^\d{6}$/.test(compact)) {
    return 'That is an old 6-digit postcode. Koro needs the 11-character NIPOST code.'
  }
  if (parsePostal(trimmed)) return null
  return 'Not a valid NIPOST postcode. Use SS LL DDD AA BB, for example FC 02 A09 DB 09.'
}

/** Deterministic demo postcode. Not a live NIPOST registry id. */
export function seedPostal(
  stateCode: string,
  lga: number,
  districtLetter: string,
  districtNum: number,
  area: string,
  building: number,
): string {
  const compact =
    stateCode.toUpperCase() +
    String(lga).padStart(2, '0') +
    districtLetter.toUpperCase() +
    String(districtNum).padStart(2, '0') +
    area.toUpperCase().slice(0, 2) +
    String(building).padStart(2, '0')
  return assertValidPostal(compact, 'seed').compact
}
