import { launch, device, URL_BASE, TARGET } from './env.mjs'
import { ignorable } from './env.mjs'
let failed = 0
const check = (ok, name) => { console.log(`${ok ? 'OK  ' : 'FEIL'} ${name}`); if (!ok) failed++ }
const browser = await launch()
const ctx = await browser.newContext(device({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', permissions: ['geolocation'], geolocation: { latitude: 63.43, longitude: 10.39, accuracy: 10 } }))
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => ignorable(e) || errors.push(e.message))
page.on('dialog', (d) => d.accept())
await page.addInitScript(() => localStorage.setItem('hideandseek.guide', JSON.stringify({ state: { seen: true }, version: 0 })))
await page.goto(URL_BASE)
await page.waitForSelector('aside')
// Et ekte spill med et halvferdig spørsmål åpent
await page.locator('[data-guide="start-round"]').click()
await page.getByRole('button', { name: 'Start letingen' }).click()
await page.locator('[data-guide="new-question"]').click()
await page.waitForTimeout(1500)
check((await page.getByText('Seeker', { exact: true }).count()) >= 1, 'før reprisen: det halvferdige spørsmålet har en «Seeker»-nål')
await page.getByRole('button', { name: 'Lær appen' }).click().catch(async () => {
  // På spillskjermen ligger Lær appen under Verktøy → Hjelp
  await page.locator('[data-guide="tab-tools"]').click()
  await page.getByRole('button', { name: /Hjelp og innstillinger/ }).click()
})
const learnBtn = page.getByRole('button', { name: 'Trondheim', exact: true })
await learnBtn.click()
const sc = page.getByRole('dialog', { name: 'Simulert spill' })
await sc.getByRole('button', { name: /^Neste/ }).waitFor({ timeout: 20000 })
await page.waitForTimeout(800)
check(!(await page.locator('aside').isVisible()), 'i reprisen: panelet er helt skjult')
check(!(await page.locator('[data-guide="panel-handle"]').isVisible()), 'i reprisen: ingen strek å dra panelet opp med')
check(!(await page.locator('[data-guide="tab-questions"]').isVisible()), 'i reprisen: ingen faner')
check((await page.getByText('Seeker', { exact: true }).count()) === 0, 'i reprisen: ingen gammel «Seeker»-nål fra det ekte spillet')
const sim = await page.evaluate(async () => (await fetch('data/trondheim/game.json')).json())
const total = await sc.getByRole('tab').count()
let wrong = []
let labels = []
for (let k = 0; k < total; k++) {
  await page.waitForTimeout(500)
  const pos = await page.evaluate(() => JSON.parse(localStorage.getItem('hideandseek.test')).state.pos)
  const n = sim.questions.length
  const q = k >= 1 && k <= n ? sim.questions[k - 1] : null
  const expect = k === 0 ? sim.positions[0] : k > n ? sim.hider.pos : q.kind === 'thermometer' ? q.to : sim.positions[k - 1]
  if (!pos || Math.abs(pos[0] - expect[0]) > 1e-9 || Math.abs(pos[1] - expect[1]) > 1e-9) wrong.push(k)
  labels.push(await page.getByText('Seekerne', { exact: true }).count())
  if (k < total - 1) await sc.getByRole('button', { name: /^Neste/ }).click()
}
check(wrong.length === 0, `seekerne står riktig sted i alle ${total} steg, også etter termometer${wrong.length ? ` (feil i steg ${wrong.join(', ')})` : ''}`)
check(labels.every((c) => c === 1), `nøyaktig én «Seekerne»-prikk i hvert steg (${labels.join(',')})`)
await sc.getByRole('button', { name: 'Ferdig' }).click()
await page.waitForTimeout(1200)
check((await page.getByText('Seekerne', { exact: true }).count()) === 0, 'etter reprisen: ingen seeker-prikk blir stående')
check(await page.locator('aside').isVisible(), 'etter reprisen: panelet er tilbake')
check(errors.length === 0, `ingen JS-feil ${errors.join(' | ')}`)
await browser.close()
console.log(failed ? `\n${failed} feilet` : '\nAlt OK')
process.exitCode = failed ? 1 : 0
