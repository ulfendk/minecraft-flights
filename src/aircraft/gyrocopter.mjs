import { commonMaterials, gloss, PALETTE } from '../lib/materials.mjs';
import { fin, fuselage, Model, propeller, rotor, wheel } from '../lib/parts.mjs';

// A two-seat gyroplane: an open tandem pod, a free-spinning rotor on a mast and a pusher
// propeller behind. Scale 1.5.
const m = new Model();
m.bone('root', null, [0, 0, 0]);
const b = m.bone('body', 'root', [0, 12, 0]);

fuselage(b, [
  [-26, 3, 4, 10], // nose
  [-20, 5, 6, 11],
  [-12, 6, 6, 11], // tandem pod, open on top
  [6, 5, 5, 11],
], 'paint');
b.box([-5, 17, -21], [10, 4, 1], 'glass'); // windscreen
b.box([-1, 4, -18], [2, 2, 40], 'frame'); // keel
b.box([-1, 15, 6], [2, 22, 2], 'frame'); // mast
b.box([-2, 34, 5], [4, 2, 4], 'dark'); // rotor head
b.box([-4, 13, 6], [8, 8, 6], 'engine'); // engine behind the seats

// Tail on the keel: fin with rudder and a small stabiliser.
fin(b, { y: 6, h: 18, z0: 26, chord: 10, tipChord: 7, mat: 'paint' });
b.box([-8, 8, 30], [16, 1, 5], 'paint');

// Gear: nose wheel and a wide main axle.
wheel(m, 'nose_wheel', 'body', { x: 0, y: 2.5, z: -20, r: 2.5, w: 2 });
b.box([-10, 3, 2], [20, 1, 2], 'frame');
for (const s of [1, -1]) wheel(m, `main_wheel_${s > 0 ? 'l' : 'r'}`, 'body', { x: s * 10, y: 3, z: 3, r: 3, w: 2 });

rotor(m, 'rotor', 'body', { y: 36, z: 7, r: 46, w: 3 });
propeller(m, 'prop', 'body', { y: 17, z: 14, r: 10 });

const materials = { ...commonMaterials(PALETTE.orange), paint: gloss('#e8771e'), engine: gloss('#3a3d40') };

export default {
  id: 'gyrocopter',
  name: 'Gyrocopter',
  group: 'rotorcraft',
  info: 'An open two-seater with a free-spinning rotor and a pusher propeller. It takes off after a short run, can’t stall, and sinks slowly on its spinning rotor if it runs out of speed. Throttle with W and S, look up to climb and look where you want to turn.',
  scale: 1.5,
  hitbox: { width: 1.6, height: 2.2 },
  bounds: { width: 10, height: 5 },
  health: 40,
  mass: 8,
  camera: 9,
  seats: [{ at: [0, 9, -12] }, { at: [0, 11, -2] }],
  flight: { kind: 'wing', thrust: 0.015, maxSpeed: 1.5, stall: 0.45, stallSink: 0.15, maxPitch: 20, maxBank: 30, turn: 4, ceiling: 250 },
  // The rotor spins from the airflow ($rotor follows speed); the propeller from the engine.
  visuals: [
    { bone: 'rotor', prop: 'rotation', axis: 1, expr: '$spin * 2 + 15' },
    { bone: 'prop', prop: 'rotation', axis: 2, expr: '$spin * 3' },
  ],
  recipe: { pattern: ['III', ' F ', 'I I'], key: { I: 'iron_ingot', F: 'furnace' } },
  icon: {
    rows: [
      '................',
      '.kkkkkkkkkkkkkk.',
      '.......k........',
      '.......k........',
      '.......k........',
      '...g...k...o....',
      '..ooooooookoo...',
      '.oooooooookppo..',
      '..oooooooook..o.',
      '.......k.....oo.',
      '...kk.kkk.......',
      '...kk..k........',
      '................',
      '................',
      '................',
      '................',
    ],
    palette: { k: '#2a2a2a', o: '#e8771e', g: '#a8d4e6', p: '#555555' },
  },
  model: m.build(),
  materials,
};
