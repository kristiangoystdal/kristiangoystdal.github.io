import { METRO_LINES, POI_TYPES, areaAt, dist, nearestPoi, nearestStation, stationPos } from './geo'
import type { AdminLevel, GameSize, GeoData, Kind, LngLat, Question, QuestionBody, Station } from './types'

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

/** Kortene er fysiske. Appen viser bare hvor mange hider trekker og beholder per kategori. */
export const DRAWS: Record<Category, { draw: number; keep: number }> = {
  Matching: { draw: 3, keep: 1 },
  Measuring: { draw: 3, keep: 1 },
  Thermometer: { draw: 2, keep: 1 },
  Radar: { draw: 2, keep: 1 },
  Tentacles: { draw: 4, keep: 2 },
  Photos: { draw: 1, keep: 1 },
}
export const MAX_HAND = 6

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
const mManual = (id: string, group: string, label: string) => matching(id, group, label, { kind: 'manual', family: 'matching', text: label.toLowerCase() })
const meManual = (id: string, group: string, label: string) => measuring(id, group, label, { kind: 'manual', family: 'measuring', text: label.toLowerCase() })
const radar = (m: number): Item => ({ id: `r-${m}`, category: 'Radar', group: 'Avstand', label: fmtDist(m), sizes: ALL, fields: { kind: 'radar', radiusM: m } })
const thermo = (m: number, sizes: string): Item => ({ id: `t-${m}`, category: 'Thermometer', group: 'Reist minst', label: fmtDist(m), sizes, fields: { kind: 'thermometer', radiusM: m } })
const tentacle = (key: string, m: number, sizes: string): Item => ({
  id: `te-${key}`,
  category: 'Tentacles',
  group: `Innen ${fmtDist(m)}`,
  label: key === METRO_LINES ? 'T-banelinjer' : cap(poi(key).plural),
  sizes,
  fields: { kind: 'tentacles', poiType: key, radiusM: m },
})
const photo = (id: string, sizes: string, label: string, rules: string): Item => ({
  id: `p-${id}`,
  category: 'Photos',
  group: sizes === ALL ? 'Alle spill' : sizes === 'ML' ? 'Medium og Large' : 'Kun Large',
  label,
  sizes,
  fields: { kind: 'photo', text: label },
  rules,
})

const POI_GROUPS: [string, string[]][] = [
  ['Severdigheter', ['fornoyelsespark', 'dyrepark', 'akvarium', 'golfbane', 'museum', 'kino']],
  ['Offentlige tjenester', ['sykehus', 'bibliotek', 'konsulat']],
]

export const ITEMS: Item[] = [
  mPoi('flyplass', 'Transport'),
  matching('line', 'Transport', 'T-banelinje', { kind: 'line' }),
  matching('namelen', 'Transport', 'Lengde på stasjonsnavn', { kind: 'namelen' }),
  mManual('street', 'Transport', 'Gate eller sti'),
  matching('admin1', 'Administrativt', '1. nivå: fylke', { kind: 'admin', level: 'fylke' }),
  matching('admin2', 'Administrativt', '2. nivå: kommune', { kind: 'admin', level: 'kommune' }),
  matching('admin3', 'Administrativt', '3. nivå: bydel', { kind: 'admin', level: 'bydel' }),
  matching('admin4', 'Administrativt', '4. nivå: postsone', { kind: 'admin', level: 'postsone' }),
  mPoi('fjell', 'Natur'),
  mManual('landmass', 'Natur', 'Landmasse'),
  mPoi('park', 'Natur'),
  ...POI_GROUPS.flatMap(([group, keys]) => keys.map((k) => mPoi(k, group))),

  mePoi('flyplass', 'Transport'),
  meManual('highspeed', 'Transport', 'Høyhastighetsbane'),
  mePoi('jernbanestasjon', 'Transport'),
  meManual('border-int', 'Grenser', 'Riksgrensen'),
  measuring('border1', 'Grenser', 'Fylkesgrense', { kind: 'border', level: 'fylke' }),
  measuring('border2', 'Grenser', 'Kommunegrense', { kind: 'border', level: 'kommune' }),
  meManual('sealevel', 'Natur', 'Havnivå (høyde over havet)'),
  meManual('water', 'Natur', 'Vann eller innsjø'),
  meManual('coast', 'Natur', 'Kystlinjen'),
  mePoi('fjell', 'Natur'),
  mePoi('park', 'Natur'),
  ...POI_GROUPS.flatMap(([group, keys]) => keys.map((k) => mePoi(k, group))),

  thermo(1000, ALL),
  thermo(5000, ALL),
  thermo(15000, 'ML'),
  thermo(75000, 'L'),

  ...[500, 1000, 2000, 5000, 10000, 15000, 40000, 80000, 160000].map(radar),
  { id: 'r-choose', category: 'Radar', group: 'Avstand', label: 'Velg selv', sizes: ALL, fields: { kind: 'radar', radiusM: 3000 } },

  ...['museum', 'bibliotek', 'kino', 'sykehus'].map((k) => tentacle(k, 2000, 'ML')),
  ...[METRO_LINES, 'dyrepark', 'akvarium', 'fornoyelsespark'].map((k) => tentacle(k, 25000, 'L')),

  photo('tree', ALL, 'Et tre', 'Hele treet må være med.'),
  photo('sky', ALL, 'Himmelen', 'Legg telefonen på bakken og ta bildet rett opp.'),
  photo('you', ALL, 'Deg selv', 'Selfie med armen helt utstrakt og parallell med bakken.'),
  photo('street', ALL, 'Bredeste gate', 'Begge sider av gaten må være med.'),
  photo('tallest', ALL, 'Høyeste konstruksjon i sikte', 'Toppen og begge sider må være med, med toppen i øverste tredel av bildet.'),
  photo('building', ALL, 'En bygning synlig fra stasjonen', 'Stå rett utenfor inngangen til stasjonen. Tak og begge sider må være med, med toppen i øverste tredel.'),
  photo('tallest-building', 'ML', 'Høyeste bygning synlig fra stasjonen', 'Stå rett utenfor inngangen til stasjonen. Tak og begge sider må være med, med toppen i øverste tredel.'),
  photo('trace', 'ML', 'Tegn opp nærmeste gate eller sti', 'Må vises i en kartapp. Tegn fra kryss til kryss.'),
  photo('two-buildings', 'ML', 'To bygninger', 'Bunnen og opptil fire etasjer.'),
  photo('restaurant', 'ML', 'Restaurant innvendig', 'Ingen zoom. Tatt gjennom vinduet utenfra.'),
  photo('platform', 'ML', 'Togperrong', 'Utsnitt på 2 × 2 m med tre ulike elementer.'),
  photo('park', 'ML', 'Park', 'Ingen zoom. Telefonen vinkelrett på bakken, 2 m fra hindringer.'),
  photo('aisle', 'ML', 'Hylle i dagligvarebutikk', 'Ingen zoom. Stå i enden av gangen og ta bildet rett nedover.'),
  photo('worship', 'ML', 'Gudshus', 'Utsnitt på 2 × 2 m med tre ulike elementer.'),
  photo('streets', 'L', '1 km gater tegnet opp', 'Sammenhengende, fem svinger, ingen u-svinger, orientert nord-sør. Gatene må vises i en kartapp.'),
  photo('mountain', 'L', 'Høyeste fjell synlig fra stasjonen', 'Maks 3× zoom. Toppen i øverste tredel av bildet.'),
  photo('water', 'L', 'Største vann i sonen din', 'Maks 3× zoom. Begge sider av vannet eller horisonten må være med.'),
  photo('five-buildings', 'L', 'Fem bygninger', 'Bunnen og opptil fire etasjer.'),
]

const ITEM_BY_ID = new Map(ITEMS.map((i) => [i.id, i]))
export const itemOf = (id: string | undefined) => (id ? ITEM_BY_ID.get(id) : undefined)
export const itemsFor = (category: Category, size: GameSize) => ITEMS.filter((i) => i.category === category && i.sizes.includes(size))

// Spørsmål lagret før regelboklisten kom har ingen item. Da gjettes kategorien fra typen.
const LEGACY_CATEGORY: Record<Kind, Category> = {
  radar: 'Radar',
  thermometer: 'Thermometer',
  line: 'Matching',
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

const BLANK: Omit<Form, 'item' | 'kind' | 'pos'> = { pos2: null, radiusM: 1000, line: '1', level: 'bydel', poiType: 'museum', ref: 'museum', text: '', family: 'matching', answer: null }

export const newForm = (item: Item, pos: LngLat | null): Form => ({ ...BLANK, kind: 'radar', pos, ...item.fields, item: item.id })

/** Bytter spørsmål i skjemaet, men beholder posisjonene som alt er valgt. */
export const switchItem = (form: Form, item: Item): Form => ({ ...newForm(item, form.pos), pos2: form.pos2, line: form.line, id: form.id, note: form.note })

export function formToBody(f: Form): (QuestionBody & { item: string }) | null {
  const body = ((): QuestionBody | null => {
    switch (f.kind) {
      case 'radar':
        return f.pos && f.radiusM > 0 ? { kind: 'radar', center: f.pos, radiusM: f.radiusM } : null
      case 'thermometer':
        return f.pos && f.pos2 ? { kind: 'thermometer', from: f.pos, to: f.pos2, minM: f.radiusM } : null
      case 'line':
        return { kind: 'line', line: f.line }
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
        return { kind: 'manual', family: f.family, subject: f.text }
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
          ? { family: q.family, text: q.subject }
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
const poiName = (key: string) => (key === METRO_LINES ? 'T-banelinje' : (POI_TYPES.find((t) => t.key === key)?.label ?? key))
const poiPlural = (key: string) => (key === METRO_LINES ? 'T-banelinjene' : (POI_TYPES.find((t) => t.key === key)?.plural ?? key))
const LEVEL_NAMES: Record<AdminLevel, string> = { fylke: 'fylke', kommune: 'kommune', bydel: 'bydel', postsone: 'postsone', postnummer: 'postnummer' }
/** Nivået i løpende tekst: «samme postsone». */
export const levelName = (key: AdminLevel) => LEVEL_NAMES[key] ?? key

/** Beskriver et punkt ut fra nærmeste stasjon. */
export function place(pos: LngLat, stations: Station[]) {
  const s = nearestStation(stations, pos)
  const d = dist(stationPos(s), pos)
  return d < 60 ? s.name : `${fmtDist(d)} fra ${s.name}`
}

export function describe(q: Question, data: GeoData): string {
  switch (q.kind) {
    case 'radar':
      return `Er du innenfor ${fmtDist(q.radiusM)} fra meg? (${place(q.center, data.stations)})`
    case 'thermometer':
      return `Jeg har reist ${q.minM ? `minst ${fmtDist(q.minM)}` : fmtDist(dist(q.from, q.to))}: ${place(q.from, data.stations)} → ${place(q.to, data.stations)}. Varmere eller kaldere?`
    case 'line':
      return `Er stasjonen din på linje ${q.line}?`
    case 'admin': {
      const a = areaAt(data, q.level, q.pos)
      return `Er du i samme ${levelName(q.level)} som meg?${a ? ` (${a.properties.name})` : ''}`
    }
    case 'nearest': {
      const p = nearestPoi(data.poi[q.poiType] ?? [], q.pos)
      return `Har vi samme nærmeste ${poiName(q.poiType)}?${p ? ` (min: ${p.name})` : ''}`
    }
    case 'namelen': {
      const s = nearestStation(data.stations, q.pos)
      return `Har stasjonsnavnet ditt like mange tegn som mitt? (${s.name}: ${s.name.length})`
    }
    case 'measure':
      return `Er du nærmere nærmeste ${poiName(q.ref)} enn meg? (${place(q.pos, data.stations)})`
    case 'border':
      return `Er du nærmere ${q.level === 'fylke' ? 'fylkesgrensen' : 'kommunegrensen'} enn meg? (${place(q.pos, data.stations)})`
    case 'manual':
      return q.family === 'matching' ? `Har vi samme nærmeste ${q.subject}?` : `Er du nærmere ${q.subject} enn meg?`
    case 'tentacles':
      return `Hvilken av ${poiPlural(q.poiType)} innen ${fmtDist(q.radiusM)} fra meg er du nærmest? (${place(q.pos, data.stations)})`
    case 'photo':
      return `Send et bilde: ${q.text}`
  }
}

const ANSWER_LABELS: Record<string, string> = {
  in: 'Innenfor',
  out: 'Utenfor',
  warmer: 'Varmere',
  colder: 'Kaldere',
  yes: 'Ja',
  no: 'Nei',
  closer: 'Nærmere',
  further: 'Lenger unna',
  outside: 'Utenfor radius',
}
export const answerLabel = (q: Pick<Question, 'kind'> & { poiType?: string }, answer: string) =>
  q.kind === 'photo' ? answer : q.poiType === METRO_LINES && !ANSWER_LABELS[answer] ? `Linje ${answer}` : (ANSWER_LABELS[answer] ?? answer)

/** Svarene hider kan gi. Tom liste = fritekst. */
export function answerOptions(q: Question, data: GeoData): string[] {
  switch (q.kind) {
    case 'radar':
      return ['in', 'out']
    case 'thermometer':
      return ['warmer', 'colder']
    case 'measure':
    case 'border':
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
  const extra = q.kind === 'line' ? `:${q.line}` : q.item === 'r-choose' && q.kind === 'radar' ? `:${q.radiusM}` : ''
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

/** Nøklene til alle spørsmål som alt er stilt, for å merke hva som er brukt. */
export const usedKeys = (log: Question[]) => new Set(log.map(questionKey))

/** Hva hider trekker for et spørsmål. Er det stilt før i loggen, trekker hider to ganger. */
export function drawFor(q: Question, log: Question[]) {
  const { draw, keep } = DRAWS[categoryOf(q)]
  const at = log.findIndex((x) => x.id === q.id)
  const earlier = at === -1 ? log : log.slice(0, at)
  const repeat = earlier.some((x) => questionKey(x) === questionKey(q))
  return { draw, keep, repeat, text: `Hider trekker ${draw}, beholder ${keep}${repeat ? ', to ganger (stilt før)' : ''}` }
}
