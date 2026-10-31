import { existsSync } from 'node:fs'
import { chromium, devices, webkit } from 'playwright'

/**
 * Hvilken telefon testene kjører som. iphone = WebKit, samme motor som Safari på iPhone.
 * android = Chromium som en Pixel 7. desktop = vanlig Chromium.
 */
export const TARGET = process.env.TARGET ?? 'iphone'
/** Den ferdige appen, som `vite preview` serverer den (run-all.mjs starter den). */
export const URL_BASE = process.env.APP_URL ?? 'http://localhost:4173/'

// Lokalt på Mac brukes Chrome om den finnes, så det ikke må lastes ned egen Chromium. I CI brukes Playwrights.
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const chromeOpts = !process.env.CI && existsSync(CHROME) ? { executablePath: CHROME } : {}

export const launch = () => (TARGET === 'iphone' ? webkit.launch() : chromium.launch({ ...chromeOpts, headless: true }))

/** Konteksten for telefonen: skjerm, berøring og nettleserinfo går foran testens egne mål. */
export function device(opts = {}) {
  const d = TARGET === 'iphone' ? devices['iPhone 14'] : TARGET === 'android' ? devices['Pixel 7'] : null
  if (!d) return opts
  const { viewport: _v, deviceScaleFactor: _s, hasTouch: _t, ...rest } = opts
  return { ...rest, ...d }
}

/**
 * Feil som ikke kommer fra appen: Firebase sin tilkobling (lang-polling) rapporterer en feil i WebKit
 * når siden lastes på nytt mens databasen er åpen. Brukeren ser ingenting av det.
 */
export const ignorable = (e) => /firebasedatabase\.app\/\.lp\?/.test(`${e.message} ${e.stack ?? ''}`)
