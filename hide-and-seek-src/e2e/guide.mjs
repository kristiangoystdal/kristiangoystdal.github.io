import { tmpdir } from 'node:os'
import { launch, device, URL_BASE, TARGET } from './env.mjs'
import { ignorable } from './env.mjs'

const URL_ = URL_BASE
const SHOTS = `${tmpdir()}/hide-and-seek-e2e-`
let failed = 0
const check = (ok, name) => {
  console.log(`${ok ? 'OK  ' : 'FEIL'} ${name}`)
  if (!ok) failed++
}
const browser = await launch()

async function open({ seed } = {}) {
  const ctx = await browser.newContext(device({ viewport: { width: 400, height: 860 }, serviceWorkers: 'block', permissions: ['geolocation'], geolocation: { latitude: 63.43, longitude: 10.39, accuracy: 20 } }))
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => ignorable(e) || errors.push(e.message + ' @ ' + (e.stack ?? '').split('\n').slice(1, 7).join(' <- ')))
  page.on('dialog', (d) => d.accept())
  if (seed) await page.addInitScript((s) => { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1') } }, seed)
  await page.goto(URL_)
  await page.waitForSelector('aside', { timeout: 15000 })
  return { ctx, page, errors }
}
const card = (page) => page.getByRole('dialog', { name: 'Guide' })
const stepTitle = async (page) => (await card(page).locator('h2').first().textContent())?.trim()
const marked = (page, key) => page.locator(`[data-guide="${key}"].guide-target`).count()
const waitTitle = async (page, title, timeout = 8000) => {
  await card(page).locator('h2', { hasText: title }).first().waitFor({ timeout })
  return true
}
const game = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('hideandseek.v1')).state)

// Omvisning
{
  const { ctx, page, errors } = await open()
  check(await page.getByText('Ny her?').isVisible(), '«Lær appen» er åpen for nye brukere')
  await page.getByRole('button', { name: 'Lær appen' }).click()
  await page.getByRole('button', { name: /Ta en omvisning/ }).click()
  check(await waitTitle(page, 'Velkommen'), 'omvisningen starter')
  const expect = [['Kartet', 'map'], ['By og oppsett', 'lobby-rules'], ['Spillere', 'lobby-players'], ['Denne telefonen', 'lobby-role'], ['Gjemmetid', 'lobby-hiding'], ['Flere telefoner', 'lobby-room'], ['Start', 'start-round'], ['Lær mer', 'learn']]
  for (const [title, key] of expect) {
    await card(page).getByRole('button', { name: /^(Neste|Start)/ }).click()
    await waitTitle(page, title)
    await page.waitForTimeout(500)
    check((await marked(page, key)) > 0, `omvisning: «${title}» markerer ${key}`)
  }
  await card(page).getByRole('button', { name: /^Neste/ }).click()
  await waitTitle(page, 'Klar?')
  check(await card(page).getByRole('button', { name: 'Spill demorunde' }).isVisible(), 'omvisningen ender med tilbud om demo')
  await card(page).getByRole('button', { name: 'Ferdig' }).click()
  check(!(await card(page).isVisible()), 'ferdig lukker guiden')
  await page.reload()
  await page.waitForSelector('aside')
  check(!(await page.getByText('Ny her?').isVisible()) && (await page.getByRole('button', { name: 'Lær appen' }).isVisible()), 'etter omvisningen: «Lær appen» er en lukket knapp, uten velkomsttekst')
  check(errors.length === 0, `omvisning: ingen JS-feil ${errors.join(' | ')}`)
  await ctx.close()
}

// Demo med et ekte spill på telefonen som må komme tilbake
const realGame = {
  'hideandseek.v1': JSON.stringify({
    state: {
      mode: 'hider',
      players: ['Kari', 'Ola'],
      questions: [{ id: 'real1', time: 1, answer: 'in', kind: 'radar', center: [10.39, 63.43], radiusM: 1000 }],
      settings: { city: 'trondheim', zoneRadius: 600, lines: [], day: 'wk', hourFrom: 10, hourTo: 18, adminLevel: 'bydel', theme: 'auto', basemap: 'clean', size: 'L', playArea: null },
      round: { hidingMinutes: 45, hider: 'Ola', seekFrom: null },
      results: [{ id: 'r1', hider: 'Kari', seconds: 1234, bonusMinutes: 2 }],
      archive: [], past: [], hider: { stationId: null }, hiderPts: [], bonusAsked: 'r1',
    },
    version: 7,
  }),
  'hideandseek.guide': JSON.stringify({ state: { seen: true }, version: 0 }),
}
{
  const { ctx, page, errors } = await open({ seed: realGame })
  const before = await game(page)
  await page.getByRole('button', { name: 'Innstillinger' }).click()
  await page.getByRole('dialog', { name: 'Innstillinger og hjelp' }).getByRole('button', { name: /Spill en demorunde/ }).click()
  await waitTitle(page, 'Demorunde')
  await page.waitForTimeout(1500)
  const demo = await game(page)
  check(demo.settings.city === 'oslo' && demo.players.includes('Demo-hider') && demo.questions.length === 0 && demo.mode === 'seeker', 'demoen setter opp et eget spill i Oslo')
  await card(page).getByRole('button', { name: /^Start/ }).click()
  await waitTitle(page, 'Start runden')
  await page.waitForTimeout(500)
  check((await marked(page, 'start-round')) > 0, 'demo: «Start runden» er markert')
  await page.locator('[data-guide="start-round"]').click()
  await waitTitle(page, 'Gjemmetiden')
  await page.getByRole('button', { name: 'Start letingen' }).click()
  await waitTitle(page, 'Ditt første spørsmål')
  await page.locator('[data-guide="new-question"]').click()
  await waitTitle(page, 'Still det')
  await page.waitForTimeout(1500)
  await page.locator('[data-guide="ask"]').click()
  const ok = await waitTitle(page, 'Kartet krymper', 10000).catch(async () => {
    await page.screenshot({ path: `${SHOTS}debug-ask.png` })
    console.log('DEBUG', await stepTitle(page), JSON.stringify((await game(page)).questions).slice(0, 300), await page.evaluate(() => localStorage.getItem('hideandseek.test')))
    return false
  })
  check(ok, 'demo: hider svarer av seg selv')
  if (!ok) { await browser.close(); process.exit(1) }
  const body = await card(page).locator('p').first().textContent()
  check(/Hider svarte «(Innenfor|Utenfor)»/.test(body), `demo: svaret står i guiden («${body.slice(0, 40)}…»)`)
  await page.screenshot({ path: `${SHOTS}9-demo-svar.png` })
  await card(page).getByRole('button', { name: /^Neste/ }).click()
  await waitTitle(page, 'Flytt deg')
  await page.locator('[data-guide="move-me"]').click()
  check(!(await card(page).isVisible()), 'demo: guiden viker for kartet mens du velger sted')
  await page.mouse.click(120, 150)
  check(await waitTitle(page, 'Snevre inn'), 'demo: å flytte seg fullfører steget')
  // Still noen spørsmål til, så hopp videre
  for (let i = 0; i < 2; i++) {
    await page.locator('[data-guide="new-question"]').click()
    await page.waitForTimeout(1200)
    await page.locator('[data-guide="ask"]').click().catch(() => {})
    await page.waitForTimeout(2500)
  }
  const asked = (await game(page)).questions
  check(asked.length >= 2 && asked.every((q) => q.answer !== null), `demo: alle ${asked.length} spørsmål er besvart av hider`)
  if ((await stepTitle(page)) === 'Snevre inn') await card(page).getByRole('button', { name: 'Hopp over' }).click()
  await waitTitle(page, 'Endgame')
  await page.locator('[data-guide="tab-endgame"]').click()
  await waitTitle(page, 'Start endgame')
  await page.locator('[data-guide="endgame-start"]').click()
  check(await waitTitle(page, 'Fasit'), 'demo: endgame gir fasit')
  const fasit = await card(page).locator('p').first().textContent()
  check(/Hider er ved \S/.test(fasit), `demo: fasiten sier hvor hider var («${fasit.slice(0, 50)}…»)`)
  await page.screenshot({ path: `${SHOTS}10-demo-fasit.png` })
  await page.locator('[data-guide="found"]').click()
  await waitTitle(page, 'Det var demoen')
  await card(page).getByRole('button', { name: 'Avslutt demoen' }).click()
  await page.waitForTimeout(1500)
  const after = await game(page)
  check(JSON.stringify(after.questions) === JSON.stringify(before.questions), 'etter demoen: spørsmålene er som før')
  check(after.settings.city === 'trondheim' && after.settings.zoneRadius === 600 && after.mode === 'hider', 'etter demoen: by, sone og rolle er som før')
  check(JSON.stringify(after.players) === JSON.stringify(before.players) && after.results.length === 1 && after.archive.length === 0, 'etter demoen: spillere, poengtavle og arkiv er som før')
  const test = await page.evaluate(() => JSON.parse(localStorage.getItem('hideandseek.test') ?? '{}').state)
  check(!test?.on, 'etter demoen: falsk GPS er av')
  check(errors.length === 0, `demo: ingen JS-feil ${errors.join(' | ')}`)
  await ctx.close()
}

// Omlasting midt i demoen gir det ekte spillet tilbake
{
  const { ctx, page } = await open({ seed: realGame })
  await page.getByRole('button', { name: 'Innstillinger' }).click()
  await page.getByRole('dialog', { name: 'Innstillinger og hjelp' }).getByRole('button', { name: /Spill en demorunde/ }).click()
  await waitTitle(page, 'Demorunde')
  await card(page).getByRole('button', { name: /^Start/ }).click()
  await page.locator('[data-guide="start-round"]').click()
  await page.waitForTimeout(800)
  await page.reload()
  await page.waitForSelector('aside')
  await page.waitForTimeout(1500)
  const after = await game(page)
  check(after.settings.city === 'trondheim' && after.players.join() === 'Kari,Ola' && after.round.seekFrom === null && after.questions[0]?.id === 'real1', 'omlasting midt i demoen: det ekte spillet er tilbake')
  check(!(await card(page).isVisible()), 'omlasting midt i demoen: guiden er lukket')
  await ctx.close()
}

// Simulerte spill i hver by
for (const cityName of ['Oslo', 'Bergen', 'Stavanger', 'Trondheim']) {
  const { ctx, page, errors } = await open({ seed: realGame })
  const sc = page.getByRole('dialog', { name: 'Simulert spill' })
  await page.getByRole('button', { name: 'Lær appen' }).click()
  await page.getByRole('dialog', { name: 'Lær appen' }).getByRole('button', { name: cityName, exact: true }).click()
  await sc.getByText(`Simulert spill i ${cityName}`).waitFor({ timeout: 20000 })
  await sc.getByRole('button', { name: /^Neste/ }).waitFor({ timeout: 20000 })
  const total = await sc.getByRole('tab').count()
  const counts = []
  const mapCount = async () => +(await page.locator('main b.text-accent.tabular-nums').first().textContent())
  for (let i = 1; i < total - 1; i++) {
    await sc.getByRole('button', { name: /^Neste/ }).click()
    await sc.getByText(`Spørsmål ${i} av`).waitFor({ timeout: 5000 })
    const after = +(await sc.locator('.board b').textContent())
    await page.waitForTimeout(400)
    counts.push([after, await mapCount()])
  }
  check(counts.length >= 5 && counts.every(([a, m]) => a === m), `${cityName}: tallet i kortet stemmer med kartet for hvert steg (${counts.map(([a, m]) => a === m ? a : `${a}≠${m}`).join(' → ')})`)
  check(counts.every(([a], i) => i === 0 || a < counts[i - 1][0]), `${cityName}: kartet krymper for hvert spørsmål`)
  await sc.getByRole('button', { name: 'Forrige' }).click()
  await page.waitForTimeout(400)
  check((await mapCount()) === counts.at(-2)[0], `${cityName}: forrige går et steg tilbake på kartet`)
  await sc.getByRole('button', { name: /^Neste/ }).click()
  await sc.getByRole('button', { name: /^Neste/ }).click()
  await sc.getByText(/^Endgame ved/).waitFor({ timeout: 5000 })
  check(/Hider var ved \S/.test(await sc.textContent()), `${cityName}: siste steg viser fasit`)
  if (cityName === 'Bergen') await page.screenshot({ path: `${SHOTS}11-simulert-${cityName}.png` })
  await sc.getByRole('button', { name: 'Ferdig' }).click()
  await page.waitForTimeout(1500)
  const after = await game(page)
  check(after.settings.city === 'trondheim' && after.players.join() === 'Kari,Ola' && after.questions[0]?.id === 'real1', `${cityName}: det ekte spillet er tilbake etterpå`)
  check(errors.length === 0, `${cityName}: ingen JS-feil ${errors.join(' | ')}`)
  await ctx.close()
}

await browser.close()
console.log(failed ? `\n${failed} feilet` : '\nAlt OK')
process.exitCode = failed ? 1 : 0
