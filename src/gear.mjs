// The parachute a player hangs under (an entity on Bedrock and Java), and its item.
import { commonMaterials, gores, rope } from './lib/materials.mjs';
import { Model, tube } from './lib/parts.mjs';
import { pixelIcon } from './lib/texture.mjs';

// The entity sits at the rider; the canopy floats about two and a half blocks up.
const p = new Model();
p.bone('root', null, [0, 0, 0]).box([-4, 22, -1], [8, 1, 2], 'dark'); // harness bar over the shoulders
const sway = p.bone('canopy', 'root', [0, 22, 0]);
tube(sway, { r: 16, y: 44, h: 2, mat: 'canopy' });
tube(sway, { r: 13, y: 46, h: 2, mat: 'canopy' });
tube(sway, { r: 8, y: 48, h: 1, mat: 'canopy' });
for (const [x, z] of [[-10, -5], [10, -5], [-10, 5], [10, 5]]) sway.box([x - 0.5, 23, z - 0.5], [1, 21, 1], 'rope');

export const parachute = {
  id: 'parachute',
  name: 'Parachute',
  scale: 1,
  attitude: false,
  model: p.build(),
  materials: { ...commonMaterials(), canopy: gores(['#2f6fd0', '#f4f1e8', '#f2b705', '#f4f1e8']), rope: rope() },
  visuals: [
    { bone: 'canopy', prop: 'rotation', axis: 2, expr: 'math.sin($time * 90) * 4' },
    { bone: 'canopy', prop: 'rotation', axis: 0, expr: 'math.cos($time * 70) * 3' },
  ],
};

export const PARACHUTE_ICON = pixelIcon([
  '................',
  '.....bbwwbb.....',
  '...bbbwwwwbbb...',
  '..bbbbwwwwbbbb..',
  '.bbbbbwwwwbbbbb.',
  '.k............k.',
  '..k..........k..',
  '...k........k...',
  '....k......k....',
  '.....k....k.....',
  '......kssk......',
  '......ssss......',
  '......ssss......',
  '.......ss.......',
  '................',
  '................',
], { b: '#2f6fd0', w: '#f4f1e8', k: '#cfc6ad', s: '#5a4632' });
