import { STATE_CODES } from './states'

/**
 * NIPOST National Digital Alphanumeric Postcode (launched 1 Oct 2026).
 *
 * 11 alphanumeric characters in 5 segments (spaces/hyphens optional):
 *   SS  LL  DDD  AA  BB
 *   │   │    │   │   └─ Building  (2 digits, 01–99)
 *   │   │    │   └───── Area      (2 letters)
 *   │   │    └───────── District  (1 letter + 2 digits, e.g. A09)
 *   │   └────────────── LGA       (2 digits, 01–99)
 *   └────────────────── State/FCT (2 letters from approved list)
 *
 * Examples: `FC 02 A09 DB 09`, `FC-02-A09-DB-09`, `FC02A09DB09`
 * Canonical storage: compact uppercase 11 chars without separators.
 */

export const POSTAL_SEGMENT =
  /^(?<state>[A-Z]{2})(?<lga>0[1-9]|[1-9][0-9])(?<district>[A-Z][0-9]{2})(?<area>[A-Z]{2})(?<building>0[1-9]|[1-9][0-9])$/

export function normalizePostal(raw: string): string {
  return raw.replace(/[\s\-]/g, '').toUpperCase()
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
  const m = POSTAL_SEGMENT.exec(compact)
  if (!m?.groups) return null
  const { state, lga, district, area, building } = m.groups
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

export function assertValidPostal(raw: string, context = 'listing'): PostalParse {
  const parsed = parsePostal(raw)
  if (!parsed) {
    throw new Error(
      `Rejected ${context}: invalid NIPOST postcode "${raw}". Expected 11-char format SSLLDDDAABB (e.g. FC02A09DB09).`,
    )
  }
  return parsed
}

export function formatPostalDisplay(raw: string): string {
  return parsePostal(raw)?.display ?? raw
}

/** Build a deterministic seed postcode for a state (not a real building; demo-only). */
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
