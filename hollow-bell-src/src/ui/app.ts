import { AudioEngine, voiceKey } from '../audio/audio';
import { runBot } from '../engine/bot';
import { allEndings, endingsFound, recordEnding } from '../engine/meta';
import {
  deleteSave,
  parseSave,
  readSave,
  SLOTS,
  storageWorks,
  writeSave,
  type SlotId,
} from '../engine/save';
import { choose, currentScene, newGame, visibleChoices, type ChoiceView } from '../engine/state';
import { interpolate, playerVars, sceneParagraphs, unquote, type ShownParagraph } from '../engine/text';
import { STAT_NAMES, type GameState, type RollResult, type Scene, type StatName, type Story } from '../engine/types';
import { displayName, STORIES, storyById } from '../stories';
import { HOUSE_COLORS } from '../visuals/actors';
import { getPreset } from '../visuals/presets';
import { castFor, Stage } from '../visuals/stage';
import { add, clear, fill, h } from './dom';
import { T, type Strings } from './i18n';
import { loadSettings, storeSettings, type Settings } from './settings';
import type { Remote, RemoteView } from '../remote/host';

type Overlay = 'menu' | 'status' | 'log' | 'settings' | 'saves' | 'export' | 'remote' | null;

export class App {
  settings: Settings = loadSettings();
  story: Story = STORIES[0];
  game: GameState | null = null;
  private ui: HTMLElement;
  private bubbles: HTMLElement;
  private toasts: HTMLElement;
  private overlay: Overlay = null;
  private overlayEl: HTMLElement | null = null;
  private screen: 'title' | 'create' | 'play' | 'end' = 'title';
  // scene playback
  private paras: ShownParagraph[] = [];
  private paraIdx = 0;
  private narration: HTMLElement | null = null;
  private choicesEl: HTMLElement | null = null;
  private controlsEl: HTMLElement | null = null;
  private bubble: { el: HTMLElement; actor: string } | null = null;
  private autoTimer = 0;
  private busy = false; // a choice is being resolved (dice, transitions)
  private hidden = false;
  private sceneToken = 0;
  private storageOk = storageWorks();
  private remote: Remote | null = null;
  private remoteRev = 0;
  private debug = new URLSearchParams(location.search).has('debug');
  private debugEl: HTMLElement | null = null;

  constructor(
    private stage: Stage,
    private audio: AudioEngine,
  ) {
    this.ui = document.getElementById('ui')!;
    this.bubbles = document.getElementById('bubbles')!;
    this.toasts = document.getElementById('toasts')!;
    this.applySettings();
    addEventListener('keydown', (e) => this.onKey(e));
    const followBubble = () => {
      this.positionBubble();
      requestAnimationFrame(followBubble);
    };
    requestAnimationFrame(followBubble);
    if (this.debug) {
      this.debugEl = h('div#debug');
      add(document.body, this.debugEl);
    }
  }

  get t(): Strings {
    return T;
  }

  private applySettings() {
    const s = this.settings;
    document.body.dataset.theme = s.theme;
    document.body.dataset.motion = s.animation;
    document.documentElement.style.setProperty('--text-size', s.textSize + 'rem');
    this.stage.motion = s.animation;
    this.audio.setVolumes(s.volumes);
    this.audio.setEnabled(s.sound);
    this.audio.voiceEnabled = s.voice;
    storeSettings(s);
  }

  /** Audio can only start after a click; call this from every "start" button. */
  private async wake() {
    await this.audio.init();
    this.audio.setVolumes(this.settings.volumes);
  }

  // ======================= title =======================
  showTitle() {
    this.screen = 'title';
    this.game = null;
    this.clearScene();
    this.closeOverlay();
    this.publishRemote();
    void this.stage.show({ preset: 'window-night', particles: ['fog', 'fireflies'], mood: 'tense', actors: [] }, 'cut');
    const t = this.t;
    const auto = readSave('auto');
    const autoStory = auto ? storyById(auto.storyId) : undefined;
    fill(this.ui, 
      h(
        'main.title-screen',
        {},
        h('h1.game-title', {}, this.story.title),
        h('p.tagline', {}, this.story.tagline),
        h('p.meta', {}, `${this.story.estimatedMinutes} ${t.minutes} · ${'●'.repeat(this.story.difficulty)}${'○'.repeat(3 - this.story.difficulty)}`),
        h(
          'nav.title-buttons',
          {},
          autoStory &&
            h(
              'button.primary',
              {
                onclick: async () => {
                  await this.wake();
                  this.story = autoStory;
                  this.startFromState(auto!.state);
                },
              },
              `${t.continue}: ${auto!.sceneTitle}`,
            ),
          h('button', { class: autoStory ? '' : 'primary', onclick: () => this.showCreate() }, t.newGame),
          h('button', { onclick: () => this.openOverlay('saves') }, t.load),
          h('button', { onclick: () => this.openOverlay('settings') }, t.settings),
        ),
        !this.storageOk && h('p.warn', {}, t.noStorage),
        h('footer.disclaimer', {}, t.disclaimer),
      ),
    );
    (this.ui.querySelector('.title-buttons button') as HTMLElement | null)?.focus();
  }

  // ======================= character creation =======================
  showCreate(prev?: { name: string; house: string }) {
    this.screen = 'create';
    const t = this.t;
    const cc = this.story.characterCreation ?? {};
    const houses = cc.houseChoice ?? Object.keys(HOUSE_COLORS);
    const total = cc.bonusPoints ?? 6;
    let name = prev?.name ?? cc.nameInput?.default ?? 'Alex';
    let house = prev?.house ?? houses[0];
    const bonus: Record<StatName, number> = { courage: 0, wit: 0, kindness: 0, cunning: 0 };
    const base = this.story.initialState.stats;
    const left = () => total - Object.values(bonus).reduce((a, b) => a + b, 0);

    const preview = () =>
      void this.stage.show({ preset: 'dormitory-night', particles: ['dust'], mood: 'cozy', actors: castFor({ houseColor: HOUSE_COLORS[house] }) }, 'cut');
    preview();

    const statsEl = h('div.stats-edit');
    const leftEl = h('p.points');
    const beginBtn = h('button.primary', {
      onclick: async () => {
        await this.wake();
        const s = newGame(this.story, { name: name.trim() || cc.nameInput?.default || 'Alex', house }, bonus);
        this.startFromState(s, true);
      },
    }, t.begin);
    const renderStats = () => {
      clear(statsEl);
      for (const k of STAT_NAMES) {
        statsEl.append(
          h(
            'div.stat-row',
            {},
            h('span.stat-name', {}, t[k]),
            h('button.small', { 'aria-label': `${t[k]} −`, disabled: bonus[k] === 0, onclick: () => ((bonus[k] -= 1), renderStats()) }, '−'),
            h('span.stat-dots', { 'aria-label': String(base[k] + bonus[k]) }, dots(base[k] + bonus[k], 10)),
            h('button.small', { 'aria-label': `${t[k]} +`, disabled: left() === 0, onclick: () => ((bonus[k] += 1), renderStats()) }, '+'),
          ),
        );
      }
      leftEl.textContent = t.pointsLeft(left());
      (beginBtn as HTMLButtonElement).disabled = left() !== 0;
    };
    renderStats();

    const houseEl = h(
      'div.houses',
      { role: 'radiogroup', 'aria-label': t.house },
      houses.map((hs) =>
        h(
          'button.house',
          {
            role: 'radio',
            'aria-checked': String(hs === house),
            style: `--house:${HOUSE_COLORS[hs] ?? '#777'}`,
            onclick: (e: Event) => {
              house = hs;
              houseEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b === e.currentTarget)));
              preview();
            },
          },
          hs,
        ),
      ),
    );

    fill(this.ui, 
      h(
        'main.panel.create',
        {},
        h('h2', {}, t.createTitle),
        h(
          'label.field',
          {},
          h('span', {}, cc.nameInput?.label ?? 'Name'),
          h('input', {
            type: 'text',
            value: name,
            maxlength: cc.nameInput?.maxLength ?? 16,
            placeholder: cc.nameInput?.placeholder ?? '',
            oninput: (e: Event) => (name = (e.target as HTMLInputElement).value),
          }),
        ),
        h('h3', {}, t.house),
        houseEl,
        h('h3', {}, t.stats),
        statsEl,
        leftEl,
        h('div.row', {}, h('button', { onclick: () => this.showTitle() }, t.back), beginBtn),
      ),
    );
    (this.ui.querySelector('input') as HTMLInputElement).focus();
  }

  // ======================= playing =======================
  private startFromState(s: GameState, fresh = false) {
    this.game = s;
    this.screen = 'play';
    this.closeOverlay();
    fill(this.ui, this.playLayout());
    void this.runScene(fresh ? 'cut' : 'cut');
  }

  private playLayout() {
    const t = this.t;
    this.narration = h('div.narration', { 'aria-live': 'polite' });
    this.choicesEl = h('ol.choices');
    this.controlsEl = h('div.controls');
    const box = h('section.textbox', { onclick: (e: Event) => !(e.target as HTMLElement).closest('button') && this.advance() }, this.narration, this.controlsEl, this.choicesEl);
    return h(
      'div.play',
      {},
      h(
        'header.hud',
        {},
        h('div.scene-title'),
        h(
          'div.hud-buttons',
          {},
          h('button.icon', { onclick: () => this.openOverlay('status'), title: `${t.status} (I)` }, t.status),
          h('button.icon', { onclick: () => this.openOverlay('log'), title: `${t.log} (L)` }, t.log),
          h('button.icon', { onclick: () => this.openOverlay('menu'), title: `${t.menu} (Esc)` }, t.menu),
        ),
      ),
      h('div.stage-click', { onclick: () => this.advance() }),
      box,
      h('p.hidden-note', {}, t.hidden),
    );
  }

  private clearScene() {
    clearTimeout(this.autoTimer);
    this.audio.stopVoice();
    this.hideBubble();
    this.paras = [];
    this.paraIdx = 0;
  }

  private async runScene(transition: 'cut' | 'walk' | 'none') {
    const s = this.game!;
    const sc = currentScene(this.story, s);
    const token = ++this.sceneToken;
    this.clearScene();
    this.audio.scene(sc);
    const titleEl = this.ui.querySelector('.scene-title');
    if (titleEl) {
      fill(titleEl, 
        h('span', {}, interpolate(sc.title ?? '', playerVars(s))),
        sc.pov && h('span.pov', {}, ` · ${sc.pov.name}`),
      );
    }
    document.body.dataset.pov = sc.pov ? 'yes' : '';
    if (sc.ending) recordEnding(this.story.id, sc.ending.id);
    if (this.storageOk) writeSave('auto', s, sc.title ?? '');
    this.updateDebug();

    clear(this.narration!);
    clear(this.choicesEl!);
    clear(this.controlsEl!);
    this.choicesEl!.parentElement!.classList.remove('choosing');
    this.busy = true;
    await this.stage.show(
      {
        preset: sc.visual?.preset,
        particles: sc.visual?.particles,
        mood: sc.mood,
        actors: castFor({ speaker: sc.speaker, pov: sc.pov?.name, houseColor: HOUSE_COLORS[s.player.house] }),
      },
      transition,
    );
    if (token !== this.sceneToken) return;
    this.busy = false;
    this.paras = sceneParagraphs(sc, s);
    this.paraIdx = 0;
    this.publishRemote();
    this.advance();
  }

  /** Shows the next paragraph, or the choices when the text is done. */
  private advance() {
    if (this.screen !== 'play' || this.busy || this.overlay || !this.game) return;
    clearTimeout(this.autoTimer);
    if (this.paraIdx >= this.paras.length) return; // choices are already showing
    const sc = currentScene(this.story, this.game);
    const p = this.paras[this.paraIdx++];
    const actor = sc.speaker ? 'speaker:' + sc.speaker : null;
    if (p.dialogue && actor && this.stage.headPos(actor)) {
      this.showBubble(actor, unquote(p.text));
      void voiceKey(sc.id, p.index, p.raw).then((key) => this.audio.say(key, unquote(p.text), sc.speaker!));
    } else {
      this.hideBubble();
      this.audio.stopVoice();
      this.narration!.querySelectorAll('p.current').forEach((x) => x.classList.remove('current'));
      this.narration!.append(h('p.current', { class: p.dialogue ? 'speech' : '' }, p.text));
      this.narration!.scrollTop = this.narration!.scrollHeight;
    }
    if (this.paraIdx >= this.paras.length) this.showChoices();
    else {
      fill(this.controlsEl!, 
        h('button.next', { onclick: () => this.advance(), 'aria-label': this.t.next }, '▸'),
        h('button.link', { onclick: () => this.showAll() }, this.t.showAll),
      );
      if (this.settings.autoAdvance) this.autoTimer = window.setTimeout(() => this.advance(), 1600 + p.text.length * 45);
    }
    this.publishRemote();
  }

  private showAll() {
    while (this.paraIdx < this.paras.length) this.advance();
  }

  private showChoices() {
    const s = this.game!;
    const sc = currentScene(this.story, s);
    const t = this.t;
    clear(this.controlsEl!);
    clear(this.choicesEl!);
    const views = visibleChoices(this.story, s);
    let n = 0;
    for (const v of views) {
      const key = ++n;
      const c = v.choice;
      this.choicesEl!.append(
        h(
          'li',
          {},
          h(
            'button.choice',
            { disabled: !v.available, 'data-key': key, onclick: () => this.pick(v) },
            h('span.key', {}, String(key)),
            h('span.label', {}, interpolate(c.label, playerVars(s))),
            c.check && v.available && h('span.check', { title: t.check(t[c.check.stat], c.check.difficulty) }, `🎲 ${t.check(t[c.check.stat], c.check.difficulty)}`),
            !v.available && c.lockedHint && h('span.hint', {}, `${t.locked}: ${c.lockedHint}`),
          ),
        ),
      );
    }
    if (sc.ending) {
      this.choicesEl!.append(
        h('li', {}, h('button.choice.ending-btn', { 'data-key': ++n, onclick: () => this.showEnd() }, h('span.key', {}, String(n)), h('span.label', {}, `${t.seeEnding}: ${sc.ending.title}`))),
      );
    }
    this.choicesEl!.parentElement!.classList.add('choosing');
    this.narration!.scrollTop = this.narration!.scrollHeight;
    (this.choicesEl!.querySelector('button:not([disabled])') as HTMLElement | null)?.focus({ preventScroll: true });
    this.publishRemote();
  }

  private async pick(v: ChoiceView) {
    if (this.busy || !this.game || !v.available) return;
    this.busy = true;
    const before = this.game;
    const fromScene = currentScene(this.story, before);
    const res = choose(this.story, before, v.index);
    this.audio.stopVoice();
    this.hideBubble();
    clear(this.choicesEl!);
    if (res.roll) await this.showRoll(res.roll);
    if (res.ripple) this.toast(interpolate(res.ripple, playerVars(before)), 'ripple');
    this.game = res.state;
    this.busy = false;
    const toScene = currentScene(this.story, res.state);
    void this.runScene(this.pickTransition(fromScene, toScene, v, res.state.loops !== before.loops));
  }

  private pickTransition(from: Scene, to: Scene, v: ChoiceView, looped: boolean): 'cut' | 'walk' | 'none' {
    const explicit = v.choice.transition ?? to.transition;
    if (from.visual?.preset === to.visual?.preset && !explicit) return 'none';
    if (this.settings.transitions === 'cut' || this.settings.animation !== 'full') return 'cut';
    if (explicit === 'walk') return 'walk';
    if (explicit) return 'cut';
    // cut on time jumps, pov changes, endings and the loop; walk between ordinary places
    const a = getPreset(from.visual?.preset);
    const b = getPreset(to.visual?.preset);
    if (looped || to.ending || !!from.pov !== !!to.pov || a.night !== b.night || a.area === b.area) return 'cut';
    return 'walk';
  }

  private showRoll(r: RollResult): Promise<void> {
    const t = this.t;
    const face = h('div.die', {}, '?');
    const line = h('p.roll-line', {}, '');
    const verdict = h('p.verdict', {}, '');
    const card = h('div.roll', { role: 'status' }, face, line, verdict);
    add(document.body, card);
    return new Promise((done) => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        card.classList.add('out');
        setTimeout(() => card.remove(), 300);
        done();
      };
      const reveal = () => {
        face.textContent = String(r.die);
        line.textContent = t.rollLine(r.die, t[r.stat], r.bonus, r.difficulty);
        verdict.textContent = r.success ? t.success : t.failure;
        card.classList.add(r.success ? 'success' : 'failure');
        void this.audio.sfx(r.success ? 'chime_success' : 'heartbeat');
        card.addEventListener('click', finish);
        setTimeout(finish, 2200);
      };
      if (this.settings.animation === 'full') {
        let i = 0;
        const spin = setInterval(() => {
          face.textContent = String(1 + Math.floor(Math.random() * 10));
          if (++i > 12) {
            clearInterval(spin);
            reveal();
          }
        }, 60);
      } else reveal();
    });
  }

  // ---------- speech bubbles ----------
  private showBubble(actor: string, text: string) {
    this.hideBubble();
    const el = h('div.bubble', { role: 'status' }, h('p', {}, text));
    this.bubbles.append(el);
    this.bubble = { el, actor };
    this.stage.setTalking(actor);
    this.positionBubble();
  }

  private hideBubble() {
    this.bubble?.el.remove();
    this.bubble = null;
    this.stage.setTalking(null);
  }

  private positionBubble() {
    if (!this.bubble) return;
    const pos = this.stage.headPos(this.bubble.actor);
    const el = this.bubble.el;
    if (!pos) {
      el.style.opacity = '0';
      return;
    }
    const w = el.offsetWidth;
    const hgt = el.offsetHeight;
    const margin = 12;
    const x = Math.max(margin, Math.min(innerWidth - w - margin, pos.x - w / 2));
    const top = Math.max(60, pos.y - hgt - 14);
    el.style.transform = `translate(${x}px, ${top}px)`;
    el.style.setProperty('--tail', `${Math.max(16, Math.min(w - 16, pos.x - x))}px`);
    el.style.opacity = '1';
  }

  // ======================= ending =======================
  private showEnd() {
    const s = this.game!;
    const sc = currentScene(this.story, s);
    if (!sc.ending) return;
    this.screen = 'end';
    this.clearScene();
    deleteSave('auto');
    const t = this.t;
    const found = endingsFound(this.story);
    const cr = this.story.credits ?? {};
    const vars = { ...playerVars(s), found: found.found, total: found.total };
    const path = s.history.map((e) => {
      const scene = this.story.scenes[e.scene];
      const others = (scene?.choices ?? []).length - 1;
      const label = e.choice !== undefined ? scene?.choices?.[e.choice]?.label : undefined;
      return h(
        'li',
        {},
        h('span.step-scene', {}, interpolate(scene?.title ?? '', playerVars(s))),
        label && h('span.step-choice', {}, interpolate(label, playerVars(s))),
        e.roll && h('span.step-roll', { class: e.roll.success ? 'ok' : 'bad' }, `🎲 ${e.roll.die}+${e.roll.bonus}`),
        others > 0 && h('span.step-others', { 'aria-label': `${others} other choices` }, '?'.repeat(Math.min(others, 6)).split('').map((q) => h('i', {}, q))),
      );
    });
    fill(this.ui, 
      h(
        'main.panel.end',
        { 'data-kind': sc.ending.kind },
        h('p.kind', {}, t.kinds[sc.ending.kind] ?? t.ending),
        h('h2', {}, sc.ending.title),
        h('p.found', {}, cr.endingCountText ? interpolate(cr.endingCountText, vars) : t.endingsFound(found.found, found.total)),
        h(
          'ul.ending-grid',
          {},
          allEndings(this.story).map((e) => h('li', { class: found.ids.has(e.id) ? 'got' : '', 'data-kind': found.ids.has(e.id) ? e.kind : '' }, found.ids.has(e.id) ? e.title : '? ? ?')),
        ),
        h('details.path', {}, h('summary', {}, t.yourPath), h('ol', {}, path)),
        h('div.credits', {}, h('h3', {}, cr.title ?? this.story.title), (cr.lines ?? []).map((l) => h('p', {}, interpolate(l, vars)))),
        h(
          'div.row',
          {},
          h('button.primary', { onclick: () => this.showCreate(s.player) }, cr.buttons?.[0] ?? t.playAgain),
          h('button', { onclick: () => this.showTitle() }, cr.buttons?.[1] ?? t.quitToTitle),
        ),
      ),
    );
    this.publishRemote();
  }

  // ======================= overlays =======================
  openOverlay(o: Exclude<Overlay, null>) {
    this.closeOverlay();
    this.overlay = o;
    clearTimeout(this.autoTimer);
    const t = this.t;
    const body = h('div.overlay-body');
    const el = h('div.overlay', { role: 'dialog', 'aria-modal': 'true', onclick: (e: Event) => e.target === el && this.closeOverlay() }, h('div.sheet', {}, body, h('button.close', { onclick: () => this.closeOverlay(), 'aria-label': t.close }, '×')));
    this.overlayEl = el;
    add(document.body, el);
    if (o === 'menu') this.renderMenu(body);
    if (o === 'status') this.renderStatus(body);
    if (o === 'log') this.renderLog(body);
    if (o === 'settings') this.renderSettings(body);
    if (o === 'saves') this.renderSaves(body, this.screen === 'play' ? 'save' : 'load');
    if (o === 'export') this.renderExport(body);
    if (o === 'remote') void this.renderRemote(body);
    (el.querySelector('button:not(.close), input, select') as HTMLElement | null)?.focus();
  }

  closeOverlay() {
    this.overlayEl?.remove();
    this.overlayEl = null;
    this.overlay = null;
  }

  private renderMenu(body: HTMLElement) {
    const t = this.t;
    add(body, 
      h('h2', {}, t.menu),
      h(
        'nav.menu',
        {},
        h('button.primary', { onclick: () => this.closeOverlay() }, t.resume),
        h('button', { onclick: () => this.openOverlay('saves') }, `${t.save} / ${t.load}`),
        h('button', { onclick: () => this.openOverlay('export') }, `${t.exportSave} / ${t.importSave}`),
        h('button', { onclick: () => this.openOverlay('settings') }, t.settings),
        h('button', { onclick: () => this.openOverlay('remote') }, t.remote),
        h('button', { onclick: () => this.showTitle() }, t.quitToTitle),
      ),
      h('p.keys', {}, t.keys),
    );
  }

  private renderStatus(body: HTMLElement) {
    const t = this.t;
    const s = this.game;
    if (!s) return;
    add(body, 
      h('h2', {}, `${s.player.name} · ${s.player.house}`),
      h('h3', {}, t.stats),
      h('ul.stat-list', {}, STAT_NAMES.map((k) => h('li', {}, h('span.stat-name', {}, t[k]), h('span.stat-dots', {}, dots(s.stats[k], 10))))),
      h('h3', {}, t.items),
      s.items.length ? h('ul.items', {}, s.items.map((i) => h('li', {}, displayName(i)))) : h('p.muted', {}, t.nothing),
      h('h3', {}, t.relations),
      h(
        'ul.relations',
        {},
        Object.entries(s.relations).map(([id, v]) => h('li', {}, h('span', {}, displayName(id)), h('span.rel', { 'data-sign': Math.sign(v) }, v > 0 ? '♥'.repeat(Math.min(v, 6)) : v < 0 ? '✕'.repeat(Math.min(-v, 6)) : '·'))),
      ),
    );
  }

  private renderLog(body: HTMLElement) {
    const t = this.t;
    const s = this.game;
    if (!s) return;
    const vars = playerVars(s);
    const sc = currentScene(this.story, s);
    add(body, 
      h('h2', {}, t.log),
      h(
        'ol.log',
        {},
        s.history.map((e) => {
          const scene = this.story.scenes[e.scene];
          const ch = e.choice !== undefined ? scene?.choices?.[e.choice] : undefined;
          return h('li', {}, h('strong', {}, interpolate(scene?.title ?? '', vars)), ch && h('span', {}, ` → ${interpolate(ch.label, vars)}`), e.roll && h('span.muted', {}, ` (🎲 ${e.roll.die}+${e.roll.bonus}/${e.roll.difficulty})`));
        }),
        h('li.now', {}, h('strong', {}, interpolate(sc.title ?? '', vars)), this.paras.slice(0, this.paraIdx).map((p) => h('p', {}, p.text))),
      ),
    );
    requestAnimationFrame(() => (body.parentElement!.scrollTop = 1e6));
  }

  private renderSaves(body: HTMLElement, mode: 'save' | 'load') {
    const t = this.t;
    const list = h('ul.slots');
    const fmt = (d: number) => new Date(d).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
    const slots: SlotId[] = ['auto', ...SLOTS];
    for (const slot of slots) {
      const f = readSave(slot);
      const name = slot === 'auto' ? t.autosave : t.slot(slot);
      const info = f ? `${f.state.player.name} · ${f.sceneTitle} · ${fmt(f.savedAt)}` : t.empty;
      const canSave = mode === 'save' && slot !== 'auto' && this.game;
      list.append(
        h(
          'li',
          {},
          h('div', {}, h('strong', {}, name), h('span.muted', {}, info)),
          canSave &&
            h('button', {
              onclick: () => {
                const ok = writeSave(slot, this.game!, currentScene(this.story, this.game!).title ?? '');
                this.toast(ok ? t.saved : t.noStorage);
                this.openOverlay('saves');
              },
            }, t.save),
          f &&
            h('button', {
              onclick: async () => {
                const st = storyById(f.storyId);
                if (!st) return;
                await this.wake();
                this.story = st;
                this.toast(t.loaded);
                this.startFromState(f.state);
              },
            }, t.load),
        ),
      );
    }
    add(body, h('h2', {}, mode === 'save' ? `${t.save} / ${t.load}` : t.load), !this.storageOk && h('p.warn', {}, t.noStorage), list);
  }

  private renderExport(body: HTMLElement) {
    const t = this.t;
    const text = this.game ? JSON.stringify({ version: 1, savedAt: Date.now(), storyId: this.game.storyId, sceneTitle: currentScene(this.story, this.game).title ?? '', state: this.game }) : '';
    const area = h('textarea.export', { rows: 8, spellcheck: 'false' }) as HTMLTextAreaElement;
    area.value = text;
    add(body, 
      h('h2', {}, `${t.exportSave} / ${t.importSave}`),
      h('p', {}, t.exportHelp),
      area,
      h(
        'div.row',
        {},
        h('button', { onclick: () => void navigator.clipboard?.writeText(area.value).then(() => this.toast('✓')) }, t.exportSave),
        h('button.primary', {
          onclick: async () => {
            const f = parseSave(area.value);
            const st = f && storyById(f.storyId);
            if (!f || !st || !st.scenes[f.state.sceneId]) return this.toast(t.importFailed);
            await this.wake();
            this.story = st;
            this.startFromState(f.state);
          },
        }, t.importSave),
      ),
    );
  }

  private renderSettings(body: HTMLElement) {
    const t = this.t;
    const s = this.settings;
    const set = (patch: Partial<Settings>) => {
      this.settings = { ...this.settings, ...patch };
      this.applySettings();
      this.openOverlay('settings');
    };
    const radio = <K extends keyof Settings>(label: string, key: K, opts: [Settings[K], string][]) =>
      h(
        'fieldset',
        {},
        h('legend', {}, label),
        opts.map(([v, l]) => h('button.pill', { 'aria-pressed': String(s[key] === v), onclick: () => set({ [key]: v } as Partial<Settings>) }, l)),
      );
    const slider = (label: string, key: keyof Settings['volumes']) =>
      h(
        'label.slider',
        {},
        h('span', {}, label),
        h('input', {
          type: 'range',
          min: 0,
          max: 1,
          step: 0.05,
          value: s.volumes[key],
          oninput: (e: Event) => {
            this.settings.volumes = { ...this.settings.volumes, [key]: Number((e.target as HTMLInputElement).value) };
            this.applySettings();
          },
        }),
      );
    add(body, 
      h('h2', {}, t.settings),
      radio(t.animation, 'animation', [['full', t.animFull], ['reduced', t.animReduced], ['off', t.animOff]]),
      radio(t.transitions, 'transitions', [['auto', t.transAuto], ['cut', t.transCut]]),
      radio(t.theme, 'theme', [['paper', t.themePaper], ['ink', t.themeInk]]),
      radio(t.textSize, 'textSize', [[1.05, 'A'], [1.2, 'A+'], [1.4, 'A++']]),
      radio(t.autoAdvance, 'autoAdvance', [[false, t.off], [true, t.on]]),
      radio(t.sound, 'sound', [[true, t.on], [false, t.off]]),
      slider(t.master, 'master'),
      slider(t.ambience, 'ambience'),
      slider(t.effects, 'sfx'),
      radio(t.voiceOn, 'voice', [[false, t.off], [true, t.on]]),
      slider(t.voice, 'voice'),
      h('p.keys', {}, t.keys),
    );
  }

  // ======================= phone remote =======================
  setRemote(r: Remote | null) {
    this.remote = r;
  }

  private async renderRemote(body: HTMLElement) {
    const t = this.t;
    add(body, h('h2', {}, t.remote));
    const { createRemote, remoteAvailable } = await import('../remote/host');
    if (!remoteAvailable()) {
      add(body, h('p', {}, t.remoteUnavailable));
      return;
    }
    if (!this.remote) {
      try {
        this.remote = await createRemote((input) => this.onRemoteInput(input));
      } catch (e) {
        console.error(e);
        add(body, h('p.warn', {}, t.remoteError));
        return;
      }
    }
    const r = this.remote;
    const qr = h('div.qr', { html: r.qrSvg });
    add(body, 
      h('p', {}, t.remoteHelp),
      h('div.remote-box', {}, qr, h('div', {}, h('p.code', {}, r.code), h('p.muted.url', {}, r.url))),
      h('div.row', {}, h('button', {
        onclick: async () => {
          await this.remote?.close();
          this.remote = null;
          this.closeOverlay();
        },
      }, t.remoteOff)),
    );
    this.publishRemote();
  }

  /** What the phone shows: title, choices once they are on screen, and the ending. */
  private publishRemote() {
    if (!this.remote) return;
    const view: RemoteView = { rev: ++this.remoteRev, screen: this.screen, title: '', choices: [], canAdvance: false, ending: null };
    if (this.game && (this.screen === 'play' || this.screen === 'end')) {
      const sc = currentScene(this.story, this.game);
      view.title = interpolate(sc.title ?? '', playerVars(this.game));
      if (this.screen === 'play' && this.paraIdx >= this.paras.length && !this.busy) {
        let n = 0;
        view.choices = visibleChoices(this.story, this.game).map((v) => ({
          id: String(v.index),
          n: ++n,
          label: interpolate(v.choice.label, playerVars(this.game!)),
          locked: !v.available,
          lockedHint: v.available ? null : v.choice.lockedHint ?? null,
        }));
        if (sc.ending) view.choices.push({ id: 'ending', n: ++n, label: `${this.t.seeEnding}: ${sc.ending.title}`, locked: false, lockedHint: null });
      }
      view.canAdvance = this.screen === 'play' && this.paraIdx < this.paras.length;
      if (this.screen === 'end' && sc.ending) view.ending = { id: sc.ending.id, title: sc.ending.title, kind: sc.ending.kind };
    }
    void this.remote.publish(view);
  }

  private onRemoteInput(input: { choiceId: string; rev: number }) {
    if (input.rev !== this.remoteRev || this.overlay) return;
    if (input.choiceId === 'next') return this.advance();
    if (input.choiceId === 'all') return this.showAll();
    if (input.choiceId === 'ending') return this.showEnd();
    if (!this.game || this.paraIdx < this.paras.length) return;
    const v = visibleChoices(this.story, this.game).find((c) => String(c.index) === input.choiceId);
    if (v) void this.pick(v);
  }

  // ======================= misc =======================
  toast(text: string, kind = '') {
    const el = h('div.toast', { class: kind, role: 'status' }, text);
    this.toasts.append(el);
    setTimeout(() => el.classList.add('out'), kind === 'ripple' ? 4200 : 1800);
    setTimeout(() => el.remove(), kind === 'ripple' ? 4800 : 2400);
  }

  private onKey(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'Escape') {
      if (this.overlay) this.closeOverlay();
      else if (this.screen === 'play') this.openOverlay('menu');
      return;
    }
    if (e.key === 'f' || e.key === 'F') {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen?.().catch(() => {});
      return;
    }
    if (this.overlay || this.screen !== 'play') return;
    if (e.key === ' ' || e.key === 'Enter') {
      if ((e.target as HTMLElement).closest?.('button') && e.key === 'Enter') return;
      e.preventDefault();
      this.advance();
    } else if (/^[1-9]$/.test(e.key)) {
      const b = this.choicesEl?.querySelector<HTMLButtonElement>(`button[data-key="${e.key}"]`);
      if (b && !b.disabled) b.click();
    } else if (e.key === 'h' || e.key === 'H') {
      this.hidden = !this.hidden;
      document.body.classList.toggle('text-hidden', this.hidden);
    } else if (e.key === 'l' || e.key === 'L') this.openOverlay('log');
    else if (e.key === 'i' || e.key === 'I' || e.key === 'Tab') {
      if (e.key === 'Tab') return;
      this.openOverlay('status');
    }
  }

  /** ?debug: scene number, counters and state sizes only, never story text (spoiler-free testing). */
  private updateDebug() {
    if (!this.debugEl || !this.game) return;
    const s = this.game;
    const ids = Object.keys(this.story.scenes).sort();
    const flags = Object.values(s.flags).filter(Boolean).length;
    fill(this.debugEl, 
      h('div', {}, `scene #${ids.indexOf(s.sceneId)} / ${ids.length} · step ${s.history.length} · draws ${s.draws} · loops ${s.loops}`),
      h('div', {}, `stats ${STAT_NAMES.map((k) => s.stats[k]).join('/')} · flags ${flags} · items ${s.items.length} · counters ${Object.values(s.counters).join('/')}`),
      h('button.small', {
        onclick: () => {
          const rep = runBot(this.story, 1000);
          const ends = allEndings(this.story);
          const lines = ends.map((e, i) => `ending ${i + 1}: ${(((rep.endings[e.id] ?? 0) / rep.runs) * 100).toFixed(1)}%`);
          this.debugEl!.append(h('pre', {}, `stuck ${rep.stuck}, errors ${rep.errors.length}, avg steps ${rep.avgSteps.toFixed(1)}\n${lines.join('\n')}`));
        },
      }, this.t.debugQuick),
    );
  }

}

function dots(v: number, max: number) {
  return '●'.repeat(Math.max(0, v)) + '○'.repeat(Math.max(0, max - v));
}
