import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadAircraft, ORDER } from '../src/lib/aircraft.mjs';
import { buildGeometry } from '../src/lib/model.mjs';
import { aircraftAnimation } from '../src/lib/anim.mjs';
import { runtimeRecord, seatPositions } from '../src/lib/behavior.mjs';
import { flightFixtures } from '../tools/java.mjs';
import { STRINGS } from '../src/i18n.mjs';
import { items } from '../src/items.mjs';
import { parachute } from '../src/gear.mjs';

const aircraft = await loadAircraft();

test('all seven aircraft load, in the display order', () => {
  assert.deepEqual(aircraft.map((a) => a.id), ORDER);
  assert.equal(aircraft.length, 7);
});

for (const a of [...aircraft, parachute]) {
  test(`${a.id}: model packs into a texture and animates only existing bones`, () => {
    const geo = buildGeometry(`geometry.flights.${a.id}`, a.model);
    assert.ok(geo.width <= 512 && geo.height <= 512);
    const bones = new Set(a.model.bones.map((b) => b.name));
    for (const anim of Object.values(aircraftAnimation(a, 'bedrock').animations)) {
      for (const b of Object.keys(anim.bones)) assert.ok(bones.has(b), `animates missing bone ${b}`);
    }
  });
}

for (const a of aircraft) {
  test(`${a.id}: has Danish texts`, () => {
    assert.ok(STRINGS.da.names[a.id], 'no Danish name');
    assert.ok(STRINGS.da.info[a.id], 'no Danish description');
  });

  test(`${a.id}: seats sit inside the hitbox footprint and above the ground`, () => {
    for (const [x, y, z] of seatPositions(a)) {
      assert.ok(Number.isFinite(x + y + z));
      assert.ok(y > -0.2 && y < a.hitbox.height + 1, `seat height ${y}`);
      assert.ok(Math.abs(z) < 6 && Math.abs(x) < 3, `seat at ${x}, ${z}`);
    }
  });

  test(`${a.id}: the runtime record carries the whole flight block`, () => {
    const r = runtimeRecord(a);
    for (const k of ['kind', 'stall', 'stallSink', 'turn', 'ceiling', 'climb', 'thrust', 'windFactor']) assert.ok(k in r.flight, k);
    assert.ok(r.crash > 0);
  });
}

test('every item has a recipe or is the handbook, and Danish names', () => {
  for (const item of items(aircraft)) {
    assert.ok(STRINGS.da.names[item.id], `no Danish name for ${item.id}`);
    if (item.id !== 'pilots_handbook') assert.ok(item.recipe?.pattern.length === 3, `${item.id} has no recipe`);
  }
  const patterns = items(aircraft).filter((i) => i.recipe).map((i) => JSON.stringify([i.recipe.pattern, i.recipe.key]));
  assert.equal(new Set(patterns).size, patterns.length, 'two recipes are the same');
});

test('the flight fixtures for the Java test cover every aircraft and stay finite', () => {
  const fixtures = flightFixtures(aircraft.map(runtimeRecord));
  assert.deepEqual(fixtures.map((f) => f.id), ORDER);
  for (const f of fixtures) for (const t of f.ticks) for (const v of Object.values(t.state)) if (typeof v === 'number') assert.ok(Number.isFinite(v));
});
