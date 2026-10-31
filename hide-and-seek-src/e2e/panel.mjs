import { launch, device, URL_BASE, TARGET } from './env.mjs'
let failed = 0
const check = (ok, name) => { console.log(`${ok ? 'OK  ' : 'FEIL'} ${name}`); if (!ok) failed++ }
const browser = await launch()
const ctx = await browser.newContext(device({ viewport: { width: 400, height: 800 }, serviceWorkers: 'block', hasTouch: true }))
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
await page.goto(URL_BASE)
await page.waitForSelector('aside')
const handle = page.locator('[data-guide="panel-handle"]')
const asideH = async () => (await page.locator('aside').boundingBox()).height
const mainH = async () => (await page.locator('main').boundingBox()).height
const drag = async (toY) => {
  const b = await handle.boundingBox()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 - 10, { steps: 2 })
  await page.mouse.move(b.x + b.width / 2, toY, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(300)
}
const H = page.viewportSize().height
check(Math.abs((await asideH()) - 0.55 * H) < 3, `standard: panelet er 55 % (${Math.round(await asideH())} px)`)
await drag(H * 0.2)
check(Math.abs((await asideH()) - 0.8 * H) < 6, `dra opp til 80 % (${Math.round(await asideH())} px)`)
await drag(5)
check(Math.abs((await asideH()) - 0.9 * H) < 6, `kan ikke dras over 90 % (${Math.round(await asideH())} px)`)
await drag(H * 0.7)
check(Math.abs((await asideH()) - 0.3 * H) < 6, `dra ned til 30 % (${Math.round(await asideH())} px)`)
await drag(H - 2)
const hiddenH = await asideH()
check(hiddenH < 40 && (await mainH()) > H - 40, `dra helt ned: bare streken er igjen, kartet fyller skjermen (${Math.round(hiddenH)} px)`)
await handle.click()
await page.waitForTimeout(300)
check(Math.abs((await asideH()) - 0.3 * H) < 6, `kort trykk viser panelet igjen i forrige høyde (${Math.round(await asideH())} px)`)
await handle.click()
await page.waitForTimeout(300)
check((await asideH()) < 40, 'kort trykk skjuler panelet')
await handle.click()
await drag(H * 0.4)
await page.reload()
await page.waitForSelector('aside')
await page.waitForTimeout(500)
check(Math.abs((await asideH()) - 0.6 * H) < 6, `høyden huskes etter omlasting (${Math.round(await asideH())} px)`)
await handle.focus()
await page.keyboard.press('ArrowUp')
await page.waitForTimeout(200)
check(Math.abs((await asideH()) - 0.65 * H) < 6, `piltast opp gir 5 % mer (${Math.round(await asideH())} px)`)
// kartet følger med i størrelse
const mapBox = await page.locator('.leaflet-container').boundingBox()
check(Math.abs(mapBox.height - (H - (await asideH()))) < 4, 'kartet tar resten av skjermen')
// PC: panelet ligger ved siden av og ignorerer høyden
if (TARGET === 'desktop') {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.waitForTimeout(400)
  check(!(await handle.isVisible()) && Math.abs((await asideH()) - 800) < 2, 'på PC er panelet full høyde ved siden av kartet, uten strek')
}
check(errors.length === 0, `ingen JS-feil ${errors.join(' | ')}`)
await browser.close()
console.log(failed ? `\n${failed} feilet` : '\nAlt OK')
process.exitCode = failed ? 1 : 0
