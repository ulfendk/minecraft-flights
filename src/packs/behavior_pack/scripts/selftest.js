import { ItemStack, system, world } from '@minecraft/server';
import { ITEMS } from './data.js';
import { flightOf, track } from './flying.js';
import { LOG, NS } from './util.js';

/**
 * Used by tools/bds-test.sh: checks that every aircraft and item exists, then flies a few:
 * a pilotless glider let go high up glides down instead of dropping, a hot-air balloon stands
 * still. Message = space-separated expected ids.
 */
export function selfTest(message) {
  const expected = message.split(/\s+/).filter(Boolean);
  const dim = world.getDimension('overworld');
  const counts = {};
  for (const e of dim.getEntities()) {
    if (e.typeId.startsWith(`${NS}:`)) counts[e.typeId] = (counts[e.typeId] ?? 0) + 1;
  }
  const missing = expected.filter((id) => !counts[`${NS}:${id}`]);
  for (const id of ITEMS) {
    try {
      new ItemStack(id, 1);
    } catch {
      missing.push(id);
    }
  }
  console.log(`${LOG} selftest found ${JSON.stringify(counts)}`);

  // A glider let go 40 blocks up, flying south at its best glide speed.
  const glider = dim.spawnEntity(`${NS}:glider`, { x: -30.5, y: -20, z: -40.5 });
  glider.setRotation({ x: 0, y: 0 });
  glider.setDynamicProperty(`${NS}:flight`, JSON.stringify({ speed: 1.1, yaw: 0, vy: 0 }));
  const balloon = dim.spawnEntity(`${NS}:hot_air_balloon`, { x: -40.5, y: -60, z: -40.5 });
  // A seaplane on a pond floats at the surface.
  dim.runCommand('fill -60 -61 -10 -50 -61 0 water');
  const sea = dim.spawnEntity(`${NS}:seaplane`, { x: -54.5, y: -58, z: -4.5 });
  track(sea);
  track(glider);
  track(balloon);
  let y0;
  system.runTimeout(() => {
    y0 = glider.location.y;
  }, 5);
  system.runTimeout(() => {
    const s = flightOf(glider);
    const dropped = y0 - glider.location.y;
    // 40 ticks of gliding at 1:30 is about a block and a half down; falling would be far more.
    if (!s || dropped > 6 || dropped < 0.2) missing.push(`glider gliding (dropped ${dropped?.toFixed?.(2)})`);
    if (Math.abs(balloon.location.y + 60) > 0.2) missing.push('balloon parked');
    if (Math.abs(sea.location.y + 60) > 0.3) missing.push(`seaplane floating (y ${sea.location.y.toFixed(2)})`);
  }, 45);
  system.runTimeout(() => {
    console.log(missing.length ? `${LOG} selftest FAIL missing: ${missing.join(' ')}` : `${LOG} selftest PASS`);
  }, 60);
}
