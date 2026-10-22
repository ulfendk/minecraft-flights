// Pack icon: a hot-air balloon and a small plane in an evening sky over green hills, with
// a few clouds. Drawn at 32x32 and scaled up.
import { PNG } from 'pngjs';
import { hex, mix } from './texture.mjs';

export function packIcon(scale = 8) {
  const N = 32;
  const px = Array.from({ length: N }, () => new Array(N));
  const sky = [hex('#2b5fb4'), hex('#6fa8e8'), hex('#f3c27a'), hex('#ffe2a8')];
  for (let y = 0; y < N; y++) {
    const t = y / 26;
    const c = t < 0.5 ? mix(sky[0], sky[1], t / 0.5) : t < 0.85 ? mix(sky[1], sky[2], (t - 0.5) / 0.35) : mix(sky[2], sky[3], Math.min(1, (t - 0.85) / 0.15));
    for (let x = 0; x < N; x++) px[y][x] = c;
  }
  const put = (x, y, c) => { if (x >= 0 && x < N && y >= 0 && y < N) px[y][x] = hex(c); };
  const fill = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, c); };

  // Clouds
  fill(2, 6, 8, 7, '#ffffff'); fill(4, 5, 6, 5, '#ffffff'); fill(21, 18, 29, 19, '#fdf6ea'); fill(23, 17, 26, 17, '#fdf6ea');

  // Hills
  for (let x = 0; x < N; x++) {
    const h = 26 + Math.round(Math.sin(x / 5) * 1.5 + Math.sin(x / 2.3) * 0.6);
    for (let y = h; y < N; y++) put(x, y, y === h ? '#6fbf4a' : (x + y) % 4 ? '#4e8f34' : '#447e2d');
  }

  // Hot-air balloon: striped envelope, ropes and a basket.
  const cx = 12, cy = 12;
  const stripes = ['#d8322a', '#f2b705', '#d8322a', '#2f6fd0', '#f4f1e8'];
  for (let y = 3; y <= 20; y++) {
    const t = (y - 3) / 17;
    const r = Math.round(t < 0.55 ? 7 * Math.sqrt(Math.min(1, (t + 0.08) / 0.6)) : 7 - (t - 0.55) * 10);
    for (let x = cx - r; x <= cx + r; x++) {
      const band = Math.floor(((x - cx + r) / Math.max(1, 2 * r + 1)) * 5);
      const shadeEdge = x === cx - r || x === cx + r;
      put(x, y, shadeEdge ? '#9c2018' : stripes[Math.min(4, band)]);
    }
  }
  put(cx - 3, 21, '#5a4632'); put(cx + 3, 21, '#5a4632'); put(cx - 2, 22, '#5a4632'); put(cx + 2, 22, '#5a4632');
  fill(cx - 2, 23, cx + 2, 25, '#a8763e'); fill(cx - 2, 23, cx + 2, 23, '#7a5228');
  put(cx, 21, '#ffc23a'); put(cx, 22, '#ff7a1a');

  // A small plane heading right, upper right.
  fill(20, 8, 29, 8, '#f2f0ea'); // fuselage
  fill(21, 9, 28, 9, '#1f4e9a'); // stripe
  fill(23, 6, 25, 7, '#f2f0ea'); fill(23, 10, 25, 11, '#f2f0ea'); // wings
  fill(20, 6, 20, 7, '#f2f0ea'); // fin
  put(28, 8, '#a8d4e6'); put(30, 7, '#555555'); put(30, 9, '#555555'); put(30, 8, '#999999'); // windscreen, prop

  const png = new PNG({ width: N * scale, height: N * scale });
  for (let y = 0; y < N * scale; y++) for (let x = 0; x < N * scale; x++) {
    png.data.set(px[Math.floor(y / scale)][Math.floor(x / scale)], (y * N * scale + x) * 4);
  }
  return PNG.sync.write(png);
}
