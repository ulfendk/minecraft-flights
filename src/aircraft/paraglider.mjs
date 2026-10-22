import { cells, commonMaterials, PALETTE } from '../lib/materials.mjs';
import { Model } from '../lib/parts.mjs';

// A paraglider: an arched canopy of cells high above, lines down to a harness the pilot sits
// in. Scale 1 (16 px = 1 block). The entity is the harness; the wing floats six blocks up.
const m = new Model();
m.bone('root', null, [0, 0, 0]);
const b = m.bone('body', 'root', [0, 10, 0]);

// Harness: a seat board and a back rest, with a reserve pocket.
b.box([-4, 3, -4], [8, 2, 8], 'harness').box([-4, 5, 3], [8, 9, 2], 'harness').box([-2, 5, 5], [4, 5, 2], 'reserve');
b.box([-5, 13, 2], [1, 2, 1], 'frame').box([4, 13, 2], [1, 2, 1], 'frame'); // carabiners

// The wing: 9 cells along an arc, each tilted to follow it.
const canopy = m.bone('canopy', 'body', [0, 14, 0]);
const R = 72, top = 104, cells9 = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
const ends = [];
for (const i of cells9) {
  const a = i * 9.5; // degrees round the arc
  const x = Math.sin((a * Math.PI) / 180) * R, y = top - (1 - Math.cos((a * Math.PI) / 180)) * R;
  canopy.box([x - 6.5, y - 1.5, -18], [13, 3, 30], 'cells', { rotation: [0, 0, a], pivot: [x, y, -3] });
  if (Math.abs(i) === 4 || Math.abs(i) === 2) ends.push([x, y]);
}
// Lines from the carabiners up to the canopy (bundled in four risers).
for (const [x, y] of ends) {
  const from = [Math.sign(x) * 4.5, 15];
  const dx = x - from[0], dy = y - 2 - from[1];
  const len = Math.round(Math.hypot(dx, dy));
  const tilt = (Math.atan2(dx, dy) * 180) / Math.PI;
  for (const z of [-10, 4]) {
    canopy.box([from[0] - 0.5, from[1], z], [1, len, 1], 'rope', { rotation: [0, 0, tilt], pivot: [from[0], from[1], z + 0.5] });
  }
}

const materials = {
  ...commonMaterials(PALETTE.blue),
  cells: cells(['#1f8fd0', '#f2b705', '#e8501f', '#f2b705', '#1f8fd0'], 13),
  harness: { base: '#33363a', shading: 0.15 },
  reserve: { base: '#e8501f', shading: 0.15 },
};

export default {
  id: 'paraglider',
  name: 'Paraglider',
  group: 'unpowered',
  info: 'A fabric wing and a harness. Hold W to run off a slope and glide down in long turns. Find rising air over campfires, lava and sand to climb again.',
  scale: 1,
  hitbox: { width: 0.9, height: 1.2 },
  bounds: { width: 12, height: 9 },
  health: 12,
  mass: 1,
  camera: 9,
  crash: 0.5,
  seats: [{ at: [0, 5, 0] }],
  flight: {
    kind: 'wing', trim: 0.45, glide: 8, stall: 0.28, stallSink: 0.25, maxPitch: 10, maxBank: 25, turn: 3,
    ceiling: 280, fixedPitch: true, run: 0.3, windFactor: 0.6, taxiTurn: 4, rollRate: 2,
  },
  visuals: [{ bone: 'canopy', prop: 'rotation', axis: 2, expr: 'math.sin($time * 50) * 2' }],
  recipe: { pattern: ['WWW', 'S S', ' L '], key: { W: 'white_wool', S: 'string', L: 'leather' } },
  icon: {
    rows: [
      '................',
      '...bbyyoyybb....',
      '.bbyyooooyybb...',
      'b.............b.',
      '.k...........k..',
      '..k.........k...',
      '...k.......k....',
      '....k.....k.....',
      '.....k...k......',
      '......k.k.......',
      '.......h........',
      '......hhh.......',
      '.......h........',
      '................',
      '................',
      '................',
    ],
    palette: { b: '#1f8fd0', y: '#f2b705', o: '#e8501f', k: '#cfc6ad', h: '#33363a' },
  },
  model: m.build(),
  materials,
};
