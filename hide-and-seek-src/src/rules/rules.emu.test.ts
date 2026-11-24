import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { get, ref, remove, runTransaction, set, update } from 'firebase/database'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

/**
 * Databasereglene, testet mot Firebase-emulatoren. Kjøres med `npm run test:rules`
 * (starter emulatoren selv). Ingenting her rører den ekte databasen.
 */
let env: RulesTestEnvironment
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-hide-and-seek',
    database: { host: '127.0.0.1', port: 9000, rules: readFileSync('database.rules.json', 'utf8') },
  })
})
afterAll(() => env.cleanup())
beforeEach(() => env.clearDatabase())

const ada = () => env.authenticatedContext('ada').database()
const bo = () => env.authenticatedContext('bo').database()
const nobody = () => env.unauthenticatedContext().database()
const preset = (owner: string, extra: Record<string, unknown> = {}) => ({ owner, name: 'Kort runde i sentrum', city: 'oslo', setup: '{"size":"M"}', hidingMinutes: 45, created: 1, ...extra })

describe('rom', () => {
  it('kan leses av alle som kjenner koden, men bare skrives av innloggede', async () => {
    await assertFails(set(ref(nobody(), 'rooms/ABC123/created'), 1))
    await assertSucceeds(set(ref(ada(), 'rooms/ABC123/created'), 1))
    await assertSucceeds(get(ref(nobody(), 'rooms/ABC123')))
  })
  it('felt som ikke finnes, avvises, også posisjoner som ikke deles lenger', async () => {
    await assertFails(set(ref(ada(), 'rooms/ABC123/seekers/x'), '{}'))
    await assertFails(set(ref(ada(), 'rooms/ABC123/tull'), 'x'))
  })
  it('forslag om å endre reglene kan lagres og slettes, men ikke være for store', async () => {
    await assertSucceeds(set(ref(ada(), 'rooms/ABC123/proposal'), JSON.stringify({ id: 'p1', change: { zoneRadius: 600 } })))
    await assertSucceeds(remove(ref(bo(), 'rooms/ABC123/proposal')))
    await assertFails(set(ref(ada(), 'rooms/ABC123/proposal'), 'x'.repeat(5000)))
    await assertFails(set(ref(nobody(), 'rooms/ABC123/proposal'), '{}'))
  })
  it('ugyldige romkoder avvises', async () => {
    await assertFails(set(ref(ada(), 'rooms/abc/created'), 1))
  })
  it('alle rom kan ikke listes', async () => {
    await assertFails(get(ref(ada(), 'rooms')))
  })
})

describe('delte oppsett', () => {
  it('kan lages av innloggede med seg selv som eier', async () => {
    await assertSucceeds(set(ref(ada(), 'presets/abcd1234'), preset('ada')))
    await assertFails(set(ref(nobody(), 'presets/abcd5678'), preset('ada')))
  })
  it('kan ikke lages i noen andres navn', async () => {
    await assertFails(set(ref(ada(), 'presets/abcd1234'), preset('bo')))
  })
  it('alle kan lese listen', async () => {
    await env.withSecurityRulesDisabled((c) => set(ref(c.database(), 'presets/abcd1234'), preset('ada')))
    await assertSucceeds(get(ref(nobody(), 'presets')))
  })
  it('bare eieren kan endre og slette', async () => {
    await env.withSecurityRulesDisabled((c) => set(ref(c.database(), 'presets/abcd1234'), preset('ada')))
    await assertFails(update(ref(bo(), 'presets/abcd1234'), { name: 'Kapret' }))
    await assertFails(remove(ref(bo(), 'presets/abcd1234')))
    await assertSucceeds(update(ref(ada(), 'presets/abcd1234'), { name: 'Nytt navn', updated: 2 }))
    await assertSucceeds(remove(ref(ada(), 'presets/abcd1234')))
  })
  it('eieren kan ikke byttes eller tidspunktet for når det ble laget', async () => {
    await env.withSecurityRulesDisabled((c) => set(ref(c.database(), 'presets/abcd1234'), preset('ada')))
    await assertFails(update(ref(ada(), 'presets/abcd1234'), { owner: 'bo' }))
    await assertFails(update(ref(ada(), 'presets/abcd1234'), { created: 99 }))
  })
  it('felt som mangler, er for lange eller ikke finnes, avvises', async () => {
    const { name: _n, ...noName } = preset('ada')
    await assertFails(set(ref(ada(), 'presets/abcd1234'), noName))
    await assertFails(set(ref(ada(), 'presets/abcd1234'), preset('ada', { name: 'x'.repeat(41) })))
    await assertFails(set(ref(ada(), 'presets/abcd1234'), preset('ada', { description: 'x'.repeat(201) })))
    await assertFails(set(ref(ada(), 'presets/abcd1234'), preset('ada', { tull: 1 })))
    await assertFails(set(ref(ada(), 'presets/ABCD1234'), preset('ada')))
  })
  it('alle innloggede kan telle bruk, men bare én om gangen', async () => {
    await env.withSecurityRulesDisabled((c) => set(ref(c.database(), 'presets/abcd1234'), preset('ada')))
    await assertSucceeds(runTransaction(ref(bo(), 'presets/abcd1234/uses'), (n) => (n ?? 0) + 1))
    await assertSucceeds(runTransaction(ref(ada(), 'presets/abcd1234/uses'), (n) => (n ?? 0) + 1))
    await assertFails(set(ref(bo(), 'presets/abcd1234/uses'), 100))
    await assertFails(set(ref(nobody(), 'presets/abcd1234/uses'), 3))
    await assertFails(set(ref(bo(), 'presets/finnesikke/uses'), 1))
  })
  it('hver telefon kan rapportere én gang, i sitt eget navn', async () => {
    await env.withSecurityRulesDisabled((c) => set(ref(c.database(), 'presets/abcd1234'), preset('ada')))
    await assertSucceeds(set(ref(bo(), 'presets/abcd1234/reports/bo'), true))
    await assertFails(set(ref(bo(), 'presets/abcd1234/reports/cy'), true))
    await assertFails(set(ref(bo(), 'presets/abcd1234/reports/bo'), 'spam'))
    await assertFails(set(ref(nobody(), 'presets/abcd1234/reports/x'), true))
  })
})

/**
 * Rangeringshatten (../rangeringshatten) deler databasen. Rommene ligger i rangeringshatten/<KODE>.
 * Mac-en som laget rommet (host) styrer spillet, hver telefon skriver bare sitt eget navn og sin egen liste.
 * Står i samme fil fordi testfilene ellers tømmer databasen for hverandre.
 */
const mac = () => env.authenticatedContext('mac').database()
const R = 'rangeringshatten/K7QM'
const newRoom = (host = 'mac') => ({ host, created: 1, state: '{"phase":"lobby"}' })
const seed = () => env.withSecurityRulesDisabled((c) => set(ref(c.database(), R), newRoom()))

describe('rangeringshatten', () => {
  it('innloggede kan lage et rom med seg selv som vert', async () => {
    await assertSucceeds(set(ref(mac(), R), newRoom()))
    await assertFails(set(ref(nobody(), 'rangeringshatten/K7QN'), newRoom()))
    await assertFails(set(ref(ada(), 'rangeringshatten/K7QP'), newRoom('mac')))
    await assertFails(set(ref(ada(), 'rangeringshatten/K7QR'), { host: 'ada', created: 1 }))
  })

  it('koden må ha fire tegn uten de som er lette å forveksle', async () => {
    await assertFails(set(ref(mac(), 'rangeringshatten/K7Q0'), newRoom()))
    await assertFails(set(ref(mac(), 'rangeringshatten/k7qm'), newRoom()))
    await assertFails(set(ref(mac(), 'rangeringshatten/K7QMX'), newRoom()))
  })

  it('bare verten endrer spillet og kan slette rommet', async () => {
    await seed()
    await assertSucceeds(set(ref(mac(), `${R}/state`), '{"phase":"rank"}'))
    await assertFails(set(ref(ada(), `${R}/state`), '{"phase":"final"}'))
    await assertFails(set(ref(ada(), R), newRoom('ada')))
    await assertFails(remove(ref(ada(), R)))
    await assertSucceeds(remove(ref(mac(), R)))
  })

  it('en spiller skriver bare sitt eget navn og sin egen liste', async () => {
    await seed()
    await assertSucceeds(set(ref(ada(), `${R}/players/ada`), '{"name":"Ada","at":1}'))
    await assertFails(set(ref(ada(), `${R}/players/bo`), '{"name":"Bo","at":1}'))
    await assertSucceeds(set(ref(ada(), `${R}/rankings/r0/ada`), '[0,1,2,3,4,5,6,7]'))
    await assertFails(set(ref(bo(), `${R}/rankings/r0/ada`), '[7,6,5,4,3,2,1,0]'))
    await assertFails(set(ref(ada(), `${R}/rankings/x0/ada`), '[0,1,2,3,4,5,6,7]'))
    await assertSucceeds(set(ref(ada(), `${R}/rankings/r142/ada`), '[0,1,2,3,4,5,6,7]'))
    await assertFails(set(ref(ada(), `${R}/rankings/r1000/ada`), '[0,1,2,3,4,5,6,7]'))
    await assertSucceeds(remove(ref(ada(), `${R}/rankings/r0/ada`)))
    await assertSucceeds(remove(ref(mac(), `${R}/players/ada`)))
  })

  it('ingen kan skrive i et rom som ikke finnes, eller legge til andre felt', async () => {
    await assertFails(set(ref(ada(), `${R}/players/ada`), '{"name":"Ada"}'))
    await seed()
    await assertFails(set(ref(mac(), `${R}/tull`), 'x'))
    await assertFails(set(ref(ada(), `${R}/players/ada`), 'x'.repeat(400)))
  })

  it('alle kan lese et rom med koden, men ingen kan liste rommene', async () => {
    await seed()
    await assertSucceeds(get(ref(nobody(), R)))
    await assertFails(get(ref(ada(), 'rangeringshatten')))
  })
})

/**
 * The Hollow Bell (../hollow-bell-src) shares the database. The PC writes the room in hollowbell/<CODE>,
 * the phone remote only writes hollowbell/<CODE>/input.
 */
const HB = 'hollowbell/K7QM2P'
const hbRoom = (host: string) => ({ host, created: 1, state: '{"rev":1}' })
const hbInput = (from: string, extra: Record<string, unknown> = {}) => ({ choiceId: '2', rev: 1, from, at: 1, ...extra })

describe('hollowbell', () => {
  it('the PC creates and owns its room', async () => {
    await assertFails(set(ref(nobody(), HB), hbRoom('ada')))
    await assertFails(set(ref(ada(), HB), hbRoom('bo')))
    await assertSucceeds(set(ref(ada(), HB), hbRoom('ada')))
    await assertFails(set(ref(bo(), HB + '/state'), '{}'))
    await assertSucceeds(set(ref(ada(), HB + '/state'), '{"rev":2}'))
    await assertFails(set(ref(ada(), 'hollowbell/abc'), hbRoom('ada')))
  })
  it('a phone can only write input, as itself, in a room that exists', async () => {
    await assertFails(set(ref(bo(), HB + '/input'), hbInput('bo')))
    await set(ref(ada(), HB), hbRoom('ada'))
    await assertSucceeds(set(ref(bo(), HB + '/input'), hbInput('bo')))
    await assertFails(set(ref(bo(), HB + '/input'), hbInput('ada')))
    await assertFails(set(ref(bo(), HB + '/input'), hbInput('bo', { extra: 1 })))
    await assertFails(set(ref(bo(), HB + '/input'), hbInput('bo', { choiceId: 'x'.repeat(40) })))
    await assertFails(set(ref(nobody(), HB + '/input'), hbInput('bo')))
  })
  it('only signed-in users can read a room, and rooms cannot be listed', async () => {
    await set(ref(ada(), HB), hbRoom('ada'))
    await assertSucceeds(get(ref(bo(), HB)))
    await assertFails(get(ref(nobody(), HB)))
    await assertFails(get(ref(ada(), 'hollowbell')))
  })
  it('the host can remove the room when the game closes', async () => {
    await set(ref(ada(), HB), hbRoom('ada'))
    await assertFails(remove(ref(bo(), HB)))
    await assertSucceeds(remove(ref(ada(), HB)))
  })
})

describe('hollowbell, two players', () => {
  // ada is the PC (owns the room and may manage it), bo and cy are phones
  const cy = () => env.authenticatedContext('cy').database();
  const seat = (who: string) => `${HB}/players/${who}`;
  it('each phone claims one seat for itself, and cannot take a seat that is taken', async () => {
    await assertFails(set(ref(bo(), seat('ingerid')), 'bo'));
    await set(ref(ada(), HB), hbRoom('ada'));
    await assertSucceeds(set(ref(bo(), seat('ingerid')), 'bo'));
    await assertFails(set(ref(nobody(), seat('kristian')), 'x'));
    await assertFails(set(ref(cy(), seat('ingerid')), 'cy'));
    await assertFails(set(ref(bo(), seat('kristian')), 'ada'));
    await assertSucceeds(set(ref(cy(), seat('kristian')), 'cy'));
    await assertFails(set(ref(bo(), `${HB}/players/someone`), 'bo'));
  });
  it('only the seat holder can send that seat\'s setup and choices', async () => {
    await set(ref(ada(), HB), hbRoom('ada'));
    await set(ref(bo(), seat('ingerid')), 'bo');
    await assertSucceeds(set(ref(bo(), `${HB}/setup/ingerid`), '{"house":"Ravenclaw"}'));
    await assertFails(set(ref(cy(), `${HB}/setup/ingerid`), '{}'));
    await assertFails(set(ref(bo(), `${HB}/setup/kristian`), '{}'));
    await assertFails(set(ref(bo(), `${HB}/setup/ingerid`), 'x'.repeat(400)));
    await assertSucceeds(set(ref(bo(), `${HB}/inputs/ingerid`), hbInput('bo')));
    await assertFails(set(ref(cy(), `${HB}/inputs/ingerid`), hbInput('cy')));
    await assertFails(set(ref(bo(), `${HB}/inputs/kristian`), hbInput('bo')));
    await assertFails(set(ref(bo(), `${HB}/inputs/ingerid`), hbInput('bo', { extra: 1 })));
  });
  it('the host can clear the room with all seats', async () => {
    await set(ref(ada(), HB), hbRoom('ada'));
    await set(ref(bo(), seat('ingerid')), 'bo');
    await assertSucceeds(remove(ref(ada(), HB)));
  });
});
