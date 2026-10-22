import { commonMaterials, gloss, livery, PALETTE } from '../lib/materials.mjs';
import { fin, fuselage, Model, rotor, tubeZ } from '../lib/parts.mjs';

// A four-seat light helicopter: a glass bubble, a slim tail boom, skids, a two-blade main
// rotor and a tail rotor. Scale 1.5.
const m = new Model();
m.bone('root', null, [0, 0, 0]);
const b = m.bone('body', 'root', [0, 14, -6]);

// The bubble: glass in front, paint behind.
fuselage(b, [
  [-32, 4, 5, 15],
  [-26, 8, 9, 16],
  [-18, 10, 11, 17],
], 'glass');
fuselage(b, [
  [-18, 10, 11, 17],
  [-4, 10, 11, 17],
  [6, 8, 9, 17],
], 'paint');
b.box([-10, 6, -18], [20, 2, 20], 'paint'); // floor
b.box([-6, 27, -6], [12, 4, 14], 'paint'); // engine cowling and mast fairing
b.box([-1, 31, -1], [2, 3, 2], 'dark'); // mast

// Tail boom, fin and tail rotor.
tubeZ(b, { rx: 3, ry: 3, y: 21, z0: 6, z1: 30, mat: 'paint' });
tubeZ(b, { rx: 2, ry: 2, y: 22, z0: 30, z1: 58, mat: 'paint' });
fin(b, { y: 17, h: 14, z0: 52, chord: 8, tipChord: 5, mat: 'paint' });
b.box([-6, 22, 54], [12, 1, 4], 'paint');
b.box([-0.5, 30, 57], [1, 1, 2], 'strobe');

// Skids on struts.
for (const s of [1, -1]) {
  tubeZ(b, { rx: 1, ry: 1, x: s * 11, y: 1, z0: -24, z1: 14, mat: 'frame' });
  b.box([s * 11 - 1.5, 1, -26], [3, 2, 3], 'frame', { rotation: [-30, 0, 0] });
  for (const z of [-14, 4]) b.box([s > 0 ? 8 : -11, 2, z], [3, 5, 1], 'frame', { rotation: [0, 0, s * -20], pivot: [s * 9.5, 2, z] });
}

rotor(m, 'rotor', 'body', { y: 34, z: 0, r: 54, w: 3 });
const tail = m.bone('tail_rotor', 'body', [-3, 24, 56]);
tail.box([-3.5, 16, 55], [1, 16, 2], 'blade').box([-4, 23, 55.5], [2, 2, 1], 'dark');

const materials = {
  ...commonMaterials(PALETTE.red),
  paint: livery('#c8261b', '#f2f0ea', { y0: 13, y1: 15 }),
  glass: { base: '#9fd0eaa8', shading: 0.05 },
};
materials.blade = gloss('#2f3236');

export default {
  id: 'helicopter',
  name: 'Helicopter',
  group: 'rotorcraft',
  info: 'A four-seat light helicopter. Wait for the rotor to spin up, jump to climb, and fly where you look. A and D fly sideways, and when you let go of everything it hovers.',
  scale: 1.5,
  hitbox: { width: 2.2, height: 2.6 },
  bounds: { width: 12, height: 5 },
  health: 60,
  mass: 12,
  camera: 11,
  seats: [{ at: [4, 9, -12] }, { at: [-4, 9, -12] }, { at: [4, 9, -2] }, { at: [-4, 9, -2] }],
  flight: { kind: 'heli', maxSpeed: 1.8, climb: 0.35, accel: 0.03, turn: 4, stallSink: 0.4, ceiling: 300 },
  visuals: [
    { bone: 'rotor', prop: 'rotation', axis: 1, expr: '$spin * 2' },
    { bone: 'tail_rotor', prop: 'rotation', axis: 0, expr: '$spin * 5' },
  ],
  recipe: { pattern: ['III', 'GFI', 'B B'], key: { I: 'iron_ingot', G: 'glass_pane', F: 'furnace', B: 'iron_block' } },
  icon: {
    rows: [
      '................',
      '................',
      'kkkkkkkkkkkkkkk.',
      '.......k........',
      '.....rrrr.......',
      '...ggrrrrr......',
      '..gggrrrrrrrrrrk',
      '..gggrrrrr....kk',
      '...rrrrrr.......',
      '....k...k.......',
      '..kkkkkkkkk.....',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    palette: { k: '#2a2a2a', r: '#c8261b', g: '#a8d4e6' },
  },
  model: m.build(),
  materials,
};
