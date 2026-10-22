import { commonMaterials, gores, metal, PALETTE, wicker } from '../lib/materials.mjs';
import { Model, tube } from '../lib/parts.mjs';

// A hot-air balloon: a wicker basket for four, a burner on a frame, and a big striped
// envelope. Scale 2 (16 px = 2 blocks). Only the basket collides.
const m = new Model();
m.bone('root', null, [0, 0, 0]);
const b = m.bone('body', 'root', [0, 8, 0]);

// Basket: open on top, so the people in it can look (and shoot) out.
b.box([-9, 0, -9], [18, 1, 18], 'wicker');
b.box([-9, 1, -9], [18, 7, 1], 'wicker').box([-9, 1, 8], [18, 7, 1], 'wicker');
b.box([-9, 1, -8], [1, 7, 16], 'wicker').box([8, 1, -8], [1, 7, 16], 'wicker');
b.box([-9.5, 8, -9.5], [19, 1, 19], 'leather', { inflate: 0.1 }); // padded rim
// Sandbags on the outside.
for (const [x, z] of [[9, -4], [9, 3], [-10, -4], [-10, 3]]) b.box([x, 3, z], [1, 3, 2], 'sand');

// Burner frame on four uprights, the burner and its pilot light.
for (const [x, z] of [[-6, -6], [5, -6], [-6, 5], [5, 5]]) b.box([x, 8, z], [1, 9, 1], 'frame');
b.box([-6, 17, -6], [12, 1, 12], 'frame');
b.box([-2, 15, -2], [4, 3, 4], 'burner');
const flame = m.bone('flame', 'body', [0, 18, 0]);
flame.box([-1.5, 18, -1.5], [3, 9, 3], 'flame').box([-0.5, 27, -0.5], [1, 3, 1], 'flame');

// Ropes from the basket corners up to the envelope's mouth.
for (const [x, z] of [[-8, -8], [7, -8], [-8, 7], [7, 7]]) b.box([x, 9, z], [1, 18, 1], 'rope', { rotation: [z < 0 ? 4 : -4, 0, x < 0 ? -4 : 4], pivot: [x + 0.5, 9, z + 0.5] });

// Envelope: rings from the mouth up to the crown.
const env = m.bone('envelope', 'body', [0, 28, 0]);
const rings = [
  [7, 28], [9, 31], [11, 34], [13, 37], [15, 40], [17, 43], [18, 46], [19, 49], [19, 52], [19, 55],
  [18, 58], [17, 61], [15, 64], [12, 67], [8, 69],
];
rings.forEach(([r, y], i) => tube(env, { r, y, h: i === rings.length - 1 ? 2 : 3, mat: 'envelope' }));

const materials = {
  ...commonMaterials(PALETTE.red),
  wicker: wicker(),
  leather: { base: '#5a3a22', shading: 0.15 },
  sand: { base: '#c9b27a', shading: 0.15 },
  burner: metal('#8e9296'),
  envelope: gores(['#d8322a', '#f2b705', '#d8322a', '#2f6fd0', '#f4f1e8', '#2f6fd0'], { n: 12 }),
};

export default {
  id: 'hot_air_balloon',
  name: 'Hot-Air Balloon',
  group: 'unpowered',
  info: 'A big balloon with a basket for four. W fires the burner, S opens the vent, and when you let go it holds its height. It drifts with the wind, so steer by finding another wind higher or lower. Jump drops the anchor.',
  scale: 2,
  hitbox: { width: 2.2, height: 1.1 },
  bounds: { width: 6, height: 19 },
  health: 30,
  mass: 6,
  camera: 12,
  seats: [{ at: [4, 4, -4] }, { at: [-4, 4, -4] }, { at: [4, 4, 4] }, { at: [-4, 4, 4] }],
  flight: { kind: 'balloon', climb: 0.12, sink: 0.1, cool: 0.03, turn: 1, ceiling: 300 },
  visuals: [
    { bone: 'flame', prop: 'scale', axis: -1, expr: '$burner * (0.85 + math.sin($time * 1100) * 0.15)' },
  ],
  recipe: { pattern: ['RRR', 'RCR', 'SBS'], key: { R: 'red_wool', C: 'campfire', S: 'string', B: 'barrel' } },
  icon: {
    rows: [
      '.....rryyrr.....',
      '....rryyyyrr....',
      '...rryyyyyyrr...',
      '...rryyyyyyrr...',
      '...rryyyyyyrr...',
      '...rryyyyyyrr...',
      '....rryyyyrr....',
      '.....rryyrr.....',
      '......r..r......',
      '......k..k......',
      '......k..k......',
      '......kffk......',
      '.....wwwwww.....',
      '.....wwwwww.....',
      '.....wwwwww.....',
      '................',
    ],
    palette: { r: '#d8322a', y: '#f2b705', k: '#cfc6ad', f: '#ffc23a', w: '#a8763e' },
  },
  model: m.build(),
  materials,
};
