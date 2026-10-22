// Generates the behavior pack and resource pack into build/, and the Java edition's
// resources into java/src/generated/resources (tools/java.mjs).
import { copyFile, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { aircraftAnimation } from '../src/lib/anim.mjs';
import { buildEntity, buildLoot, buildParachuteEntity, floatJson, runtimeRecord } from '../src/lib/behavior.mjs';
import { buildClientEntity, buildRenderController } from '../src/lib/client.mjs';
import { MIN_ENGINE, NS, PACK_NAME, SCRIPT_SERVER_VERSION, SCRIPT_UI_VERSION } from '../src/lib/constants.mjs';
import { packIcon } from '../src/lib/icon.mjs';
import { loadAircraft } from '../src/lib/aircraft.mjs';
import { buildGeometry } from '../src/lib/model.mjs';
import { paintTexture } from '../src/lib/texture.mjs';
import { langEntries, LOCALES } from '../src/lang.mjs';
import { buildItem, items as itemsFor, recipes as recipesFor } from '../src/items.mjs';
import { parachute } from '../src/gear.mjs';
import { render } from './render.mjs';
import { buildJava } from './java.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'build');
const BP = join(OUT, 'behavior_pack');
const RP = join(OUT, 'resource_pack');

const UUID = {
  bpHeader: '6e2b9f14-0c7a-4d53-8b1e-f3a90d25c741',
  bpData: 'b4d17a2c-58e3-4f09-9a6c-2e71f0b8d352',
  bpScript: '0f93c6e8-2a4b-4d71-b5e0-8c16d4a9f263',
  rpHeader: '9a5e3c71-d82f-4b16-a0c4-71e2b9f6d084',
  rpResources: 'e1c84b26-7f3d-4a95-8e02-5b6d9c1a7f35',
};

async function write(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data, null, 2) + '\n');
}

function manifests(version) {
  const v = version.split('.').map(Number);
  const meta = { authors: ['Flights contributors'], license: 'MIT' };
  const bp = {
    format_version: 2,
    header: { name: `${PACK_NAME} v${version} (Behavior)`, description: 'pack.description', uuid: UUID.bpHeader, version: v, min_engine_version: MIN_ENGINE },
    modules: [
      { type: 'data', uuid: UUID.bpData, version: v },
      { type: 'script', language: 'javascript', uuid: UUID.bpScript, version: v, entry: 'scripts/main.js' },
    ],
    dependencies: [
      { uuid: UUID.rpHeader, version: v },
      { module_name: '@minecraft/server', version: SCRIPT_SERVER_VERSION },
      { module_name: '@minecraft/server-ui', version: SCRIPT_UI_VERSION },
    ],
    metadata: meta,
  };
  const rp = {
    format_version: 2,
    header: { name: `${PACK_NAME} v${version} (Resources)`, description: 'pack.description', uuid: UUID.rpHeader, version: v, min_engine_version: MIN_ENGINE },
    modules: [{ type: 'resources', uuid: UUID.rpResources, version: v }],
    dependencies: [{ uuid: UUID.bpHeader, version: v }],
    metadata: meta,
  };
  return { bp, rp };
}

/** Wings, rotors and envelopes reach far outside the hitbox: set the culling bounds. */
function setBounds(geo, m) {
  const d = geo.geometry['minecraft:geometry'][0].description;
  if (m.bounds) {
    d.visible_bounds_width = m.bounds.width;
    d.visible_bounds_height = m.bounds.height;
    d.visible_bounds_offset = [0, m.bounds.height / 2 - 1, 0];
  } else {
    d.visible_bounds_width = Math.ceil(d.visible_bounds_width * 1.2) + 2;
    d.visible_bounds_height = Math.ceil(d.visible_bounds_height * 1.2) + 2;
  }
}

/** Geometry, texture and animation of a model; the Java edition reuses them. */
function art(m) {
  const geo = buildGeometry(`geometry.${NS}.${m.id}`, m.model);
  setBounds(geo, m);
  const texture = paintTexture(geo, m.materials);
  return { geo, texture };
}

export async function build({ quiet = false } = {}) {
  const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
  await rm(BP, { recursive: true, force: true });
  await rm(RP, { recursive: true, force: true });
  for (const [from, to] of [['behavior_pack', BP], ['resource_pack', RP]]) {
    if (existsSync(join(ROOT, 'src', 'packs', from))) await cp(join(ROOT, 'src', 'packs', from), to, { recursive: true });
  }

  const { bp, rp } = manifests(pkg.version);
  await write(join(BP, 'manifest.json'), bp);
  await write(join(RP, 'manifest.json'), rp);
  const icon = packIcon();
  await write(join(BP, 'pack_icon.png'), icon);
  await write(join(RP, 'pack_icon.png'), icon);

  const aircraft = await loadAircraft();
  const java = { geos: {}, anims: {}, textures: {}, records: [] };
  const report = [];
  for (const m of [...aircraft, parachute]) {
    const isAircraft = m !== parachute;
    if (isAircraft) {
      await write(join(BP, 'entities', `${m.id}.json`), floatJson(buildEntity(m)));
      await write(join(BP, 'loot_tables', 'entities', `${NS}_${m.id}.json`), buildLoot(m));
    } else {
      await write(join(BP, 'entities', `${m.id}.json`), buildParachuteEntity());
    }
    const { geo, texture } = art(m);
    await write(join(RP, 'models', 'entity', `${m.id}.geo.json`), geo.geometry);
    await write(join(RP, 'textures', 'entity', NS, `${m.id}.png`), texture);
    await write(join(RP, 'animations', `${m.id}.animation.json`), aircraftAnimation(m, 'bedrock'));
    await write(join(RP, 'entity', `${m.id}.entity.json`), buildClientEntity(m, { simple: !isAircraft }));
    await write(join(RP, 'render_controllers', `${m.id}.render_controllers.json`), buildRenderController(m));

    java.geos[m.id] = geo.geometry;
    java.anims[m.id] = aircraftAnimation(m, 'java');
    java.textures[m.id] = texture;
    if (!isAircraft) continue;
    // Portrait for the Pilot's Handbook.
    const anim = Object.values(aircraftAnimation(m, 'preview').animations)[0];
    await write(join(RP, 'textures', 'ui', NS, `${m.id}.png`), render(geo.geometry, texture, { yaw: 35, size: 64, anim, vars: { pitch: 0, roll: 0, spin: 0, rotor: 0, throttle: 0, burner: 0, anchored: 1, time: 0 } }));
    java.records.push(runtimeRecord(m));
    report.push(`${m.id} (${geo.width}x${geo.height})`);
  }

  // Data for the scripts, and the flight model they share with the build.
  const records = aircraft.map(runtimeRecord);
  const itemList = itemsFor(aircraft);
  await write(join(BP, 'scripts', 'data.js'), [
    '// Generated by tools/build.mjs',
    `export const AIRCRAFT = ${JSON.stringify(records)};`,
    `export const ITEMS = ${JSON.stringify(itemList.map((i) => `${NS}:${i.id}`))};`,
    '',
  ].join('\n'));
  await copyFile(join(ROOT, 'src', 'lib', 'flight.mjs'), join(BP, 'scripts', 'flight.js'));

  // Items
  const itemTextures = {};
  for (const item of itemList) {
    await write(join(BP, 'items', `${item.id}.json`), buildItem(item));
    await write(join(RP, 'textures', 'items', NS, `${item.id}.png`), item.icon);
    itemTextures[`${NS}_${item.id}`] = { textures: `textures/items/${NS}/${item.id}` };
  }
  await write(join(RP, 'textures', 'item_texture.json'), { resource_pack_name: NS, texture_name: 'atlas.items', texture_data: itemTextures });

  const recipes = recipesFor(itemList);
  for (const recipe of recipes) {
    const body = Object.values(recipe)[0];
    await write(join(BP, 'recipes', `${body.description.identifier.split(':')[1]}.json`), { format_version: '1.12', ...recipe });
  }

  // Language
  const langs = {};
  for (const locale of LOCALES) {
    const entries = langEntries(locale, { aircraft, items: itemList, description: pkg.description, version: pkg.version });
    langs[locale] = entries;
    const text = entries.map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
    for (const pack of [BP, RP]) await write(join(pack, 'texts', `${locale}.lang`), text);
  }
  for (const pack of [BP, RP]) await write(join(pack, 'texts', 'languages.json'), LOCALES);

  await buildJava({
    aircraft, ...java, items: itemList, recipes, langs, icon,
    OUT: join(ROOT, 'java', 'src', 'generated', 'resources'),
  });

  if (!quiet) console.log(`Built ${aircraft.length} aircraft: ${report.join(', ')}\nItems: ${itemList.map((i) => i.id).join(', ')}`);
  return { aircraft, items: itemList, version: pkg.version };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  build().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
