// Pixel backgrounds, one per hub. Each paints a box (x, y, w, h) at frame t, so the same
// scene works as a hub card, a room in the building or a strip. The floor line is
// returned so creatures know where to stand.
import { rand, PAINTS } from './pixel.js';

function rect(ctx, x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
// Two colours in a checker, for soft pixel-art blends between bands.
function dither(ctx, x, y, w, h, a, b) {
  rect(ctx, x, y, w, h, a);
  ctx.fillStyle = b;
  for (let j = 0; j < h; j++) for (let i = (j % 2); i < w; i += 2) ctx.fillRect(x + i, y + j, 1, 1);
}
function bands(ctx, x, y, w, h, colours) {
  const n = colours.length;
  const step = h / n;
  colours.forEach((c, i) => {
    rect(ctx, x, y + i * step, w, Math.ceil(step), c);
    if (i < n - 1) dither(ctx, x, Math.round(y + (i + 1) * step) - 1, w, 2, c, colours[i + 1]);
  });
}
function specks(ctx, x, y, w, h, colour, count, seed) {
  ctx.fillStyle = colour;
  for (let k = 0; k < count; k++) ctx.fillRect(x + Math.floor(rand(seed + k) * w), y + Math.floor(rand(seed + k * 7.3) * h), 1, 1);
}

export const SCENES = {
  // Ungrouped and anything without its own: open grass under a sky.
  meadow(ctx, x, y, w, h, t) {
    const floor = y + h - 12;
    bands(ctx, x, y, w, floor - y, ['#7cc6e6', '#9ad4ec', '#bfe4f2']);
    for (let k = 0; k < 2; k++) {
      const cx = x + ((k * 70 + t / 4) % (w + 30)) - 15;
      rect(ctx, cx, y + 6 + k * 7, 12, 3, '#ffffff');
      rect(ctx, cx + 3, y + 4 + k * 7, 6, 2, '#ffffff');
    }
    for (let i = 0; i < w; i++) {
      const hill = Math.round(5 + Math.sin((i + 13) / 11) * 3 + Math.sin(i / 5) * 1);
      rect(ctx, x + i, floor - hill, 1, hill, '#79b96a');
    }
    rect(ctx, x, floor, w, y + h - floor, '#5aa64b');
    rect(ctx, x, floor, w, 1, '#7fcf62');
    specks(ctx, x, floor + 2, w, h - 14, '#3f8a3a', w / 3, 3);
    specks(ctx, x, floor + 1, w, 2, '#9be07a', w / 5, 9);
    for (let k = 0; k < w / 25; k++) {
      const fx = x + Math.floor(rand(k + 40) * w);
      rect(ctx, fx, floor + 3 + Math.floor(rand(k + 2) * 6), 1, 1, k % 2 ? '#ffffff' : '#f5c451');
    }
    return floor;
  },

  // Projects: a riverbank with a half-built dam, for the beaver.
  riverbank(ctx, x, y, w, h, t) {
    const floor = y + h - 11;
    bands(ctx, x, y, w, floor - y - 8, ['#8fc7e0', '#b5dbe9']);
    // Pines in the distance
    for (let i = -4; i < w; i += 9) {
      const px = x + i + Math.floor(rand(i + 9) * 4);
      const ph = 9 + Math.floor(rand(i + 2) * 6);
      for (let j = 0; j < ph; j++) rect(ctx, px + 4 - Math.floor(j / 2), floor - 8 - ph + j, Math.floor(j / 2) * 2 + 1, 1, '#4f7d5c');
    }
    // River with drifting ripples
    rect(ctx, x, floor - 8, w, 8, '#4f8fb8');
    rect(ctx, x, floor - 8, w, 1, '#7fb4d6');
    for (let k = 0; k < w / 10; k++) {
      const rx = x + ((k * 13 + Math.floor(t / 3)) % (w + 6)) - 3;
      rect(ctx, rx, floor - 6 + (k % 3) * 2, 3, 1, '#8cc3e0');
    }
    // The dam: stacked logs on the right
    const dx = x + w - 17;
    [[0, 0, 17], [2, 3, 15], [1, 6, 16], [4, 9, 13]].forEach(([ox, oy, lw]) => {
      const ly = floor - 3 - oy;
      rect(ctx, dx + ox, ly, lw, 3, '#7a4f35');
      rect(ctx, dx + ox, ly, lw, 1, '#9a6a48');
      rect(ctx, dx + ox, ly, 2, 3, '#d9b07f');
      rect(ctx, dx + ox, ly + 1, 1, 1, '#9a6a48');
    });
    for (let k = 0; k < 4; k++) rect(ctx, dx + 3 + k * 4, floor - 15 - (k % 2), 1, 3, '#5b3a2c');
    // Muddy bank with grass and wood chips
    rect(ctx, x, floor, w, y + h - floor, '#8a6a48');
    rect(ctx, x, floor, w, 1, '#6aa84f');
    specks(ctx, x, floor + 1, w, 1, '#86c36a', w / 4, 5);
    specks(ctx, x, floor + 3, w, h - 14, '#6e5236', w / 3, 8);
    specks(ctx, x, floor + 2, w, h - 13, '#e8c39a', w / 8, 13);
    return floor;
  },

  // Music: a small stage with curtains and a spotlight.
  stage(ctx, x, y, w, h, t) {
    const floor = y + h - 11;
    rect(ctx, x, y, w, floor - y, '#2a1f4a');
    for (let i = 0; i < w; i += 8) rect(ctx, x + i, y, 1, floor - y, '#241a40');
    // Spotlight
    ctx.globalAlpha = 0.16 + (t % 16 < 8 ? 0.02 : 0);
    ctx.fillStyle = '#fff1b8';
    for (let j = 0; j < floor - y; j++) {
      const half = 6 + j * 0.7;
      ctx.fillRect(Math.round(x + w / 2 - half), y + j, Math.round(half * 2), 1);
    }
    ctx.globalAlpha = 1;
    // Curtains
    [0, w - 12].forEach((cx, side) => {
      for (let i = 0; i < 12; i++) rect(ctx, x + cx + i, y, 1, floor - y + 2, (i + side) % 3 === 0 ? '#7d1f38' : '#a8324a');
    });
    rect(ctx, x, y, w, 4, '#7d1f38');
    for (let i = 0; i < w; i += 6) rect(ctx, x + i, y + 4, 3, 2, '#a8324a');
    // Floor boards
    rect(ctx, x, floor, w, y + h - floor, '#8a5a3c');
    rect(ctx, x, floor, w, 1, '#b07a52');
    for (let j = floor + 3; j < y + h; j += 3) rect(ctx, x, j, w, 1, '#6e4630');
    for (let k = 0; k < w / 14; k++) rect(ctx, x + Math.floor(rand(k + 5) * w), floor + 1 + (k % 3) * 3, 1, 2, '#6e4630');
    return floor;
  },

  // Claude: under the sea with seaweed and bubbles.
  sea(ctx, x, y, w, h, t) {
    const floor = y + h - 10;
    bands(ctx, x, y, w, floor - y, ['#1d4e89', '#24609c', '#2c74af', '#3588bf']);
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#d9f2ff';
    for (let r = 0; r < 3; r++)
      for (let j = 0; j < floor - y; j++) ctx.fillRect(Math.round(x + 20 + r * 45 + j * 0.5 + Math.sin(t / 10) * 2), y + j, 4, 1);
    ctx.globalAlpha = 1;
    rect(ctx, x, floor, w, y + h - floor, '#e2c290');
    rect(ctx, x, floor, w, 1, '#f0d7a8');
    specks(ctx, x, floor + 1, w, h - 11, '#c4a06a', w / 2.5, 11);
    for (let k = 0; k < Math.max(2, w / 30); k++) {
      const sx = x + 8 + Math.floor(rand(k + 70) * (w - 16));
      const tall = 9 + Math.floor(rand(k + 3) * 8);
      for (let j = 0; j < tall; j++) {
        const sway = Math.round(Math.sin(t / 5 + j / 3 + k) * (j / tall) * 2);
        rect(ctx, sx + sway, floor - j, 2, 1, j % 4 === 0 ? '#2f8f5b' : '#3fae6c');
      }
    }
    for (let k = 0; k < 4; k++) {
      const life = (t + k * 9) % 36;
      rect(ctx, x + 10 + Math.floor(rand(k + 90) * (w - 20)) + Math.round(Math.sin(life / 3)), floor - 2 - life, 1, 1, '#bfe6ff');
    }
    return floor;
  },

  // Life Admin: a wet garden in light rain.
  garden(ctx, x, y, w, h, t) {
    const floor = y + h - 11;
    bands(ctx, x, y, w, floor - y, ['#8193ab', '#93a5bb', '#a7b7c9']);
    // Fence
    rect(ctx, x, floor - 9, w, 1, '#c9b79a');
    rect(ctx, x, floor - 5, w, 1, '#c9b79a');
    for (let i = 4; i < w; i += 10) rect(ctx, x + i, floor - 12, 2, 12, '#d8c6a8');
    rect(ctx, x, floor, w, y + h - floor, '#4f8f4a');
    rect(ctx, x, floor, w, 1, '#6fb35f');
    specks(ctx, x, floor + 2, w, h - 13, '#3b7337', w / 3, 21);
    // Puddle
    rect(ctx, x + w - 38, floor + 4, 22, 3, '#7f9fc0');
    rect(ctx, x + w - 35, floor + 4, 8, 1, '#b9d2ea');
    // Mushroom
    rect(ctx, x + 14, floor - 3, 2, 3, '#f1e6d6');
    rect(ctx, x + 12, floor - 5, 6, 2, '#d8443f');
    rect(ctx, x + 13, floor - 5, 1, 1, '#ffffff');
    // Rain
    ctx.fillStyle = '#dbe7f5';
    for (let k = 0; k < w / 5; k++) {
      const rx = x + Math.floor(rand(k + 7) * w);
      const ry = y + ((Math.floor(rand(k + 13) * h) + t * 3) % (floor - y));
      ctx.fillRect(rx, ry, 1, 2);
    }
    return floor;
  },

  // Work: an office corner with a window onto the city.
  office(ctx, x, y, w, h, t) {
    const floor = y + h - 10;
    rect(ctx, x, y, w, floor - y, '#d9cdb8');
    rect(ctx, x, floor - 8, w, 8, '#bfae92');
    rect(ctx, x, floor - 9, w, 1, '#a8977b');
    // Window
    const wx = x + Math.round(w * 0.55);
    const ww = Math.min(44, Math.round(w * 0.35));
    rect(ctx, wx - 2, y + 4, ww + 4, floor - y - 17, '#8a7a62');
    bands(ctx, wx, y + 6, ww, floor - y - 21, ['#9ccbe8', '#c9e4f2']);
    for (let i = 0; i < ww; i += 6) {
      const bh = 6 + Math.floor(rand(i + 3) * 10);
      rect(ctx, wx + i, floor - 15 - bh, 5, bh, '#6b7a99');
      for (let j = 2; j < bh - 1; j += 3) if (rand(i * 3 + j + Math.floor(t / 24)) > 0.5) rect(ctx, wx + i + 1 + (j % 2) * 2, floor - 15 - bh + j, 1, 1, '#f5e08a');
    }
    rect(ctx, wx + Math.floor(ww / 2), y + 6, 1, floor - y - 21, '#8a7a62');
    // Clock
    rect(ctx, x + 18, y + 6, 7, 7, '#ffffff');
    rect(ctx, x + 21, y + 7, 1, 3, '#1a1430');
    rect(ctx, x + 21, y + 9, 2, 1, '#1a1430');
    // Plant
    rect(ctx, x + 6, floor - 6, 6, 6, '#b5653f');
    [[5, -12], [8, -15], [11, -11], [7, -9], [10, -8]].forEach(([px, py]) => rect(ctx, x + px, floor + py, 2, 4, '#4a9a55'));
    // Carpet
    rect(ctx, x, floor, w, y + h - floor, '#6b7a99');
    rect(ctx, x, floor, w, 1, '#8593b0');
    for (let j = floor + 2; j < y + h; j += 2) for (let i = (j % 4 === 0 ? 0 : 2); i < w; i += 4) rect(ctx, x + i, j, 1, 1, '#5d6a87');
    return floor;
  },

  // Design: a studio with an easel and paint on the floor.
  studio(ctx, x, y, w, h, t) {
    const floor = y + h - 10;
    rect(ctx, x, y, w, floor - y, '#e8d9c4');
    for (let i = 0; i < w; i += 12) rect(ctx, x + i, y, 1, floor - y, '#dccbb3');
    // Framed pictures
    [[8, 6, 14, 10, ['#3E8EDE', '#F5C451']], [28, 9, 10, 8, ['#E5484D', '#46B37A']]].forEach(([px, py, pw, ph, cs]) => {
      rect(ctx, x + px - 1, y + py - 1, pw + 2, ph + 2, '#6e4a2e');
      rect(ctx, x + px, y + py, pw, ph, cs[0]);
      rect(ctx, x + px, y + py + Math.floor(ph / 2), pw, Math.ceil(ph / 2), cs[1]);
      rect(ctx, x + px + 3, y + py + 2, 3, 3, '#ffffff');
    });
    // Easel
    const ex = x + w - 30;
    rect(ctx, ex + 2, floor - 22, 1, 22, '#8a5a3c');
    rect(ctx, ex + 15, floor - 22, 1, 22, '#8a5a3c');
    rect(ctx, ex + 8, floor - 24, 1, 24, '#6e4630');
    rect(ctx, ex, floor - 22, 18, 13, '#fbf6ee');
    rect(ctx, ex + 2, floor - 20, 6, 4, '#E5484D');
    rect(ctx, ex + 8, floor - 18, 7, 5, '#3E8EDE');
    rect(ctx, ex + 4, floor - 15, 5, 3, '#F5C451');
    rect(ctx, ex - 1, floor - 9, 20, 1, '#8a5a3c');
    // Floor boards with splats
    rect(ctx, x, floor, w, y + h - floor, '#a0704a');
    rect(ctx, x, floor, w, 1, '#c08a5e');
    for (let j = floor + 3; j < y + h; j += 3) rect(ctx, x, j, w, 1, '#87593a');
    for (let k = 0; k < w / 22; k++) {
      const sx = x + Math.floor(rand(k + 31) * w);
      const sy = floor + 2 + Math.floor(rand(k + 8) * 6);
      const c = PAINTS[k % 4];
      rect(ctx, sx, sy, 2, 1, c);
      rect(ctx, sx + 1, sy + 1, 1, 1, c);
    }
    return floor;
  },

  // Workspace: a control room with screens.
  control(ctx, x, y, w, h, t) {
    const floor = y + h - 10;
    rect(ctx, x, y, w, floor - y, '#1b2433');
    const cols = Math.max(2, Math.floor((w - 8) / 22));
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < 2; j++) {
        const sx = x + 6 + i * 22;
        const sy = y + 4 + j * 12;
        rect(ctx, sx - 1, sy - 1, 18, 10, '#3a4658');
        rect(ctx, sx, sy, 16, 8, '#0f1b24');
        for (let l = 0; l < 3; l++) {
          const len = 3 + Math.floor(rand(i * 9 + j * 3 + l + Math.floor(t / 6)) * 11);
          rect(ctx, sx + 2, sy + 2 + l * 2, len, 1, l === 0 ? '#56B4A0' : '#3d8a7a');
        }
        if ((t + i * 3 + j * 5) % 10 < 5) rect(ctx, sx + 14, sy + 1, 1, 1, '#f5c451');
      }
    // Desk edge
    rect(ctx, x, floor - 5, w, 5, '#2d3748');
    rect(ctx, x, floor - 5, w, 1, '#4a5a70');
    for (let i = 5; i < w; i += 9) rect(ctx, x + i, floor - 3, 1, 1, (t + i) % 7 < 3 ? '#e5484d' : '#46b37a');
    // Floor plates
    rect(ctx, x, floor, w, y + h - floor, '#3a4658');
    rect(ctx, x, floor, w, 1, '#56657d');
    for (let i = 0; i < w; i += 16) rect(ctx, x + i, floor + 1, 1, h - 11, '#2d3748');
    for (let j = floor + 5; j < y + h; j += 5) rect(ctx, x, j, w, 1, '#2d3748');
    return floor;
  },
};

// A scene by name, from species.json. Anything unknown gets the meadow.
export function scene(name) {
  return SCENES[name] || SCENES.meadow;
}

