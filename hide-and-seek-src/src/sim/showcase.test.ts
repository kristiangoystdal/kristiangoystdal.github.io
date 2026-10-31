import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { CITIES, linesOf, setActiveModes, setCity, type City } from '../cities'
import { loadData } from '../data'
import { clipData, onlyLines, setBounds, solve } from '../geo'
import { DEFAULT_SETTINGS } from '../store'
import { GAME_FILE, SEEDS, seeded, simulateGame, type SimGame } from '../showcase'

/**
 * Simulerte spill: ett per by, som brukeren blar gjennom. De regnes ut på forhånd og ligger i
 * public/data/<by>/game.json, så de åpnes med en gang på telefonen.
 * `npm run sim:games` lager filene på nytt. Ellers sjekker testen at de stemmer med kartdataene.
 */
const WRITE = !!process.env.WRITE_GAMES

const read = (id: string) => async (path: string) => {
  const file = `public/data/${id}/${path}`
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
}

describe('tilfeldige tall med frø', () => {
  it('samme frø gir samme rekke, ulike frø ulike', () => {
    const a = seeded(5)
    const b = seeded(5)
    const c = seeded(6)
    const xs = [a(), a(), a()]
    expect([b(), b(), b()]).toEqual(xs)
    expect(c()).not.toBe(xs[0])
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true)
  })
  it('frø 0 gir ikke bare nuller', () => {
    const z = seeded(0)
    expect(new Set([z(), z(), z()]).size).toBe(3)
  })
})

for (const c of CITIES as City[]) {
  describe(`simulert spill i ${c.name}`, async () => {
    const raw = await loadData(c.id, read(c.id))
    const lines = linesOf(raw, c.defaultModes)
    const settings = { ...DEFAULT_SETTINGS, city: c.id, lines, zoneRadius: 500, size: 'M' as const, playArea: null }
    const data = onlyLines(clipData(raw, null), lines)
    beforeEach(() => {
      setCity(c)
      setBounds(c.bounds)
      setActiveModes(c.defaultModes)
    })

    const file = `public/data/${c.id}/${GAME_FILE}`
    it('hiders stasjon blir aldri utelukket, og kartet krymper for hvert spørsmål', { timeout: 120000 }, () => {
      const t0 = performance.now()
      const sim = simulateGame(data, settings, SEEDS[c.id])
      const ms = performance.now() - t0
      if (WRITE) writeFileSync(file, JSON.stringify(sim))
      expect(sim.questions.length).toBeGreaterThanOrEqual(5)
      expect(sim.questions.length).toBe(sim.positions.length)
      expect(sim.left.length).toBe(sim.questions.length)
      for (let i = 0; i < sim.questions.length; i++) {
        const res = solve(sim.questions.slice(0, i + 1), data, settings)
        expect(res.stations.map((s) => s.id)).toContain(sim.hider.stationId)
        expect(res.stations.length).toBe(sim.left[i])
        if (i > 0) expect(sim.left[i]).toBeLessThan(sim.left[i - 1])
      }
      // Seekerne kommer langt: til slutt er det få stasjoner igjen.
      expect(sim.left.at(-1)!).toBeLessThanOrEqual(Math.max(5, sim.total / 20))
      // Spørsmålene ligger i rekkefølge etter at runden startet, og alle er besvart.
      expect(sim.questions.every((q, i) => q.answer !== null && q.time > sim.seekFrom && (i === 0 || q.time > sim.questions[i - 1].time))).toBe(true)
      // Spillet regnes ut på forhånd, men en ny by skal ikke gjøre det uutholdelig tregt.
      expect(ms).toBeLessThan(60000)
      console.log(`${c.name}: hider ved ${sim.hider.name}, start ${sim.start}, ${sim.questions.length} spørsmål, ${sim.total} → ${sim.left.join(' → ')} stasjoner, ${Math.round(ms)} ms, typer: ${sim.questions.map((q) => q.kind).join(', ')}`)
    })

    it('det lagrede spillet stemmer med kartdataene (ellers: npm run sim:games)', { timeout: 120000 }, () => {
      expect(existsSync(file), `${file} mangler. Kjør npm run sim:games`).toBe(true)
      const saved = JSON.parse(readFileSync(file, 'utf8')) as SimGame
      const fresh = simulateGame(data, settings, SEEDS[c.id])
      expect(saved, 'Spillet er laget med eldre kartdata. Kjør npm run sim:games').toEqual(JSON.parse(JSON.stringify(fresh)))
    })
  })
}
