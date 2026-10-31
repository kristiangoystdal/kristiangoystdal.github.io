/**
 * Klikk-testene: starter den ferdige appen (`vite preview`, bygg først med `npm run build`),
 * og kjører hver test som iPhone (WebKit) og Android (Chromium). Avslutter med feilkode hvis noe feiler.
 *
 *   npm run e2e                 alle tester, begge telefoner
 *   TARGETS=iphone npm run e2e  bare iPhone
 *   npm run e2e -- guide area   bare noen av testene
 */
import { spawn } from 'node:child_process'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const TESTS = ['startup', 'area', 'settings', 'panel', 'overrides', 'replay', 'guide']
const only = process.argv.slice(2)
const tests = only.length ? TESTS.filter((t) => only.includes(t)) : TESTS
const targets = (process.env.TARGETS ?? 'iphone,android').split(',')
const URL_BASE = process.env.APP_URL ?? 'http://localhost:4173/'

async function up() {
  try {
    return (await fetch(URL_BASE)).ok
  } catch {
    return false
  }
}

let server = null
if (!(await up())) {
  server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { cwd: `${here}/..`, stdio: 'ignore' })
  for (let i = 0; i < 60 && !(await up()); i++) await new Promise((r) => setTimeout(r, 500))
  if (!(await up())) {
    console.error('Fikk ikke startet vite preview. Er appen bygget (npm run build)?')
    server.kill()
    process.exit(1)
  }
}

const run = (test, target) =>
  new Promise((resolve) => {
    const p = spawn(process.execPath, [`${here}/${test}.mjs`], { env: { ...process.env, TARGET: target, APP_URL: URL_BASE }, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    p.stdout.on('data', (d) => (out += d))
    p.stderr.on('data', (d) => (out += d))
    p.on('close', (code) => resolve({ code, out }))
  })

let failed = 0
for (const target of targets) {
  for (const test of tests) {
    const t0 = Date.now()
    const { code, out } = await run(test, target)
    const checks = (out.match(/^OK /gm) ?? []).length
    const sec = ((Date.now() - t0) / 1000).toFixed(0)
    if (code === 0) console.log(`OK    ${target.padEnd(8)} ${test.padEnd(10)} ${checks} sjekker, ${sec} s`)
    else {
      failed++
      console.log(`FEIL  ${target.padEnd(8)} ${test.padEnd(10)} (${sec} s)\n${out.split('\n').filter((l) => l.startsWith('FEIL') || /Error|locator\.|waiting for/.test(l)).slice(0, 12).map((l) => `        ${l}`).join('\n')}`)
    }
  }
}
server?.kill()
console.log(failed ? `\n${failed} feilet` : '\nAlle klikk-testene består')
process.exit(failed ? 1 : 0)
