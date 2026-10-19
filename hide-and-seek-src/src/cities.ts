import type { AdminLevel } from './types'

/**
 * En by appen kan spilles i. Alt som er ulikt fra by til by står her, og
 * kartdataene ligger i `public/data/<id>/`, bygget av scriptene med samme id
 * i `scripts/cities.json`. Ny by: legg den til begge steder og bygg dataene
 * (se README).
 */
export interface City {
  id: string
  name: string
  /** Hva kollektivnettet heter, brukt i tekster: «T-bane» gir «T-banestasjon», «T-banelinje». */
  network: string
  /** Hele nettet, f.eks. «T-banenettet». */
  networkWhole: string
  /** Ytre ramme for alt som regnes ut, [vest, sør, øst, nord]. Må dekke hele nettet med god margin. */
  bounds: [number, number, number, number]
  /** Områdenivåene dataene har, grovest først. Spørsmål om andre nivåer slås av. */
  adminLevels: { key: AdminLevel; label: string }[]
  /** Kartverkets API-er for høyde og adresser finnes bare i Norge. Uten dem svarer hider selv. */
  norway: boolean
  /** Har byen høyhastighetsbane? Uten er svaret på det spørsmålet alltid nullsvar. */
  highSpeed: boolean
}

export const CITIES: City[] = [
  {
    id: 'oslo',
    name: 'Oslo',
    network: 'T-bane',
    networkWhole: 'T-banenettet',
    bounds: [10.2, 59.7, 11.25, 60.2],
    adminLevels: [
      { key: 'fylke', label: 'Fylke' },
      { key: 'kommune', label: 'Kommune' },
      { key: 'bydel', label: 'Bydel' },
      { key: 'postsone', label: 'Postsone (3 første siffer)' },
      { key: 'postnummer', label: 'Postnummer' },
    ],
    norway: true,
    highSpeed: false,
  },
]

export const DEFAULT_CITY = CITIES[0].id
export const cityOf = (id: string | undefined) => CITIES.find((c) => c.id === id) ?? CITIES[0]

/**
 * Byen som er lastet inn. Settes av `loadData`, så tekster og geometri kan bruke
 * den uten at byen må sendes gjennom hver funksjon. Én by er lastet om gangen.
 */
let current: City = CITIES[0]
export const city = () => current
export const setCity = (c: City) => void (current = c)
/** Merket stasjonene i nettet får blant jernbanestasjonene, f.eks. « (T-bane)». */
export const networkSuffix = () => ` (${current.network})`
