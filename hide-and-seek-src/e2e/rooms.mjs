import { launch, device, URL_BASE, ignorable } from './env.mjs'

/**
 * En norsk og en engelsk telefon i samme rom, mot Firebase-emulatoren (npm run e2e:firebase).
 * Det som lagres i rommet, er likt på alle språk, så hver telefon viser spørsmål og svar på sitt eget.
 */
let failed = 0
const check = (ok, name) => { console.log(`${ok ? 'OK  ' : 'FEIL'} ${name}`); if (!ok) failed++ }
const browser = await launch()
const errors = []
async function phone(locale) {
  const ctx = await browser.newContext(device({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', locale }))
  const page = await ctx.newPage()
  page.on('pageerror', (e) => ignorable(e) || errors.push(e.message))
  page.on('dialog', (d) => d.accept())
  await page.addInitScript(() => localStorage.getItem('hideandseek.guide') || localStorage.setItem('hideandseek.guide', JSON.stringify({ state: { seen: true }, version: 0 })))
  await page.goto(URL_BASE)
  await page.waitForFunction(() => !document.querySelector('[data-guide="start-round"]')?.hasAttribute('disabled'), null, { timeout: 30000 })
  return page
}

// Den norske telefonen leter og lager rommet.
const nb = await phone('nb-NO')
await nb.getByLabel('Ny spiller').fill('Kari')
await nb.getByRole('button', { name: 'Legg til', exact: true }).click()
await nb.locator('[data-guide="create-room"]').click()
const tiles = nb.getByLabel(/^Romkode /)
await tiles.waitFor({ timeout: 20000 })
const code = (await tiles.getAttribute('aria-label')).replace('Romkode ', '').replaceAll(' ', '')
check(/^[A-Z0-9]{6}$/.test(code), `rommet er laget (${code})`)

// Den engelske telefonen blir med og gjemmer seg.
const en = await phone('en-US')
await en.getByLabel('Room code').fill(code)
await en.getByRole('button', { name: 'Join', exact: true }).click()
await en.getByText('● Connected').waitFor({ timeout: 20000 })
// «Tilkoblet» kommer før rommets innhold, så det ventes på spillerne.
await en.getByRole('radio', { name: /Kari/ }).waitFor({ timeout: 20000 })
check(true, 'engelsk telefon: spillerne fra rommet er kommet')
await en.getByRole('radio', { name: /Hiding/ }).click()

// Runden startes på den norske telefonen.
await nb.locator('[data-guide="start-round"]').click()
await nb.getByRole('button', { name: 'Start letingen' }).click()
await en.getByRole('button', { name: 'Hider found' }).waitFor({ timeout: 20000 })
check(true, 'engelsk telefon: runden og letingen startet fra den norske')

// Et bildespørsmål fra den norske telefonen.
await nb.locator('[data-guide="new-question"]').click()
const form = nb.locator('[data-guide="question-form"]')
await form.getByRole('button', { name: 'Photos', exact: true }).click()
await form.getByRole('radio', { name: 'Et tre' }).click()
await form.getByRole('button', { name: 'Still spørsmål' }).click()
await nb.getByText('Venter på svar').waitFor()

// Hider ser det på engelsk og svarer.
await en.getByText('Send a photo: A tree').waitFor({ timeout: 20000 })
check(true, 'engelsk telefon: spørsmålet fra den norske telefonen står på engelsk')
check(await en.getByText(/The whole tree must be in the picture/).isVisible(), 'engelsk telefon: kravet til bildet står på engelsk')
await en.getByRole('button', { name: 'Photo sent' }).click()
await en.getByText('You answered:').waitFor()
check(await en.locator('b', { hasText: 'Photo sent' }).first().isVisible(), 'engelsk telefon: svaret står på engelsk')

// Seekerne ser svaret på norsk.
await nb.getByText('Send et bilde: Et tre').waitFor()
await nb.locator('span', { hasText: /^Bilde sendt$/ }).first().waitFor({ timeout: 20000 })
check(true, 'norsk telefon: spørsmålet og svaret står på norsk')
check((await nb.getByText('Photo sent').count()) === 0, 'norsk telefon: ingen engelsk tekst fra den andre telefonen')

// Et spørsmål med fritt emne fra regelboklisten (høyhastighetsbane) virker også på tvers.
await nb.locator('[data-guide="new-question"]').click()
await form.getByRole('button', { name: 'Measuring', exact: true }).click()
await form.getByRole('radio', { name: 'Høyhastighetsbane' }).click()
await form.getByLabel(/Seekers posisjon: velg stasjon/).selectOption({ label: 'Jernbanetorget' })
await form.getByRole('button', { name: 'Still spørsmål' }).click()
await en.getByText(/Are you closer to high-speed rail than me\? \(Jernbanetorget\)/).waitFor({ timeout: 20000 })
check(true, 'engelsk telefon: emnet står på engelsk, stasjonsnavnet på norsk')

// Endre reglene midt i runden: seekeren foreslår, hider må si ja.
const slide = (loc, value) =>
  loc.evaluate((el, v) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(v))
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }, value)
const openForm = async (page, tools) => {
  await page.getByRole('button', { name: tools, exact: true }).click()
  const box = page.locator('[data-guide="change-rules"]')
  if (!(await box.evaluate((d) => d.open))) await box.locator(':scope > summary').click()
  return box
}
let box = await openForm(nb, 'Verktøy')
await slide(box.getByLabel('Ny sone i meter'), 600)
await box.getByRole('button', { name: 'Foreslå endringen' }).click()
await nb.getByText('Venter på at hider sier ja.').waitFor()
check(true, 'norsk seeker: forslaget venter på hider')
const banner = en.locator('[data-guide="proposal"]')
await banner.getByText('zone 600 m').waitFor({ timeout: 20000 })
check(true, 'engelsk hider: forslaget vises på engelsk')
await banner.getByRole('button', { name: 'Accept' }).click()
await en.getByText(/Rules changed at .*: zone 400 → 600 m/).waitFor({ timeout: 20000 })
check(true, 'engelsk hider: endringen gjelder og står i loggen')
await nb.getByRole('button', { name: /^Spørsmål/ }).click()
await nb.getByText(/Reglene ble endret kl\. .*: sone 400 → 600 m/).waitFor({ timeout: 20000 })
check((await nb.locator('[data-guide="proposal"]').count()) === 0, 'norsk seeker: sonen er endret, og forslaget er borte')

// Hider foreslår kortere gjemmetid, og seekeren sier nei.
box = await openForm(en, 'Tools')
await box.getByLabel('New hiding time in minutes').fill('45')
await box.getByRole('button', { name: 'Propose the change' }).click()
const nbBanner = nb.locator('[data-guide="proposal"]')
await nbBanner.getByText('gjemmetid 45 min').waitFor({ timeout: 20000 })
await nbBanner.getByRole('button', { name: 'Avslå' }).click()
await en.getByText('The proposal was declined').waitFor({ timeout: 20000 })
check(true, 'engelsk hider: får beskjed om at forslaget ble avslått')
check((await en.locator('[data-guide="proposal"]').count()) === 0, 'engelsk hider: forslaget er borte')
check((await en.getByText(/hiding time 60 → 45/).count()) === 0, 'gjemmetiden er ikke endret')

check(errors.length === 0, `ingen JS-feil ${errors.join(' | ')}`)
await browser.close()
console.log(failed ? `\n${failed} feilet` : '\nAlt OK')
process.exitCode = failed ? 1 : 0
