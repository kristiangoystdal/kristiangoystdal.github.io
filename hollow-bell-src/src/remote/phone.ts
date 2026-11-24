// The phone page (remote.html): joins a room by code and shows the choices as big buttons.
import { onValue, ref, set } from 'firebase/database';
import { fill, h } from '../ui/dom';
import { T as UI } from '../ui/i18n';
import { cleanCode, CODE_LENGTH, connect, firebaseConfigured, MAX_AGE_MS, ROOT } from './firebase';
import type { RemoteView } from './host';
import type { DuoRoomView } from './duoHost';
import { drawRig, HOUSE_COLORS, POSES, rig } from '../visuals/actors';
import { DEFAULT_APPEARANCE, HAIR_COLOURS, HAIR_STYLES, HEIGHTS, playerLook, SKIN_TONES, type Appearance } from '../visuals/appearance';
import '../styles/remote.css';

const app = document.getElementById('app')!;
const T = {
  en: { join: 'Join', code: 'Room code from the game', waiting: 'Waiting for the game…', reconnect: 'Reconnecting…', next: 'Next', all: 'Show all', reading: 'Read on the big screen', gone: 'The game has closed this room.', notSetUp: 'The phone remote is not set up in this build.', ended: 'The end' },
};
const t = () => T.en;

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
      const room = snap.val() as DuoRoom | null;
      if (!room || Date.now() - room.created > MAX_AGE_MS) return void fill(app, h('p.status', {}, t().gone));
      let view: RemoteView;
      try {
        view = JSON.parse(room.state);
      } catch {
        return;
      }
      if ((view as unknown as DuoRoomView).mode === 'duo') return renderDuo(room, view as unknown as DuoRoomView, db, uid, code);
      render(view, (choiceId) => {
        navigator.vibrate?.(15);
        void set(ref(db, `${ROOT}/${code}/input`), { choiceId, rev: view.rev, from: uid, at: Date.now() });
      });
    },
    () => fill(app, h('p.status', {}, t().gone)),
  );
}

function render(v: RemoteView, send: (id: string) => void) {
  const s = UI;
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


// ---------------------------------------------------------------- two players
type Seat = 'ingerid' | 'kristian';
type DuoRoom = { created: number; state: string; players?: Partial<Record<Seat, string>>; setup?: Partial<Record<Seat, string>> };
const SEATS: Seat[] = ['ingerid', 'kristian'];
const SEAT_NAMES: Record<Seat, string> = { ingerid: 'Ingerid', kristian: 'Kristian' };
const STATS = ['courage', 'wit', 'kindness', 'cunning'] as const;
let draftBonus: Record<string, number> = { courage: 0, wit: 0, kindness: 0, cunning: 0 };
let draftHouse = '';
let draftLook: Appearance | null = null;

/** A small painted preview of how the player will look. */
function preview(seat: Seat, house: string, a: Appearance) {
  const c = document.createElement('canvas');
  const dpr = Math.min(2, devicePixelRatio || 1);
  c.width = 140 * dpr;
  c.height = 220 * dpr;
  c.className = 'preview';
  const ctx = c.getContext('2d')!;
  const look = playerLook(seat, a);
  const scale = (190 / 260) * dpr;
  ctx.translate(70 * dpr, 212 * dpr);
  ctx.scale(scale, scale);
  drawRig(ctx, rig(look, HOUSE_COLORS[house]), look, POSES.idle, 0, null);
  return c;
}

function renderDuo(room: DuoRoom, v: DuoRoomView, db: Parameters<typeof ref>[0], uid: string, code: string) {
  const base = `${ROOT}/${code}`;
  const mine = SEATS.find((p) => room.players?.[p] === uid);
  const send = (choiceId: string) => {
    navigator.vibrate?.(15);
    void set(ref(db, `${base}/inputs/${mine}`), { choiceId, rev: v.rev, from: uid, at: Date.now() });
  };
  const header = h('header', {}, h('p.code', {}, code), h('h1', {}, mine ? SEAT_NAMES[mine] : 'The Other Side of the Glass'), h('p.reconnect', {}, t().reconnect));

  if (!mine) {
    return void fill(
      app,
      header,
      h('p.muted', {}, 'Who are you?'),
      h(
        'div.seats',
        {},
        SEATS.map((p) =>
          h('button.big', { disabled: !!room.players?.[p], onclick: () => void set(ref(db, `${base}/players/${p}`), uid).catch(() => {}) }, room.players?.[p] ? `${SEAT_NAMES[p]} (taken)` : SEAT_NAMES[p]),
        ),
      ),
    );
  }

  if (v.screen === 'lobby') {
    if (room.setup?.[mine]) return void fill(app, header, h('p.status', {}, 'Ready. Waiting for the other player, and for the game to start on the big screen.'));
    const left = () => v.bonusPoints - Object.values(draftBonus).reduce((a, b) => a + b, 0);
    if (!draftHouse) draftHouse = v.houses[0];
    if (!draftLook) draftLook = { ...DEFAULT_APPEARANCE[mine] };
    const look = draftLook;
    const redraw = () => renderDuo(room, v, db, uid, code);
    const pick = (patch: Partial<Appearance>) => (Object.assign(look, patch), redraw());
    return void fill(
      app,
      header,
      h('div.preview-box', {}, preview(mine, draftHouse, look)),
      h('h2', {}, 'How you look'),
      h('div.look-row', {}, HAIR_STYLES.map((x) => h('button.chip', { class: look.hairStyle === x.id ? 'picked' : '', onclick: () => pick({ hairStyle: x.id }) }, x.label))),
      h('div.look-row', {}, HAIR_COLOURS.map((c) => h('button.swatch', { class: look.hair === c ? 'picked' : '', style: `--c:${c}`, 'aria-label': 'Hair colour', onclick: () => pick({ hair: c }) }))),
      h('div.look-row', {}, SKIN_TONES.map((c) => h('button.swatch', { class: look.skin === c ? 'picked' : '', style: `--c:${c}`, 'aria-label': 'Skin tone', onclick: () => pick({ skin: c }) }))),
      h('div.look-row', {}, HEIGHTS.map((x) => h('button.chip', { class: look.height === x.id ? 'picked' : '', onclick: () => pick({ height: x.id }) }, x.label))),
      h('h2', {}, 'House'),
      h('div.houses', {}, v.houses.map((hs) => h('button.big', { class: hs === draftHouse ? 'picked' : '', onclick: () => ((draftHouse = hs), redraw()) }, hs))),
      h('h2', {}, 'Qualities'),
      h(
        'div.stats',
        {},
        STATS.map((k) =>
          h(
            'div.stat',
            {},
            h('span', {}, k[0].toUpperCase() + k.slice(1)),
            h('button.small', { disabled: draftBonus[k] === 0, onclick: () => ((draftBonus[k] -= 1), redraw()) }, '−'),
            h('span.dots', {}, '●'.repeat(2 + draftBonus[k])),
            h('button.small', { disabled: left() === 0, onclick: () => ((draftBonus[k] += 1), redraw()) }, '+'),
          ),
        ),
      ),
      h('p.muted', {}, `${left()} point${left() === 1 ? '' : 's'} left`),
      h('button.big.go', { disabled: left() !== 0, onclick: () => void set(ref(db, `${base}/setup/${mine}`), JSON.stringify({ house: draftHouse, bonus: draftBonus, look })) }, 'Ready'),
    );
  }

  const me = v.players[mine];
  const ui = UI;
  if (v.screen === 'end' && v.ending) {
    return void fill(app, header, h('div.ending', { 'data-kind': v.ending.kind }, h('p', {}, ui.kinds[v.ending.kind] ?? t().ended), h('h2', {}, v.ending.title)));
  }
  fill(
    app,
    header,
    h('p.muted', {}, v.title),
    me.ripple && h('p.ripple', {}, me.ripple),
    me.turn && me.choices.length > 0 &&
      h(
        'ol.choices',
        {},
        me.choices.map((c) =>
          h('li', {}, h('button.big.choice', { disabled: c.locked, onclick: (e: Event) => ((e.currentTarget as HTMLButtonElement).classList.add('sent'), send(c.id)) }, h('span.n', {}, String(c.n)), h('span', {}, c.label), c.locked && c.lockedHint && h('small', {}, c.lockedHint))),
        ),
      ),
    !me.turn && me.waitingFor && h('p.status', {}, `${me.waitingFor} is choosing…`),
    v.canAdvance && h('div.advance', {}, h('p.muted', {}, t().reading), h('button.big', { onclick: () => send('next') }, `${t().next} ▸`), h('button.link', { onclick: () => send('all') }, t().all)),
    !me.turn && !me.waitingFor && !v.canAdvance && h('p.status', {}, t().waiting),
  );
}
