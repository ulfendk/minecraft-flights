import { commonMaterials, gloss, PALETTE } from '../lib/materials.mjs';
import { fin, fuselage, Model, wheel, wing } from '../lib/parts.mjs';

// A two-seat sailplane: long slender wings, a bubble canopy and a T-tail. Scale 1.5.
const m = new Model();
m.bone('root', null, [0, 0, 0]);
const b = m.bone('body', 'root', [0, 10, -10]);

fuselage(b, [
  [-38, 2, 3, 9], // nose
  [-32, 4, 5, 10],
  [-24, 5, 6, 10], // cockpit
  [-4, 4, 5, 10],
  [8, 3, 3, 11], // tail boom
  [40, 2, 2, 12],
], 'paint');
b.box([-4, 15, -30], [8, 4, 24], 'glass'); // canopy over both seats
b.box([-3, 19, -27], [6, 1, 18], 'glass');
b.box([-0.5, 1, -38], [1, 3, 3], 'dark'); // nose skid

// Long wings at the shoulder, tips turned up a little.
wing(b, { span: 164, y: 14, z0: -14, chord: 11, tipChord: 6, dihedral: 6, mat: 'wing' });
for (const s of [1, -1]) b.box([s > 0 ? 81 : -82, 20, -11], [1, 3, 4], 'tip');

// T-tail
fin(b, { y: 12, h: 15, z0: 32, chord: 9, tipChord: 6, mat: 'paint' });
wing(b, { span: 30, y: 27, z0: 36, chord: 5, tipChord: 4, mat: 'wing' });

wheel(m, 'main_wheel', 'body', { x: 0, y: 2.5, z: -10, r: 2.5, w: 2 });
b.box([-0.5, 7, 36], [1, 4, 2], 'dark'); // tail skid

const materials = { ...commonMaterials(PALETTE.white), paint: gloss('#f7f7f5'), wing: gloss('#f7f7f5'), tip: gloss('#d8322a') };

export default {
  id: 'glider',
  name: 'Glider',
  group: 'unpowered',
  info: 'A two-seat sailplane with long wings. Jump on the ground for a winch launch up to about 40 blocks, then glide 30 blocks for every block it sinks. Thermals over campfires, lava and sand carry it back up.',
  scale: 1.5,
  hitbox: { width: 1.6, height: 1.8 },
  bounds: { width: 16, height: 4 },
  health: 30,
  mass: 6,
  camera: 10,
  seats: [{ at: [0, 8, -22] }, { at: [0, 9, -12] }],
  flight: { kind: 'wing', trim: 1.1, glide: 30, stall: 0.6, stallSink: 0.6, maxPitch: 25, maxBank: 40, turn: 3.2, ceiling: 320, winch: 60, taxiTurn: 1.5 },
  visuals: [],
  recipe: { pattern: ['WWW', 'IGI', ' I '], key: { W: 'white_wool', I: 'iron_ingot', G: 'glass_pane' } },
  icon: {
    rows: [
      '................',
      '................',
      '................',
      '.......r........',
      'wwwwwwwwwwwwwwww',
      '.......w........',
      '.....gggw.......',
      'w..wwwwwwwwww...',
      'wwwwwww.........',
      '..........k.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    palette: { w: '#f7f7f5', r: '#d8322a', g: '#a8d4e6', k: '#2a2a2a' },
  },
  model: m.build(),
  materials,
};
