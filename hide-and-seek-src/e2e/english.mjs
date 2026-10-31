import { launch, device, URL_BASE } from './env.mjs'
import { ignorable } from './env.mjs'

// Språket: følger telefonen, kan byttes i innstillingene og huskes. På engelsk skal ingen norsk
// tekst lekke ut på skjermene, men stedsnavn (stasjoner, bydeler) står på norsk.
let failed = 0
const check = (ok, name) => { console.log(`${ok ? 'OK  ' : 'FEIL'} ${name}`); if (!ok) failed++ }
const browser = await launch()
const errors = []

/** Norske småord og ord appen bruker mye. Stedsnavn inneholder ingen av dem som hele ord. */
const NORWEGIAN = /\b(og|ikke|eller|til|med|som|på|av|er|det|du|dere|seg|spørsmål|Spørsmål|stasjoner|Velg|Trykk|Lagre|Slett|Avbryt|Lukk|Henter|Laster|Rom|Spillere|Gjemmetid|Oppsett)\b/
/** Norske ord i den synlige teksten, med litt tekst rundt så det er lett å finne igjen. */
const leaks = async (page, where) => {
  const text = await page.evaluate(() => document.body.innerText)
  const found = []
  for (const line of text.split('\n')) {
    const m = line.match(NORWEGIAN)
    if (m) found.push(`«${m[0]}» i «${line.trim().slice(0, 60)}»`)
  }
  check(found.length === 0, `ingen norsk tekst: ${where}${found.length ? `: ${found.slice(0, 4).join(', ')}` : ''}`)
}

const phone = async (locale) => {
  const ctx = await browser.newContext(device({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', locale }))
  const page = await ctx.newPage()
  page.on('pageerror', (e) => ignorable(e) || errors.push(e.message))
  await page.addInitScript(() => localStorage.setItem('hideandseek.guide', JSON.stringify({ state: { seen: true }, version: 0 })))
  await page.goto(URL_BASE)
  await page.getByRole('heading', { name: /Hide and Seek/ }).waitFor()
  return { ctx, page }
}

// En norsk telefon får norsk.
{
  const { ctx, page } = await phone('nb-NO')
  check(await page.locator('[data-guide="start-round"]').getByText('Start runden').isVisible(), 'norsk telefon: appen er på norsk')
  check((await page.evaluate(() => document.documentElement.lang)) === 'nb', 'norsk telefon: siden er merket som norsk')
  await ctx.close()
}

// Nynorsk regnes også som norsk.
{
  const { ctx, page } = await phone('nn-NO')
  check(await page.locator('[data-guide="start-round"]').getByText('Start runden').isVisible(), 'nynorsk telefon: appen er på norsk')
  await ctx.close()
}

// En engelsk telefon får engelsk, overalt.
const { ctx, page } = await phone('en-US')
check((await page.evaluate(() => document.documentElement.lang)) === 'en', 'engelsk telefon: siden er merket som engelsk')
const start = page.locator('[data-guide="start-round"]')
await page.waitForFunction(() => !document.querySelector('[data-guide="start-round"]')?.hasAttribute('disabled'), null, { timeout: 15000 })
check(await start.getByText('Start the round').isVisible(), 'engelsk telefon: startknappen er på engelsk')
check(await page.getByRole('button', { name: 'Learn the app' }).isVisible(), 'engelsk telefon: «Learn the app» i lobbyen')
check(await page.getByRole('radio', { name: /Oslo/ }).isVisible(), 'bynavnet står som før')
await page.getByLabel('New player').fill('Kari')
await page.getByRole('button', { name: 'Add', exact: true }).click()
await page.getByLabel('New player').fill('Ola')
await page.getByRole('button', { name: 'Add', exact: true }).click()
await leaks(page, 'lobbyen')

// Oppsettet, med delte oppsett øverst.
await page.getByRole('button', { name: /Game size, lines/ }).click()
const setup = page.getByRole('dialog', { name: /Setup for Oslo/ })
await setup.waitFor()
check(await setup.getByText('Use a ready-made setup').isVisible(), 'oppsett: delte oppsett øverst på engelsk')
await setup.getByText('Customize questions').waitFor()
await leaks(page, 'oppsett-arket')
await setup.getByRole('button', { name: 'Close' }).click()

// Lær appen.
await page.getByRole('button', { name: 'Learn the app' }).click()
await page.getByRole('dialog', { name: 'Learn the app' }).waitFor()
await leaks(page, 'lær appen')
await page.getByRole('dialog', { name: 'Learn the app' }).getByRole('button', { name: 'Close' }).click()

// Innstillinger: personvern og kartdata på engelsk.
await page.getByRole('button', { name: 'Settings' }).click()
const settings = page.getByRole('dialog', { name: 'Settings and help' })
await settings.waitFor()
await settings.locator('summary', { hasText: /stations/ }).waitFor({ timeout: 15000 })
await settings.getByText('What the app stores, and for how long').click()
await settings.locator('summary', { hasText: /stations/ }).click()
await leaks(page, 'innstillinger')
check(await settings.getByRole('radio', { name: 'Like the phone' }).getAttribute('aria-checked') === 'true', 'språket følger telefonen til brukeren velger selv')
await settings.getByRole('button', { name: 'Close' }).click()

// En runde: spørsmålsskjemaet og loggen.
await start.click()
await page.getByRole('button', { name: 'Start seeking' }).click()
await page.locator('[data-guide="new-question"]').click()
const form = page.locator('[data-guide="question-form"]')
await form.waitFor()
check(await form.getByRole('button', { name: 'Ask question' }).isVisible(), 'spørsmålsskjemaet er på engelsk')
await form.getByRole('button', { name: 'Pick on map' }).first().waitFor()
// Seeker står ved Jernbanetorget (valgt i stasjonslisten), så spørsmålet nevner et norsk stedsnavn.
await form.getByLabel(/Seeker's position: choose station/).selectOption({ label: 'Jernbanetorget' })
await form.getByText(/Are you within .* of me\? \(Jernbanetorget\)/).waitFor()
check(true, 'spørsmålet er på engelsk, med stasjonsnavnet på norsk')
await leaks(page, 'spørsmålsskjemaet')
await form.getByRole('button', { name: 'Ask question' }).click()
await page.getByText('Waiting for answer').waitFor()
check(true, 'loggen viser at seekerne venter på svar')
await leaks(page, 'spørsmålsloggen')
await page.getByRole('button', { name: 'Tools', exact: true }).click()
await page.getByText('Measuring tools').waitFor()
await leaks(page, 'verktøy')
await page.getByRole('button', { name: 'Endgame', exact: true }).click()
await page.getByText(/Possible stations/).waitFor()
await leaks(page, 'endgame')

// Regelboken er på norsk, og sier fra om det.
await page.getByRole('button', { name: 'Tools', exact: true }).click()
await page.getByRole('button', { name: /Rules \(Norwegian\)/ }).click()
check(await page.getByText('The rulebook is only in Norwegian for now.', { exact: false }).isVisible(), 'regelboken sier på engelsk at den er på norsk')
await page.getByRole('dialog', { name: /Rules/ }).getByRole('button', { name: 'Close' }).click()

// Bytt til norsk: appen lastes på nytt på norsk, og valget huskes.
await page.getByRole('button', { name: /Help and settings/ }).click()
await Promise.all([page.waitForEvent('load'), page.getByRole('radio', { name: 'Norsk' }).click()])
// Etter omlasting står appen på Spørsmål. Et nytt trykk på fanen ville lukket panelet.
await page.getByText('Venter på svar').waitFor()
check(true, 'etter bytte til norsk: loggen er på norsk og runden er der fortsatt')
await page.reload()
await page.getByText('Venter på svar').waitFor()
check(true, 'norsk huskes etter omlasting, selv om telefonen er engelsk')

// Tilbake til telefonens språk.
await page.getByRole('button', { name: 'Verktøy', exact: true }).click()
await page.getByRole('button', { name: /Hjelp og innstillinger/ }).click()
await Promise.all([page.waitForEvent('load'), page.getByRole('radio', { name: 'Som telefonen' }).click()])
await page.getByText('Waiting for answer').waitFor()
check(true, '«Som telefonen» gir engelsk igjen')
await ctx.close()

check(errors.length === 0, `ingen JS-feil ${errors.join(' | ')}`)
await browser.close()
console.log(failed ? `\n${failed} feilet` : '\nAlt OK')
process.exitCode = failed ? 1 : 0
