// Draws the app icon: the Workspace robot in its control room, on a small pixel grid
// scaled up to 1024. tools/make-icon.sh renders this page and makes every icon size from it.
import { mix, sprite } from './lib/pixel/pixel.js';

const N = 43; // 24 screen pixels per pixel at 1024, so the rounded square holds about 34
const px = document.createElement('canvas');
px.width = N;
px.height = N;
const g = px.getContext('2d');
const rect = (x, y, w, h, c) => {
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
};

// Control room: wall, two screens, a desk edge and floor plates.
rect(0, 0, N, N, '#1b2433');
[[8, 8], [24, 8]].forEach(([sx, sy], i) => {
  rect(sx - 1, sy - 1, 13, 9, '#3a4658');
  rect(sx, sy, 11, 7, '#0f1b24');
  [[8, '#56B4A0'], [5, '#3d8a7a'], [7, '#3d8a7a']].forEach(([len, c], l) => rect(sx + 1, sy + 1 + l * 2, len - i * 2, 1, c));
  rect(sx + 9, sy + 1, 1, 1, '#f5c451');
});
rect(0, 25, N, 5, '#2d3748');
rect(0, 25, N, 1, '#4a5a70');
[6, 12, 30, 36].forEach((x, i) => rect(x, 27, 1, 1, i % 2 ? '#e5484d' : '#46b37a'));
rect(0, 30, N, N - 30, '#3a4658');
rect(0, 30, N, 1, '#56657d');
[11, 31].forEach((x) => rect(x, 31, 1, N - 31, '#2d3748'));
rect(0, 35, N, 1, '#2d3748');

// The robot, with its bulb lit, standing on the floor.
const ground = 31;
rect(13, ground + 1, 16, 1, 'rgba(10, 6, 20, 0.4)');
rect(15, ground + 2, 12, 1, 'rgba(10, 6, 20, 0.4)');
g.drawImage(sprite('bot', '#56B4A0', { eyes: 'open', mouth: 'smile', bulb: '#f5c451', f: 0 }), 9, ground - 21);

// Scale up with no smoothing, inside a rounded square with the usual macOS margins.
const out = document.getElementById('icon').getContext('2d');
const M = 100;
const S = 1024 - M * 2;
out.save();
out.beginPath();
out.roundRect(M, M, S, S, 185);
out.clip();
out.imageSmoothingEnabled = false;
out.drawImage(px, 0, 0, N * 24, N * 24); // whole numbers of screen pixels, so every pixel is the same size
out.restore();
out.lineWidth = 6;
out.strokeStyle = mix('#56B4A0', '#1b2433', 0.55);
out.beginPath();
out.roundRect(M + 3, M + 3, S - 6, S - 6, 182);
out.stroke();
document.body.dataset.ready = '1';
