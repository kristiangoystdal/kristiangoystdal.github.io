import { transit } from './cities'
import { ANSWER_CANT, ANSWER_NULL, ANSWER_RANDOM, ANSWER_VETO, METRO_LINES, POI_TYPES, areaAt, dist, levelName, nearestPoi, nearestStation, stationPos } from './geo'
import { tr } from './lang'
import type { AdminLevel, GameSize, GeoData, Kind, LngLat, Question, QuestionBody, Settings, ShapeKey, Station } from './types'

/** Skjemaet for et spørsmål: flatt og med valgfrie punkter, så det kan være halvferdig. */
export interface Form {
  id?: string
  /** Hvilket spørsmål i regelboken som er valgt (id i ITEMS). */
  item: string
  kind: Kind
  pos: LngLat | null
  /** Bare termometer: punktet seeker gikk til. */
  pos2: LngLat | null
  radiusM: number
  line: string
  /** Bare kollektivlinje: kjøreretningen og neste stopp, som plass i linjens stasjonsliste. */
  dir: 1 | -1
  next: number
  level: AdminLevel
  poiType: string
  ref: string
  text: string
  family: 'matching' | 'measuring'
  answer: string | null
  note?: string
}

export const CATEGORIES = ['Matching', 'Measuring', 'Thermometer', 'Radar', 'Tentacles', 'Photos'] as const
export type Category = (typeof CATEGORIES)[number]

/** Regelbokens gjemmetid og soneradius per spillstørrelse. Settes når størrelsen velges, og kan overstyres. */
export const SIZE_RULES: Record<GameSize, { hidingMinutes: number; zoneRadius: number }> = {
  S: { hidingMinutes: 30, zoneRadius: 400 },
  M: { hidingMinutes: 60, zoneRadius: 400 },
  L: { hidingMinutes: 180, zoneRadius: 800 },
}

/** Ett spørsmål fra regelboken. */
export interface Item {
  id: string
  category: Category
  group: string
  label: string
  /** Spillstørrelsene spørsmålet er med i. */
  sizes: string
  fields: Partial<Form>
  /** Krav til bildet, for fotospørsmål. */
  rules?: string
}

const ALL = 'SML'
const poi = (key: string) => POI_TYPES.find((t) => t.key === key)!
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

const matching = (id: string, group: string, label: string, fields: Partial<Form>): Item => ({ id: `m-${id}`, category: 'Matching', group, label, sizes: ALL, fields })
const measuring = (id: string, group: string, label: string, fields: Partial<Form>): Item => ({ id: `me-${id}`, category: 'Measuring', group, label, sizes: ALL, fields })
const mPoi = (key: string, group: string) => matching(key, group, cap(poi(key).label), { kind: 'nearest', poiType: key })
const mePoi = (key: string, group: string) => measuring(key, group, cap(poi(key).label), { kind: 'measure', ref: key })
// Emnet lagres i spørsmålet på norsk, så det er likt på alle telefonene. Teksten som vises, kommer fra listen.
const mManual = (id: string, group: string, label: string, subject: string) => matching(id, group, label, { kind: 'manual', family: 'matching', text: subject })
const meShape = (id: string, group: string, label: string, ref: ShapeKey) => measuring(id, group, label, { kind: 'geodist', ref })
const meManual = (id: string, group: string, label: string, subject: string) => measuring(id, group, label, { kind: 'manual', family: 'measuring', text: subject })
const DISTANCE = tr('Avstand', 'Distance')
const radar = (m: number): Item => ({ id: `r-${m}`, category: 'Radar', group: DISTANCE, label: fmtDist(m), sizes: ALL, fields: { kind: 'radar', radiusM: m } })
const thermo = (m: number, sizes: string): Item => ({ id: `t-${m}`, category: 'Thermometer', group: tr('Reist minst', 'Travel at least'), label: fmtDist(m), sizes, fields: { kind: 'thermometer', radiusM: m } })
const tentacle = (key: string, m: number, sizes: string): Item => ({
  id: `te-${key}`,
  category: 'Tentacles',
  group: tr(`Innen ${fmtDist(m)}`, `Within ${fmtDist(m)}`),
  // Hentes når den vises, så den følger byen som er lastet inn.
  get label() {
    return key === METRO_LINES ? cap(transit().lines) : cap(poi(key).plural)
  },
  sizes,
  fields: { kind: 'tentacles', poiType: key, radiusM: m },
})
/** `text` er den norske teksten som lagres i spørsmålet. Teksten som vises, kommer fra listen. */
const photo = (id: string, sizes: string, [label, text]: [string, string], rules: string): Item => ({
  id: `p-${id}`,
  category: 'Photos',
  group: sizes === ALL ? tr('Alle spill', 'All games') : sizes === 'ML' ? tr('Medium og Large', 'Medium and Large') : tr('Kun Large', 'Large only'),
  label,
  sizes,
  fields: { kind: 'photo', text },
  rules,
})
/** Navnet på bildet på begge språk: [det som vises, det som lagres]. */
const ph = (nb: string, en: string): [string, string] => [tr(nb, en), nb]

const TRANSPORT = 'Transport'
const NATURE = tr('Natur', 'Nature')
const BORDERS = tr('Grenser', 'Borders')
const ADMIN = tr('Administrativt', 'Administrative')
const POI_GROUPS: [string, string[]][] = [
  [tr('Severdigheter', 'Attractions'), ['fornoyelsespark', 'dyrepark', 'akvarium', 'golfbane', 'museum', 'kino']],
  [tr('Offentlige tjenester', 'Public services'), ['sykehus', 'bibliotek', 'konsulat']],
]

export const ITEMS: Item[] = [
  mPoi('flyplass', TRANSPORT),
  matching('line', TRANSPORT, tr('Kollektivlinje (det dere sitter på)', 'Transit line (the one you are on)'), { kind: 'transit' }),
  matching('namelen', TRANSPORT, tr('Lengde på stasjonsnavn', 'Station name length'), { kind: 'namelen' }),
  mManual('street', TRANSPORT, tr('Gate eller sti', 'Street or path'), 'gate eller sti'),
  matching('admin1', ADMIN, tr('1. nivå: fylke', '1st level: county'), { kind: 'admin', level: 'fylke' }),
  matching('admin2', ADMIN, tr('2. nivå: kommune', '2nd level: municipality'), { kind: 'admin', level: 'kommune' }),
  matching('admin3', ADMIN, tr('3. nivå: bydel', '3rd level: borough'), { kind: 'admin', level: 'bydel' }),
  matching('admin4', ADMIN, tr('4. nivå: postsone', '4th level: postal zone'), { kind: 'admin', level: 'postsone' }),
  mPoi('fjell', NATURE),
  matching('landmass', NATURE, tr('Landmasse', 'Landmass'), { kind: 'landmass' }),
  mPoi('park', NATURE),
  ...POI_GROUPS.flatMap(([group, keys]) => keys.map((k) => mPoi(k, group))),

  mePoi('flyplass', TRANSPORT),
  meManual('highspeed', TRANSPORT, tr('Høyhastighetsbane', 'High-speed rail'), 'høyhastighetsbane'),
  mePoi('jernbanestasjon', TRANSPORT),
  meShape('border-int', BORDERS, tr('Riksgrensen', 'International border'), 'riks'),
  measuring('border1', BORDERS, tr('Fylkesgrense', 'County border'), { kind: 'border', level: 'fylke' }),
  measuring('border2', BORDERS, tr('Kommunegrense', 'Municipal border'), { kind: 'border', level: 'kommune' }),
  meManual('sealevel', NATURE, tr('Havnivå (høyde over havet)', 'Sea level (height above sea level)'), 'havnivå (høyde over havet)'),
  meShape('water', NATURE, tr('Vann eller innsjø', 'Body of water'), 'water'),
  meShape('coast', NATURE, tr('Kystlinjen', 'Coastline'), 'coast'),
  mePoi('fjell', NATURE),
  mePoi('park', NATURE),
  ...POI_GROUPS.flatMap(([group, keys]) => keys.map((k) => mePoi(k, group))),

  thermo(1000, ALL),
  thermo(5000, ALL),
  thermo(15000, 'ML'),
  thermo(75000, 'L'),

  ...[500, 1000, 2000, 5000, 10000, 15000, 40000, 80000, 160000].map(radar),
  { id: 'r-choose', category: 'Radar', group: DISTANCE, label: tr('Velg selv', 'Choose your own'), sizes: ALL, fields: { kind: 'radar', radiusM: 3000 } },

  ...['museum', 'bibliotek', 'kino', 'sykehus'].map((k) => tentacle(k, 2000, 'ML')),
  ...[METRO_LINES, 'dyrepark', 'akvarium', 'fornoyelsespark'].map((k) => tentacle(k, 25000, 'L')),

  photo('tree', ALL, ph('Et tre', 'A tree'), tr('Hele treet må være med.', 'The whole tree must be in the picture.')),
  photo('sky', ALL, ph('Himmelen', 'The sky'), tr('Legg telefonen på bakken og ta bildet rett opp.', 'Put the phone on the ground and shoot straight up.')),
  photo('you', ALL, ph('Deg selv', 'You'), tr('Selfie med armen helt utstrakt og parallell med bakken.', 'Selfie with your arm fully extended and parallel to the ground.')),
  photo('street', ALL, ph('Bredeste gate', 'Widest street'), tr('Begge sider av gaten må være med.', 'Both sides of the street must be in the picture.')),
  photo(
    'tallest',
    ALL,
    ph('Høyeste konstruksjon i sikte', 'Tallest structure in sight'),
    tr('Toppen og begge sider må være med, med toppen i øverste tredel av bildet.', 'The top and both sides must be in the picture, with the top in the upper third.'),
  ),
  photo(
    'building',
    ALL,
    ph('En bygning synlig fra stasjonen', 'Any building visible from the station'),
    tr(
      'Stå rett utenfor inngangen til stasjonen. Tak og begge sider må være med, med toppen i øverste tredel.',
      'Stand just outside the station entrance. The roof and both sides must be in the picture, with the top in the upper third.',
    ),
  ),
  photo(
    'tallest-building',
    'ML',
    ph('Høyeste bygning synlig fra stasjonen', 'Tallest building visible from the station'),
    tr(
      'Stå rett utenfor inngangen til stasjonen. Tak og begge sider må være med, med toppen i øverste tredel.',
      'Stand just outside the station entrance. The roof and both sides must be in the picture, with the top in the upper third.',
    ),
  ),
  photo('trace', 'ML', ph('Tegn opp nærmeste gate eller sti', 'Trace the nearest street or path'), tr('Må vises i en kartapp. Tegn fra kryss til kryss.', 'Must show in a map app. Trace from intersection to intersection.')),
  photo('two-buildings', 'ML', ph('To bygninger', 'Two buildings'), tr('Bunnen og opptil fire etasjer.', 'The bottom and up to four floors.')),
  photo('restaurant', 'ML', ph('Restaurant innvendig', 'Restaurant interior'), tr('Ingen zoom. Tatt gjennom vinduet utenfra.', 'No zoom. Taken through the window from outside.')),
  photo('platform', 'ML', ph('Togperrong', 'Train platform'), tr('Utsnitt på 2 × 2 m med tre ulike elementer.', 'A 2 × 2 m section with three distinct elements.')),
  photo('park', 'ML', ph('Park', 'Park'), tr('Ingen zoom. Telefonen vinkelrett på bakken, 2 m fra hindringer.', 'No zoom. Phone perpendicular to the ground, 2 m from obstructions.')),
  photo('aisle', 'ML', ph('Hylle i dagligvarebutikk', 'Grocery store aisle'), tr('Ingen zoom. Stå i enden av gangen og ta bildet rett nedover.', 'No zoom. Stand at the end of the aisle and shoot straight down it.')),
  photo('worship', 'ML', ph('Gudshus', 'Place of worship'), tr('Utsnitt på 2 × 2 m med tre ulike elementer.', 'A 2 × 2 m section with three distinct elements.')),
  photo(
    'streets',
    'L',
    ph('1 km gater tegnet opp', 'Trace 1 km of streets'),
    tr('Sammenhengende, fem svinger, ingen u-svinger, orientert nord-sør. Gatene må vises i en kartapp.', 'Continuous, five turns, no U-turns, oriented north-south. The streets must show in a map app.'),
  ),
  photo('mountain', 'L', ph('Høyeste fjell synlig fra stasjonen', 'Tallest mountain visible from the station'), tr('Maks 3× zoom. Toppen i øverste tredel av bildet.', 'Max 3× zoom. The top in the upper third.')),
  photo('water', 'L', ph('Største vann i sonen din', 'Biggest body of water in your zone'), tr('Maks 3× zoom. Begge sider av vannet eller horisonten må være med.', 'Max 3× zoom. Both sides of the water or the horizon must be in the picture.')),
  photo('five-buildings', 'L', ph('Fem bygninger', 'Five buildings'), tr('Bunnen og opptil fire etasjer.', 'The bottom and up to four floors.')),
]

const ITEM_BY_ID = new Map(ITEMS.map((i) => [i.id, i]))
export const itemOf = (id: string | undefined) => (id ? ITEM_BY_ID.get(id) : undefined)
/** Det i oppsettet som avgjør hvilke spørsmål som er med. */
export type Rules = Pick<Settings, 'size' | 'questions'>
/** Er spørsmålet med i dette spillet? Et egendefinert utvalg går foran spillstørrelsen. */
export const available = (i: Item, rules: Rules) => (rules.questions ? rules.questions.includes(i.id) : i.sizes.includes(rules.size))
export const itemsFor = (category: Category, rules: Rules) => ITEMS.filter((i) => i.category === category && available(i, rules))
/** Spørsmålene som er med, som en liste med id-er. Utgangspunktet når utvalget tilpasses. */
export const enabledIds = (rules: Rules) => ITEMS.filter((i) => available(i, rules)).map((i) => i.id)

/** Kortene hider har spilt som stenger spørsmål resten av runden. */
export type Locks = { drained?: string[]; spotty?: string | null }
/** Hvorfor spørsmålet ikke kan stilles nå, eller null. Drained Brain og Spotty Memory stenger selv mot økt kostnad. */
export const lockedBy = (i: Item, locks: Locks) => (locks.drained?.includes(i.id) ? 'Drained Brain' : locks.spotty === i.category ? 'Spotty Memory' : null)

// Spørsmål lagret før regelboklisten kom har ingen item. Da gjettes kategorien fra typen.
const LEGACY_CATEGORY: Record<Kind, Category> = {
  radar: 'Radar',
  thermometer: 'Thermometer',
  line: 'Matching',
  transit: 'Matching',
  landmass: 'Matching',
  geodist: 'Measuring',
  admin: 'Matching',
  nearest: 'Matching',
  namelen: 'Matching',
  measure: 'Measuring',
  border: 'Measuring',
  manual: 'Matching',
  tentacles: 'Tentacles',
  photo: 'Photos',
}
export const categoryOf = (q: Pick<Question, 'kind' | 'item'>): Category => itemOf(q.item)?.category ?? LEGACY_CATEGORY[q.kind]

/** Svartiden hider har: 5 min, men 10 min (S/M) eller 20 min (L) for bilder. */
export const responseMinutes = (q: Pick<Question, 'kind' | 'item'>, size: GameSize) => (categoryOf(q) === 'Photos' ? (size === 'L' ? 20 : 10) : 5)

const BLANK: Omit<Form, 'item' | 'kind' | 'pos'> = { pos2: null, radiusM: 1000, line: '1', dir: 1, next: 0, level: 'bydel', poiType: 'museum', ref: 'museum', text: '', family: 'matching', answer: null }

export const newForm = (item: Item, pos: LngLat | null): Form => ({ ...BLANK, kind: 'radar', pos, ...item.fields, item: item.id })

/** Bytter spørsmål i skjemaet, men beholder posisjonene som alt er valgt. */
export const switchItem = (form: Form, item: Item): Form => ({ ...newForm(item, form.pos), pos2: form.pos2, line: form.line, dir: form.dir, next: form.next, id: form.id, note: form.note })

export function formToBody(f: Form): (QuestionBody & { item: string }) | null {
  const body = ((): QuestionBody | null => {
    switch (f.kind) {
      case 'radar':
        return f.pos && f.radiusM > 0 ? { kind: 'radar', center: f.pos, radiusM: f.radiusM } : null
      case 'thermometer':
        return f.pos && f.pos2 ? { kind: 'thermometer', from: f.pos, to: f.pos2, minM: f.radiusM } : null
      case 'line':
        return { kind: 'line', line: f.line }
      case 'transit':
        return f.pos && { kind: 'transit', line: f.line, dir: f.dir, next: f.next, pos: f.pos }
      case 'geodist':
        return f.pos && { kind: 'geodist', ref: f.ref as ShapeKey, pos: f.pos }
      case 'landmass':
        return f.pos && { kind: 'landmass', pos: f.pos }
      case 'admin':
        return f.pos && { kind: 'admin', level: f.level, pos: f.pos }
      case 'nearest':
        return f.pos && { kind: 'nearest', poiType: f.poiType, pos: f.pos }
      case 'measure':
        return f.pos && { kind: 'measure', ref: f.ref, pos: f.pos }
      case 'namelen':
        return f.pos && { kind: 'namelen', pos: f.pos }
      case 'border':
        return f.pos && (f.level === 'fylke' || f.level === 'kommune') ? { kind: 'border', level: f.level, pos: f.pos } : null
      case 'tentacles':
        return f.pos && f.radiusM > 0 ? { kind: 'tentacles', poiType: f.poiType, pos: f.pos, radiusM: f.radiusM } : null
      case 'manual':
        return f.pos && { kind: 'manual', family: f.family, subject: f.text, pos: f.pos }
      case 'photo':
        return f.text.trim() ? { kind: 'photo', text: f.text.trim() } : null
    }
  })()
  return body && { ...body, item: f.item }
}

export function questionToForm(q: Question): Form {
  const item = itemOf(q.item) ?? ITEMS.find((i) => i.category === categoryOf(q) && i.fields.kind === q.kind) ?? ITEMS[0]
  const body: Partial<Form> =
    q.kind === 'radar'
      ? { pos: q.center, radiusM: q.radiusM }
      : q.kind === 'thermometer'
        ? { pos: q.from, pos2: q.to, radiusM: q.minM ?? 0 }
        : q.kind === 'manual'
          ? { family: q.family, text: q.subject, pos: q.pos ?? null }
          : q
  return { ...newForm(item, null), ...body, item: item.id, id: q.id, answer: q.answer, note: q.note }
}

export const formToQuestion = (f: Form): Question | null => {
  const body = formToBody(f)
  return body && { ...body, id: f.id ?? 'draft', time: 0, answer: f.answer }
}

export function fmtDist(d: number) {
  return d >= 1000 ? `${+(d / 1000).toFixed(d % 1000 ? 1 : 0)} km` : `${Math.round(d)} m`
}
const poiName = (key: string) => (key === METRO_LINES ? transit().line : (POI_TYPES.find((t) => t.key === key)?.label ?? key))
const poiPlural = (key: string) => (key === METRO_LINES ? transit().lines : (POI_TYPES.find((t) => t.key === key)?.plural ?? key))
const SHAPE_NAMES: Record<ShapeKey, string> = tr(
  { coast: 'kystlinjen', water: 'nærmeste vann eller innsjø', riks: 'riksgrensen' },
  { coast: 'the coastline', water: 'the nearest body of water', riks: 'the international border' },
)
export { levelName }

/** Beskriver et punkt ut fra nærmeste stasjon. */
export function place(pos: LngLat, stations: Station[]) {
  const s = nearestStation(stations, pos)
  const d = dist(stationPos(s), pos)
  return d < 60 ? s.name : tr(`${fmtDist(d)} fra ${s.name}`, `${fmtDist(d)} from ${s.name}`)
}

/**
 * Emnet i et manuelt spørsmål. Spørsmål fra listen får navnet derfra, så det vises på telefonens språk.
 * Ellers brukes emnet som er lagret.
 */
const subjectOf = (q: Extract<Question, { kind: 'manual' }>) => {
  const label = itemOf(q.item)?.label
  return label ? label.toLowerCase() : q.subject
}

export function describe(q: Question, data: GeoData): string {
  switch (q.kind) {
    case 'radar':
      return tr(`Er du innenfor ${fmtDist(q.radiusM)} fra meg?`, `Are you within ${fmtDist(q.radiusM)} of me?`) + ` (${place(q.center, data.stations)})`
    case 'thermometer': {
      const how = q.minM ? tr(`minst ${fmtDist(q.minM)}`, `at least ${fmtDist(q.minM)}`) : fmtDist(dist(q.from, q.to))
      const route = `${place(q.from, data.stations)} → ${place(q.to, data.stations)}`
      return tr(`Jeg har reist ${how}: ${route}. Varmere eller kaldere?`, `I have traveled ${how}: ${route}. Hotter or colder?`)
    }
    case 'line':
      return tr(`Er stasjonen din på linje ${q.line}?`, `Is your station on line ${q.line}?`)
    case 'transit': {
      const order = data.lines.features.find((f) => f.properties.line === q.line)?.properties.stations ?? []
      const name = (id?: string) => data.stations.find((s) => s.id === id)?.name ?? tr('ukjent', 'unknown')
      const end = name(q.dir === 1 ? order.at(-1) : order[0])
      const next = name(order[q.next])
      const at = q.pos ? place(q.pos, data.stations) : null
      return tr(
        `Stopper ${transit().vehicle} vi sitter på ved stasjonen din? (linje ${q.line} mot ${end}, neste stopp ${next}${at ? `, seeker ved ${at}` : ''})`,
        `Does ${transit().vehicle} we are on stop at your station? (line ${q.line} towards ${end}, next stop ${next}${at ? `, seeker at ${at}` : ''})`,
      )
    }
    case 'geodist':
      return tr(`Er du nærmere ${SHAPE_NAMES[q.ref]} enn meg?`, `Are you closer to ${SHAPE_NAMES[q.ref]} than me?`) + ` (${place(q.pos, data.stations)})`
    case 'landmass':
      return tr('Er du på samme landmasse som meg?', 'Are you on the same landmass as me?') + ` (${place(q.pos, data.stations)})`
    case 'admin': {
      const a = areaAt(data, q.level, q.pos)
      return tr(`Er du i samme ${levelName(q.level)} som meg?`, `Are you in the same ${levelName(q.level)} as me?`) + (a ? ` (${a.properties.name})` : '')
    }
    case 'nearest': {
      const p = nearestPoi(data.poi[q.poiType] ?? [], q.pos)
      return tr(`Har vi samme nærmeste ${poiName(q.poiType)}?`, `Is your nearest ${poiName(q.poiType)} the same as mine?`) + (p ? tr(` (min: ${p.name})`, ` (mine: ${p.name})`) : '')
    }
    case 'namelen': {
      const s = nearestStation(data.stations, q.pos)
      return tr('Har stasjonsnavnet ditt like mange tegn som mitt?', 'Does your station name have as many characters as mine?') + ` (${s.name}: ${s.name.length})`
    }
    case 'measure':
      return tr(`Er du nærmere nærmeste ${poiName(q.ref)} enn meg?`, `Are you closer to the nearest ${poiName(q.ref)} than me?`) + ` (${place(q.pos, data.stations)})`
    case 'border': {
      const border = q.level === 'fylke' ? tr('fylkesgrensen', 'a county border') : tr('kommunegrensen', 'a municipal border')
      return tr(`Er du nærmere ${border} enn meg?`, `Are you closer to ${border} than me?`) + ` (${place(q.pos, data.stations)})`
    }
    case 'manual': {
      const subject = subjectOf(q)
      const text = q.family === 'matching' ? tr(`Har vi samme nærmeste ${subject}?`, `Is your nearest ${subject} the same as mine?`) : tr(`Er du nærmere ${subject} enn meg?`, `Are you closer to ${subject} than me?`)
      return `${text}${q.pos ? ` (${place(q.pos, data.stations)})` : ''}`
    }
    case 'tentacles':
      return (
        tr(`Av alle ${poiPlural(q.poiType)} innen ${fmtDist(q.radiusM)} fra meg, hvilken er du nærmest?`, `Of all ${poiPlural(q.poiType)} within ${fmtDist(q.radiusM)} of me, which are you closest to?`) +
        ` (${place(q.pos, data.stations)})`
      )
    case 'photo':
      return tr('Send et bilde: ', 'Send a photo: ') + (itemOf(q.item)?.label ?? q.text)
  }
}

const ANSWER_LABELS: Record<string, string> = tr(
  { in: 'Innenfor', out: 'Utenfor', warmer: 'Varmere', colder: 'Kaldere', yes: 'Ja', no: 'Nei', closer: 'Nærmere', further: 'Lenger unna', outside: 'Utenfor radius' },
  { in: 'Inside', out: 'Outside', warmer: 'Hotter', colder: 'Colder', yes: 'Yes', no: 'No', closer: 'Closer', further: 'Further', outside: 'Outside the radius' },
)
const SPECIAL_LABELS: Record<string, string> = tr(
  {
    [ANSWER_NULL]: 'Nullsvar (finnes ikke innenfor kartet)',
    [ANSWER_CANT]: 'Kan ikke svare',
    [ANSWER_VETO]: 'Veto (ikke besvart)',
    [ANSWER_RANDOM]: 'Randomize (byttet spørsmål)',
  },
  {
    [ANSWER_NULL]: 'Null answer (not on the map)',
    [ANSWER_CANT]: 'Cannot answer',
    [ANSWER_VETO]: 'Veto (not answered)',
    [ANSWER_RANDOM]: 'Randomize (question swapped)',
  },
)
/** Svaret som lagres når hider har sendt bildet. Alltid på norsk i rommet, og vises på telefonens språk. */
export const PHOTO_SENT = 'Bilde sendt'
export const answerLabel = (q: Pick<Question, 'kind'> & { poiType?: string }, answer: string) =>
  SPECIAL_LABELS[answer] ?? (q.kind === 'photo' ? (answer === PHOTO_SENT ? tr(PHOTO_SENT, 'Photo sent') : answer) : q.poiType === METRO_LINES && !ANSWER_LABELS[answer] ? tr(`Linje ${answer}`, `Line ${answer}`) : (ANSWER_LABELS[answer] ?? answer))

/** Svarene hider kan gi. Tom liste = fritekst. */
export function answerOptions(q: Question, data: GeoData): string[] {
  switch (q.kind) {
    case 'radar':
      return ['in', 'out']
    case 'thermometer':
      return ['warmer', 'colder']
    case 'measure':
    case 'border':
    case 'geodist':
      return ['closer', 'further']
    case 'manual':
      return q.family === 'matching' ? ['yes', 'no'] : ['closer', 'further']
    case 'tentacles':
      if (q.poiType === METRO_LINES) return [...data.lines.features.map((f) => f.properties.line), 'outside']
      return [...(data.poi[q.poiType] ?? []).filter((p) => dist(p.pos, q.pos) <= q.radiusM).map((p) => p.name), 'outside']
    case 'photo':
      return []
    default:
      return ['yes', 'no']
  }
}

/** To spørsmål med samme nøkkel er «akkurat samme spørsmål», uansett hvor seeker står. */
export function questionKey(q: Question): string {
  const extra = q.kind === 'line' || q.kind === 'transit' ? `:${q.line}` : q.item === 'r-choose' && q.kind === 'radar' ? `:${q.radiusM}` : ''
  if (q.item) return q.item + extra
  switch (q.kind) {
    case 'radar':
      return `radar:${q.radiusM}`
    case 'admin':
      return `admin:${q.level}`
    case 'nearest':
      return `nearest:${q.poiType}`
    case 'measure':
      return `measure:${q.ref}`
    case 'tentacles':
      return `tentacles:${q.poiType}:${q.radiusM}`
    case 'photo':
      return `photo:${q.text.trim().toLowerCase()}`
    default:
      return q.kind + extra
  }
}

/** Nøklene til alle spørsmål som alt er stilt, for å merke hva som er brukt. Et spørsmål hider byttet ut med Randomize regnes ikke som stilt. */
export const usedKeys = (log: Question[]) => new Set(log.filter((q) => q.answer !== ANSWER_RANDOM).map(questionKey))

/**
 * Randomize: et tilfeldig spørsmål i samme kategori som ikke er stilt og ikke er stengt.
 * null når det ikke finnes noe å bytte til.
 */
export function randomSwap(q: Question, log: Question[], rules: Rules, locks: Locks, rnd = Math.random): Item | null {
  const used = usedKeys(log.filter((x) => x.id !== q.id))
  const options = itemsFor(categoryOf(q), rules).filter((i) => i.id !== q.item && !isUsed(used, i.id) && !lockedBy(i, locks))
  return options.length ? options[Math.floor(rnd() * options.length)] : null
}
/** Er spørsmålet i katalogen stilt før, i en eller annen variant? */
export const isUsed = (used: Set<string>, itemId: string) => [...used].some((k) => k === itemId || k.startsWith(`${itemId}:`))
