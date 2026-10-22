// Renders every aircraft (parked, in flight, from several sides) into build/preview/,
// plus a contact sheet of all of them: build/preview/sheet.png.
// `npm run preview helicopter` renders only that one.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from './build.mjs';
import { aircraftAnimation } from '../src/lib/anim.mjs';
import { NS } from '../src/lib/constants.mjs';
import { parachute } from '../src/gear.mjs';
import { render, sheet } from './render.mjs';

const RP = 'build/resource_pack';
const OUT = 'build/preview';
const only = process.argv.slice(2);

export const PARKED = { pitch: 0, roll: 0, spin: 0, rotor: 0, throttle: 0, burner: 0, anchored: 1, time: 0 };
/** In the air: nose a little up, banking, engine running (the propeller blades turned a bit). */
export const FLYING = { pitch: 8, roll: 20, spin: 40, rotor: 1, throttle: 1, burner: 1, anchored: 0, time: 0.4 };

const { aircraft } = await build({ quiet: true });
await mkdir(OUT, { recursive: true });
const thumbs = [];
for (const m of [...aircraft, parachute]) {
  if (only.length && !only.includes(m.id)) continue;
  const geo = JSON.parse(await readFile(join(RP, 'models/entity', `${m.id}.geo.json`), 'utf8'));
  const tex = await readFile(join(RP, 'textures/entity', NS, `${m.id}.png`));
  const anim = Object.values(aircraftAnimation(m, 'preview').animations)[0];
  const views = [
    render(geo, tex, { anim, vars: PARKED, yaw: 35 }),
    render(geo, tex, { anim, vars: PARKED, yaw: 145 }),
    render(geo, tex, { anim, vars: FLYING, yaw: 35 }),
    render(geo, tex, { anim, vars: PARKED, yaw: 90, pitch: 5 }),
    render(geo, tex, { anim, vars: FLYING, yaw: 215, pitch: 35 }),
    render(geo, tex, { anim, vars: PARKED, yaw: 0, pitch: 89 }),
  ];
  await writeFile(join(OUT, `${m.id}.png`), sheet(views, { cols: 3 }));
  if (m !== parachute) thumbs.push(views[0]);
}
if (thumbs.length) await writeFile(join(OUT, 'sheet.png'), sheet(thumbs, { cols: 4 }));
console.log(`Wrote previews for ${thumbs.length} aircraft to ${OUT}/`);
