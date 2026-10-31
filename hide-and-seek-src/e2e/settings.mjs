import { launch, device, URL_BASE, TARGET } from './env.mjs'
let failed = 0
const check = (ok, name) => { console.log(`${ok ? 'OK  ' : 'FEIL'} ${name}`); if (!ok) failed++ }
const browser = await launch()
const ctx = await browser.newContext(device({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }))
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
// Kartdataene (utenom stasjoner og linjer) kommer sent, så arket åpnes mens de lastes.
await page.route('**/data/oslo/{admin,coast,water,riks}.geojson', async (r) => { await new Promise((ok) => setTimeout(ok, 3000)); await r.continue() })
await page.goto(URL_BASE)
await page.waitForSelector('aside')
const t0 = Date.now()
await page.getByRole('button', { name: 'Innstillinger' }).click()
const sheet = page.getByRole('dialog', { name: 'Innstillinger og hjelp' })
await sheet.waitFor()
check(Date.now() - t0 < 1500, `arket åpnes med en gang (${Date.now() - t0} ms)`)
check(await sheet.getByRole('radio', { name: 'Mørk' }).isVisible() || (await sheet.getByRole('radio', { name: 'Mørk' }).count()) > 0, 'temavalget kan brukes med en gang')
await sheet.locator('summary', { hasText: /stasjoner/ }).waitFor({ timeout: 5000 })
const kart = sheet.locator('details').filter({ has: page.locator('summary', { hasText: /stasjoner/ }) })
check(await kart.evaluate((d) => !d.open), 'kartdataene er en lukket linje som ikke tar plass')
await sheet.locator('summary', { hasText: /stasjoner/ }).click()
const early = await sheet.getByText(/^Områder:/).locator('..').textContent()
check(/bydel lastes/.test(early), `før resten av kartdataene er lastet står det «lastes» (${early.slice(0, 50)})`)
await page.waitForFunction(() => /bydel \d+/.test(document.querySelector('[role=dialog] details')?.textContent ?? ''), null, { timeout: 15000 })
const late = await kart.textContent()
check(/bydel \d+/.test(late), `tallene oppdateres av seg selv når kartdataene er lastet (${late.match(/bydel \d+/)?.[0]})`)
check((await sheet.getByText('Hva appen lagrer, og hvor lenge').count()) === 1, 'personvern ligger i innstillingene')
check(errors.length === 0, `ingen JS-feil ${errors.join(' | ')}`)
await browser.close()
console.log(failed ? `\n${failed} feilet` : '\nAlt OK')
process.exitCode = failed ? 1 : 0
