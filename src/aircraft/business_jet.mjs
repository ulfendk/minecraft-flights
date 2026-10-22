import { commonMaterials, gloss, livery, metal, PALETTE } from '../lib/materials.mjs';
import { fin, fuselage, Model, tubeZ, wheel, wing } from '../lib/parts.mjs';

// A small business jet: low swept wing, two engines on the tail, a T-tail. Scale 2.
const m = new Model();
m.bone('root', null, [0, 0, 0]);
const b = m.bone('body', 'root', [0, 12, 0]);

fuselage(b, [
  [-62, 2, 2, 12], // nose tip
  [-56, 5, 5, 12],
  [-48, 7, 7, 13], // cockpit
  [-38, 8, 8, 13], // cabin
  [18, 8, 8, 13],
  [34, 6, 6, 14],
  [50, 3, 4, 16], // tail cone
], 'paint');
// Windscreen and the row of cabin windows.
b.box([-5, 16, -52], [10, 3, 4], 'glass');
for (let z = -34; z <= 12; z += 7) for (const s of [1, -1]) b.box([s > 0 ? 8 : -9, 14, z], [1, 3, 3], 'glass');
b.box([7.5, 9, -30], [1, 9, 6], 'paint2').box([-8.5, 9, -30], [1, 9, 6], 'paint2'); // airstair door lines

// Low swept wing with winglets.
wing(b, { span: 112, y: 6, z0: -10, chord: 24, tipChord: 9, t: 2, dihedral: 5, sweep: 14, mat: 'wing' });
b.box([-9, 5, -12], [18, 3, 28], 'wing'); // wing-to-body fairing
for (const s of [1, -1]) {
  b.box([s > 0 ? 55 : -56, 11, 9], [1, 8, 6], 'paint', { rotation: [0, 0, s * -10], pivot: [s * 55.5, 11, 12] }); // winglet
  b.box([s > 0 ? 54 : -55, 11, 8], [1, 1, 2], s > 0 ? 'nav_red' : 'nav_green');
}

// Engines on short pylons beside the tail.
for (const s of [1, -1]) {
  tubeZ(b, { rx: 5, ry: 5, x: s * 15, y: 18, z0: 18, z1: 40, mat: 'nacelle' });
  b.box([s > 0 ? 7 : -11, 16, 24], [4, 3, 10], 'nacelle'); // pylon
  const fan = m.bone(`fan_${s > 0 ? 'l' : 'r'}`, 'body', [s * 15, 18, 17]);
  fan.box([s * 15 - 3, 15, 17], [6, 6, 1], 'metal').box([s * 15 - 0.5, 14, 16.5], [1, 8, 1], 'chrome');
}

// T-tail
fin(b, { y: 19, h: 24, z0: 36, chord: 18, tipChord: 11, mat: 'paint' });
wing(b, { span: 38, y: 43, z0: 45, chord: 9, tipChord: 6, mat: 'wing' });
b.box([-0.5, 42, 50], [1, 1, 2], 'strobe');

// Retractable gear (always out in this model).
b.box([-0.5, 3, -48], [1, 7, 1], 'metal');
wheel(m, 'nose_wheel', 'body', { x: 0, y: 2, z: -48, r: 2, w: 2 });
for (const s of [1, -1]) {
  b.box([s * 10 - 0.5, 3, 2], [1, 5, 1], 'metal');
  wheel(m, `main_wheel_${s > 0 ? 'l' : 'r'}`, 'body', { x: s * 10, y: 2.5, z: 2, r: 2.5, w: 3 });
}

const materials = {
  ...commonMaterials(PALETTE.white),
  paint: livery('#f6f6f4', '#2a2d34', { y0: 10, y1: 11, second: '#b88a2e', y2: 11, y3: 12 }),
  paint2: metal('#c9ccd0'),
  wing: gloss('#e6e8ea'),
  nacelle: gloss('#f6f6f4'),
};

export default {
  id: 'business_jet',
  name: 'Business Jet',
  group: 'plane',
  info: 'A fast jet for six. It needs a long runway, but flies twice as fast and high as the light aircraft. Throttle with W and S, look up to rotate, and look where you want to turn.',
  scale: 2,
  hitbox: { width: 2.5, height: 2.8 },
  bounds: { width: 16, height: 7 },
  health: 100,
  mass: 30,
  camera: 14,
  crash: 0.7,
  seats: [{ at: [4, 10, -40] }, { at: [-4, 10, -40] }, { at: [4, 10, -26] }, { at: [-4, 10, -26] }, { at: [4, 10, -12] }, { at: [-4, 10, -12] }],
  flight: { kind: 'wing', thrust: 0.03, maxSpeed: 4, stall: 1.6, stallSink: 0.9, maxPitch: 22, maxBank: 35, turn: 2.2, ceiling: 380, taxiTurn: 2 },
  visuals: [
    { bone: 'fan_l', prop: 'rotation', axis: 2, expr: '$spin * 4' },
    { bone: 'fan_r', prop: 'rotation', axis: 2, expr: '$spin * 4' },
  ],
  recipe: { pattern: ['BGB', 'FDF', 'B B'], key: { B: 'iron_block', G: 'glass_pane', F: 'blast_furnace', D: 'diamond' } },
  icon: {
    rows: [
      '................',
      '................',
      '.............kk.',
      '.............kk.',
      '..........nn.k..',
      '.gwwwwwwwwwnnk..',
      'gwwwwwwwwwwwww..',
      '.kkkkkkkkkkkkk..',
      '.....wwwww......',
      '......wwww......',
      '.......www......',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    palette: { w: '#f6f6f4', k: '#2a2d34', g: '#a8d4e6', n: '#9a9da2' },
  },
  model: m.build(),
  materials,
};
