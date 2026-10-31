import { launch, device, URL_BASE, ignorable } from './env.mjs'

/**
 * Delte oppsett mot Firebase-emulatoren (npm run e2e:firebase). Hver kontekst er en egen telefon
 * med sin egen anonyme konto.
 */
// Starter med tom database. Emulatoren lar «owner» gjøre alt, uten regler.
await fetch('http://127.0.0.1:9000/.json?ns=demo-hide-and-seek-default-rtdb', { method: 'DELETE', headers: { Authorization: 'Bearer owner' } })

let failed = 0
const check = (ok, name) => { console.log(`${ok ? 'OK  ' : 'FEIL'} ${name}`); if (!ok) failed++ }
const browser = await launch()
const errors = []
async function phone() {
  const ctx = await browser.newContext(device({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }))
  const page = await ctx.newPage()
  page.on('pageerror', (e) => ignorable(e) || errors.push(e.message))
  page.on('dialog', (d) => d.accept())
  await page.addInitScript(() => localStorage.getItem('hideandseek.guide') || localStorage.setItem('hideandseek.guide', JSON.stringify({ state: { seen: true }, version: 0 })))
  await page.goto(URL_BASE)
  await page.waitForFunction(() => !document.body.innerText.includes('Laster kartdata'), null, { timeout: 30000 })
  return page
}
const openList = async (page) => {
  await page.getByRole('button', { name: /Spillstørrelse, linjer/ }).click()
  await page.locator('[data-guide="presets-entry"]').click()
  await page.getByRole('dialog', { name: /Ferdige oppsett for/ }).waitFor()
  // Arket får navnet til oppsettet når et oppsett åpnes, så det finnes på at det er et ark.
  const sheet = page.locator('[role="dialog"][aria-modal]')
  await page.waitForFunction(() => !document.body.innerText.includes('Henter oppsett'), null, { timeout: 20000 })
  return sheet
}
const share = async (page, name, description = '') => {
  await page.getByRole('button', { name: /Spillstørrelse, linjer/ }).click()
  const rules = page.getByRole('dialog', { name: /Oppsett for/ })
  await rules.getByLabel('Navn på oppsettet').fill(name)
  if (description) await rules.getByLabel('Beskrivelse').fill(description)
  await rules.getByRole('button', { name: 'Del med alle' }).click()
  const result = await Promise.race([
    rules.getByText(`«${name}» er delt med alle.`).waitFor({ timeout: 15000 }).then(() => 'ok'),
    rules.locator('p.text-bad').first().waitFor({ timeout: 15000 }).then(async () => await rules.locator('p.text-bad').first().textContent()),
  ])
  await rules.getByRole('button', { name: 'Lukk' }).click()
  return result
}
const close = (page) => page.getByRole('button', { name: 'Lukk' }).first().click()

// 1. Telefon 1 deler et oppsett med sone 750 m og 45 min gjemmetid.
const a = await phone()
let sheet = await openList(a)
check(await sheet.getByText(/Ingen har delt oppsett for Oslo ennå/).isVisible(), 'tom liste sier at ingen har delt noe ennå')
await close(a)
await a.getByRole('radio', { name: '45 min' }).click()
await a.getByRole('button', { name: /Spillstørrelse, linjer/ }).click()
await a.getByLabel('Sonestørrelse i meter').fill('750')
await a.getByRole('button', { name: 'Lukk' }).first().click()
check((await share(a, 'Testrunde sentrum', 'Kort runde for testing')) === 'ok', 'telefon 1 deler et oppsett')

// 2. Telefon 2 ser det, åpner detaljene og bruker det.
const b = await phone()
sheet = await openList(b)
const row = sheet.getByRole('button', { name: /Testrunde sentrum/ })
check(await row.isVisible(), 'telefon 2 ser oppsettet i oversikten')
check((await row.textContent()).includes('Kort runde for testing'), 'beskrivelsen vises i listen')
await row.click()
check((await sheet.locator('svg[role=img]').count()) === 1, 'detaljene viser kartet over oppsettet')
check(await sheet.getByRole('button', { name: /Rapporter/ }).isVisible() && !(await sheet.getByRole('button', { name: 'Slett' }).count()), 'telefon 2 kan rapportere, men ikke slette')
await sheet.getByRole('button', { name: 'Bruk dette oppsettet' }).click()
const bs = await b.evaluate(() => JSON.parse(localStorage.getItem('hideandseek.v1')).state)
check(bs.settings.zoneRadius === 750 && bs.round.hidingMinutes === 45, 'oppsettet er brukt: sone 750 m og 45 min')
await b.locator('[data-guide="start-round"]').click()
await b.waitForTimeout(2500)

// 3. Telefon 1 ser at det er brukt én gang, og kan endre det.
sheet = await openList(a)
check((await sheet.getByRole('button', { name: /Testrunde sentrum/ }).textContent()).includes('brukt 1 gang'), 'å starte en runde med oppsettet telles som brukt')
await sheet.getByRole('button', { name: /Testrunde sentrum/ }).click()
check(await sheet.getByText('Ditt oppsett').isVisible(), 'eieren ser at det er sitt eget')
await sheet.getByRole('button', { name: 'Endre' }).click()
await sheet.getByLabel('Navn').fill('Testrunde sentrum v2')
await sheet.getByRole('button', { name: /Lagre endringen/ }).click()
await sheet.getByRole('heading', { name: 'Testrunde sentrum v2' }).waitFor({ timeout: 10000 })
check(true, 'eieren endrer navnet')
await close(a)

// 4. Lenken åpner oppsettet rett i detaljene.
const id = await a.evaluate(() => JSON.parse(localStorage.getItem('hideandseek.presets')).state.applied?.id)
const c = await phone()
await c.goto(URL_BASE.replace(/\/$/, '/') + '#oppsett=' + id)
await c.getByRole('dialog', { name: 'Testrunde sentrum v2' }).waitFor({ timeout: 20000 }).then(() => check(true, 'lenken åpner oppsettet'), () => check(false, 'lenken åpner oppsettet'))

// 5. Tre telefoner rapporterer. Da skjules det for andre, men ikke for eieren.
await c.close()
for (let i = 0; i < 3; i++) {
  const page = await phone()
  const s = await openList(page)
  const r = s.getByRole('button', { name: /Testrunde sentrum v2/ })
  if (await r.count()) {
    await r.click()
    await s.getByRole('button', { name: /Rapporter/ }).click()
    await s.getByText('Du har rapportert dette oppsettet.').waitFor({ timeout: 10000 })
  }
  await close(page)
}
const d = await phone()
sheet = await openList(d)
check(!(await sheet.getByRole('button', { name: /Testrunde sentrum v2/ }).count()), 'rapportert av tre telefoner: skjult for andre')
await close(d)
sheet = await openList(a)
check(await sheet.getByRole('button', { name: /Testrunde sentrum v2/ }).isVisible(), 'eieren ser fortsatt sitt eget')

// 6. Eieren sletter det.
await sheet.getByRole('button', { name: /Testrunde sentrum v2/ }).click()
await sheet.getByRole('button', { name: 'Slett' }).click()
await sheet.getByText(/Ingen har delt oppsett/).waitFor({ timeout: 10000 }).then(() => check(true, 'eieren sletter oppsettet'), () => check(false, 'eieren sletter oppsettet'))
await close(a)

// 7. Hver telefon kan dele maks 10.
let last = ''
for (let i = 1; i <= 11; i++) last = await share(a, `Grense ${i}`)
check(/Du har delt 10 oppsett/.test(last), `det ellevte blir avvist (${last})`)

check(errors.length === 0, `ingen JS-feil ${errors.join(' | ')}`)
await browser.close()
console.log(failed ? `\n${failed} feilet` : '\nAlt OK')
process.exitCode = failed ? 1 : 0
