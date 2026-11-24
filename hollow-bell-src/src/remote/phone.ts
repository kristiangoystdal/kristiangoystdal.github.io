// The phone page (remote.html): joins a room by code and shows the choices as big buttons.
import { onValue, ref, set } from 'firebase/database';
import { fill, h } from '../ui/dom';
import { STRINGS } from '../ui/i18n';
import { cleanCode, CODE_LENGTH, connect, firebaseConfigured, MAX_AGE_MS, ROOT } from './firebase';
import type { RemoteView } from './host';
import '../styles/remote.css';

const app = document.getElementById('app')!;
let lang: 'en' | 'no' = /^(nb|nn|no)\b/i.test(navigator.language) ? 'no' : 'en';
const T = {
  en: { join: 'Join', code: 'Room code from the game', waiting: 'Waiting for the game…', reconnect: 'Reconnecting…', next: 'Next', all: 'Show all', reading: 'Read on the big screen', gone: 'The game has closed this room.', notSetUp: 'The phone remote is not set up in this build.', ended: 'The end' },
  no: { join: 'Bli med', code: 'Romkode fra spillet', waiting: 'Venter på spillet…', reconnect: 'Kobler til på nytt…', next: 'Neste', all: 'Vis alt', reading: 'Les på den store skjermen', gone: 'Spillet har lukket rommet.', notSetUp: 'Mobilfjernkontrollen er ikke satt opp i denne utgaven.', ended: 'Slutt' },
};
const t = () => T[lang];

let wakeLock: { release: () => Promise<void> } | null = null;
async function keepAwake() {
  try {
    wakeLock = await (navigator as unknown as { wakeLock?: { request: (k: string) => Promise<typeof wakeLock> } }).wakeLock?.request('screen') ?? null;
  } catch {
    /* not supported */
  }
}
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && !wakeLock && void keepAwake());

function joinForm(prefill = '') {
  if (!firebaseConfigured()) return void fill(app, h('p.status', {}, t().notSetUp));
  const input = h('input', { inputmode: 'text', autocapitalize: 'characters', maxlength: CODE_LENGTH, value: prefill, 'aria-label': t().code, placeholder: 'K7QM2P' }) as HTMLInputElement;
  const go = () => {
    const code = cleanCode(input.value);
    if (code.length === CODE_LENGTH) void join(code);
  };
  fill(app, h('form.join', { onsubmit: (e: Event) => (e.preventDefault(), go()) }, h('label', {}, t().code), input, h('button.big', { type: 'submit' }, t().join)));
  input.focus();
}

async function join(code: string) {
  history.replaceState(null, '', '?room=' + code);
  fill(app, h('p.status', {}, t().waiting));
  void keepAwake();
  const { db, uid } = await connect();
  let online = true;
  onValue(ref(db, '.info/connected'), (s) => {
    online = !!s.val();
    document.body.classList.toggle('offline', !online);
  });
  onValue(
    ref(db, `${ROOT}/${code}`),
    (snap) => {
      const room = snap.val() as { created: number; state: string } | null;
      if (!room || Date.now() - room.created > MAX_AGE_MS) return void fill(app, h('p.status', {}, t().gone));
      let view: RemoteView;
      try {
        view = JSON.parse(room.state);
      } catch {
        return;
      }
      if (view.lang) lang = view.lang;
      render(view, (choiceId) => {
        navigator.vibrate?.(15);
        void set(ref(db, `${ROOT}/${code}/input`), { choiceId, rev: view.rev, from: uid, at: Date.now() });
      });
    },
    () => fill(app, h('p.status', {}, t().gone)),
  );
}

function render(v: RemoteView, send: (id: string) => void) {
  const s = STRINGS[lang];
  fill(app, 
    h('header', {}, h('p.code', {}, new URLSearchParams(location.search).get('room') ?? ''), h('h1', {}, v.title || '—'), h('p.reconnect', {}, t().reconnect)),
    v.ending && h('div.ending', { 'data-kind': v.ending.kind }, h('p', {}, s.kinds[v.ending.kind] ?? t().ended), h('h2', {}, v.ending.title)),
    v.canAdvance && h('div.advance', {}, h('p.muted', {}, t().reading), h('button.big', { onclick: () => send('next') }, `${t().next} ▸`), h('button.link', { onclick: () => send('all') }, t().all)),
    v.choices.length > 0 &&
      h(
        'ol.choices',
        {},
        v.choices.map((c) =>
          h('li', {}, h('button.big.choice', { disabled: c.locked, onclick: (e: Event) => ((e.currentTarget as HTMLButtonElement).classList.add('sent'), send(c.id)) }, h('span.n', {}, String(c.n)), h('span', {}, c.label), c.locked && c.lockedHint && h('small', {}, c.lockedHint))),
        ),
      ),
    !v.canAdvance && !v.choices.length && !v.ending && h('p.status', {}, t().waiting),
  );
}

const code = cleanCode(new URLSearchParams(location.search).get('room') ?? '');
if (code.length === CODE_LENGTH && firebaseConfigured()) void join(code).catch(() => joinForm(code));
else joinForm(code);
