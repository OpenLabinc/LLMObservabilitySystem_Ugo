/** NIPOST-approved 2-letter state / FCT codes (37). */
export interface NgState {
  code: string
  name: string
  capital: string
  /** Approximate map center for seed pins */
  lat: number
  lng: number
}

export const NG_STATES: NgState[] = [
  { code: 'AB', name: 'Abia', capital: 'Umuahia', lat: 5.5263, lng: 7.4898 },
  { code: 'AD', name: 'Adamawa', capital: 'Yola', lat: 9.2035, lng: 12.4954 },
  { code: 'AK', name: 'Akwa Ibom', capital: 'Uyo', lat: 5.0377, lng: 7.9128 },
  { code: 'AN', name: 'Anambra', capital: 'Awka', lat: 6.2109, lng: 7.0741 },
  { code: 'BA', name: 'Bauchi', capital: 'Bauchi', lat: 10.3103, lng: 9.8439 },
  { code: 'BY', name: 'Bayelsa', capital: 'Yenagoa', lat: 4.9267, lng: 6.2676 },
  { code: 'BE', name: 'Benue', capital: 'Makurdi', lat: 7.7322, lng: 8.5391 },
  { code: 'BR', name: 'Borno', capital: 'Maiduguri', lat: 11.8333, lng: 13.15 },
  { code: 'CR', name: 'Cross River', capital: 'Calabar', lat: 4.9757, lng: 8.3417 },
  { code: 'DE', name: 'Delta', capital: 'Asaba', lat: 6.2059, lng: 6.6959 },
  { code: 'EB', name: 'Ebonyi', capital: 'Abakaliki', lat: 6.3249, lng: 8.1137 },
  { code: 'ED', name: 'Edo', capital: 'Benin City', lat: 6.335, lng: 5.6037 },
  { code: 'EK', name: 'Ekiti', capital: 'Ado-Ekiti', lat: 7.6211, lng: 5.2214 },
  { code: 'EN', name: 'Enugu', capital: 'Enugu', lat: 6.4584, lng: 7.5464 },
  { code: 'FC', name: 'FCT', capital: 'Abuja', lat: 9.0765, lng: 7.3986 },
  { code: 'GM', name: 'Gombe', capital: 'Gombe', lat: 10.2897, lng: 11.1711 },
  { code: 'IM', name: 'Imo', capital: 'Owerri', lat: 5.484, lng: 7.0351 },
  { code: 'JI', name: 'Jigawa', capital: 'Dutse', lat: 11.7006, lng: 9.3427 },
  { code: 'KD', name: 'Kaduna', capital: 'Kaduna', lat: 10.5105, lng: 7.4165 },
  { code: 'KN', name: 'Kano', capital: 'Kano', lat: 12.0022, lng: 8.592 },
  { code: 'KT', name: 'Katsina', capital: 'Katsina', lat: 12.9908, lng: 7.601 },
  { code: 'KE', name: 'Kebbi', capital: 'Birnin Kebbi', lat: 12.4539, lng: 4.197 },
  { code: 'KG', name: 'Kogi', capital: 'Lokoja', lat: 7.8023, lng: 6.7333 },
  { code: 'KW', name: 'Kwara', capital: 'Ilorin', lat: 8.4966, lng: 4.5421 },
  { code: 'LA', name: 'Lagos', capital: 'Ikeja', lat: 6.5244, lng: 3.3792 },
  { code: 'NA', name: 'Nasarawa', capital: 'Lafia', lat: 8.4939, lng: 8.515 },
  { code: 'NI', name: 'Niger', capital: 'Minna', lat: 9.6152, lng: 6.5476 },
  { code: 'OG', name: 'Ogun', capital: 'Abeokuta', lat: 7.1475, lng: 3.3619 },
  { code: 'ON', name: 'Ondo', capital: 'Akure', lat: 7.2571, lng: 5.2058 },
  { code: 'OS', name: 'Osun', capital: 'Osogbo', lat: 7.7717, lng: 4.5567 },
  { code: 'OY', name: 'Oyo', capital: 'Ibadan', lat: 7.3775, lng: 3.947 },
  { code: 'PL', name: 'Plateau', capital: 'Jos', lat: 9.8965, lng: 8.8583 },
  { code: 'RI', name: 'Rivers', capital: 'Port Harcourt', lat: 4.8156, lng: 7.0498 },
  { code: 'SK', name: 'Sokoto', capital: 'Sokoto', lat: 13.0059, lng: 5.2476 },
  { code: 'TA', name: 'Taraba', capital: 'Jalingo', lat: 8.8929, lng: 11.3771 },
  { code: 'YB', name: 'Yobe', capital: 'Damaturu', lat: 11.747, lng: 11.9662 },
  { code: 'ZA', name: 'Zamfara', capital: 'Gusau', lat: 12.1628, lng: 6.6666 },
]

export const STATE_CODES = new Set(NG_STATES.map((s) => s.code))

export function stateByCode(code: string) {
  return NG_STATES.find((s) => s.code === code.toUpperCase())
}

export function assertAllStatesCovered(codes: string[]) {
  const missing = NG_STATES.filter((s) => !codes.includes(s.code)).map((s) => s.code)
  if (missing.length) {
    throw new Error(`Missing state coverage: ${missing.join(', ')}`)
  }
  return NG_STATES.length
}
