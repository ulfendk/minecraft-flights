// Loads the aircraft specs from src/aircraft/ and checks them.
import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'aircraft');

/** Display order everywhere (creative tab, site, handbook). */
export const ORDER = ['paraglider', 'hot_air_balloon', 'glider', 'light_aircraft', 'business_jet', 'gyrocopter', 'helicopter'];

export const GROUPS = ['unpowered', 'plane', 'rotorcraft'];
export const KINDS = ['wing', 'heli', 'balloon'];

/** Flight parameters every kind needs (see src/lib/flight.mjs). */
const NEEDS = {
  wing: ['stall', 'stallSink', 'maxPitch', 'maxBank', 'turn', 'ceiling'],
  heli: ['maxSpeed', 'climb', 'accel', 'turn', 'stallSink', 'ceiling'],
  balloon: ['climb', 'sink', 'cool', 'turn', 'ceiling'],
};

export async function loadAircraft() {
  const files = (await readdir(DIR)).filter((f) => f.endsWith('.mjs'));
  const list = [];
  for (const f of files) list.push((await import(pathToFileURL(join(DIR, f)).href)).default);
  list.sort((a, b) => rank(a.id) - rank(b.id));
  for (const a of list) check(a);
  return list;
}

const rank = (id) => (ORDER.includes(id) ? ORDER.indexOf(id) : 999);

export function check(a) {
  const where = `aircraft ${a.id}`;
  for (const key of ['id', 'name', 'group', 'info', 'scale', 'hitbox', 'health', 'mass', 'seats', 'flight', 'recipe', 'icon', 'model', 'materials']) {
    if (a[key] === undefined) throw new Error(`${where}: missing "${key}"`);
  }
  if (!GROUPS.includes(a.group)) throw new Error(`${where}: unknown group ${a.group}`);
  const f = a.flight;
  if (!KINDS.includes(f.kind)) throw new Error(`${where}: unknown flight kind ${f.kind}`);
  for (const k of NEEDS[f.kind]) if (typeof f[k] !== 'number') throw new Error(`${where}: flight.${k} is missing`);
  if (f.kind === 'wing') {
    if (f.thrust > 0 && !(f.maxSpeed > f.stall)) throw new Error(`${where}: maxSpeed must be above stall speed`);
    if (!(f.thrust > 0) && !(f.trim > f.stall && f.glide > 1)) throw new Error(`${where}: a glider needs trim > stall and a glide ratio`);
  }
  const bones = new Set(a.model.bones.map((b) => b.name));
  if (!bones.has('body')) throw new Error(`${where}: the model needs a "body" bone (it pitches and rolls)`);
  for (const d of a.visuals ?? []) if (!bones.has(d.bone)) throw new Error(`${where}: visual for unknown bone ${d.bone}`);
  if (!a.seats.length) throw new Error(`${where}: no seats`);
}

/** Model pixels (16 per block, at the aircraft's scale) to entity-space blocks, +z forward. */
export const toLocal = ([x, y, z], scale) => [(x / 16) * scale, (y / 16) * scale, (-z / 16) * scale];
