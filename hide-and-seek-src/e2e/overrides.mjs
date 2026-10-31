import { launch, device, URL_BASE, TARGET } from './env.mjs'

const URL = URL_BASE
const MAJ = { latitude: 59.929609, longitude: 10.717431 }
// ca. meter nord for Majorstuen
const north = (m) => ({ latitude: MAJ.latitude + m / 111320, longitude: MAJ.longitude })
let failed = 0
const check = (ok, name) => {
  console.log(`${ok ? 'OK  ' : 'FEIL'} ${name}`)
  if (!ok) failed++
}

const radar = (id, answer, extra = {}) => ({ id, time: Date.now() - 60000, answer, kind: 'radar', center: [MAJ.longitude, MAJ.latitude], radiusM: 1000, by: 'other', ...extra })

function seed(mode, questions) {
  const now = Date.now()
  return {
    state: {
      mode,
      questions,
      past: [],
      settings: { city: 'oslo', zoneRadius: 500, lines: ['1', '2', '3', '4', '5'], day: 'wk', hourFrom: 10, hourTo: 18, adminLevel: 'bydel', theme: 'auto', basemap: 'clean', size: 'M', playArea: null },
      round: { hidingMinutes: 30, hider: 'Ada', seekFrom: now - 10 * 60000, endgame: null, pause: null, stoppedMs: 0, planUntil: null, moves: [], drained: [], spotty: null },
      players: ['Ada', 'Bo'],
      results: [],
      hider: { stationId: null },
      archive: [],
      hiderPts: [],
      bonusAsked: null,
    },
    version: 7,
  }
}

const browser = await launch()

async function open(mode, questions, geo, { allowGeo = true } = {}) {
  const ctx = await browser.newContext(device({ permissions: allowGeo ? ['geolocation'] : [], geolocation: geo ? { ...geo, accuracy: geo.accuracy ?? 10 } : undefined, serviceWorkers: 'block', viewport: { width: 420, height: 900 } }))
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.clear()
      localStorage.setItem('hideandseek.v1', s)
      sessionStorage.setItem('seeded', '1')
    }
  }, JSON.stringify(seed(mode, questions)))
  await page.goto(URL)
  const tab = page.locator('[data-guide="tab-questions"]')
  await tab.waitFor({ timeout: 15000 })
  if ((await tab.getAttribute('aria-current')) !== 'page') await tab.click()
  const dialogs = []
  let reply = true
  page.on('dialog', (d) => {
    dialogs.push(d.message())
    reply ? d.accept() : d.dismiss()
  })
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('hideandseek.v1')).state.questions)
  return { ctx, page, dialogs, errors, stored, setReply: (v) => (reply = v) }
}

// A: hider midt i radaren, overstyrer til motsatt svar
{
  const t = await open('hider', [radar('q1', null)], { ...MAJ, accuracy: 10 })
  const { page } = t
  await page.getByRole('button', { name: 'Svar: Innenfor' }).waitFor({ timeout: 15000 })
  check(true, 'A: forslaget «Svar: Innenfor» vises')
  const link = page.getByRole('button', { name: 'Stemmer ikke svaret? Svar selv' })
  check(await link.isVisible(), 'A: lenken «Svar selv» vises selv om GPS virker')
  await link.click()
  check(!(await link.isVisible()), 'A: lenken forsvinner når valgene vises')
  t.setReply(false)
  await page.getByRole('button', { name: 'Utenfor', exact: true }).click()
  check(t.dialogs.length === 1 && t.dialogs[0].includes('«Innenfor»') && t.dialogs[0].includes('«Utenfor»'), 'A: annet svar enn appen spør først')
  check((await t.stored())[0].answer === null, 'A: avbryt i dialogen gir ikke noe svar')
  t.setReply(true)
  await page.getByRole('button', { name: 'Utenfor', exact: true }).click()
  await page.getByText('(selv)').waitFor({ timeout: 3000 })
  let q = (await t.stored())[0]
  check(q.answer === 'out' && q.manual === true, 'A: svaret lagres som gitt for hånd')
  // E: angre svaret fjerner merket
  await page.getByRole('button', { name: 'angre svaret' }).click()
  q = (await t.stored())[0]
  check(q.answer === null && q.manual === undefined, 'E: angre svaret fjerner merket og åpner spørsmålet igjen')
  check(t.errors.length === 0, `A: ingen JS-feil ${t.errors.join(' | ')}`)
  await t.ctx.close()
}

// B: rett innenfor kanten med god GPS: valgene vises før hider trykker
{
  const t = await open('hider', [radar('q1', null)], { ...north(990), accuracy: 5 })
  const { page } = t
  const recheck = page.getByRole('button', { name: 'Sjekk posisjonen på nytt' })
  await recheck.waitFor({ timeout: 15000 })
  check(!(await page.getByRole('button', { name: 'Svar: Innenfor' }).isVisible()), 'B: usikkert forslag gir ikke en «Svar: Innenfor»-knapp')
  check(await page.getByText('Svar selv ut fra der du står.').first().isVisible(), 'B: valgene for å svare selv vises med en gang')
  const hint = await page.getByText(/Bare \d+ m fra motsatt svar/).first().textContent()
  check(!hint.includes('GPS'), `B: med god GPS nevnes ikke GPS-feil («${hint}»)`)
  await recheck.click()
  await page.getByText(/Appen svarer ikke for deg/).waitFor({ timeout: 12000 })
  check((await t.stored())[0].answer === null, 'B: sjekk på nytt svarer ikke når det fortsatt er usikkert')
  await page.getByRole('button', { name: 'Innenfor', exact: true }).click()
  const q = (await t.stored())[0]
  check(t.dialogs.length === 0 && q.answer === 'in' && q.manual === undefined, 'B: samme svar som appen: ingen dialog, ikke merket')
  await t.ctx.close()
}

// C: 100 m innenfor, men GPS bommer med 150 m. Så blir GPS-en god
{
  const t = await open('hider', [radar('q1', null)], { ...north(900), accuracy: 150 })
  const { page } = t
  await page.getByRole('button', { name: 'Sjekk posisjonen på nytt' }).waitFor({ timeout: 15000 })
  check(await page.getByText(/GPS-en kan bomme med 150 m/).first().isVisible(), 'C: dårlig GPS nær kanten: GPS-en nevnes som grunn')
  await t.ctx.setGeolocation({ ...north(900), accuracy: 8 })
  await page.getByRole('button', { name: 'Svar: Innenfor' }).waitFor({ timeout: 15000 })
  check(true, 'C: når GPS-en blir god, blir svaret sikkert igjen')
  await page.getByRole('button', { name: 'Svar: Innenfor' }).click()
  await page.getByText('Du svarte:').waitFor({ timeout: 12000 })
  const q = (await t.stored())[0]
  check(q.answer === 'in' && !q.manual, 'C: svarer automatisk når GPS-en er god')
  await t.ctx.close()
}

// I: hider står trygt i forslaget, men flytter seg til kanten før svaret
{
  const t = await open('hider', [radar('q1', null)], { ...north(500), accuracy: 5 })
  const { page } = t
  const btn = page.getByRole('button', { name: 'Svar: Innenfor' })
  await btn.waitFor({ timeout: 15000 })
  await t.ctx.setGeolocation({ ...north(1010), accuracy: 5 })
  await btn.click({ timeout: 3000 }).catch(() => {})
  await page.waitForTimeout(2500)
  check((await t.stored())[0].answer === null, 'I: flytter hider seg til kanten, svarer ikke appen automatisk')
  await t.ctx.close()
}

// J: svaret var tatt ut av seekerne, hider endrer det: det nye gjelder igjen
{
  const t = await open('hider', [radar('q1', 'out', { ignored: true, manual: true, answeredAt: Date.now() - 1000 })], { ...MAJ, accuracy: 5 })
  const { page } = t
  await page.getByRole('button', { name: 'angre svaret' }).click({ timeout: 15000 })
  await page.getByRole('button', { name: 'Svar: Innenfor' }).click({ timeout: 15000 })
  await page.getByText('Du svarte:').waitFor({ timeout: 12000 })
  const q = (await t.stored())[0]
  check(q.answer === 'in' && !q.ignored && !q.manual && q.history?.length >= 1, 'J: nytt svar etter et som var tatt ut gjelder igjen, med historikk')
  await t.ctx.close()
}

// D: godt innenfor, god GPS: svarer automatisk som før
{
  const t = await open('hider', [radar('q1', null)], { ...north(500), accuracy: 10 })
  const { page } = t
  const btn = page.getByRole('button', { name: 'Svar: Innenfor' })
  await btn.waitFor({ timeout: 15000 })
  await btn.click()
  await page.getByText('Du svarte:').waitFor({ timeout: 12000 })
  const q = (await t.stored())[0]
  check(q.answer === 'in' && q.manual === undefined, 'D: sikkert svar sendes automatisk og merkes ikke')
  await t.ctx.close()
}

// F: nettsiden får ikke bruke posisjonen
{
  const t = await open('hider', [radar('q1', null)], null, { allowGeo: false })
  const { page } = t
  const btn = page.getByRole('button', { name: 'Svar med posisjonen min nå' })
  await btn.waitFor({ timeout: 15000 })
  await btn.click()
  await page.getByText('Svar selv ut fra der du står.').first().waitFor({ timeout: 15000 })
  check(true, 'F: uten GPS vises valgene for å svare selv')
  await page.getByRole('button', { name: 'Utenfor', exact: true }).click()
  const q = (await t.stored())[0]
  check(t.dialogs.length === 0 && q.answer === 'out' && q.manual === true, 'F: uten forslag: ingen dialog, merket som gitt for hånd')
  await t.ctx.close()
}

// G/H: seekerne ser merket og kan ta svaret ut av kartet
{
  const qs = [
    radar('q1', 'in', { manual: true, answeredAt: Date.now() - 50000 }),
    radar('q2', 'none', { radiusM: 500, time: Date.now() - 40000, answeredAt: Date.now() - 30000 }),
    radar('q3', null, { radiusM: 2000, time: Date.now() - 20000 }),
  ]
  const t = await open('seeker', qs, { ...MAJ })
  const { page } = t
  await page.getByText(/Spørsmålslogg/).waitFor({ timeout: 15000 })
  check(await page.getByText('Hider svarte selv i stedet for å bruke appens utregning.').isVisible(), 'G: seekerne ser at hider svarte selv')
  const toggles = page.getByRole('switch', { name: 'Ta svaret ut av kartet' })
  check((await toggles.count()) === 1, 'H: bryteren vises bare på svar som krymper kartet (ikke nullsvar eller ubesvart)')
  const countText = async () => (await page.locator('li.card').first().textContent()).match(/(\d+) → (\d+) stasjoner|Ikke brukt på kartet/)?.[0]
  const before = await countText()
  t.setReply(false)
  await toggles.first().click()
  check(t.dialogs.length === 1 && !(await t.stored())[0].ignored, 'G: avbryt i dialogen endrer ingenting')
  t.setReply(true)
  await toggles.first().click()
  await page.getByRole('switch', { name: 'Bruk svaret på kartet igjen' }).waitFor({ timeout: 3000 })
  check((await t.stored())[0].ignored === true, 'G: svaret er tatt ut')
  check((await countText()) === 'Ikke brukt på kartet', `G: loggen viser «Ikke brukt på kartet» (før: ${before})`)
  const n = t.dialogs.length
  await page.getByRole('switch', { name: 'Bruk svaret på kartet igjen' }).click()
  check(t.dialogs.length === n && !(await t.stored())[0].ignored, 'G: ta inn igjen uten dialog')
  check((await countText()) === before, 'G: stasjonstallet er tilbake')
  await toggles.first().click()
  await page.getByRole('button', { name: 'Angre', exact: true }).click()
  check(!(await t.stored())[0].ignored, 'G: «Angre» tar det inn igjen')
  check(t.errors.length === 0, `G: ingen JS-feil ${t.errors.join(' | ')}`)
  await t.ctx.close()
}

await browser.close()
console.log(failed ? `\n${failed} feilet` : '\nAlt OK')
process.exitCode = failed ? 1 : 0
