// Generates the Java edition's resources (java/src/generated/resources) from the same
// specs as the Bedrock packs. GeckoLib reads the Bedrock geometry and animation formats
// directly, so models and animations are shared.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { NS } from '../src/lib/constants.mjs';
import { initial, NO_INPUT, step } from '../src/lib/flight.mjs';
import { javaId } from '../src/ids.mjs';

async function write(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data, null, 2) + '\n');
}

async function itemModel(A, id) {
  await write(join(A, 'models', 'item', `${id}.json`), { parent: 'minecraft:item/generated', textures: { layer0: `${NS}:item/${id}` } });
  await write(join(A, 'items', `${id}.json`), { model: { type: 'minecraft:model', model: `${NS}:item/${id}` } });
}

/**
 * Flights through the JavaScript flight model with scripted inputs, tick by tick, so the
 * Java model can be checked against it (FlightGameTests.flightMatchesJs).
 */
export function flightFixtures(records) {
  const out = [];
  for (const r of records) {
    let s = initial(10);
    let y = 70;
    const ticks = [];
    for (let t = 0; t < 240; t++) {
      // Throttle up and roll, pull up, bank left then right, let go; jump now and then.
      const input = {
        ...NO_INPUT,
        pilot: t < 200,
        fwd: t < 120 ? 1 : t < 160 ? 0 : -1,
        side: t >= 120 && t < 140 ? 1 : t >= 140 && t < 160 ? -1 : 0,
        jump: t === 3 || (t >= 60 && t < 90 && t % 7 === 0) || t === 170,
        down: t >= 180 && t < 190,
        look: t < 50 ? 5 : t < 100 ? -25 : 20,
        lookYaw: 10 + t * 0.7,
      };
      const env = { onGround: y <= 70, y, time: 1000 + t * 13, lift: t > 150 && t < 170 ? 0.05 : 0, hit: t === 210 };
      s = step(s, input, r.flight, env);
      y = Math.max(70, y + s.vy);
      ticks.push({ input, env, state: s });
    }
    out.push({ id: r.id, ticks });
  }
  return out;
}

function javaRecipe(item) {
  return {
    type: 'minecraft:crafting_shaped',
    category: 'misc',
    pattern: item.recipe.pattern,
    key: Object.fromEntries(Object.entries(item.recipe.key).map(([k, v]) => [k, javaId(v)])),
    result: { id: `${NS}:${item.id}`, count: 1 },
  };
}

export async function buildJava({ geos, anims, textures, records, items, langs, icon, OUT }) {
  await rm(OUT, { recursive: true, force: true });
  const A = join(OUT, 'assets', NS);
  const D = join(OUT, 'data', NS);

  for (const id of Object.keys(geos)) {
    await write(join(A, 'geckolib', 'models', 'entity', `${id}.geo.json`), geos[id]);
    await write(join(A, 'geckolib', 'animations', 'entity', `${id}.animation.json`), anims[id]);
    await write(join(A, 'textures', 'entity', `${id}.png`), textures[id]);
  }
  await write(join(OUT, NS, 'aircraft.json'), records);
  await write(join(OUT, NS, 'flight_fixtures.json'), flightFixtures(records));

  for (const item of items) {
    await write(join(A, 'textures', 'item', `${item.id}.png`), item.icon);
    await itemModel(A, item.id);
    if (item.recipe) await write(join(D, 'recipe', `${item.id}.json`), javaRecipe(item));
  }
  await write(join(D, 'recipe', 'pilots_handbook.json'), {
    type: 'minecraft:crafting_shapeless', category: 'misc',
    ingredients: ['minecraft:book', 'minecraft:feather'], result: { id: `${NS}:pilots_handbook`, count: 1 },
  });

  // Language files: Bedrock keys -> Java keys.
  for (const [locale, entries] of Object.entries(langs)) {
    const out = {};
    for (const [k, v] of entries) {
      let m;
      if ((m = k.match(new RegExp(`^entity\\.${NS}:(.+)\\.name$`)))) out[`entity.${NS}.${m[1]}`] = v;
      else if ((m = k.match(new RegExp(`^item\\.${NS}:(.+)\\.name$`)))) out[`item.${NS}.${m[1]}`] = v;
      else if (k.startsWith(`${NS}.`) || k.startsWith('key.')) out[k] = v;
    }
    out[`itemGroup.${NS}`] = 'Flights';
    await write(join(A, 'lang', `${locale.toLowerCase()}.json`), out);
  }

  await write(join(A, 'icon.png'), icon);
}
