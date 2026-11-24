// The painted locations. Each preset is a wide side-view picture (W x H) split into parallax layers.
// Everything is generated in code from the watercolour primitives, so there are no image assets.
import { arch, ellipse, glow, ground, makeRand, rect, tri, wash, type Pt, type Rand } from './paint';

export const W = 1800;
export const H = 900; // painted height; the screen shows about 720 of it (VIEW_H)
export const VIEW_H = 720;
export const FLOOR = 610; // where feet stand

export type Light = { x: number; y: number; r: number; color: string; flicker?: number; depth?: number };
type Ctx = CanvasRenderingContext2D;
type Painter = (ctx: Ctx, r: Rand) => void;

export type Preset = {
  area: string; // presets in the same area are one place (used to pick walk vs cut)
  night: boolean;
  layers: { depth: number; paint: Painter }[];
  lights: Light[];
  /** Placement of actors on the stage, as fractions of the view width. */
  actorY?: number;
};

// ---------- reusable painted things ----------
function stoneWall(ctx: Ctx, r: Rand, top: string, bottom: string, mortar: string) {
  ground(ctx, W, H, top, bottom, r);
  for (let y = 40; y < FLOOR; y += 46) {
    const off = (y / 46) % 2 ? 0 : 50;
    for (let x = -50 + off; x < W; x += 100) {
      if (r() < 0.55) wash(ctx, rect(x + 4, y + 4, 92, 38), mortar, r, { layers: 3, alpha: 0.05, spread: 4 });
    }
  }
}

function floor(ctx: Ctx, r: Rand, color: string, y = FLOOR - 20) {
  wash(ctx, rect(-40, y, W + 80, H - y + 40), color, r, { layers: 12, alpha: 0.14, spread: 8 });
  for (let x = 0; x < W; x += 140 + r() * 60) wash(ctx, rect(x, y + 4, 4, H - y), color, r, { layers: 2, alpha: 0.08, spread: 2 });
}

function window_(ctx: Ctx, r: Rand, x: number, y: number, w: number, h: number, glass: string, frame: string, pointed = true) {
  wash(ctx, arch(x - 10, y - 10, w + 20, h + 20, pointed), frame, r, { layers: 8, alpha: 0.12 });
  wash(ctx, arch(x, y, w, h, pointed), glass, r, { layers: 10, alpha: 0.16 });
  wash(ctx, rect(x + w / 2 - 3, y + 10, 6, h - 10), frame, r, { layers: 5, alpha: 0.18, spread: 2 });
  wash(ctx, rect(x, y + h * 0.55, w, 6), frame, r, { layers: 5, alpha: 0.18, spread: 2 });
}

function column(ctx: Ctx, r: Rand, x: number, w: number, color: string, top = 0) {
  wash(ctx, rect(x, top, w, FLOOR - top), color, r, { layers: 10, alpha: 0.12, spread: 5 });
  wash(ctx, rect(x - 12, FLOOR - 40, w + 24, 40), color, r, { layers: 6, alpha: 0.14 });
}

function bookshelf(ctx: Ctx, r: Rand, x: number, y: number, w: number, h: number, wood: string, books: string[]) {
  wash(ctx, rect(x, y, w, h), wood, r, { layers: 10, alpha: 0.16 });
  for (let sy = y + 16; sy < y + h - 40; sy += 70) {
    let bx = x + 12;
    while (bx < x + w - 24) {
      const bw = 10 + r() * 16;
      const bh = 40 + r() * 20;
      wash(ctx, rect(bx, sy + 56 - bh, bw, bh), books[Math.floor(r() * books.length)], r, { layers: 3, alpha: 0.22, spread: 2, edge: false });
      bx += bw + 2;
    }
    wash(ctx, rect(x, sy + 56, w, 8), wood, r, { layers: 4, alpha: 0.25, spread: 2 });
  }
}

function bed(ctx: Ctx, r: Rand, x: number, cover: string, wood: string) {
  const y = FLOOR - 90;
  wash(ctx, rect(x, y - 150, 12, 240), wood, r, { layers: 5, alpha: 0.2, spread: 3 });
  wash(ctx, rect(x + 228, y - 150, 12, 240), wood, r, { layers: 5, alpha: 0.2, spread: 3 });
  wash(ctx, rect(x - 10, y - 170, 260, 30), cover, r, { layers: 6, alpha: 0.14 }); // canopy
  wash(ctx, rect(x + 6, y + 10, 230, 60), cover, r, { layers: 10, alpha: 0.16 });
  wash(ctx, ellipse(x + 40, y + 10, 34, 16), '#e9e2d0', r, { layers: 6, alpha: 0.2 });
  wash(ctx, rect(x + 6, y + 60, 230, 22), wood, r, { layers: 5, alpha: 0.2 });
}

function torchBracket(ctx: Ctx, r: Rand, x: number, y: number) {
  wash(ctx, rect(x - 4, y, 8, 46), '#3a2a22', r, { layers: 4, alpha: 0.35, spread: 2 });
  wash(ctx, tri(x - 14, y - 6, 28, 16), '#3a2a22', r, { layers: 4, alpha: 0.35, spread: 2 });
}

function armour(ctx: Ctx, r: Rand, x: number, color: string) {
  wash(ctx, ellipse(x, FLOOR - 230, 22, 26), color, r, { layers: 6, alpha: 0.2 });
  wash(ctx, rect(x - 34, FLOOR - 205, 68, 100), color, r, { layers: 7, alpha: 0.2 });
  wash(ctx, rect(x - 26, FLOOR - 105, 20, 100), color, r, { layers: 5, alpha: 0.2 });
  wash(ctx, rect(x + 6, FLOOR - 105, 20, 100), color, r, { layers: 5, alpha: 0.2 });
  wash(ctx, rect(x + 44, FLOOR - 300, 6, 300), color, r, { layers: 4, alpha: 0.2, spread: 2 }); // halberd
}

function tower(ctx: Ctx, r: Rand, x: number, base: number, w: number, h: number, color: string) {
  wash(ctx, rect(x, base - h, w, h), color, r, { layers: 8, alpha: 0.14 });
  wash(ctx, tri(x - 12, base - h - w * 1.3, w + 24, w * 1.3), color, r, { layers: 8, alpha: 0.14 });
}

function skyline(ctx: Ctx, r: Rand, base: number, color: string) {
  let x = -40;
  while (x < W) {
    const w = 60 + r() * 140;
    const h = 60 + r() * 160;
    wash(ctx, rect(x, base - h, w, h + 40), color, r, { layers: 6, alpha: 0.13 });
    if (r() < 0.45) tower(ctx, r, x + w * 0.3, base - h + 4, 38, 60 + r() * 80, color);
    x += w - 10;
  }
}

function bell(ctx: Ctx, r: Rand, cx: number, top: number, s: number, color: string) {
  const p: Pt[] = [
    [cx - s * 0.32, top + s * 0.12],
    [cx - s * 0.18, top],
    [cx + s * 0.18, top],
    [cx + s * 0.32, top + s * 0.12],
    [cx + s * 0.4, top + s * 0.7],
    [cx + s * 0.58, top + s * 0.95],
    [cx - s * 0.58, top + s * 0.95],
    [cx - s * 0.4, top + s * 0.7],
  ];
  wash(ctx, p, color, r, { layers: 14, alpha: 0.18, spread: 4 });
  wash(ctx, ellipse(cx, top + s * 0.95, s * 0.58, s * 0.06), '#0b0a14', r, { layers: 6, alpha: 0.2 });
}

function stairs(ctx: Ctx, r: Rand, x0: number, color: string, edge: string, rising = true) {
  for (let i = 0; i < 14; i++) {
    const x = x0 + i * 70;
    const y = rising ? FLOOR - i * 34 : FLOOR - (13 - i) * 34;
    wash(ctx, rect(x, y - 34, 74, FLOOR - y + 34), color, r, { layers: 6, alpha: 0.22, spread: 3 });
    wash(ctx, rect(x, y - 36, 74, 6), edge, r, { layers: 4, alpha: 0.35, spread: 1.5, edge: false }); // lit tread
  }
}

function hedge(ctx: Ctx, r: Rand, x: number, y: number, w: number, color: string) {
  for (let i = 0; i < 5; i++) wash(ctx, ellipse(x + (i / 4) * w, y, w * 0.2, 50 + r() * 30), color, r, { layers: 5, alpha: 0.12, spread: 10 });
}

/** Dark soft shapes at the screen edges in the nearest layer, to frame the picture. */
function vignetteFront(ctx: Ctx, r: Rand, color: string) {
  wash(ctx, ellipse(-60, H * 0.55, 180, H * 0.7), color, r, { layers: 8, alpha: 0.1, spread: 30, edge: false });
  wash(ctx, ellipse(W + 60, H * 0.5, 180, H * 0.7), color, r, { layers: 8, alpha: 0.1, spread: 30, edge: false });
  wash(ctx, rect(-40, H - 60, W + 80, 120), color, r, { layers: 6, alpha: 0.12, spread: 14, edge: false });
}

const fogBank = (ctx: Ctx, r: Rand, color: string, y: number) => {
  for (let i = 0; i < 8; i++) wash(ctx, ellipse(r() * W, y + r() * 60, 260, 40), color, r, { layers: 4, alpha: 0.05, spread: 20, edge: false });
};

// ---------- presets ----------
const NIGHT_BOOKS = ['#5b3a52', '#2f4d5e', '#6b4b2a', '#3e5a3a', '#7a3a35'];
const DAY_BOOKS = ['#9b4a3c', '#4a6b80', '#8a6a3a', '#5f7d4e', '#7c4f6e'];

export const PRESETS: Record<string, Preset> = {
  'dormitory-night': {
    area: 'dormitory',
    night: true,
    layers: [
      {
        depth: 0.2,
        paint: (c, r) => {
          stoneWall(c, r, '#24264a', '#3a3463', '#151632');
          window_(c, r, 760, 110, 150, 280, '#4f6fa6', '#1a1a33');
          glow(c, 835, 240, 220, '#8fb0e8', 0.25);
        },
      },
      {
        depth: 0.6,
        paint: (c, r) => {
          floor(c, r, '#3b2c40');
          bed(c, r, 140, '#6b2f3a', '#2e1f24');
          bed(c, r, 560, '#6b2f3a', '#2e1f24');
          bed(c, r, 1050, '#6b2f3a', '#2e1f24');
          bed(c, r, 1450, '#6b2f3a', '#2e1f24');
          wash(c, rect(870, FLOOR - 170, 110, 150), '#4a3328', r, { layers: 8, alpha: 0.2 }); // fireplace
          wash(c, rect(895, FLOOR - 110, 60, 90), '#140c0c', r, { layers: 6, alpha: 0.3 });
        },
      },
      { depth: 1.25, paint: (c, r) => vignetteFront(c, r, '#0c0c1c') },
    ],
    lights: [
      { x: 925, y: FLOOR - 60, r: 160, color: '#ff9a4a', flicker: 0.35, depth: 0.6 },
      { x: 835, y: 240, r: 260, color: '#6d8fd6', flicker: 0.03, depth: 0.2 },
    ],
  },

  'window-night': {
    area: 'window',
    night: true,
    layers: [
      {
        depth: 0.08,
        paint: (c, r) => {
          ground(c, W, H, '#14173a', '#3b3570', r);
          wash(c, ellipse(1350, 140, 50, 50), '#efe8c8', r, { layers: 10, alpha: 0.2 });
          glow(c, 1350, 140, 240, '#c9d3f5', 0.3);
          for (let i = 0; i < 80; i++) wash(c, ellipse(r() * W, r() * 300, 1.5, 1.5, 5), '#f4efd8', r, { layers: 1, alpha: 0.6, spread: 0.5, edge: false });
        },
      },
      {
        depth: 0.3,
        paint: (c, r) => {
          skyline(c, r, 560, '#1b1b3a');
          tower(c, r, 1150, 520, 90, 330, '#121228');
          wash(c, rect(1175, 230, 40, 40), '#f2d9a0', r, { layers: 6, alpha: 0.25 }); // light at the top
        },
      },
      {
        depth: 0.55,
        paint: (c, r) => {
          fogBank(c, r, '#c4c9e6', 520);
          hedge(c, r, -40, 640, 700, '#151a2c');
          hedge(c, r, 1100, 660, 800, '#151a2c');
        },
      },
      {
        depth: 1.1,
        paint: (c, r) => {
          // a big window frame in front of everything
          wash(c, rect(-40, -40, 210, H + 80), '#211a2a', r, { layers: 10, alpha: 0.2 });
          wash(c, rect(W - 170, -40, 210, H + 80), '#211a2a', r, { layers: 10, alpha: 0.2 });
          wash(c, rect(-40, H - 110, W + 80, 150), '#2a1f2a', r, { layers: 10, alpha: 0.2 });
          wash(c, rect(880, -40, 26, H), '#211a2a', r, { layers: 8, alpha: 0.18 });
        },
      },
    ],
    lights: [{ x: 1195, y: 250, r: 120, color: '#ffd27a', flicker: 0.4, depth: 0.3 }],
  },

  'corridor-torch': {
    area: 'corridor',
    night: true,
    layers: [
      {
        depth: 0.2,
        paint: (c, r) => {
          stoneWall(c, r, '#2b2240', '#4a3348', '#1b1426');
          for (let x = 160; x < W; x += 420) wash(c, arch(x, 140, 180, 420, true), '#1a1428', r, { layers: 8, alpha: 0.16 });
        },
      },
      {
        depth: 0.65,
        paint: (c, r) => {
          floor(c, r, '#3a2a30');
          for (let x = 60; x < W; x += 420) column(c, r, x, 70, '#3e3044', 0);
          armour(c, r, 470, '#55576a');
          armour(c, r, 1300, '#55576a');
          wash(c, rect(780, 180, 170, 220), '#6a4a2a', r, { layers: 8, alpha: 0.2 }); // portrait
          wash(c, rect(800, 200, 130, 180), '#2b2638', r, { layers: 8, alpha: 0.25 });
          for (const x of [330, 1050, 1640]) torchBracket(c, r, x, 250);
        },
      },
      { depth: 1.25, paint: (c, r) => vignetteFront(c, r, '#0e0a16') },
    ],
    lights: [330, 1050, 1640].map((x) => ({ x, y: 240, r: 220, color: '#ffa04a', flicker: 0.45, depth: 0.65 })),
  },

  'tower-stairs': {
    area: 'tower',
    night: true,
    layers: [
      {
        depth: 0.2,
        paint: (c, r) => {
          stoneWall(c, r, '#191836', '#2b2448', '#0f0e22');
          for (let x = 300; x < W; x += 600) wash(c, arch(x, 120, 50, 120, true), '#506aa0', r, { layers: 6, alpha: 0.2 });
        },
      },
      {
        depth: 0.7,
        paint: (c, r) => {
          stairs(c, r, 200, '#4a4068', '#8a7aa8');
          wash(c, rect(-40, FLOOR - 10, 300, 200), '#3a3350', r, { layers: 8, alpha: 0.18 });
          fogBank(c, r, '#9aa0c8', FLOOR - 120);
          torchBracket(c, r, 640, 300);
        },
      },
      { depth: 1.25, paint: (c, r) => vignetteFront(c, r, '#07071a') },
    ],
    lights: [
      { x: 640, y: 290, r: 200, color: '#ff9e48', flicker: 0.5, depth: 0.7 },
      { x: 1200, y: 170, r: 160, color: '#7a8fd0', flicker: 0.05, depth: 0.2 },
    ],
  },

  'great-hall-day': {
    area: 'hall',
    night: false,
    layers: [
      {
        depth: 0.2,
        paint: (c, r) => {
          stoneWall(c, r, '#c9b48e', '#a68a64', '#8a7354');
          for (let x = 120; x < W; x += 360) window_(c, r, x, 60, 120, 340, '#d9e4ec', '#6d5a44');
          wash(c, rect(-40, 0, W + 80, 40), '#7a6248', r, { layers: 6, alpha: 0.14 });
        },
      },
      {
        depth: 0.6,
        paint: (c, r) => {
          floor(c, r, '#8a6a48');
          wash(c, rect(100, FLOOR - 70, 1600, 26), '#6b4a2c', r, { layers: 10, alpha: 0.22 }); // long table
          for (let x = 140; x < 1680; x += 140) wash(c, rect(x, FLOOR - 44, 10, 44), '#5b3d24', r, { layers: 3, alpha: 0.25, spread: 2 });
          for (let x = 200; x < 1650; x += 230) wash(c, ellipse(x, FLOOR - 76, 26, 8), '#e8dcc0', r, { layers: 4, alpha: 0.3 });
          wash(c, rect(600, 330, 600, 40), '#6b4a2c', r, { layers: 8, alpha: 0.18 }); // staff table at the back
        },
      },
      { depth: 1.25, paint: (c, r) => vignetteFront(c, r, '#5a4630') },
    ],
    lights: [120, 480, 840, 1200, 1560].map((x) => ({ x: x + 60, y: 220, r: 230, color: '#fff2cc', flicker: 0.02, depth: 0.2 })),
  },

  'courtyard-day': {
    area: 'courtyard',
    night: false,
    layers: [
      {
        depth: 0.08,
        paint: (c, r) => {
          ground(c, W, H, '#a9c3d8', '#e8dcc0', r);
          for (let i = 0; i < 6; i++) wash(c, ellipse(r() * W, 60 + r() * 140, 160, 40), '#ffffff', r, { layers: 5, alpha: 0.12, spread: 20 });
        },
      },
      {
        depth: 0.3,
        paint: (c, r) => {
          skyline(c, r, 470, '#8c8a98');
          tower(c, r, 1180, 430, 90, 300, '#6f6d80');
        },
      },
      {
        depth: 0.65,
        paint: (c, r) => {
          wash(c, rect(-40, 420, W + 80, 200), '#b9a27a', r, { layers: 8, alpha: 0.18 }); // wall
          for (let x = 0; x < W; x += 260) wash(c, arch(x + 40, 450, 150, 160), '#7d6a52', r, { layers: 6, alpha: 0.2 });
          floor(c, r, '#a08860');
          hedge(c, r, 200, FLOOR - 30, 400, '#5d7a4a');
          hedge(c, r, 1250, FLOOR - 30, 420, '#5d7a4a');
          wash(c, ellipse(900, FLOOR - 40, 120, 30), '#8a9aa8', r, { layers: 8, alpha: 0.2 }); // fountain
          wash(c, rect(880, FLOOR - 140, 40, 100), '#8a8478', r, { layers: 6, alpha: 0.2 });
        },
      },
      { depth: 1.25, paint: (c, r) => vignetteFront(c, r, '#3f4a32') },
    ],
    lights: [{ x: 1500, y: 80, r: 420, color: '#fff3d0', flicker: 0, depth: 0.08 }],
  },

  'library-basement': {
    area: 'archive',
    night: true,
    layers: [
      {
        depth: 0.2,
        paint: (c, r) => {
          stoneWall(c, r, '#2e2a35', '#4a3c38', '#1c1820');
          for (let x = -20; x < W; x += 300) bookshelf(c, r, x, 90, 260, 480, '#3a2a22', NIGHT_BOOKS);
        },
      },
      {
        depth: 0.65,
        paint: (c, r) => {
          floor(c, r, '#3e3028');
          wash(c, rect(700, FLOOR - 110, 380, 30), '#5a3e28', r, { layers: 10, alpha: 0.24 }); // desk
          wash(c, rect(720, FLOOR - 80, 24, 80), '#4a3020', r, { layers: 4, alpha: 0.24 });
          wash(c, rect(1040, FLOOR - 80, 24, 80), '#4a3020', r, { layers: 4, alpha: 0.24 });
          for (let i = 0; i < 5; i++) wash(c, rect(760 + i * 40, FLOOR - 140 - i * 4, 34, 30 + i * 4), '#cdbb94', r, { layers: 3, alpha: 0.25 });
          wash(c, rect(1000, FLOOR - 150, 18, 40), '#2a2018', r, { layers: 3, alpha: 0.3 }); // lamp
          bookshelf(c, r, 1350, 200, 220, 410, '#3a2a22', NIGHT_BOOKS);
        },
      },
      {
        depth: 1.25,
        paint: (c, r) => {
          vignetteFront(c, r, '#120e10');
          bookshelf(c, r, -120, 260, 220, 500, '#1a1210', NIGHT_BOOKS);
        },
      },
    ],
    lights: [
      { x: 1009, y: FLOOR - 160, r: 260, color: '#ffbf66', flicker: 0.12, depth: 0.65 },
      { x: 300, y: 180, r: 200, color: '#b08a5a', flicker: 0.05, depth: 0.2 },
    ],
  },

  'music-room-moon': {
    area: 'music-room',
    night: true,
    layers: [
      {
        depth: 0.2,
        paint: (c, r) => {
          stoneWall(c, r, '#1f2a48', '#33416a', '#151c33');
          window_(c, r, 1200, 90, 200, 360, '#7d9ad0', '#141a30');
          glow(c, 1300, 260, 300, '#9fbaf0', 0.3);
          for (let i = 0; i < 20; i++) wash(c, ellipse(r() * W, r() * 500, 20, 20, 6), '#cde0ff', r, { layers: 2, alpha: 0.05, spread: 8, edge: false }); // frost
        },
      },
      {
        depth: 0.65,
        paint: (c, r) => {
          floor(c, r, '#2c3150');
          // grand piano in profile
          wash(c, [[500, FLOOR - 200], [820, FLOOR - 230], [900, FLOOR - 180], [880, FLOOR - 150], [500, FLOOR - 150]], '#0e0f1c', r, { layers: 12, alpha: 0.22 });
          for (const x of [520, 760, 860]) wash(c, rect(x, FLOOR - 150, 14, 150), '#0e0f1c', r, { layers: 4, alpha: 0.25, spread: 2 });
          // fallen chairs and music stands
          wash(c, [[1000, FLOOR], [1080, FLOOR - 70], [1100, FLOOR - 60], [1030, FLOOR]], '#3a2a2a', r, { layers: 5, alpha: 0.22 });
          for (const x of [260, 1500]) {
            wash(c, rect(x, FLOOR - 160, 6, 160), '#20243a', r, { layers: 3, alpha: 0.3, spread: 2 });
            wash(c, [[x - 40, FLOOR - 190], [x + 46, FLOOR - 190], [x + 30, FLOOR - 150], [x - 24, FLOOR - 150]], '#20243a', r, { layers: 4, alpha: 0.25 });
          }
        },
      },
      { depth: 1.25, paint: (c, r) => vignetteFront(c, r, '#080c1c') },
    ],
    lights: [{ x: 1300, y: 260, r: 380, color: '#8fb0ff', flicker: 0.04, depth: 0.2 }],
  },

  'belfry-storm': {
    area: 'belfry',
    night: true,
    layers: [
      {
        depth: 0.1,
        paint: (c, r) => {
          ground(c, W, H, '#161433', '#3d2d5a', r);
          for (let i = 0; i < 10; i++) wash(c, ellipse(r() * W, r() * 300, 260, 70), '#2a2550', r, { layers: 4, alpha: 0.12, spread: 30 });
        },
      },
      {
        depth: 0.3,
        paint: (c, r) => {
          // open arches of the belfry against the storm
          wash(c, rect(-40, -40, W + 80, 130), '#1a1528', r, { layers: 8, alpha: 0.25 });
          for (let x = -40; x < W; x += 380) wash(c, rect(x, 60, 90, FLOOR), '#1e1830', r, { layers: 8, alpha: 0.25 });
        },
      },
      {
        depth: 0.65,
        paint: (c, r) => {
          floor(c, r, '#2a2236');
          wash(c, rect(880, 70, 40, 90), '#151020', r, { layers: 6, alpha: 0.3 }); // yoke
          bell(c, r, 900, 140, 340, '#100c18');
          wash(c, rect(1050, 160, 4, FLOOR - 160), '#a08060', r, { layers: 3, alpha: 0.35, spread: 1, edge: false }); // rope
        },
      },
      {
        depth: 1.25,
        paint: (c, r) => {
          vignetteFront(c, r, '#070612');
          fogBank(c, r, '#a9a6d6', H - 120);
        },
      },
    ],
    lights: [
      { x: 900, y: 420, r: 300, color: '#6e64c8', flicker: 0.15, depth: 0.65 },
      { x: 300, y: 600, r: 140, color: '#ffa858', flicker: 0.4, depth: 0.65 },
    ],
  },

  'office-study': {
    area: 'office',
    night: false,
    layers: [
      {
        depth: 0.2,
        paint: (c, r) => {
          stoneWall(c, r, '#5a4636', '#6e5642', '#3e2f24');
          wash(c, rect(-40, 0, W + 80, 330), '#6b4b3a', r, { layers: 8, alpha: 0.14 }); // panelling
          window_(c, r, 300, 100, 140, 260, '#b9c8d4', '#3a2a20');
          bookshelf(c, r, 1300, 110, 300, 480, '#3a2a20', DAY_BOOKS);
        },
      },
      {
        depth: 0.65,
        paint: (c, r) => {
          floor(c, r, '#5a3e2c');
          wash(c, rect(-40, FLOOR - 20, W + 80, 24), '#7a2f2f', r, { layers: 6, alpha: 0.18 }); // rug edge
          wash(c, rect(640, FLOOR - 120, 420, 30), '#4a2e1c', r, { layers: 10, alpha: 0.26 }); // desk
          wash(c, rect(660, FLOOR - 90, 120, 90), '#3e2616', r, { layers: 8, alpha: 0.26 });
          wash(c, rect(920, FLOOR - 90, 120, 90), '#3e2616', r, { layers: 8, alpha: 0.26 });
          wash(c, rect(780, FLOOR - 140, 90, 20), '#e6d8b8', r, { layers: 4, alpha: 0.35 }); // open book
          wash(c, rect(1110, FLOOR - 300, 150, 300), '#55443a', r, { layers: 8, alpha: 0.2 }); // glass cabinet
          wash(c, rect(1125, FLOOR - 285, 120, 270), '#a8b8c0', r, { layers: 6, alpha: 0.12 });
          for (let i = 0; i < 4; i++) wash(c, ellipse(1150 + i * 25, FLOOR - 200 + (i % 2) * 60, 8, 14), '#d8d8d8', r, { layers: 3, alpha: 0.35 });
          wash(c, ellipse(1000, FLOOR - 140, 16, 10), '#f0e8d8', r, { layers: 3, alpha: 0.4 }); // teacup
        },
      },
      { depth: 1.25, paint: (c, r) => vignetteFront(c, r, '#2a1c14') },
    ],
    lights: [
      { x: 370, y: 230, r: 300, color: '#fff0d0', flicker: 0.02, depth: 0.2 },
      { x: 700, y: FLOOR - 170, r: 160, color: '#ffc070', flicker: 0.2, depth: 0.65 },
    ],
  },

  'ending-dawn': {
    area: 'ending',
    night: false,
    layers: [
      {
        depth: 0.08,
        paint: (c, r) => {
          ground(c, W, H, '#f2c9a0', '#f6e6c8', r);
          wash(c, ellipse(900, 520, 140, 140), '#ffe2a0', r, { layers: 12, alpha: 0.2 });
          glow(c, 900, 520, 500, '#ffd59a', 0.5);
        },
      },
      {
        depth: 0.3,
        paint: (c, r) => {
          wash(c, [[-40, 560], [300, 470], [700, 520], [1100, 450], [1500, 500], [W + 40, 460], [W + 40, H], [-40, H]], '#b48a8a', r, { layers: 10, alpha: 0.14, spread: 14 });
          skyline(c, r, 560, '#8a6a7a');
          tower(c, r, 1180, 520, 90, 300, '#6e526a');
        },
      },
      {
        depth: 0.7,
        paint: (c, r) => {
          wash(c, [[-40, 620], [600, 590], [1200, 610], [W + 40, 590], [W + 40, H + 40], [-40, H + 40]], '#7a8a5a', r, { layers: 10, alpha: 0.18, spread: 12 });
          hedge(c, r, 100, 640, 500, '#5d6e44');
        },
      },
    ],
    lights: [{ x: 900, y: 520, r: 520, color: '#ffe0a8', flicker: 0.01, depth: 0.08 }],
  },

  'ending-dark': {
    area: 'ending',
    night: true,
    layers: [
      {
        depth: 0.08,
        paint: (c, r) => {
          ground(c, W, H, '#0f0f26', '#26203f', r);
          for (let i = 0; i < 6; i++) wash(c, ellipse(r() * W, r() * 400, 280, 70), '#2d2650', r, { layers: 4, alpha: 0.1, spread: 30 });
        },
      },
      {
        depth: 0.35,
        paint: (c, r) => {
          skyline(c, r, 600, '#0b0b1a');
          tower(c, r, 1180, 560, 90, 360, '#07070f');
          wash(c, rect(1205, 230, 40, 40), '#c8c0f0', r, { layers: 6, alpha: 0.2 });
        },
      },
      { depth: 1.1, paint: (c, r) => fogBank(c, r, '#8a86b8', H - 160) },
    ],
    lights: [{ x: 1225, y: 250, r: 160, color: '#a090ff', flicker: 0.2, depth: 0.35 }],
  },

  'ending-silence': {
    area: 'ending',
    night: true,
    layers: [
      {
        depth: 0.1,
        paint: (c, r) => {
          ground(c, W, H, '#0c0c1e', '#1a1a33', r);
          for (let i = 0; i < 14; i++) wash(c, ellipse(r() * W, r() * H, 300, 90), '#2a2a48', r, { layers: 4, alpha: 0.08, spread: 40, edge: false });
        },
      },
      { depth: 0.6, paint: (c, r) => bell(c, r, 900, 160, 300, '#05050c') },
      { depth: 1.1, paint: (c, r) => fogBank(c, r, '#6e6e9a', H - 200) },
    ],
    lights: [{ x: 900, y: 360, r: 260, color: '#5a5a9a', flicker: 0.08, depth: 0.6 }],
  },
};

export const FALLBACK = 'corridor-torch';
export const getPreset = (id?: string) => PRESETS[id ?? ''] ?? PRESETS[FALLBACK];

// ---------- painting cache ----------
const cache = new Map<string, HTMLCanvasElement[]>();

/** Paints every layer of a preset once (deterministic per preset) and caches the canvases. */
export function paintPreset(id: string): HTMLCanvasElement[] {
  const key = PRESETS[id] ? id : FALLBACK;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = PRESETS[key];
  let seed = 0;
  for (const ch of key) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const canvases = p.layers.map((layer, i) => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d')!;
    layer.paint(ctx, makeRand(seed + i * 101));
    return c;
  });
  cache.set(key, canvases);
  return canvases;
}
