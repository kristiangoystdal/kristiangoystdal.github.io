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
