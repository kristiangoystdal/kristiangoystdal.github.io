// Rangeringshatten: Mac-en (TV-en) er verten, telefonene er spillerne.
import * as S from './sync.js';

const { createApp, ref, computed, watch, nextTick, onMounted, onBeforeUnmount } = Vue;

const SIZE = 8;
const COLORS = ['#e8604f', '#4fa6e8', '#5cc483', '#e9bf3f', '#b583ea', '#ea7fb9', '#47d2c6', '#e8924f', '#9db3d9', '#c9d65a'];
const SESSION = 'rh-session-v1';
const NAME = 'rh-name-v1';
const EMU = new URLSearchParams(location.search).has('emu');

const load = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const save = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* privat modus */ } };
const parse = (s) => { try { return JSON.parse(s); } catch (e) { return null; } };
const CATS = Object.fromEntries(RH.CATEGORIES.map((c) => [c.id, c]));

function shuffle(list, rand = Math.random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/** Samme tilfeldige rekkefølge hver gang for samme frø, så listen ikke stokkes om når siden lastes på nytt. */
function seeded(seed) {
  let h = 1779033703;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 3432918353), h = (h << 13) | (h >>> 19);
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
/** En kategori dere ikke har hatt ennå. Er alle brukt, en som ikke var blant de siste 15. */
function nextCat(used = []) {
  const all = RH.CATEGORIES.map((c) => c.id);
  const fresh = all.filter((id) => !used.includes(id));
  const pool = fresh.length ? fresh : all.filter((id) => !used.slice(-15).includes(id));
  return shuffle(pool)[0];
}
const isOrder = (o) => Array.isArray(o) && o.length === SIZE && new Set(o).size === SIZE && o.every((x) => Number.isInteger(x) && x >= 0 && x < SIZE);

/** Hvor like to lister er, 0–100 %: 100 er helt like, 0 er helt motsatt. */
function similarity(a, b) {
  let d = 0;
  for (let item = 0; item < SIZE; item++) d += Math.abs(a.indexOf(item) - b.indexOf(item));
  const max = SIZE * SIZE / 2;
  return Math.round(100 * (1 - d / max));
}
/** Fargen til hver ting i sammenligningen. */
const ITEM_COLORS = ['#f5b941', '#e8604f', '#4fa6e8', '#5cc483', '#b583ea', '#ea7fb9', '#47d2c6', '#e8924f'];

/* ---------- Listen man drar i ---------- */
const Sorter = {
  props: { order: Array, items: Array, disabled: Boolean, label: String },
  emits: ['move'],
  template: `
    <ol class="sorter" :class="{ disabled, settling, dragging: !!drag }" ref="list" :aria-label="label">
      <li v-for="(item, pos) in order" :key="item" class="sort-row" :class="{ lifted: drag && drag.from === pos }"
          :style="[{ '--p': pos }, rowStyle(pos)]" :tabindex="disabled ? -1 : 0" :data-pos="pos"
          @pointerdown="down($event, pos)" @keydown="key($event, pos)">
        <span class="sort-num">{{ pos + 1 }}</span>
        <span class="sort-name">{{ items[item] }}<slot name="tag" :item="item"></slot></span>
        <slot name="extra" :item="item" :pos="pos"></slot>
        <span v-if="!disabled" class="sort-grip" aria-hidden="true"><i></i><i></i><i></i></span>
      </li>
    </ol>`,
  setup(props, { emit }) {
    const list = ref(null), drag = ref(null), settling = ref(false);

    function rowStyle(pos) {
      const d = drag.value;
      if (!d) return null;
      if (pos === d.from) return { transform: `translateY(${d.dy}px) scale(1.02)` };
      if (d.from < d.to && pos > d.from && pos <= d.to) return { transform: `translateY(${-d.h}px)` };
      if (d.from > d.to && pos >= d.to && pos < d.from) return { transform: `translateY(${d.h}px)` };
      return null;
    }
    function finish(commit) {
      const d = drag.value;
      if (!d) return;
      settling.value = true;
      drag.value = null;
      if (commit && d.to !== d.from) emit('move', d.from, d.to);
      requestAnimationFrame(() => requestAnimationFrame(() => { settling.value = false; }));
    }
    function down(e, pos) {
      if (props.disabled || e.button > 0 || drag.value) return;
      const rows = list.value.children;
      const h = rows.length > 1 ? rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().top : rows[0].offsetHeight;
      const row = e.currentTarget;
      drag.value = { from: pos, to: pos, dy: 0, h, y: e.clientY, id: e.pointerId };
      try { row.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
      const move = (ev) => {
        const d = drag.value;
        if (!d || ev.pointerId !== d.id) return;
        d.dy = ev.clientY - d.y;
        const to = Math.max(0, Math.min(props.order.length - 1, d.from + Math.round(d.dy / d.h)));
        if (to !== d.to) { d.to = to; if (navigator.vibrate) navigator.vibrate(8); }
        if (RH.fx) RH.fx.trail(ev.clientX, ev.clientY);
      };
      const up = (ev) => {
        if (drag.value && ev.pointerId !== drag.value.id) return;
        row.removeEventListener('pointermove', move);
        row.removeEventListener('pointerup', up);
        row.removeEventListener('pointercancel', up);
        finish(ev.type === 'pointerup');
      };
      row.addEventListener('pointermove', move);
      row.addEventListener('pointerup', up);
      row.addEventListener('pointercancel', up);
      e.preventDefault();
    }
    function key(e, pos) {
      if (props.disabled) return;
      const to = e.key === 'ArrowUp' ? pos - 1 : e.key === 'ArrowDown' ? pos + 1 : -1;
      if (to < 0 || to >= props.order.length) return;
      e.preventDefault();
      emit('move', pos, to);
      nextTick(() => { const el = list.value && list.value.querySelector(`[data-pos="${to}"]`); if (el) el.focus(); });
    }
    return { list, drag, settling, rowStyle, down, key };
  }
};

/* ---------- Appen ---------- */
createApp({
  components: { Sorter },
  setup() {
    const screen = ref('start'); // start | busy | host | player
    const error = ref('');
    const busyText = ref('');
    const uid = ref(null);
    const code = ref('');
    const data = ref(null);
    const name = ref(load(NAME) || '');
    const params = new URLSearchParams(location.search);
    const joinCode = ref(S.cleanCode(params.get('rom')));
    const confirmEnd = ref(false);
    let unwatch = null;

    const st = computed(() => parse(data.value && data.value.state) || {});
    const round = computed(() => st.value.round || 0);
    const cat = computed(() => CATS[(st.value.cats || [])[round.value]] || null);
    const players = computed(() => Object.entries((data.value && data.value.players) || {})
      .map(([id, s]) => ({ id, ...(parse(s) || {}) }))
      .filter((p) => p.name)
      .sort((a, b) => (a.at || 0) - (b.at || 0) || a.id.localeCompare(b.id))
      .map((p, i) => ({ ...p, color: COLORS[i % COLORS.length] })));
    const me = computed(() => players.value.find((p) => p.id === uid.value) || null);
    const submitted = computed(() => {
      const raw = ((data.value && data.value.rankings) || {})['r' + round.value] || {};
      const out = {};
      for (const [id, s] of Object.entries(raw)) { const o = parse(s); if (isOrder(o)) out[id] = o; }
      return out;
    });
    const ranked = computed(() => players.value.filter((p) => submitted.value[p.id]));
    const allDone = computed(() => players.value.length > 0 && ranked.value.length === players.value.length);
    /** Plassen (1–8) hver spiller ga hver ting: rank[uid][item]. */
    const placeOf = computed(() => {
      const out = {};
      for (const [id, o] of Object.entries(submitted.value)) { out[id] = []; o.forEach((item, pos) => { out[id][item] = pos + 1; }); }
      return out;
    });
    /* ---------- Sammenligning ---------- */
    const roundLists = (r) => {
      const raw = ((data.value && data.value.rankings) || {})['r' + r] || {};
      return players.value.map((p) => ({ p, o: parse(raw[p.id]) })).filter((x) => isOrder(x.o));
    };
    const pairsOf = (lists) => {
      const out = [];
      for (let i = 0; i < lists.length; i++) for (let j = i + 1; j < lists.length; j++) out.push({ a: lists[i].p, b: lists[j].p, sim: similarity(lists[i].o, lists[j].o) });
      return out.sort((x, y) => y.sim - x.sim);
    };
    /** Høydepunktene i én runde. */
    function roundSummary(r) {
      const c = CATS[(st.value.cats || [])[r]];
      const lists = roundLists(r);
      if (!c || !lists.length) return null;
      const place = (o, item) => o.indexOf(item) + 1;
      const items = [...Array(SIZE).keys()].map((item) => {
        const ps = lists.map((x) => ({ p: x.p, pos: place(x.o, item) }));
        const hi = ps.reduce((m, x) => (x.pos < m.pos ? x : m)), lo = ps.reduce((m, x) => (x.pos > m.pos ? x : m));
        return { item, name: c.items[item], spread: lo.pos - hi.pos, hi, lo, top3: ps.every((x) => x.pos <= 3) };
      });
      const split = items.slice().sort((x, y) => y.spread - x.spread)[0];
      return {
        r, cat: c, lists, pairs: pairsOf(lists),
        split: lists.length > 1 && split.spread >= 2 ? split : null,
        same: lists.length > 1 ? items.filter((x) => x.spread <= 1).map((x) => x.name) : [],
        top3: lists.length > 1 ? items.filter((x) => x.top3).map((x) => x.name) : [],
        favs: lists.map((x) => ({ p: x.p, name: c.items[x.o[0]] }))
      };
    }
    const now = computed(() => (cat.value ? roundSummary(round.value) : null));
    const playedRounds = computed(() => {
      const last = st.value.phase === 'rank' ? round.value - 1 : round.value;
      const out = [];
      for (let r = 0; r <= last; r++) { const x = roundSummary(r); if (x) out.push(x); }
      return out;
    });
    /** Hele kvelden: hvor like hvert par har vært i snitt, over rundene begge var med på. */
    const evening = computed(() => {
      const acc = {};
      playedRounds.value.forEach((x) => x.pairs.forEach((pr) => {
        const k = pr.a.id + '|' + pr.b.id;
        (acc[k] = acc[k] || { a: pr.a, b: pr.b, sum: 0, n: 0 }).sum += pr.sim; acc[k].n++;
      }));
      const pairs = Object.values(acc).map((x) => ({ a: x.a, b: x.b, sim: Math.round(x.sum / x.n), n: x.n })).sort((x, y) => y.sim - x.sim);
      const avg = players.value.map((p) => {
        const mine = pairs.filter((x) => x.a.id === p.id || x.b.id === p.id);
        return { p, sim: mine.length ? Math.round(mine.reduce((s2, x) => s2 + x.sim, 0) / mine.length) : null };
      }).filter((x) => x.sim !== null).sort((x, y) => x.sim - y.sim);
      return { pairs, rebel: players.value.length > 2 && avg.length ? avg[0] : null };
    });
    /** For telefonen: hvem jeg ligner mest og minst denne runden. */
    const myPairs = computed(() => (now.value ? now.value.pairs.filter((x) => x.a.id === uid.value || x.b.id === uid.value)
      .map((x) => ({ other: x.a.id === uid.value ? x.b : x.a, sim: x.sim })) : []));
    const myEvening = computed(() => evening.value.pairs.filter((x) => x.a.id === uid.value || x.b.id === uid.value)
      .map((x) => ({ other: x.a.id === uid.value ? x.b : x.a, sim: x.sim })));
    /** Fokus på én ting i sammenligningen (klikk på den på TV-en). */
    const focus = ref(null);
    /** Linjen for én ting mellom kolonne k og k+1 (100 enheter bred kolonne, 100 høy rad). */
    function bumpPath(k, item) {
      const L = now.value.lists, y1 = L[k].o.indexOf(item) * 100 + 50, y2 = L[k + 1].o.indexOf(item) * 100 + 50;
      const x1 = k * 100 + 90, x2 = (k + 1) * 100 + 10, mx = (x1 + x2) / 2;
      return `M${x1} ${y1}C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`;
    }
    watch(() => round.value + st.value.phase, () => { focus.value = null; });

    /* ---------- Tilkobling ---------- */
    async function busy(text, fn) {
      error.value = '';
      busyText.value = text;
      const before = screen.value;
      screen.value = 'busy';
      try { await fn(); } catch (e) { error.value = e.message || String(e); screen.value = before === 'busy' ? 'start' : before; }
    }
    function follow(c, role) {
      if (unwatch) unwatch();
      code.value = c;
      save(SESSION, { code: c, role });
      let seen = false;
      return new Promise((resolve) => {
        unwatch = S.watch(c, (val) => {
          if (!val) {
            if (unwatch) unwatch();
            unwatch = null;
            save(SESSION, null);
            data.value = null;
            screen.value = 'start';
            error.value = seen ? 'Rommet er avsluttet.' : `Fant ikke rommet ${c}. Sjekk koden.`;
            resolve(false);
            return;
          }
          data.value = val;
          if (!seen) { seen = true; screen.value = role; resolve(true); }
        });
      });
    }
    const freshState = (phase = 'lobby') => ({ phase, round: 0, cats: [nextCat()] });

    function createRoom() {
      return busy('Lager rom …', async () => {
        uid.value = await S.connect();
        const old = load(SESSION);
        if (old && old.role === 'host') S.deleteRoom(old.code).catch(() => {});
        const c = await S.createRoom(freshState());
        await follow(c, 'host');
        showOpener();
      });
    }
    function join() {
      const c = S.cleanCode(joinCode.value);
      const n = name.value.trim().slice(0, 20);
      if (!S.validCode(c)) { error.value = `Koden er ${S.CODE_LENGTH} tegn. Den står på TV-en.`; return; }
      if (!n) { error.value = 'Skriv navnet ditt.'; return; }
      return busy('Kobler til …', async () => {
        uid.value = await S.connect();
        const host = await S.roomHost(c);
        if (!host) throw new Error(`Fant ikke rommet ${c}. Sjekk koden.`);
        save(NAME, n);
        const at = me.value && code.value === c ? me.value.at : Date.now();
        await S.writePlayer(c, { name: n, at });
        await follow(c, 'player');
      });
    }
    /** Ny innlasting: fortsett i samme rom. */
    function resume() {
      const s = load(SESSION);
      if (!s || !S.validCode(s.code)) return;
      if (joinCode.value && joinCode.value !== s.code) return;
      busy('Kobler til igjen …', async () => {
        uid.value = await S.connect();
        const host = await S.roomHost(s.code);
        if (!host) { save(SESSION, null); throw new Error('Rommet du var i, finnes ikke lenger.'); }
        await follow(s.code, host === uid.value ? 'host' : 'player');
      });
    }
    function leave() {
      if (RH.music) RH.music.stop();
      if (unwatch) unwatch();
      unwatch = null;
      save(SESSION, null);
      data.value = null;
      code.value = '';
      screen.value = 'start';
    }

    /* ---------- Verten ---------- */
    function setState(patch) {
      const next = { ...st.value, ...patch };
      data.value = { ...data.value, state: JSON.stringify(next) };
      return S.writeState(code.value, next).catch((e) => { error.value = e.message; });
    }
    const startGame = () => setState({ phase: 'rank', round: 0 });
    async function swapCategory() {
      const cats = (st.value.cats || []).slice();
      cats[round.value] = nextCat(cats);
      await S.clearRankings(code.value, [round.value]).catch(() => {});
      setState({ cats });
    }
    const reveal = () => setState({ phase: 'talk' });
    const backToRank = () => setState({ phase: 'rank' });
    /** Neste runde med en ny kategori. */
    function nextRound() {
      const cats = (st.value.cats || []).slice(0, round.value + 1);
      cats.push(nextCat(cats));
      setState({ cats, round: round.value + 1, phase: 'rank' });
    }
    /** Ferdig for i kveld: vis sammenligningen for hele kvelden. */
    const finish = () => setState({ phase: 'final' });
    const keepPlaying = () => nextRound();
    function nextRoundBtn() { sfx('seal'); nextRound(); }
    async function newGame() {
      await S.clearAllRankings(code.value).catch(() => {});
      setState(freshState());
    }
    const kick = (p) => S.kickPlayer(code.value, p.id).catch((e) => { error.value = e.message; });
    async function endRoom() {
      if (!confirmEnd.value) { confirmEnd.value = true; setTimeout(() => { confirmEnd.value = false; }, 3000); return; }
      confirmEnd.value = false;
      const c = code.value;
      leave();
      await S.deleteRoom(c).catch(() => {});
    }
    const joinUrl = computed(() => `${location.origin}${location.pathname}?rom=${code.value}${EMU ? '&emu' : ''}`);
    const shortUrl = computed(() => (location.host + location.pathname).replace(/index\.html$/, '').replace(/\/$/, ''));
    const qrSvg = computed(() => {
      if (!code.value || typeof qrcode !== 'function') return '';
      const q = qrcode(0, 'M');
      q.addData(joinUrl.value);
      q.make();
      return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    });
    function fullscreen() {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    }

    /* ---------- Spilleren ---------- */
    const draft = ref([]);
    const draftKey = () => `rh-draft:${code.value}:${round.value}:${cat.value && cat.value.id}`;
    watch(() => [screen.value, code.value, round.value, cat.value && cat.value.id], () => {
      if (screen.value !== 'player' || !cat.value) return;
      const mine = submitted.value[uid.value];
      const saved = load(draftKey());
      draft.value = mine ? mine.slice() : isOrder(saved) ? saved : shuffle([...Array(SIZE).keys()], seeded(uid.value + cat.value.id));
    }, { immediate: true });
    function moveDraft(from, to) {
      const o = draft.value.slice();
      o.splice(to, 0, o.splice(from, 1)[0]);
      draft.value = o;
      save(draftKey(), o);
    }
    const mine = computed(() => submitted.value[uid.value] || null);
    const sending = ref(false);
    async function submit() {
      sending.value = true;
      fx('outline', document.querySelector('.rank .sorter'), { n: 90 });
      if (navigator.vibrate) navigator.vibrate([20, 40, 30]);
      await new Promise((r) => setTimeout(r, 450));
      try { await S.writeRanking(code.value, round.value, draft.value); } catch (e) { error.value = e.message; }
      sending.value = false;
    }
    async function unsubmit() {
      sending.value = true;
      try { await S.writeRanking(code.value, round.value, null); } catch (e) { error.value = e.message; }
      sending.value = false;
    }
    const myPlace = (item) => (placeOf.value[uid.value] || [])[item];

    /* ---------- Tema for kategorien ---------- */
    const GOLD = ['#ffd98a', '#f5b941', '#fff6dc'];
    const theme = computed(() => (cat.value && (st.value.phase === 'rank' || st.value.phase === 'talk') ? RH.THEMES[cat.value.theme] : null));
    const themeVars = computed(() => (theme.value ? { '--accent': theme.value.accent, '--accent-2': theme.value.accent2, '--deep': theme.value.deep } : null));
    const icon = (name) => `<svg viewBox="0 0 64 64" aria-hidden="true">${RH.ICONS[name] || ''}</svg>`;
    const catIcon = (c) => icon(c && RH.THEMES[c.theme] ? RH.THEMES[c.theme].icon : 'hat');

    /* ---------- Musikk og lyd (bare på TV-en) ---------- */
    const M = () => (screen.value === 'host' && window.RH && RH.music ? RH.music : null);
    const muted = ref(!!(RH.music && RH.music.muted));
    function toggleMute() { muted.value = !muted.value; RH.music.setMuted(muted.value); if (!muted.value) startMusic(); }
    function startMusic() { const m = M(); if (m && !muted.value && opener.value === 'off') { m.start(); applyMood(); } }
    function applyMood() {
      const m = M(); if (!m) return;
      const ph = st.value.phase;
      m.mood(theme.value ? theme.value.mood : ph === 'final' ? 'heroic' : 'calm');
      m.duck(ph === 'talk');
    }
    const sfx = (name) => { const m = M(); if (m) m.sfx(name); };
    // Nettleseren slipper ikke lyd ut før noen har klikket. Etter en ny innlasting starter musikken ved første klikk.
    window.addEventListener('pointerdown', () => startMusic(), { once: true });

    /* ---------- Den svarte skjermen og 3D-introen ---------- */
    const opener = ref('off'); // off | wait | loading | play | out
    const introStage = ref(null);
    let introCtl = null;
    function showOpener() {
      if (window.RH && RH.intro) RH.intro.preload().catch(() => {});
      if (RH.music) RH.music.stop();
      opener.value = 'wait';
    }
    async function openerClick() {
      if (opener.value === 'play') { if (introCtl) introCtl.skip(); return; }
      if (opener.value !== 'wait') return;
      if (RH.music && !muted.value) RH.music.unlock();
      opener.value = 'loading';
      try {
        await RH.intro.preload();
        await document.fonts.load('220px "IM Fell English"').catch(() => {});
        opener.value = 'play';
        await nextTick();
        introCtl = RH.intro.play(introStage.value, { onEnd: closeOpener });
      } catch (e) {
        closeOpener();
      }
    }
    function closeOpener() {
      if (opener.value === 'out' || opener.value === 'off') return;
      opener.value = 'out';
      setTimeout(() => {
        if (introCtl) introCtl.dispose();
        introCtl = null;
        opener.value = 'off';
        startMusic();
        nextTick(() => fx('sparkle', innerWidth / 2, innerHeight * 0.35, { n: 120, spread: 8 }));
      }, 800);
    }

    /* ---------- Effekter når noe skjer ---------- */
    const fx = (kind, ...args) => { if (window.RH && RH.fx) RH.fx[kind](...args); };
    const sparkFor = (sel, color, n) => nextTick(() => fx('at', document.querySelector(sel), { n, color: color ? [color, '#fff6dc'] : undefined }));
    watch(() => players.value.map((p) => p.id), (now, before) => {
      if (!before || screen.value !== 'host') return;
      now.filter((id) => !before.includes(id)).forEach((id) => { const p = players.value.find((x) => x.id === id); sparkFor(`[data-player="${id}"]`, p && p.color, 50); sfx('join'); });
    });
    watch(() => ranked.value.map((p) => p.id).join(), (now, before) => {
      if (screen.value !== 'host' || st.value.phase !== 'rank' || before === undefined) return;
      const old = before ? before.split(',') : [];
      ranked.value.filter((p) => !old.includes(p.id)).forEach((p) => { sparkFor(`[data-player="${p.id}"] .seal`, p.color, 45); sfx('lock'); });
    });
    function applyAmbient() {
      if (screen.value === 'start') return fx('ambient', 'dust', GOLD);
      if (screen.value !== 'host' && screen.value !== 'player') return fx('ambient', null);
      if (theme.value) fx('ambient', theme.value.particle, [theme.value.accent, theme.value.accent2]);
      else fx('ambient', 'dust', GOLD);
    }
    watch(() => [screen.value, st.value.phase, cat.value && cat.value.id], () => { applyAmbient(); applyMood(); });
    watch(() => st.value.phase + ':' + round.value + ':' + (cat.value && cat.value.id), (now, before) => {
      const phase = st.value.phase;
      if (!before) return;
      const [bp, br] = before.split(':');
      if (phase === 'talk' && bp === 'rank') sfx('reveal');
      if (phase === 'rank' && bp === 'rank' && br === String(round.value)) sfx('swap');
      if (phase === 'final') setTimeout(() => fx('fireworks', screen.value === 'host' ? 9 : 4), 400);
      if (phase === 'talk' && screen.value === 'host') setTimeout(() => fx('sparkle', innerWidth / 2, innerHeight * 0.3, { n: 90, spread: 7 }), 350);
      if (phase === 'rank' && screen.value === 'host') setTimeout(() => fx('at', document.querySelector('.ranking .cat-icon'), { n: 90, spread: 6, color: theme.value ? [theme.value.accent, theme.value.accent2, '#fff'] : undefined }), 700);
      if (screen.value === 'player' && navigator.vibrate) navigator.vibrate(30);
    });
    watch(mine, (now, before) => { if (now && !before && screen.value === 'player') sparkFor('.wax', null, 40); });

    function onKey(e) {
      if (opener.value !== 'off' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openerClick(); return; }
      if (screen.value === 'host' && (e.key === 'f' || e.key === 'F') && !e.target.closest('input')) fullscreen();
      if (screen.value === 'host' && (e.key === 'm' || e.key === 'M') && !e.target.closest('input')) toggleMute();
    }
    onMounted(() => { window.addEventListener('keydown', onKey); applyAmbient(); resume(); });
    onBeforeUnmount(() => window.removeEventListener('keydown', onKey));

    return {
      screen, error, busyText, uid, code, name, joinCode, st, round, cat, players, me, submitted, ranked, allDone,
      placeOf, confirmEnd, joinUrl, shortUrl, qrSvg, draft, mine, sending,
      createRoom, join, leave, startGame, swapCategory, reveal, backToRank, finish, keepPlaying, newGame, kick, endRoom, now, playedRounds, evening, myPairs, myEvening, focus, ITEM_COLORS, bumpPath, nextRoundBtn,
      RHT: RH.THEMES, fullscreen, moveDraft, theme, themeVars, icon, catIcon, muted, toggleMute, opener, introStage, openerClick, showOpener, submit, unsubmit, myPlace,
      cleanCode: S.cleanCode
    };
  }
}).mount('#app');
