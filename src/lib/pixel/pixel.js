// Pixel creatures for Agentlings. No framework: each sprite is drawn on a small
// grid from simple shapes, then shaded from the top left and outlined automatically, so
// every species shares one look. Hubs draw on small canvases scaled up with no smoothing.
export const W = 24;
export const H = 22;
const INK = '#1a1430';

// ---------- colour ----------
// Hub colours come as hex from species.json but as hsl() from Claude's own groups,
// so read #rgb, #rrggbb, rgb() and hsl().
export function rgb(c) {
  c = String(c).trim().toLowerCase();
  const nums = (c.match(/-?[\d.]+/g) || []).map(Number);
  if (c.startsWith('hsl')) {
    const [h, sat, light] = nums;
    const s = sat / 100;
    const l = light / 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
  }
  if (c.startsWith('rgb')) return nums.slice(0, 3).map(Math.round);
  let h = c.replace('#', '');
  if (h.length === 3) h = [...h].map((ch) => ch + ch).join('');
  const out = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return out.some(Number.isNaN) ? [128, 128, 128] : out;
}
export function mix(a, b, t) {
  const A = rgb(a);
  const B = rgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
export function grey(c, t) {
  const [r, g, b] = rgb(c);
  const l = Math.round(r * 0.3 + g * 0.59 + b * 0.11);
  const L = '#' + [l, l, l].map((v) => v.toString(16).padStart(2, '0')).join('');
  return mix(c, L, t);
}
export function rand(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ---------- the grid ----------
export class Grid {
  constructor(w = W, h = H) {
    this.w = w;
    this.h = h;
    this.m = new Array(w * h).fill(null);
  }
  get(x, y) {
    return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.m[y * this.w + x];
  }
  set(x, y, v) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.m[y * this.w + x] = v;
  }
  ellipse(cx, cy, rx, ry, v) {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) this.set(x, y, v);
  }
  rect(x0, y0, w, h, v, round = 0) {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) {
        const dx = Math.min(x - x0, x0 + w - 1 - x);
        const dy = Math.min(y - y0, y0 + h - 1 - y);
        if (round && dx + dy < round) continue;
        this.set(x, y, v);
      }
  }
  // Turns body materials into colours: lit on the top left edge, shaded on the bottom right.
  shade(materials) {
    const out = this.m.slice();
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const v = this.get(x, y);
        const base = materials[v];
        if (!base) continue;
        const same = (dx, dy) => this.get(x + dx, y + dy) === v;
        const dark = mix(base, '#241a5e', 0.42);
        let c = base;
        if (!same(0, 1) || !same(1, 0)) c = dark;
        else if (!same(0, 2) || !same(2, 0)) c = mix(base, dark, 0.5);
        else if (!same(0, -1) || !same(-1, 0)) c = mix(base, '#fff3dc', 0.42);
        out[y * this.w + x] = c;
      }
    this.m = out;
  }
  outline(colour) {
    const out = this.m.slice();
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue;
        if (this.get(x + 1, y) || this.get(x - 1, y) || this.get(x, y + 1) || this.get(x, y - 1)) out[y * this.w + x] = colour;
      }
    this.m = out;
  }
  map(fn) {
    this.m = this.m.map((c) => (c ? fn(c) : c));
  }
}

// ---------- faces ----------
function eye(g, x, y, kind, ink) {
  const k = ink;
  if (kind === 'closed') {
    g.set(x, y + 1, k);
    g.set(x + 1, y + 1, k);
  } else if (kind === 'sleepy') {
    g.set(x, y + 1, k);
    g.set(x + 1, y + 1, k);
    g.set(x + 1, y, k);
  } else if (kind === 'happy') {
    g.set(x, y + 1, k);
    g.set(x + 1, y, k);
    g.set(x + 2, y + 1, k);
  } else if (kind === 'x') {
    [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]].forEach(([a, b]) => g.set(x + a, y + b - 1, k));
  } else if (kind === 'wide') {
    g.set(x, y - 1, '#ffffff');
    g.set(x + 1, y - 1, k);
    g.set(x, y, k);
    g.set(x + 1, y, k);
    g.set(x, y + 1, k);
    g.set(x + 1, y + 1, k);
  } else {
    g.set(x, y, '#ffffff');
    g.set(x + 1, y, k);
    g.set(x, y + 1, k);
    g.set(x + 1, y + 1, k);
  }
}
function mouth(g, x, y, kind) {
  const k = INK;
  if (kind === 'o') {
    g.set(x, y, k);
    g.set(x + 1, y, k);
    g.set(x, y + 1, k);
    g.set(x + 1, y + 1, k);
  } else if (kind === 'sad') {
    g.set(x - 1, y + 1, k);
    g.set(x, y, k);
    g.set(x + 1, y, k);
    g.set(x + 2, y + 1, k);
  } else if (kind === 'flat') {
    g.set(x, y, k);
    g.set(x + 1, y, k);
  } else {
    g.set(x - 1, y, k);
    g.set(x, y + 1, k);
    g.set(x + 1, y + 1, k);
    g.set(x + 2, y, k);
  }
}
function face(g, eyes, m, blush, p, base, ink = INK) {
  blush.forEach(([x, y]) => {
    g.set(x, y, mix(base, '#f08fa4', 0.65));
    g.set(x + 1, y, mix(base, '#f08fa4', 0.65));
  });
  eyes.forEach(([x, y]) => eye(g, x, y, p.eyes, ink));
  mouth(g, m[0], m[1], p.mouth);
}
function gloss(g, pts, base) {
  pts.forEach(([x, y]) => g.set(x, y, mix(base, '#ffffff', 0.7)));
}

// ---------- species ----------
// Each returns a shaded, outlined grid. Bottom row of the body is y = 20.
export const PAINTS = ['#E5484D', '#F5C451', '#3E8EDE', '#46B37A'];

const SPECIES = {
  noteling(p, c) {
    const g = new Grid();
    g.rect(15, 3, 2, 13, 'b');
    [[17, 3, 3], [17, 4, 4], [18, 5, 3], [19, 6, 2], [20, 7, 1]].forEach(([x, y, w]) => g.rect(x, y, w, 1, 'b'));
    g.ellipse(9.5, 15.5, 8.5, 5.5, 'b');
    g.shade({ b: c });
    g.rect(15, 11, 2, 1, '#EFC36A');
    gloss(g, [[4, 12], [5, 11], [6, 11]], c);
    face(g, [[5, 14], [11, 13]], [8, 17], [[3, 17], [13, 16]], p, c);
    return g;
  },
  octopus(p, c) {
    const g = new Grid();
    const arms = [5, 8, 11, 14, 17];
    arms.forEach((ax, i) => {
      const dir = i < 2 ? -1 : i > 2 ? 1 : 0;
      const wig = (p.f + i) % 4 < 2 ? 0 : 1;
      g.rect(ax, 13, 2, 6, 'b');
      g.set(ax + (dir < 0 ? -1 : dir > 0 ? 2 : 0) + (dir === 0 ? wig : 0), 19 - wig, 'b');
      g.set(ax + (dir < 0 ? -1 : dir > 0 ? 2 : 1), 20 - wig, 'b');
    });
    g.ellipse(12, 9, 8, 7, 'b');
    g.shade({ b: c });
    gloss(g, [[7, 4], [8, 3], [9, 3]], c);
    face(g, [[8, 8], [14, 8]], [11, 12], [[5, 11], [17, 11]], p, c);
    return g;
  },
  snail(p, c) {
    const g = new Grid();
    const foot = '#F5C4B3';
    g.rect(1, 17, 21, 4, 'f', 1);
    g.rect(16, 9, 4, 10, 'f', 1);
    g.rect(16, 4, 1, 6, 'f');
    g.rect(19, 5, 1, 5, 'f');
    g.ellipse(9, 11.5, 7.5, 7.5, 'b');
    g.shade({ b: c, f: foot });
    for (let t = 0; t < 9.5; t += 0.25) {
      const r = 0.6 + t * 0.55;
      g.set(Math.round(9 + Math.cos(t) * r - 0.5), Math.round(11.5 + Math.sin(t) * r - 0.5), mix(c, '#fff3dc', 0.45));
    }
    gloss(g, [[4, 7], [5, 6]], c);
    eye(g, 15, 2, p.eyes, '#3a2230');
    eye(g, 18, 3, p.eyes, '#3a2230');
    mouth(g, 18, 13, p.mouth === 'smile' ? 'flat' : p.mouth);
    g.set(20, 12, mix(foot, '#f08fa4', 0.6));
    return g;
  },
  mug(p, c) {
    const g = new Grid();
    g.rect(17, 9, 4, 7, 'b', 1);
    g.rect(3, 6, 15, 15, 'b', 1);
    g.shade({ b: c });
    g.rect(18, 11, 2, 3, null);
    g.rect(5, 6, 11, 2, '#5b3a2c');
    g.rect(6, 6, 3, 1, '#8a5a40');
    gloss(g, [[4, 9], [4, 10], [4, 11]], c);
    face(g, [[7, 12], [13, 12]], [10, 16], [[5, 15], [15, 15]], p, c);
    return g;
  },
  palette(p, c) {
    const g = new Grid();
    g.ellipse(11.5, 14, 10.5, 6.8, 'b');
    g.shade({ b: c });
    g.rect(3, 15, 2, 2, null);
    [[6, 10], [9, 9], [13, 9], [17, 10]].forEach(([x, y], i) => {
      g.rect(x, y, 2, 2, PAINTS[i]);
      g.set(x, y, mix(PAINTS[i], '#ffffff', 0.55));
    });
    face(g, [[9, 14], [15, 14]], [12, 18], [[7, 17], [17, 17]], p, c);
    return g;
  },
  bot(p, c) {
    const g = new Grid();
    g.rect(1, 11, 2, 5, 'e', 1);
    g.rect(21, 11, 2, 5, 'e', 1);
    g.rect(3, 7, 18, 14, 'b', 2);
    g.rect(11, 3, 2, 4, 'a');
    g.shade({ b: c, e: mix(c, '#241a5e', 0.35), a: '#9a97ad' });
    const bulb = p.bulb || '#6c6880';
    g.rect(11, 1, 2, 2, bulb);
    g.set(11, 1, mix(bulb, '#ffffff', 0.5));
    g.set(5, 9, mix(c, INK, 0.5));
    g.set(18, 9, mix(c, INK, 0.5));
    gloss(g, [[6, 8], [7, 8], [8, 8]], c);
    face(g, [[7, 12], [15, 12]], [11, 16], [[5, 15], [18, 15]], p, c);
    return g;
  },
  beaver(p, c) {
    const g = new Grid();
    // Flat tail behind, to the right.
    g.ellipse(19, 17.5, 4.5, 2.6, 't');
    // Body, ears and a lighter belly.
    g.ellipse(4.8, 10.2, 1.7, 1.7, 'b');
    g.ellipse(17.2, 10.2, 1.7, 1.7, 'b');
    g.ellipse(11, 14.5, 7.5, 6.5, 'b');
    g.ellipse(11, 17, 4.5, 3.5, 'l');
    // Hard hat: a dome and a brim.
    g.ellipse(11, 8.5, 6, 4.5, 'h');
    for (let y = 9; y < 13; y++) for (let x = 0; x < W; x++) if (g.get(x, y) === 'h') g.set(x, y, 'b');
    g.rect(3, 8, 16, 2, 'h', 1);
    g.shade({ b: c, l: mix(c, '#f3d9b1', 0.55), t: '#5b3a2c', h: '#F5C451' });
    // Tail cross-hatching, a ridge on the hat.
    [[17, 16], [19, 16], [21, 16], [16, 18], [18, 18], [20, 18], [22, 18]].forEach(([x, y]) => g.set(x, y, '#3f271d'));
    g.rect(10, 4, 2, 4, '#fbe3a0');
    g.rect(3, 9, 16, 1, '#d9a53a');
    gloss(g, [[5, 12], [5, 13]], c);
    // Face: eyes, nose, buck teeth.
    const ink = INK;
    [[5, 14], [15, 14]].forEach(([x, y]) => {
      g.set(x, y, mix(c, '#f08fa4', 0.6));
      g.set(x + 1, y, mix(c, '#f08fa4', 0.6));
    });
    [[7, 11], [13, 11]].forEach(([x, y]) => eye(g, x, y, p.eyes, ink));
    g.rect(10, 13, 2, 1, '#3a2230');
    g.rect(10, 14, 2, 2, '#ffffff');
    if (p.mouth === 'smile') [[9, 14], [12, 14]].forEach(([x, y]) => g.set(x, y, ink));
    if (p.mouth === 'sad') [[9, 15], [12, 15]].forEach(([x, y]) => g.set(x, y, ink));
    if (p.mouth === 'o') g.rect(10, 16, 2, 1, ink);
    return g;
  },
  fluff(p, c) {
    const g = new Grid();
    g.ellipse(12, 13.5, 9, 7.5, 'b');
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      g.set(Math.round(12 + Math.cos(a) * 9.4 - 0.5), Math.round(13.5 + Math.sin(a) * 7.9 - 0.5), 'b');
    }
    g.set(11, 5, 'b');
    g.set(13, 5, 'b');
    g.set(12, 4, 'b');
    g.shade({ b: c });
    gloss(g, [[7, 9], [8, 8]], c);
    face(g, [[8, 12], [15, 12]], [11, 16], [[6, 15], [17, 15]], p, c);
    return g;
  },
};

// Where working particles leave from, relative to the sprite's top left.
const EMIT = { beaver: [11, 15], noteling: [19, 2], octopus: [12, 1], snail: [3, 19], mug: [10, 5], palette: [12, 7], bot: [12, 1], fluff: [12, 3] };

const cache = new Map();
export function sprite(species, colour, pose) {
  const fade = Math.round((pose.fade || 0) * 10) / 10;
  const key = `${species}|${colour}|${pose.eyes}|${pose.mouth}|${pose.bulb}|${pose.grey}|${fade}|${species === 'octopus' ? pose.f % 4 : 0}`;
  if (cache.has(key)) return cache.get(key);
  const g = (SPECIES[species] || SPECIES.fluff)(pose, colour);
  g.outline(mix(colour, '#140f24', 0.7));
  if (pose.grey) g.map((c) => grey(c, 0.85));
  else if (fade) g.map((c) => mix(grey(c, fade * 0.85), '#2a2438', fade * 0.25));
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const v = g.get(x, y);
      if (!v) continue;
      ctx.fillStyle = v;
      ctx.fillRect(x, y, 1, 1);
    }
  cache.set(key, cv);
  return cv;
}

// ---------- small glyphs ----------
const GLYPH = {
  note: ['.x..', '.xx.', '.x.x', '.x..', 'xx..', 'xx..'],
  bubble: ['.x.', 'x.x', '.x.'],
  z: ['xxx', '..x', '.x.', 'xxx'],
  spark: ['.x.', 'xxx', '.x.'],
  ask: ['.ooooooo.', 'owwwwwwwo', 'owwkkkwwo', 'owwwwwkwo', 'owwwwkkwo', 'owwwwkwwo', 'owwwwwwwo', 'owwwwkwwo', '.ooooooo.', '..oo.....', '.o.......'],
  cloud: ['..ooo...', '.ooooo..', 'oooooooo', '.oooooo.'],
  drop: ['x', 'x'],
};
export function glyph(ctx, name, x, y, colours) {
  const rows = GLYPH[name];
  rows.forEach((row, j) =>
    [...row].forEach((ch, i) => {
      if (ch === '.') return;
      ctx.fillStyle = colours[ch] || colours.x;
      ctx.fillRect(Math.round(x) + i, Math.round(y) + j, 1, 1);
    }),
  );
}

// ---------- one creature, one frame ----------
// c: { species, colour, state, x (centre), ground (y of the floor), phase, fade, hover, quiet, calm }
// States: working, needs, done, failed, idle, drowsy, asleep.
// fade (0 to 1) greys out a creature left alone for days. hover perks it up.
// quiet is a tool waiting a while, which may be an approval: it stops and shows a grey "?".
export function drawCreature(ctx, c, frame) {
  const t = frame + (c.phase || 0);
  const pose = { eyes: 'open', mouth: 'smile', f: t, grey: false, bulb: '#6c6880', fade: c.fade || 0 };
  let dy = 0;
  let dx = 0;
  const blink = t % 37 === 0 || t % 37 === 1;
  switch (c.state) {
    case 'working':
      if (c.quiet) {
        pose.eyes = blink ? 'closed' : 'open';
        pose.mouth = 'flat';
        pose.bulb = '#9a97ad';
        break;
      }
      dy = t % 4 < 2 ? 0 : -1;
      if (blink) pose.eyes = 'closed';
      pose.bulb = t % 4 < 2 ? '#f5c451' : '#fff1b8';
      break;
    case 'needs':
      dy = [0, -2, -3, -2, 0, 0, 0, 0, 0, 0, 0, 0][t % 12];
      pose.eyes = 'wide';
      pose.mouth = 'o';
      pose.bulb = '#ef9f27';
      break;
    case 'done':
      // A fresh finish bounces every 2 seconds. An unread one waits 4 and jumps lower.
      dy = c.calm ? [0, -1, -3, -3, -1][t % 32] || 0 : [0, -2, -4, -5, -4, -2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0][t % 16];
      pose.eyes = 'happy';
      pose.bulb = '#f5c451';
      break;
    case 'failed':
      dx = t % 14 === 0 ? 1 : t % 14 === 1 ? -1 : 0;
      pose.eyes = 'x';
      pose.mouth = 'sad';
      pose.grey = true;
      break;
    case 'asleep':
      pose.eyes = c.hover ? 'sleepy' : 'closed';
      pose.mouth = 'flat';
      break;
    case 'drowsy':
      pose.eyes = c.hover ? 'open' : 'sleepy';
      pose.mouth = 'flat';
      break;
    default:
      if (blink) pose.eyes = 'closed';
  }
  if (c.hover && dy === 0) dy = -1;
  const left = Math.round(c.x - W / 2) + dx;
  const top = c.ground - H + 1 + dy;
  // Shadow stays on the floor and shrinks as it jumps.
  const sw = Math.max(8, 16 + dy * 2);
  ctx.fillStyle = 'rgba(10, 6, 20, 0.35)';
  ctx.fillRect(Math.round(c.x - sw / 2), c.ground + 1, sw, 1);
  ctx.fillRect(Math.round(c.x - sw / 2) + 2, c.ground + 2, sw - 4, 1);
  ctx.drawImage(sprite(c.species, c.colour, pose), left, top);
  ctx.globalAlpha = 1;
  overlays(ctx, c, t, left, top);
}

function overlays(ctx, c, t, left, top) {
  const [ex, ey] = EMIT[c.species] || EMIT.fluff;
  const x0 = left + ex;
  const y0 = top + ey;
  if (c.state === 'working' && !c.quiet && c.species === 'beaver') {
    ctx.fillStyle = '#8a5a3c';
    ctx.fillRect(left + 4, top + 18, 14, 3);
    ctx.fillStyle = '#b07a52';
    ctx.fillRect(left + 4, top + 18, 14, 1);
    ctx.fillStyle = '#e8c39a';
    ctx.fillRect(left + 3, top + 18, 2, 3);
    ctx.fillStyle = '#b07a52';
    ctx.fillRect(left + 3, top + 19, 1, 1);
  }
  if (c.state === 'working' && c.quiet) {
    glyph(ctx, 'ask', left + 16, top - 9, { o: INK, w: '#c9c1d9', k: '#5f5873' });
  } else if (c.state === 'working') {
    for (let k = 0; k < 3; k++) {
      const life = (t + k * 7) % 21;
      const fade = life < 14 ? 1 : (21 - life) / 7;
      ctx.globalAlpha = Math.max(fade, 0);
      if (c.species === 'noteling') glyph(ctx, 'note', x0 + Math.round(Math.sin(life / 3 + k) * 2), y0 - 6 - life, { x: '#e9e4ff' });
      else if (c.species === 'octopus') glyph(ctx, 'bubble', x0 - 1 + (k - 1) * 4 + Math.round(Math.sin(life / 2) * 1.2), y0 - 3 - life, { x: '#bfe6ff' });
      else if (c.species === 'mug')
        for (let s = 0; s < 4; s++) {
          ctx.fillStyle = '#efeaf5';
          ctx.fillRect(x0 + (k - 1) * 3 + Math.round(Math.sin((life + s) / 2.2)), y0 - 2 - life - s, 1, 1);
        }
      else if (c.species === 'palette') {
        const dir = k === 1 ? 0 : k === 0 ? -1 : 1;
        ctx.fillStyle = PAINTS[k + 1];
        ctx.fillRect(x0 + Math.round(dir * life * 0.6), y0 - 2 - Math.round((life * (16 - life)) / 7), 2, 2);
      } else if (c.species === 'bot') {
        if (k === 0) {
          const r = (t % 12) / 1.5 + 1;
          ctx.globalAlpha = 1 - (t % 12) / 12;
          ctx.fillStyle = '#f5c451';
          for (let a = 0; a < 24; a++) {
            const ang = (a / 24) * Math.PI * 2;
            if (Math.sin(ang) > 0.3) continue;
            ctx.fillRect(Math.round(x0 + Math.cos(ang) * r), Math.round(y0 + 1 + Math.sin(ang) * r), 1, 1);
          }
        }
      } else if (c.species === 'beaver') {
        // Wood chips flying off the log it's gnawing.
        const dir = k === 1 ? 0 : k === 0 ? -1 : 1;
        ctx.fillStyle = k % 2 ? '#e8c39a' : '#b07a52';
        ctx.fillRect(x0 + Math.round(dir * (2 + life * 0.7)), y0 + 3 - Math.round((life * (14 - life)) / 8), 1 + (k % 2), 1);
      } else if (c.species === 'snail') {
        ctx.fillStyle = '#d9f2ff';
        ctx.fillRect(x0 - 2 - life, c.ground - (life % 3 === 0 ? 1 : 0), 1, 1);
      } else {
        ctx.fillStyle = '#efeaf5';
        ctx.fillRect(x0 + (k - 1) * 4, y0 - 2 - life, 2, 2);
      }
    }
    ctx.globalAlpha = 1;
  } else if (c.state === 'needs') {
    glyph(ctx, 'ask', left + 16, top - 9 + (t % 12 < 2 ? -1 : 0), { o: INK, w: '#ffffff', k: '#ef9f27' });
  } else if (c.state === 'done') {
    [[-2, 4], [22, 6], [3, -3], [19, -2]].forEach(([sx, sy], k) => {
      if ((t + k * 3) % 8 < 5) glyph(ctx, 'spark', left + sx, top + sy, { x: k % 2 ? '#f6d77a' : '#ffffff' });
    });
  } else if (c.state === 'failed') {
    glyph(ctx, 'cloud', left + 8, top - 6, { o: '#6e687e' });
    if (t % 6 < 3) glyph(ctx, 'drop', left + 10 + (t % 3) * 2, top - 1, { x: '#8fb4d9' });
  } else if (c.state === 'asleep' && !c.hover) {
    for (let k = 0; k < 2; k++) {
      const life = (t + k * 12) % 24;
      ctx.globalAlpha = life < 16 ? 0.9 : (24 - life) / 8;
      glyph(ctx, 'z', left + 18 + Math.round(life / 5), top + 2 - Math.round(life / 2), { x: '#c9c1d9' });
    }
    ctx.globalAlpha = 1;
  }
}

// ---------- scaled canvases and the frame clock ----------
export function stage(canvas, w, h, scale) {
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = `${w * scale}px`;
  canvas.style.height = `${h * scale}px`;
  canvas.style.imageRendering = 'pixelated';
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

// One clock for every canvas, at a chunky 8 frames a second. It only runs while something
// is listening.
const listeners = new Set();
let frame = 0;
let timer = null;
let frozen = false;
// Holds every canvas on one frame, for rendering the README GIF frame by frame.
export function freezeAt(n) {
  frame = n;
  frozen = true;
}
export function onFrame(fn) {
  listeners.add(fn);
  fn(frame);
  if (!timer && !frozen) timer = setInterval(() => {
    frame++;
    listeners.forEach((l) => l(frame));
  }, 125);
  return () => {
    listeners.delete(fn);
    if (!listeners.size) {
      clearInterval(timer);
      timer = null;
    }
  };
}

