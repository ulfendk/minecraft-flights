import { commonMaterials, livery, paint, PALETTE } from '../lib/materials.mjs';
import { fin, fuselage, Model, propeller, wheel, wing } from '../lib/parts.mjs';

// A four-seat high-wing trainer. Model pixels at scale 1.5 (16 px = 1.5 blocks).
const m = new Model();
m.bone('root', null, [0, 0, 0]);
const b = m.bone('body', 'root', [0, 14, -10]);

fuselage(b, [
  [-44, 5, 5, 14], // spinner end of the cowling
  [-36, 6, 7, 14],
  [-28, 7, 9, 15], // cabin
  [-6, 7, 9, 15],
  [6, 5, 7, 15],
  [22, 3, 4, 16], // tail cone
  [40, 2, 3, 17],
], 'paint');
// Cabin glass: windscreen, side windows, rear window.
b.box([-6, 17, -31], [12, 6, 2], 'glass')
  .box([7, 16, -27], [1, 7, 11], 'glass').box([-8, 16, -27], [1, 7, 11], 'glass')
  .box([7, 16, -14], [1, 6, 8], 'glass').box([-8, 16, -14], [1, 6, 8], 'glass');
b.box([-3, 9, -48], [6, 3, 4], 'dark'); // air intake under the spinner
b.box([3, 9, -40], [1, 1, 10], 'dark'); // exhaust

// High wing on top of the cabin, struts down to the fuselage.
wing(b, { span: 118, y: 24, z0: -27, chord: 15, tipChord: 12, t: 2, dihedral: 2, mat: 'wing' });
b.box([-7, 23, -27], [14, 2, 15], 'wing'); // wing root fairing
for (const s of [1, -1]) {
  b.box([s > 0 ? 7 : -30, 11, -21], [23, 1, 1], 'dark', { rotation: [0, 0, s * -30], pivot: [s * 7, 11.5, -20.5] });
  b.box([s > 0 ? 58 : -59, 24, -26], [1, 2, 3], s > 0 ? 'nav_red' : 'nav_green'); // nav lights on the tips
}
// Tail
wing(b, { span: 42, y: 17, z0: 31, chord: 9, tipChord: 7, mat: 'wing' });
fin(b, { y: 19, h: 17, z0: 28, chord: 14, tipChord: 8, mat: 'paint' });
b.box([-0.5, 35, 34], [1, 1, 2], 'strobe');

// Tricycle gear
b.box([-0.5, 3, -37], [1, 7, 1], 'metal');
wheel(m, 'nose_wheel', 'body', { x: 0, y: 3, z: -37, r: 3, w: 2 });
for (const s of [1, -1]) {
  b.box([s > 0 ? 6 : -13, 3, -14], [7, 1, 2], 'metal', { rotation: [0, 0, s * 35], pivot: [s * 6, 9, -13] });
  wheel(m, `main_wheel_${s > 0 ? 'l' : 'r'}`, 'body', { x: s * 13, y: 3.5, z: -13, r: 3.5, w: 3 });
}
propeller(m, 'prop', 'body', { y: 14, z: -46, r: 12 });

const materials = {
  ...commonMaterials(PALETTE.white),
  paint: livery('#f2f0ea', '#1f4e9a', { y0: 12, y1: 14, second: '#c8261b', y2: 14, y3: 15 }),
  wing: paint('#f2f0ea'),
};

export default {
  id: 'light_aircraft',
  name: 'Light Aircraft',
  group: 'plane',
  info: 'A four-seat high-wing propeller plane, like a Cessna 172. Open the throttle with W, roll down the runway and look up to lift off. Look where you want to go (or bank with A and D) to turn, close the throttle with S and hold S on the ground to brake.',
  scale: 1.5,
  hitbox: { width: 2, height: 2.3 },
  bounds: { width: 13, height: 5 },
  health: 60,
  mass: 12,
  camera: 10,
  seats: [{ at: [3, 13, -21] }, { at: [-3, 13, -21] }, { at: [3, 13, -10] }, { at: [-3, 13, -10] }],
  flight: { kind: 'wing', thrust: 0.02, maxSpeed: 2.2, stall: 0.9, stallSink: 0.8, maxPitch: 20, maxBank: 35, turn: 3, ceiling: 300 },
  visuals: [{ bone: 'prop', prop: 'rotation', axis: 2, expr: '$spin * 3' }],
  recipe: { pattern: ['IGI', 'BFB', 'I I'], key: { I: 'iron_ingot', G: 'glass_pane', B: 'iron_block', F: 'furnace' } },
  icon: {
    rows: [
      '................',
      '................',
      '.......b........',
      '.wwwwwwwwwwwwww.',
      '.......w........',
      '.....gwww.......',
      'pwwwwwwwwwwwwwr.',
      'p.bbbbbbbbbbbbr.',
      'pwwwwwwwwww.....',
      '...k....k.......',
      '..kkk..kkk......',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    palette: { w: '#f2f0ea', b: '#1f4e9a', g: '#a8d4e6', p: '#555555', k: '#2a2a2a', r: '#c8261b' },
  },
  model: m.build(),
  materials,
};
