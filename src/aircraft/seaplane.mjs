import { commonMaterials, gloss, livery, paint, PALETTE } from '../lib/materials.mjs';
import { fin, fuselage, Model, propeller, tubeZ, wing } from '../lib/parts.mjs';

// A six-seat bush plane on floats: high wing, a round radial-engine cowling, and two long
// floats on struts instead of wheels, so it lands on lakes and the sea. Scale 1.5.
const m = new Model();
m.bone('root', null, [0, 0, 0]);
const b = m.bone('body', 'root', [0, 20, -10]);

fuselage(b, [
  [-46, 7, 7, 20], // radial engine cowling
  [-38, 8, 8, 20],
  [-30, 8, 10, 21], // cabin
  [-2, 8, 10, 21],
  [10, 6, 8, 21],
  [26, 4, 5, 22], // tail cone
  [44, 2, 3, 23],
], 'paint');
// Cabin glass: windscreen, side windows for the pilots and the passengers behind.
b.box([-7, 24, -33], [14, 6, 2], 'glass');
for (const s of [1, -1]) {
  const x = s > 0 ? 8 : -9;
  b.box([x, 23, -29], [1, 7, 10], 'glass').box([x, 23, -16], [1, 6, 7], 'glass').box([x, 23, -6], [1, 6, 7], 'glass');
}
b.box([-3, 14, -49], [6, 3, 3], 'dark'); // oil cooler under the cowling
b.box([-0.5, 13, -40], [1, 1, 30], 'dark'); // keel stripe

// High wing on the cabin roof, struts down to the fuselage.
wing(b, { span: 128, y: 31, z0: -30, chord: 16, tipChord: 13, t: 2, dihedral: 2, mat: 'wing' });
b.box([-8, 30, -30], [16, 2, 16], 'wing');
for (const s of [1, -1]) {
  b.box([s > 0 ? 8 : -33, 18, -24], [25, 1, 1], 'dark', { rotation: [0, 0, s * -30], pivot: [s * 8, 18.5, -23.5] });
  b.box([s > 0 ? 63 : -64, 31, -28], [1, 2, 3], s > 0 ? 'nav_red' : 'nav_green');
}
// Tail, with a small water rudder fairing at the bottom of the fin.
wing(b, { span: 44, y: 23, z0: 35, chord: 10, tipChord: 7, mat: 'wing' });
fin(b, { y: 25, h: 18, z0: 31, chord: 15, tipChord: 9, mat: 'paint' });
b.box([-0.5, 42, 38], [1, 1, 2], 'strobe');

// Floats: long pontoons with a pointed bow, on struts from the fuselage.
for (const s of [1, -1]) {
  const x = s * 13;
  tubeZ(b, { rx: 3, ry: 3, x, y: 3, z0: -34, z1: 28, mat: 'float' });
  tubeZ(b, { rx: 2, ry: 2, x, y: 4, z0: -40, z1: -34, mat: 'float' }); // bow
  b.box([x - 1, 6, -40], [2, 1, 4], 'float'); // bow deck turned up
  b.box([x - 3.5, 0, -10], [7, 1, 6], 'float'); // step under the float
  for (const z of [-24, 4]) b.box([s > 0 ? 9 : -12, 6, z], [3, 9, 1], 'dark', { rotation: [0, 0, s * -18], pivot: [s * 10.5, 6, z] });
}
b.box([-12, 9, -24], [24, 1, 1], 'dark').box([-12, 9, 4], [24, 1, 1], 'dark'); // spreader bars

propeller(m, 'prop', 'body', { y: 20, z: -48, r: 13 });

const materials = {
  ...commonMaterials(PALETTE.yellow),
  paint: livery('#f2b705', '#c8261b', { y0: 17, y1: 19, second: '#2a2a2a', y2: 19, y3: 20 }),
  wing: paint('#f2b705'),
  float: gloss('#d9dcdf'),
};

export default {
  id: 'seaplane',
  name: 'Seaplane',
  group: 'plane',
  info: 'A six-seat bush plane on floats. It takes off from and lands on water as well as on the ground: open the throttle with W, run across the lake and look up to lift off. Look where you want to turn, and touch down gently on the water.',
  scale: 1.5,
  hitbox: { width: 2.4, height: 3 },
  bounds: { width: 14, height: 6 },
  health: 70,
  mass: 14,
  camera: 11,
  seats: [{ at: [4, 19, -24] }, { at: [-4, 19, -24] }, { at: [4, 19, -12] }, { at: [-4, 19, -12] }, { at: [4, 19, -1] }, { at: [-4, 19, -1] }],
  flight: { kind: 'wing', thrust: 0.02, maxSpeed: 2, stall: 0.8, stallSink: 0.8, maxPitch: 20, maxBank: 35, turn: 3, ceiling: 280, floats: true },
  visuals: [{ bone: 'prop', prop: 'rotation', axis: 2, expr: '$spin * 3' }],
  recipe: { pattern: ['IGI', 'BFB', 'O O'], key: { I: 'iron_ingot', G: 'glass_pane', B: 'iron_block', F: 'furnace', O: 'oak_boat' } },
  icon: {
    rows: [
      '................',
      '................',
      '.......r........',
      '.yyyyyyyyyyyyyy.',
      '.......y........',
      '.....gyyy.......',
      'pyyyyyyyyyyyyyr.',
      'p.rrrrrrrrrrrrr.',
      'pyyyyyyyyyy.....',
      '...k.....k......',
      '.wwwwwwwwww.....',
      'ww.......ww.....',
      '..bbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbbbb',
      '................',
      '................',
    ],
    palette: { y: '#f2b705', r: '#c8261b', g: '#a8d4e6', p: '#555555', k: '#2a2a2a', w: '#d9dcdf', b: '#3f76e4' },
  },
  model: m.build(),
  materials,
};
