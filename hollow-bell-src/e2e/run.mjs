// Browser tests on the built game (dist-e2e). Spoiler-free: only scene/ending counts are printed.
//   node e2e/run.mjs           3 random playthroughs to an ending, plus saving and loading
//   node e2e/run.mjs --remote  PC + phone remote against the Firebase emulator (run inside emulators:exec)
// PW_CHROMIUM can point at a Chromium binary when Playwright's own is not installed.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 4175;
const BASE = `http://localhost:${PORT}/`;
const remoteMode = process.argv.includes('--remote');

const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-e2e', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const stop = () => server.kill();
for (let i = 0; i < 50; i++) {
  try {
    if ((await fetch(BASE)).ok) break;
  } catch {
    /* not up yet */
  }
  await new Promise((r) => setTimeout(r, 200));
}

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const errors = [];
const watch = (name, p) => {
  p.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  p.on('console', (m) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`));
};
let failed = false;
const check = (ok, msg) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) failed = true;
};

async function startGame(p) {
  await p.goto(BASE);
  await p.getByRole('button', { name: 'New game' }).click();
  for (const k of ['Courage', 'Wit', 'Kindness', 'Cunning', 'Wit', 'Kindness']) await p.getByRole('button', { name: k + ' +' }).click();
  await p.getByRole('button', { name: 'Begin' }).click();
}

/** Clicks through until the end screen. Returns the number of choices made. */
async function playToEnd(p, maxSteps = 600) {
  let picks = 0;
  for (let i = 0; i < maxSteps; i++) {
    if (await p.locator('.panel.end').count()) return picks;
    if (await p.locator('.roll').count()) {
      await p.locator('.roll').click().catch(() => {});
      await p.waitForTimeout(350);
      continue;
    }
    const ch = p.locator('button.choice:not([disabled])');
    const n = await ch.count();
    if (n) {
      await ch.nth(Math.floor(Math.random() * n)).click().catch(() => {});
      picks++;
      await p.waitForTimeout(250);
    } else {
      await p.locator('button.link', { hasText: 'Show all' }).click({ timeout: 500 }).catch(() => {});
      await p.waitForTimeout(150);
    }
  }
  return -1;
}

try {
  if (!remoteMode) {
    const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    watch('game', p);
    // fast settings: no animation, so scene changes are instant
    await p.addInitScript(() => localStorage.setItem('hp-cyoa:v1:settings', JSON.stringify({ animation: 'off', transitions: 'cut', lang: 'en', sound: false })));
    for (let run = 1; run <= 3; run++) {
      await startGame(p);
      const picks = await playToEnd(p);
      check(picks > 0, `playthrough ${run} reached an ending after ${picks} choices`);
      const found = await p.locator('.ending-grid li.got').count();
      check(found >= 1, `end screen lists ${found} found ending(s)`);
    }
    // save, reload, load
    await startGame(p);
    await p.locator('button.link', { hasText: 'Show all' }).click();
    await p.locator('button.choice:not([disabled])').first().waitFor();
    await p.locator('button.choice:not([disabled])').first().click();
    await p.waitForTimeout(300);
    const title = (await p.locator('.scene-title').textContent()).trim();
    await p.keyboard.press('Escape');
    await p.getByRole('button', { name: 'Save / Load' }).click();
    await p.locator('.slots li', { hasText: 'Slot 2' }).getByRole('button', { name: 'Save' }).click();
    await p.reload();
    await p.getByRole('button', { name: 'Load', exact: true }).click();
    await p.locator('.slots li', { hasText: 'Slot 2' }).getByRole('button', { name: 'Load' }).click();
    await p.waitForTimeout(300);
    check((await p.locator('.scene-title').textContent()).trim() === title, 'a saved game loads back into the same scene');
    await p.reload();
    check(await p.getByRole('button', { name: /^Continue/ }).isVisible(), 'the title screen offers to continue the autosave');
  } else {
    const pc = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    watch('pc', pc);
    watch('phone', phone);
    await startGame(pc);
    await pc.waitForTimeout(800);
    await pc.keyboard.press('Escape');
    await pc.getByRole('button', { name: 'Phone remote' }).click();
    await pc.locator('.remote-box .code').waitFor({ timeout: 15000 });
    const url = (await pc.locator('.remote-box .url').textContent()).trim();
    check(/remote\.html\?room=[A-Z2-9]{6}$/.test(url), 'the PC opens a room with a 6-character code');
    await pc.keyboard.press('Escape');
    await phone.goto(url);
    await phone.getByRole('button', { name: /Next/ }).waitFor({ timeout: 15000 });
    check(true, 'the phone joins and offers Next');
    for (let i = 0; i < 12 && !(await phone.locator('button.choice').count()); i++) {
      await phone.getByRole('button', { name: /Next/ }).click().catch(() => {});
      await phone.waitForTimeout(400);
    }
    check((await phone.locator('button.choice').count()) > 0, 'Next on the phone moves the text on the PC until choices appear');
    const before = (await pc.locator('.scene-title').textContent()).trim();
    await phone.locator('button.choice:not([disabled])').first().click();
    const moved = await pc
      .waitForFunction((t) => document.querySelector('.scene-title')?.textContent.trim() !== t, before, { timeout: 10000 })
      .then(() => true, () => false);
    check(moved, 'a choice tapped on the phone is played on the PC');
  }
} catch (e) {
  check(false, String(e));
}
check(errors.length === 0, `no errors in the browser${errors.length ? ':\n  ' + errors.join('\n  ') : ''}`);
await browser.close();
stop();
process.exit(failed ? 1 : 0);
