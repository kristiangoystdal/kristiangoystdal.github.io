// Musikk og lyder, laget med Web Audio (ingen lydfiler). Egne melodier i valsetakt.
//   RH.music.start()          starter bakgrunnsmusikken (må skje etter et klikk)
//   RH.music.mood(name)       calm | heroic | dark | bright | sad (byttes ved neste takt)
//   RH.music.duck(on)         skrur ned mens dere diskuterer
//   RH.music.sfx(name)        join | lock | reveal | seal | swap | pop | whoosh
//   RH.music.intro(t0)        musikken til 3D-introen (30 s), t0 = starttid i ctx-tid
//   RH.music.now()            klokka introen synkes mot
//   RH.music.muted / setMuted(v)
window.RH = window.RH || {};
(function () {
  var ctx = null, master = null, musicBus = null, sfxBus = null, verb = null;
  var muted = false;
  try { muted = localStorage.getItem('rh-mute') === '1'; } catch (e) { /* ok */ }
  var playing = false, timer = 0, nextBar = 0, barIndex = 0, current = 'calm', queued = null, introUntil = 0;

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.55; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
    // Romklang: en kort støy-hale gir det et lite «storsal»-preg.
    verb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.8, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    verb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.35; verb.connect(wet); wet.connect(master);
    return ctx;
  }
  function out(bus, dry, wetAmt) {
    const g = ctx.createGain(); g.gain.value = dry; g.connect(bus);
    if (wetAmt) { const w = ctx.createGain(); w.gain.value = wetAmt; g.connect(w); w.connect(verb); }
    return g;
  }

  /* ---------- Instrumenter ---------- */
  function celesta(m, t, dur, vol, bus) {
    const f = mtof(m), dest = out(bus || musicBus, vol, 0.9);
    [[1, 1, 1.6], [4, 0.28, 0.35], [2, 0.18, 0.8], [7.1, 0.05, 0.12]].forEach(([mul, amp, decay]) => {
      if (f * mul > 16000) return;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f * mul;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(dur + 0.3, decay * 1.4 + 0.2));
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + decay * 1.4 + 0.4);
    });
  }
  function harp(m, t, vol, bus) {
    const f = mtof(m), dest = out(bus || musicBus, vol, 0.6);
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2;
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(f * 6, t); lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.6);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(dest);
    o.start(t); o2.start(t); o.stop(t + 1.7); o2.stop(t + 1.7);
  }
  function pad(ms, t, dur, vol, bright, bus) {
    const dest = out(bus || musicBus, vol, 0.8), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = bright || 900; lp.Q.value = 0.5;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + Math.min(1.2, dur * 0.4));
    g.gain.setValueAtTime(1, t + dur * 0.7); g.gain.linearRampToValueAtTime(0, t + dur + 0.6);
    lp.connect(g); g.connect(dest);
    ms.forEach((m) => [-6, 6].forEach((det) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
      const og = ctx.createGain(); og.gain.value = 0.05; o.connect(og); og.connect(lp); o.start(t); o.stop(t + dur + 0.7);
    }));
  }
  function choir(ms, t, dur, vol, bus) {
    const dest = out(bus || musicBus, vol, 1);
    ms.forEach((m, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(), bp = ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = mtof(m);
      lfo.frequency.value = 5 + i * 0.3; lg.gain.value = 4; lfo.connect(lg); lg.connect(o.detune);
      bp.type = 'bandpass'; bp.frequency.value = 700 + i * 120; bp.Q.value = 1.4;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + dur * 0.35); g.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(bp); bp.connect(g); g.connect(dest); o.start(t); lfo.start(t); o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
    });
  }
  function bass(m, t, dur, vol, bus) {
    const dest = out(bus || musicBus, vol, 0.2), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = mtof(m);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.9, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
  function brass(ms, t, dur, vol, bus) {
    const dest = out(bus || musicBus, vol, 0.7);
    ms.forEach((m) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = mtof(m);
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(300, t); lp.frequency.linearRampToValueAtTime(2200, t + 0.12); lp.frequency.linearRampToValueAtTime(1200, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.06); g.gain.setValueAtTime(0.16, t + dur * 0.8); g.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(lp); lp.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
    });
  }
  function noise(t, dur, vol, from, to, bus, type) {
    const len = Math.ceil(ctx.sampleRate * dur), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = b; f.type = type || 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.4); g.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(f); f.connect(g); g.connect(out(bus || sfxBus, 1, 0.4)); s.start(t); s.stop(t + dur);
  }
  function timpani(m, t, vol, bus) {
    const dest = out(bus || musicBus, vol, 0.5), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(mtof(m) * 1.5, t); o.frequency.exponentialRampToValueAtTime(mtof(m), t + 0.08);
    g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + 1.5);
    noise(t, 0.12, vol * 0.5, 400, 120, bus || musicBus, 'lowpass');
  }

  /* ---------- Melodiene (egne, i 3/4) ---------- */
  const CH = {
    Em: [40, 52, 55, 59], Am: [45, 52, 57, 60], B7: [47, 51, 54, 57], C: [48, 52, 55, 60], G: [43, 50, 55, 59], D: [50, 54, 57, 62],
    Bm: [47, 54, 59, 62], A7: [45, 52, 55, 61], Dm: [38, 50, 53, 57], Bb: [46, 50, 53, 58], Gm: [43, 50, 55, 58], F: [41, 53, 57, 60],
    E: [40, 52, 56, 59], D7: [38, 50, 54, 60], Am2: [45, 57, 60, 64]
  };
  const MOODS = {
    calm: { bpm: 84, chords: ['Em', 'Am', 'Em', 'B7', 'C', 'Am', 'G', 'B7'],
      mel: [[[76, 1], [74, 1], [71, 1]], [[72, 2], [69, 1]], [[71, 1], [67, 1], [64, 1]], [[66, 3]], [[67, 1], [69, 1], [71, 1]], [[72, 1], [74, 1], [76, 1]], [[74, 2], [71, 1]], [[71, 2], [null, 1]]] },
    heroic: { bpm: 100, chords: ['D', 'G', 'A7', 'D', 'G', 'Bm', 'Em', 'A7'], brass: true,
      mel: [[[74, 1], [78, 1], [81, 1]], [[83, 2], [81, 1]], [[79, 1], [78, 1], [76, 1]], [[78, 3]], [[79, 1], [81, 1], [83, 1]], [[86, 2], [83, 1]], [[81, 1], [79, 1], [76, 1]], [[76, 3]]] },
    dark: { bpm: 60, chords: ['Dm', 'A7', 'Dm', 'Bb', 'Dm', 'Gm', 'A7', 'A7'], dark: true,
      mel: [[[62, 2], [65, 1]], [[64, 3]], [[62, 2], [57, 1]], [[58, 3]], [[62, 2], [65, 1]], [[69, 2], [70, 1]], [[69, 3]], [[61, 3]]] },
    bright: { bpm: 112, chords: ['G', 'C', 'Em', 'D', 'G', 'D7', 'G', 'D7'],
      mel: [[[79, 0.5], [81, 0.5], [83, 1], [79, 1]], [[84, 1], [83, 1], [81, 1]], [[79, 0.5], [78, 0.5], [76, 1], [74, 1]], [[78, 1], [81, 2]], [[83, 0.5], [84, 0.5], [86, 1], [83, 1]], [[84, 1], [81, 1], [78, 1]], [[79, 1], [83, 1], [81, 1]], [[78, 3]]] },
    sad: { bpm: 56, chords: ['Am', 'G', 'F', 'E', 'Am', 'C', 'F', 'E'],
      mel: [[[76, 2], [72, 1]], [[74, 2], [71, 1]], [[72, 2], [69, 1]], [[68, 3]], [[69, 2], [72, 1]], [[76, 2], [74, 1]], [[72, 1], [71, 1], [69, 1]], [[71, 3]]] }
  };

  function playBar(moodName, i, t) {
    const M = MOODS[moodName], beat = 60 / M.bpm, bar = 3 * beat;
    const ch = CH[M.chords[i % 8]];
    if (M.dark) {
      pad(ch.map((m) => m + 12), t, bar, 0.35, 600);
      bass(ch[0] - 12, t, bar, 0.5);
      timpani(ch[0], t, 0.25); timpani(ch[0], t + beat * 0.4, 0.15);
    } else {
      bass(ch[0] - (ch[0] > 45 ? 12 : 0), t, beat * 1.5, 0.35);
      harp(ch[1] + 12, t + beat, 0.16); harp(ch[2] + 12, t + beat, 0.12);
      harp(ch[2] + 12, t + beat * 2, 0.14); harp(ch[3] + 12, t + beat * 2, 0.1);
      if (i % 2 === 0) pad(ch.slice(1).map((m) => m + 12), t, bar * 2, 0.16, M.brass ? 1400 : 900);
      if (M.brass && i % 4 === 0) brass([ch[1] + 12, ch[2] + 12], t, bar * 0.9, 0.35);
    }
    let at = t;
    M.mel[i % 8].forEach(([m, len]) => {
      if (m != null) celesta(m, at, len * beat, moodName === 'sad' ? 0.3 : 0.26);
      if (m != null && moodName === 'heroic' && len >= 2) celesta(m - 12, at, len * beat, 0.12);
      at += len * beat;
    });
    return bar;
  }

  function tick() {
    if (!playing || !ctx) return;
    const now = ctx.currentTime;
    if (now < introUntil) { nextBar = Math.max(nextBar, introUntil); return; }
    while (nextBar < now + 0.4) {
      if (queued && barIndex % 2 === 0) { current = queued; queued = null; barIndex = 0; }
      if (nextBar < now) nextBar = now + 0.05;
      nextBar += playBar(current, barIndex, nextBar);
      barIndex++;
    }
  }

  /* ---------- Lydeffekter ---------- */
  const SFX = {
    join(t) { [79, 83, 86].forEach((m, i) => celesta(m, t + i * 0.07, 0.6, 0.35, sfxBus)); },
    lock(t) { celesta(88, t, 0.4, 0.3, sfxBus); celesta(91, t + 0.08, 0.6, 0.3, sfxBus); },
    seal(t) { timpani(43, t, 0.6, sfxBus); [67, 71, 74, 79, 83].forEach((m, i) => celesta(m + 12, t + 0.1 + i * 0.06, 0.6, 0.25, sfxBus)); },
    reveal(t) { noise(t, 0.9, 0.35, 300, 5000, sfxBus); [76, 79, 83, 88, 91].forEach((m, i) => celesta(m, t + 0.5 + i * 0.07, 0.8, 0.3, sfxBus)); },
    swap(t) { noise(t, 0.5, 0.3, 4000, 400, sfxBus); celesta(84, t + 0.3, 0.4, 0.25, sfxBus); },
    pop(t) { noise(t, 0.25, 0.25, 1800, 300, sfxBus, 'lowpass'); celesta(84 + ((Math.random() * 8) | 0), t + 0.05, 0.3, 0.12, sfxBus); },
    whoosh(t) { noise(t, 0.7, 0.4, 600, 3000, sfxBus); }
  };

  /* ---------- Introen (30 s) ---------- */
  function intro(t0) {
    const T = (s) => t0 + s, b = musicBus;
    introUntil = T(30.5);
    // 0–4: dyp drone og kor som stiger fram fra skyene
    pad([38, 50, 57], T(0), 6, 0.4, 500, b);
    choir([62, 66, 69], T(0.5), 5, 0.5, b);
    noise(T(0), 4, 0.15, 200, 1500, b);
    [86, 88, 91, 93, 95, 98].forEach((m, i) => celesta(m, T(1.5 + i * 0.35), 0.8, 0.12, b));
    // 4–25: valsen, større for anledningen
    const beat = 60 / 92, bar = beat * 3, chords = ['Em', 'Am', 'Em', 'B7', 'C', 'Am', 'G', 'B7'];
    const mel = MOODS.calm.mel;
    for (let i = 0; i < 7; i++) {
      const t = T(4 + i * bar * 1), ch = CH[chords[i % 8]];
      bass(ch[0] - (ch[0] > 45 ? 12 : 0), t, beat * 2, 0.45, b);
      harp(ch[1] + 12, t + beat, 0.18, b); harp(ch[2] + 12, t + beat * 2, 0.16, b);
      pad(ch.slice(1).map((m) => m + 12), t, bar, 0.2, 1100, b);
      let at = t;
      mel[i % 8].forEach(([m, len]) => { if (m != null) { celesta(m, at, len * beat, 0.3, b); celesta(m + 12, at, len * beat, 0.08, b); } at += len * beat; });
    }
    // Toget plystrer
    [[T(5.4), 0.7], [T(6.3), 1.1]].forEach(([t, d]) => {
      [71, 75, 78].forEach((m) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = mtof(m);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.1); g.gain.setValueAtTime(0.05, t + d - 0.15); g.gain.linearRampToValueAtTime(0, t + d);
        o.connect(g); g.connect(out(sfxBus, 1, 0.8)); o.start(t); o.stop(t + d);
      });
      noise(t, d, 0.08, 2500, 2000, sfxBus);
    });
    // Kostene suser forbi
    [10.6, 11.4, 12.2, 13.6].forEach((s) => noise(T(s), 0.8, 0.45, 500, 4000, sfxBus));
    // 14–21: dragen. Mørkere musikk, brøl og ild.
    pad([38, 45, 50, 53], T(14.2), 7, 0.5, 700, b);
    choir([50, 53, 57], T(14.5), 6, 0.45, b);
    [14.2, 15.5, 16.8, 18.1, 19.4].forEach((s) => timpani(38, T(s), 0.5, b));
    [[17.6, 2.2], [19.6, 1.4]].forEach(([s, d]) => {
      const t = T(s), o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(90, t); o.frequency.linearRampToValueAtTime(55, t + d);
      lp.type = 'lowpass'; lp.frequency.value = 500;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + 0.25); g.gain.linearRampToValueAtTime(0, t + d);
      o.connect(lp); lp.connect(g); g.connect(out(sfxBus, 1, 0.5)); o.start(t); o.stop(t + d);
      noise(t + 0.2, d, 0.45, 300, 1200, sfxBus, 'lowpass');
    });
    // 21–25: patronusen, lys og skimrende
    pad([64, 68, 71, 76], T(21), 5, 0.3, 2500, b);
    choir([76, 80, 83], T(21), 4.5, 0.5, b);
    for (let i = 0; i < 14; i++) celesta([88, 91, 95, 100][i % 4] + (i > 7 ? 12 : 0), T(21 + i * 0.22), 0.6, 0.12, b);
    // 25: lysglimt, inn i salen
    noise(T(23.8), 2, 0.4, 300, 9000, b, 'highpass');
    timpani(40, T(25.6), 0.9, b);
    // 26,5–30: hatten og tittelen. Fanfare.
    brass([64, 67, 71], T(25.6), 1.2, 0.5, b);
    brass([62, 66, 69], T(26.8), 0.5, 0.45, b);
    brass([64, 68, 71, 76], T(27.3), 2.6, 0.55, b);
    choir([64, 68, 71, 76], T(27.3), 3, 0.5, b);
    pad([40, 52, 56, 59], T(27.3), 3, 0.4, 1600, b);
    bass(28, T(27.3), 3, 0.6, b);
    timpani(40, T(27.3), 0.9, b);
    [76, 80, 83, 88, 92, 95, 100].forEach((m, i) => celesta(m, T(27.4 + i * 0.08), 1.5, 0.2, b));
  }

  RH.music = {
    now() { return ctx ? ctx.currentTime : performance.now() / 1000; },
    get ready() { return !!ctx && ctx.state === 'running'; },
    get muted() { return muted; },
    setMuted(v) {
      muted = !!v;
      try { localStorage.setItem('rh-mute', muted ? '1' : '0'); } catch (e) { /* ok */ }
      if (master) master.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.05);
    },
    unlock() { return ensure(); },
    start() {
      if (!ensure() || playing) return;
      playing = true; nextBar = ctx.currentTime + 0.1; barIndex = 0;
      timer = setInterval(tick, 100); tick();
    },
    stop() { playing = false; clearInterval(timer); },
    mood(name) { if (MOODS[name] && name !== current && name !== queued) queued = name; },
    duck(on) { if (musicBus) musicBus.gain.setTargetAtTime(on ? 0.3 : 0.55, ctx.currentTime, 0.4); },
    sfx(name) { if (!ctx || muted || !SFX[name]) return; SFX[name](ctx.currentTime + 0.01); },
    intro(t0) { if (!ensure()) return; intro(t0); },
    stopIntro() {
      // Kutter introen: skrur musikken raskt ned og opp igjen, så det som er planlagt forsvinner.
      if (!ctx) return;
      introUntil = 0;
      const old = musicBus, oldSfx = sfxBus, t = ctx.currentTime;
      old.gain.setTargetAtTime(0, t, 0.08); oldSfx.gain.setTargetAtTime(0, t, 0.08);
      setTimeout(() => { old.disconnect(); oldSfx.disconnect(); }, 1500);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.55; musicBus.connect(master);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
      nextBar = t + 0.3;
    }
  };
})();
