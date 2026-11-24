// The two-player game on the big screen: a lobby where each phone takes a seat, the shared story,
// whose turn it is, and an end screen with both players' paths. Without phones, the same game can be
// played on one screen, taking turns.
import type { AudioEngine } from '../audio/audio';
import {
  choosers,
  duoChoices,
  duoReady,
  duoScene,
  duoText,
  duoVars,
  newDuoGame,
  PLAYER_IDS,
  resolveDuo,
  submitDuo,
  type DuoScene,
  type DuoSetup,
  type DuoState,
  type DuoStory,
  type PlayerId,
} from '../engine/duo';
import { readJSON, writeJSON } from '../engine/save';
import { fillVars, segmentParagraph, speakable, voiceKey } from '../engine/segments';
import { isDialogue, unquote } from '../engine/text';
import { STAT_NAMES, type RollResult, type StatName } from '../engine/types';
import type { DuoRoom, DuoRoomView, DuoSetupInput } from '../remote/duoHost';
import mirrorStory from '../stories/mirror.json';
import mirrorVoices from '../stories/mirror.voices.json';
import { HOUSE_COLORS, lookFor, LOOKS, mirrored } from '../visuals/actors';
import { DEFAULT_APPEARANCE, HAIR_COLOURS, HAIR_STYLES, HEIGHTS, playerLook, SKIN_TONES, type Appearance } from '../visuals/appearance';
import type { ActorSpec, Stage } from '../visuals/stage';
import { add, clear, fill, h } from './dom';
import { T } from './i18n';

export const DUO_STORY = mirrorStory as unknown as DuoStory;
const VOICE_LINES = (mirrorVoices as { lines: Record<string, string[]> }).lines;
const AUTOSAVE = 'duo-autosave';

type Mode = 'phones' | 'local';

export class DuoApp {
  private story = DUO_STORY;
  private game: DuoState | null = null;
  private mode: Mode = 'phones';
  /** Set when phones were wanted but no room could be opened. */
  private fellBack = false;
  private room: DuoRoom | null = null;
  private seats: Partial<Record<PlayerId, boolean>> = {};
  private setups: Partial<Record<PlayerId, DuoSetupInput>> = {};
  private ripples: Partial<Record<PlayerId, string>> = {};
  private rev = 0;
  private screen: 'lobby' | 'play' | 'end' = 'lobby';
  private paras: { text: string; raw: string; index: number }[] = [];
  private paraIdx = 0;
  private busy = false;
  private token = 0;
  private narration!: HTMLElement;
  private choicesEl!: HTMLElement;
  private controlsEl!: HTMLElement;
  private bubble: { el: HTMLElement; actor: string } | null = null;
  private keyHandler = (e: KeyboardEvent) => this.onKey(e);

  constructor(
    private stage: Stage,
    private audio: AudioEngine,
    private ui: HTMLElement,
    private onExit: () => void,
  ) {
    const follow = () => {
      this.positionBubble();
      if (this.screen !== 'lobby' || this.bubble) requestAnimationFrame(follow);
      else requestAnimationFrame(follow);
    };
    requestAnimationFrame(follow);
  }

  // ======================= lobby =======================
  async open() {
    addEventListener('keydown', this.keyHandler);
    await this.audio.init();
    this.screen = 'lobby';
    this.showLobbyStage();
    this.renderLobby();
    const { duoRoomAvailable, createDuoRoom } = await import('../remote/duoHost');
    if (this.mode === 'phones' && duoRoomAvailable() && !this.room) {
      try {
        this.room = await createDuoRoom({
          seats: (s) => ((this.seats = s), this.renderLobby()),
          setup: (p, st) => ((this.setups = { ...this.setups, [p]: st }), this.showLobbyStage(), this.renderLobby()),
          input: (p, i) => this.onInput(p, i),
        });
      } catch (e) {
        console.warn(e);
        this.mode = 'local';
        this.fellBack = true;
      }
    } else if (!duoRoomAvailable()) this.mode = 'local';
    this.renderLobby();
  }

  /** The lobby shows both players as they currently look. */
  private showLobbyStage() {
    const actors = this.actorsFor(['ingerid', 'kristian']);
    void this.stage.show({ preset: 'ballroom-night', particles: ['candles', 'dust'], mood: 'cozy', actors }, 'cut');
  }

  private close() {
    removeEventListener('keydown', this.keyHandler);
    this.audio.stopVoice();
    this.hideBubble();
    void this.room?.close();
    this.room = null;
    this.onExit();
  }

  private renderLobby() {
    if (this.screen !== 'lobby') return;
    const st = this.story;
    const saved = readJSON<{ state?: DuoState }>(AUTOSAVE, {}).state;
    const ready = PLAYER_IDS.every((p) => this.setups[p]);
    const playerRow = (p: PlayerId) => {
      const name = st.players.find((x) => x.id === p)!.name;
      const setup = this.setups[p];
      const status = setup ? `Ready · ${setup.house}` : this.seats[p] ? 'Joined, choosing house…' : 'Waiting for phone';
      return h('li', { class: setup ? 'ready' : '' }, h('strong', {}, name), h('span.muted', {}, status));
    };
    fill(
      this.ui,
      h(
        'main.panel.duo-lobby',
        {},
        h('p.kind', {}, 'Two players'),
        h('h2', {}, st.title),
        h('p', {}, st.tagline),
        this.mode === 'phones' && !this.room
          ? h('p.muted', {}, 'Opening a room for your phones…')
          : this.mode === 'phones' && this.room
          ? [
              h('p.muted', {}, 'Ingerid and Kristian: scan the code with your own phone, pick who you are, and choose your house. Your choices stay on your phone.'),
              h('div.remote-box', {}, h('div.qr', { html: this.room.qrSvg }), h('div', {}, h('p.code', {}, this.room.code), h('p.muted.url', {}, this.room.url))),
              h('ul.duo-seats', {}, PLAYER_IDS.map(playerRow)),
            ]
          : this.localSetup(),
        h(
          'div.row',
          {},
          h('button', { onclick: () => this.close() }, T.back),
          this.mode === 'phones' && h('button', { onclick: () => ((this.mode = 'local'), this.renderLobby()) }, 'Play on this screen instead'),
          saved && h('button', { onclick: () => this.start(saved) }, 'Continue where you left off'),
          h('button.primary', { disabled: !ready, onclick: () => this.start() }, 'Begin'),
        ),
      ),
    );
    this.publish();
  }

  /** On one screen: each player picks a house and qualities here. */
  private localSetup() {
    const box = h('div.duo-local');
    const draw = () => {
      clear(box);
      for (const p of PLAYER_IDS) {
        const name = this.story.players.find((x) => x.id === p)!.name;
        const s = (this.setups[p] ??= { house: this.story.houses[p === 'ingerid' ? 2 : 0], bonus: { courage: 0, wit: 0, kindness: 0, cunning: 0 }, look: { ...DEFAULT_APPEARANCE[p] } });
        const look = (s.look ??= { ...DEFAULT_APPEARANCE[p] }) as Appearance;
        const setLook = (patch: Partial<Appearance>) => {
          Object.assign(look, patch);
          draw();
          this.showLobbyStage();
        };
        const left = this.story.bonusPoints - Object.values(s.bonus).reduce((a, b) => a + b, 0);
        add(
          box,
          h(
            'section.duo-player',
            {},
            h('h3', {}, name),
            h('div.houses', {}, this.story.houses.map((hs) => h('button.house', { 'aria-checked': String(s.house === hs), role: 'radio', style: `--house:${HOUSE_COLORS[hs] ?? '#777'}`, onclick: () => ((s.house = hs), draw(), this.renderLobbyButtons()) }, hs))),
            h(
              'div.stats-edit',
              {},
              STAT_NAMES.map((k) =>
                h(
                  'div.stat-row',
                  {},
                  h('span.stat-name', {}, T[k]),
                  h('button.small', { disabled: s.bonus[k] === 0, onclick: () => ((s.bonus[k] -= 1), draw(), this.renderLobbyButtons()) }, '−'),
                  h('span.stat-dots', {}, '●'.repeat(this.story.initialState.stats[k] + s.bonus[k])),
                  h('button.small', { disabled: left === 0, onclick: () => ((s.bonus[k] += 1), draw(), this.renderLobbyButtons()) }, '+'),
                ),
              ),
            ),
            h('p.points', {}, T.pointsLeft(left)),
            h('div.looks', {},
              h('div.look-row', {}, HAIR_STYLES.map((x) => h('button.pill', { 'aria-pressed': String(look.hairStyle === x.id), onclick: () => setLook({ hairStyle: x.id }) }, x.label))),
              h('div.look-row', { 'aria-label': 'Hair colour' }, HAIR_COLOURS.map((c) => h('button.swatch', { 'aria-pressed': String(look.hair === c), style: `--c:${c}`, 'aria-label': 'Hair colour', onclick: () => setLook({ hair: c }) }))),
              h('div.look-row', { 'aria-label': 'Skin' }, SKIN_TONES.map((c) => h('button.swatch', { 'aria-pressed': String(look.skin === c), style: `--c:${c}`, 'aria-label': 'Skin tone', onclick: () => setLook({ skin: c }) }))),
              h('div.look-row', {}, HEIGHTS.map((x) => h('button.pill', { 'aria-pressed': String(look.height === x.id), onclick: () => setLook({ height: x.id }) }, x.label))),
            ),
          ),
        );
      }
    };
    draw();
    return [
      this.fellBack && h('p.warn', {}, 'Could not open a room for phones (no connection), so you play on this screen.'),
      h('p.muted', {}, 'Take turns at the keyboard. When it is one player\'s choice, the other looks away.'),
      box,
    ];
  }

  private renderLobbyButtons() {
    const begin = this.ui.querySelector<HTMLButtonElement>('.duo-lobby .primary');
    if (begin) begin.disabled = !this.localReady();
  }

  private localReady() {
    return PLAYER_IDS.every((p) => {
      const s = this.setups[p];
      return s && Object.values(s.bonus).reduce((a, b) => a + b, 0) === this.story.bonusPoints;
    });
  }

  // ======================= playing =======================
  private start(saved?: DuoState) {
    if (!saved && this.mode === 'local' && !this.localReady()) return;
    const setup = {} as DuoSetup;
    for (const p of PLAYER_IDS) setup[p] = { house: this.setups[p]?.house ?? this.story.houses[0], bonus: (this.setups[p]?.bonus ?? {}) as Partial<Record<StatName, number>>, look: this.setups[p]?.look };
    this.game = saved ?? newDuoGame(this.story, setup);
    this.screen = 'play';
    this.narration = h('div.narration', { 'aria-live': 'polite' });
    this.choicesEl = h('ol.choices');
    this.controlsEl = h('div.controls');
    fill(
      this.ui,
      h(
        'div.play',
        {},
        h('header.hud', {}, h('div.scene-title'), h('div.hud-buttons', {}, h('button.icon', { onclick: () => this.menu() }, T.menu))),
        h('div.stage-click', { onclick: () => this.advance() }),
        h('section.textbox', { onclick: (e: Event) => !(e.target as HTMLElement).closest('button') && this.advance() }, this.narration, this.controlsEl, this.choicesEl),
      ),
    );
    void this.runScene();
  }

  private actorsFor(cast: string[], s?: DuoState): ActorSpec[] {
    const n = cast.length;
    return cast.map((entry, i) => {
      const [name, side] = entry.split('@');
      const isPlayer = name === 'ingerid' || name === 'kristian';
      const chosen = isPlayer ? ((s?.players[name as PlayerId].look ?? this.setups[name as PlayerId]?.look) as Partial<Appearance> | undefined) : undefined;
      let look = isPlayer ? playerLook(name as PlayerId, chosen) : lookFor(name) ?? LOOKS.player;
      if (side === 'mirror') look = mirrored(look);
      const house = isPlayer ? (s?.players[name as PlayerId].house ?? this.setups[name as PlayerId]?.house) : undefined;
      const accent = house && side !== 'mirror' ? HOUSE_COLORS[house] : undefined;
      const x = n === 1 ? 0.36 : 0.22 + (i * 0.56) / (n - 1);
      return { id: name === 'ingerid' || name === 'kristian' ? name : 'speaker:' + name, look, accent, x, facing: (isPlayer ? 1 : -1) as 1 | -1 };
    });
  }

  private async runScene() {
    const s = this.game!;
    const sc = duoScene(this.story, s);
    const token = ++this.token;
    this.audio.stopVoice();
    this.hideBubble();
    this.audio.scene(sc as never);
    writeJSON(AUTOSAVE, { state: s });
    const vars = duoVars(s);
    const titleEl = this.ui.querySelector('.scene-title');
    if (titleEl) fill(titleEl, h('span', {}, fillVars(sc.title ?? '', vars)));
    clear(this.narration);
    clear(this.choicesEl);
    clear(this.controlsEl);
    this.choicesEl.parentElement!.classList.remove('choosing');
    this.busy = true;
    this.publish();
    await this.stage.show({ preset: sc.visual?.preset, particles: sc.visual?.particles, mood: sc.mood, actors: this.actorsFor(sc.cast ?? [], s) }, 'cut');
    if (token !== this.token) return;
    this.busy = false;
    this.paras = duoText(sc, s);
    this.paraIdx = 0;
    this.advance();
  }

  private advance() {
    if (this.screen !== 'play' || this.busy || !this.game) return;
    if (this.paraIdx >= this.paras.length) return;
    const sc = duoScene(this.story, this.game);
    const p = this.paras[this.paraIdx++];
    const speaker = sc.speaker ? 'speaker:' + sc.speaker : null;
    if (isDialogue(p.text) && speaker && this.stage.headPos(speaker)) this.showBubble(speaker, unquote(p.text));
    else {
      this.hideBubble();
      this.narration.querySelectorAll('p.current').forEach((x) => x.classList.remove('current'));
      add(this.narration, h('p.current', { class: isDialogue(p.text) ? 'speech' : '' }, p.text));
      this.narration.scrollTop = this.narration.scrollHeight;
    }
    void this.speak(sc, p);
    if (this.paraIdx >= this.paras.length) this.showTurn();
    else fill(this.controlsEl, h('button.next', { onclick: () => this.advance() }, '▸'), h('button.link', { onclick: () => this.showAll() }, T.showAll));
    this.publish();
  }

  private showAll() {
    while (this.paraIdx < this.paras.length) this.advance();
  }

  private async speak(sc: DuoScene, p: { raw: string; index: number }) {
    const vars = duoVars(this.game!);
    const segs = segmentParagraph(p.raw, VOICE_LINES[`${sc.id}#${p.index}`], sc.speaker);
    const parts = await Promise.all(
      segs.map(async (seg, i) => {
        const text = speakable(fillVars(seg.text, vars));
        return { key: await voiceKey(sc.id, p.index, i, text), text, speaker: seg.speaker };
      }),
    );
    void this.audio.speak(parts);
  }

  /** After the text: whose turn it is, a Continue button, or the ending. */
  private showTurn() {
    const s = this.game!;
    const sc = duoScene(this.story, s);
    clear(this.controlsEl);
    clear(this.choicesEl);
    this.choicesEl.parentElement!.classList.add('choosing');
    const vars = duoVars(s);
    if (sc.ending) {
      add(this.choicesEl, h('li', {}, h('button.choice.ending-btn', { 'data-key': 1, onclick: () => this.showEnd() }, h('span.key', {}, '1'), h('span.label', {}, `${T.seeEnding}: ${fillVars(sc.ending.title, vars)}`))));
    } else {
      const who = choosers(this.story, s);
      if (!who.length) {
        add(this.choicesEl, h('li', {}, h('button.choice', { 'data-key': 1, onclick: () => this.resolve() }, h('span.key', {}, '1'), h('span.label', {}, 'Continue'))));
      } else {
        const p = who[0];
        const name = s.players[p].name;
        if (this.mode === 'phones') {
          add(this.choicesEl, h('li.turn', {}, h('span.turn-dot', { 'data-player': p }), `${name} is choosing on their phone…`));
        } else {
          add(this.choicesEl, h('li.turn', {}, h('span.turn-dot', { 'data-player': p }), `${name}'s choice. ${PLAYER_IDS.filter((x) => x !== p).map((x) => s.players[x].name).join(' and ')}, look away.`));
          let n = 0;
          for (const v of duoChoices(this.story, s, p)) {
            const key = ++n;
            add(
              this.choicesEl,
              h(
                'li',
                {},
                h(
                  'button.choice',
                  { disabled: !v.available, 'data-key': key, onclick: () => this.pick(p, v.index) },
                  h('span.key', {}, String(key)),
                  h('span.label', {}, fillVars(v.choice.label, vars)),
                  v.choice.check && v.available && h('span.check', {}, `🎲 ${T.check(T[v.choice.check.stat], v.choice.check.difficulty)}`),
                  !v.available && v.choice.lockedHint && h('span.hint', {}, `${T.locked}: ${fillVars(v.choice.lockedHint, vars)}`),
                ),
              ),
            );
          }
        }
      }
    }
    this.narration.scrollTop = this.narration.scrollHeight;
    this.publish();
  }

  private pick(p: PlayerId, index: number) {
    if (this.busy || !this.game) return;
    try {
      this.game = submitDuo(this.story, this.game, p, index);
    } catch {
      return;
    }
    if (duoReady(this.story, this.game)) void this.resolve();
  }

  private async resolve() {
    if (this.busy || !this.game || !duoReady(this.story, this.game)) return;
    this.busy = true;
    this.audio.stopVoice();
    this.hideBubble();
    clear(this.choicesEl);
    const res = resolveDuo(this.story, this.game);
    for (const p of PLAYER_IDS) if (res.rolls[p]) await this.showRoll(this.game.players[p].name, res.rolls[p]!);
    const vars = duoVars(this.game);
    for (const r of res.ripples) {
      const text = fillVars(r.text, vars);
      if (this.mode === 'phones') this.ripples[r.player] = text;
      else this.toast(`${this.game.players[r.player].name}: ${text}`);
    }
    this.game = res.state;
    this.busy = false;
    void this.runScene();
  }

  private showRoll(name: string, r: RollResult): Promise<void> {
    const face = h('div.die', {}, '?');
    const card = h('div.roll', { role: 'status' }, h('p.roll-who', {}, name), face, h('p.roll-line'), h('p.verdict'));
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
      let i = 0;
      const spin = setInterval(() => {
        face.textContent = String(1 + Math.floor(Math.random() * 10));
        if (++i > 12) {
          clearInterval(spin);
          face.textContent = String(r.die);
          card.querySelector('.roll-line')!.textContent = T.rollLine(r.die, T[r.stat], r.bonus, r.difficulty);
          card.querySelector('.verdict')!.textContent = r.success ? T.success : T.failure;
          card.classList.add(r.success ? 'success' : 'failure');
          void this.audio.sfx(r.success ? 'chime_success' : 'heartbeat');
          card.addEventListener('click', finish);
          setTimeout(finish, 2200);
        }
      }, 60);
    });
  }

  // ======================= the phones =======================
  private onInput(p: PlayerId, input: { choiceId: string; rev: number }) {
    if (input.rev !== this.rev) return;
    if (input.choiceId === 'next') return this.advance();
    if (input.choiceId === 'all') return this.showAll();
    if (this.screen !== 'play' || !this.game || this.paraIdx < this.paras.length) return;
    const sc = duoScene(this.story, this.game);
    if (input.choiceId === 'continue' && !sc.ending && !choosers(this.story, this.game).length) return void this.resolve();
    if (!choosers(this.story, this.game).includes(p)) return;
    this.ripples[p] = undefined;
    this.pick(p, Number(input.choiceId));
  }

  private publish() {
    if (!this.room) return;
    const s = this.game;
    const view: DuoRoomView = {
      rev: ++this.rev,
      mode: 'duo',
      screen: this.screen,
      title: '',
      canAdvance: false,
      houses: this.story.houses,
      bonusPoints: this.story.bonusPoints,
      players: {} as DuoRoomView['players'],
      ending: null,
    };
    const textDone = this.screen === 'play' && this.paraIdx >= this.paras.length && !this.busy;
    const turn = s && this.screen === 'play' ? choosers(this.story, s)[0] : undefined;
    for (const p of PLAYER_IDS) {
      const vars = s ? duoVars(s) : {};
      let n = 0;
      const mine = s && textDone && turn === p;
      view.players[p] = {
        name: this.story.players.find((x) => x.id === p)!.name,
        turn: !!mine,
        choices: mine
          ? duoChoices(this.story, s!, p).map((v) => ({ id: String(v.index), n: ++n, label: fillVars(v.choice.label, vars), locked: !v.available, lockedHint: v.available ? null : fillVars(v.choice.lockedHint ?? '', vars) || null }))
          : [],
        waitingFor: s && textDone && turn && turn !== p ? s.players[turn].name : null,
        ripple: this.ripples[p] ?? null,
      };
    }
    if (s) {
      const sc = duoScene(this.story, s);
      view.title = fillVars(sc.title ?? '', duoVars(s));
      view.canAdvance = this.screen === 'play' && !this.busy && this.paraIdx < this.paras.length;
      if (this.screen === 'end' && sc.ending) view.ending = { title: fillVars(sc.ending.title, duoVars(s)), kind: sc.ending.kind };
    }
    this.room.publish(view);
  }

  // ======================= ending =======================
  private showEnd() {
    const s = this.game!;
    const sc = duoScene(this.story, s);
    if (!sc.ending) return;
    this.screen = 'end';
    this.audio.stopVoice();
    this.hideBubble();
    writeJSON(AUTOSAVE, {});
    const meta = readJSON<{ endings: Record<string, string[]> }>('meta', { endings: {} });
    const found = new Set([...(meta.endings[this.story.id] ?? []), sc.ending.id]);
    writeJSON('meta', { ...meta, endings: { ...meta.endings, [this.story.id]: [...found] } });
    const vars = duoVars(s);
    const all = Object.values(this.story.scenes).filter((x) => x.ending).map((x) => x.ending!);
    const path = (p: PlayerId) =>
      s.history
        .filter((e) => e.picks[p])
        .map((e) => {
          const scene = this.story.scenes[e.scene];
          const pick = e.picks[p]!;
          const others = (scene.choices?.[p] ?? []).length - 1;
          return h(
            'li',
            {},
            h('span.step-scene', {}, fillVars(scene.title ?? '', vars)),
            h('span.step-choice', {}, fillVars(scene.choices![p]![pick.choice].label, vars)),
            pick.roll && h('span.step-roll', { class: pick.roll.success ? 'ok' : 'bad' }, `🎲 ${pick.roll.die}+${pick.roll.bonus}`),
            others > 0 && h('span.step-others', {}, '?'.repeat(Math.min(others, 6)).split('').map((q) => h('i', {}, q))),
          );
        });
    fill(
      this.ui,
      h(
        'main.panel.end',
        { 'data-kind': sc.ending.kind },
        h('p.kind', {}, T.kinds[sc.ending.kind] ?? T.ending),
        h('h2', {}, fillVars(sc.ending.title, vars)),
        h('p.found', {}, T.endingsFound(all.filter((e) => found.has(e.id)).length, all.length)),
        h('ul.ending-grid', {}, all.map((e) => h('li', { class: found.has(e.id) ? 'got' : '' }, found.has(e.id) ? fillVars(e.title, vars) : '? ? ?'))),
        h('div.duo-paths', {}, PLAYER_IDS.map((p) => h('details.path', { open: true }, h('summary', {}, `${s.players[p].name}'s path`), h('ol', {}, path(p))))),
        h('div.credits', {}, h('h3', {}, this.story.credits?.title ?? this.story.title), (this.story.credits?.lines ?? []).map((l) => h('p', {}, l))),
        h(
          'div.row',
          {},
          h('button.primary', { onclick: () => ((this.game = null), (this.screen = 'lobby'), this.renderLobby()) }, T.playAgain),
          h('button', { onclick: () => this.close() }, T.quitToTitle),
        ),
      ),
    );
    this.publish();
  }

  // ======================= misc =======================
  private menu() {
    const el = h(
      'div.overlay',
      { role: 'dialog', onclick: (e: Event) => e.target === el && el.remove() },
      h('div.sheet', {}, h('h2', {}, T.menu), h('nav.menu', {}, h('button.primary', { onclick: () => el.remove() }, T.resume), h('button', { onclick: () => (el.remove(), this.close()) }, T.quitToTitle)), h('p.keys', {}, 'Your game is saved after every scene.')),
    );
    add(document.body, el);
  }

  private toast(text: string) {
    const el = h('div.toast.ripple', { role: 'status' }, text);
    add(document.getElementById('toasts')!, el);
    setTimeout(() => el.classList.add('out'), 4200);
    setTimeout(() => el.remove(), 4800);
  }

  private showBubble(actor: string, text: string) {
    this.hideBubble();
    const el = h('div.bubble', { role: 'status' }, h('p', {}, text));
    add(document.getElementById('bubbles')!, el);
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
    if (!pos) return void (el.style.opacity = '0');
    const w = el.offsetWidth;
    const x = Math.max(12, Math.min(innerWidth - w - 12, pos.x - w / 2));
    el.style.transform = `translate(${x}px, ${Math.max(60, pos.y - el.offsetHeight - 14)}px)`;
    el.style.setProperty('--tail', `${Math.max(16, Math.min(w - 16, pos.x - x))}px`);
    el.style.opacity = '1';
  }

  private onKey(e: KeyboardEvent) {
    if (document.querySelector('.overlay') || this.screen !== 'play') return;
    if (e.key === ' ' || e.key === 'Enter') {
      if ((e.target as HTMLElement).closest?.('button') && e.key === 'Enter') return;
      e.preventDefault();
      this.advance();
    } else if (/^[1-9]$/.test(e.key)) {
      this.choicesEl.querySelector<HTMLButtonElement>(`button[data-key="${e.key}"]:not([disabled])`)?.click();
    } else if (e.key === 'Escape') this.menu();
  }
}
