import { launch, device, URL_BASE, ignorable } from './env.mjs'

/**
 * Endre reglene midt i runden på én telefon (issue #4). Uten rom er begge sider til stede,
 * så endringen gjøres etter en bekreftelse. Rom-varianten er i rooms.mjs.
 */
let failed = 0
const check = (ok, name) => { console.log(`${ok ? 'OK  ' : 'FEIL'} ${name}`); if (!ok) failed++ }
const browser = await launch()
const ctx = await browser.newContext(device({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }))
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => ignorable(e) || errors.push(e.message))
const dialogs = []
page.on('dialog', (d) => { dialogs.push(d.message()); d.accept() })
await page.addInitScript(() => localStorage.setItem('hideandseek.guide', JSON.stringify({ state: { seen: true }, version: 0 })))
await page.goto(URL_BASE)
await page.waitForFunction(() => !document.querySelector('[data-guide="start-round"]')?.hasAttribute('disabled'), null, { timeout: 15000 })

/** React lytter på input-hendelsen, så verdien settes som om brukeren dro i glidebryteren. */
const slide = (loc, value) =>
  loc.evaluate((el, v) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(v))
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }, value)
const clockMinutes = async () => {
  // «59:59» eller «1:29:59».
  const parts = (await page.getByRole('timer').getAttribute('aria-label')).split(':').map(Number)
  return parts.length === 3 ? parts[0] * 60 + parts[1] : parts[0]
}
const openForm = async () => {
  await page.getByRole('button', { name: 'Verktøy', exact: true }).click()
  const form = page.locator('[data-guide="change-rules"]')
  if (!(await form.evaluate((d) => d.open))) await form.locator(':scope > summary').click()
  return form
}

// Utenfor en runde finnes ikke skjemaet, og oppsettet sier hvor det er.
await page.getByRole('button', { name: /Spillstørrelse, linjer/ }).click()
await page.getByRole('dialog', { name: /Oppsett for/ }).getByRole('button', { name: 'Lukk' }).click()

await page.locator('[data-guide="start-round"]').click()
check((await clockMinutes()) === 59, 'runden er startet med 60 min gjemmetid')

// Gjemmetiden forlenges mens hider gjemmer seg: letingen starter senere.
let form = await openForm()
const send = form.getByRole('button', { name: 'Endre nå' })
check(await send.isDisabled(), 'ingenting å endre før noe er endret')
await form.getByLabel('Ny gjemmetid i minutter').fill('90')
check(await form.getByText('Letingen starter tidligere eller senere').isVisible(), 'i gjemmetiden forklares det at letingen flyttes')
await send.click()
check(dialogs.at(-1)?.includes('gjemmetid 90 min'), `bekreftelsen sier hva som endres (${dialogs.at(-1)})`)
check((await clockMinutes()) === 89, 'klokken viser den nye gjemmetiden')
await page.getByRole('button', { name: 'Spørsmål', exact: true }).click()
check(await page.getByText(/Reglene ble endret kl\. .*: gjemmetid 60 → 90 min/).isVisible(), 'endringen står over loggen')

// Letingen starter, så sonen og spørsmålene endres.
await page.getByRole('button', { name: 'Start letingen' }).click()
form = await openForm()
check(await form.getByText('Letingen har startet, så ny gjemmetid gjelder bare Move').isVisible(), 'etter start forklares det at gjemmetiden bare gjelder Move')
await slide(form.getByLabel('Ny sone i meter'), 1000)
await form.locator('summary', { hasText: /Standard for Medium/ }).click()
const radar = form.locator('fieldset').filter({ has: page.locator('legend', { hasText: 'Radar' }) })
await radar.getByRole('button', { name: 'Ingen' }).click()
check(await form.getByText(/sone 1000 m, \d+ spørsmål med/).isVisible(), 'det som endres, står under knappen')
await form.getByRole('button', { name: 'Endre nå' }).click()
await page.getByRole('button', { name: 'Spørsmål', exact: true }).click()
check(await page.getByText(/sone 400 → 1000 m, spørsmål \d+ → \d+/).isVisible(), 'sone og spørsmål er endret og står i loggen')

// Radar er tatt ut av spillet, så nytt spørsmål kan ikke åpne med Radar.
await page.locator('[data-guide="new-question"]').click()
const q = page.locator('[data-guide="question-form"]')
check(await q.getByRole('button', { name: 'Radar', exact: true }).isDisabled(), 'Radar kan ikke velges når den er tatt ut')
await q.getByRole('button', { name: 'Avbryt' }).click()

// Oppsettet viser det nye, og lagres når siden lastes på nytt.
await page.reload()
await page.getByText(/sone 400 → 1000 m/).waitFor()
check(true, 'endringene huskes etter omlasting')

// Avbrytes runden, finnes endringene i arkivet, og neste runde starter uten dem.
await page.getByRole('button', { name: 'Flere valg' }).click()
await page.getByRole('button', { name: 'Avbryt runden' }).click()
await page.locator('[data-guide="start-round"]').click()
check((await page.getByText(/Reglene ble endret/).count()) === 0, 'neste runde starter uten endringene fra forrige')

check(errors.length === 0, `ingen JS-feil ${errors.join(' | ')}`)
await browser.close()
console.log(failed ? `\n${failed} feilet` : '\nAlt OK')
process.exitCode = failed ? 1 : 0
