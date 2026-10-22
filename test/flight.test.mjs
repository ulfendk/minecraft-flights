import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadAircraft } from '../src/lib/aircraft.mjs';
import { initial, NO_INPUT, normalize, PARACHUTE, step, takeoff, wind } from '../src/lib/flight.mjs';

const byId = Object.fromEntries((await loadAircraft()).map((a) => [a.id, normalize(a.flight)]));
const env = (y, extra = {}) => ({ onGround: y <= 64, y, time: 0, lift: 0, hit: false, ...extra });
const pilot = (over = {}) => ({ ...NO_INPUT, pilot: true, lookYaw: 0, ...over });

/** Runs `ticks` steps from state s at height y; input may be a function of the tick. */
function fly(f, s, y, ticks, input, extraEnv = {}) {
  let minVy = 0, maxY = y;
  for (let t = 0; t < ticks; t++) {
    s = step(s, typeof input === 'function' ? input(t) : input, f, env(y, typeof extraEnv === 'function' ? extraEnv(t, y) : extraEnv));
    y = Math.max(64, y + s.vy);
    minVy = Math.min(minVy, s.vy);
    maxY = Math.max(maxY, y);
  }
  return { s, y, minVy, maxY };
}

test('the light aircraft takes off within 60 blocks, the jet needs a longer runway', () => {
  const light = takeoff(byId.light_aircraft);
  const jet = takeoff(byId.business_jet);
  const gyro = takeoff(byId.gyrocopter);
  assert.ok(light && light.dist < 60, `light aircraft: ${light?.dist}`);
  assert.ok(jet && jet.dist > light.dist * 1.4, `jet: ${jet?.dist}`);
  assert.ok(gyro && gyro.dist < light.dist, `gyrocopter: ${gyro?.dist}`);
});

test('without the stick pulled back a plane stays on the runway', () => {
  const { y } = fly(byId.light_aircraft, initial(0), 64, 300, pilot({ fwd: 1, look: 5 }));
  assert.equal(y, 64);
});

test('a plane holds its height hands off, and climbs when the pilot looks up', () => {
  const f = byId.light_aircraft;
  const cruise = { ...initial(0), speed: 1.6, throttle: 0.7 };
  const level = fly(f, cruise, 150, 400, pilot({ look: 5 }));
  assert.ok(Math.abs(level.y - 150) < 1, `level: ${level.y}`);
  const up = fly(f, cruise, 150, 200, pilot({ look: -30, fwd: 1 }));
  assert.ok(up.y > 175, `climb: ${up.y}`);
});

test('below stall speed a plane sinks fast, a gyrocopter only slowly', () => {
  const slow = (f) => fly(f, { ...initial(0), speed: f.stall * 0.4 }, 200, 60, pilot({ look: -40 }));
  assert.ok(slow(byId.light_aircraft).minVy < -0.3);
  assert.ok(slow(byId.gyrocopter).minVy > -0.25);
});

test('the glider glides about 30 to 1, the paraglider about 8 to 1', () => {
  for (const [id, ratio] of [['glider', 30], ['paraglider', 8]]) {
    const f = byId[id];
    const { s } = fly(f, { ...initial(0), speed: f.trim }, 200, 400, pilot({ look: 5 }));
    const r = s.speed / -s.vy;
    assert.ok(Math.abs(r - ratio) / ratio < 0.15, `${id}: ${r}`);
  }
});

test('a winch launch takes the glider up 30 to 60 blocks', () => {
  const { maxY } = fly(byId.glider, initial(0), 64, 400, (t) => pilot({ jump: t === 0, look: 5 }));
  assert.ok(maxY - 64 > 30 && maxY - 64 < 60, `${maxY - 64}`);
});

test('thermals carry a glider up', () => {
  const f = byId.glider;
  const { y } = fly(f, { ...initial(0), speed: f.trim }, 150, 400, pilot({ look: 5 }), { lift: 0.15 });
  assert.ok(y > 160, `${y}`);
});

test('the helicopter spins up, climbs, hovers hands off and flies where the pilot looks', () => {
  const f = byId.helicopter;
  const up = fly(f, initial(0), 64, 300, (t) => pilot({ jump: t > 100 && t < 160 }));
  assert.ok(up.y > 75, `climbed to ${up.y}`);
  const hover = fly(f, up.s, up.y, 200, pilot());
  assert.ok(Math.abs(hover.y - up.y) < 0.5 && hover.s.speed < 0.01, 'hovers');
  const turn = fly(f, hover.s, hover.y, 100, pilot({ lookYaw: 90, fwd: 1 }));
  assert.ok(Math.abs(turn.s.yaw - 90) < 1, `yaw ${turn.s.yaw}`);
  assert.ok(turn.s.vx < -1, 'flies west (yaw 90)');
});

test('the hot-air balloon climbs on the burner, holds its height and drifts with the wind', () => {
  const f = byId.hot_air_balloon;
  const up = fly(f, initial(0), 64, 300, pilot({ fwd: 1 }));
  assert.ok(up.y > 85 && up.s.burner, `${up.y}`);
  assert.ok(!up.s.anchored, 'lifting off takes the anchor up');
  const hold = fly(f, up.s, up.y, 400, pilot());
  assert.ok(Math.abs(hold.y - up.y) < 2, `held ${up.y} -> ${hold.y}`);
  assert.ok(hold.s.speed > 0.03, 'drifts');
  const anchored = fly(f, hold.s, hold.y, 200, (t) => pilot({ jump: t === 0 }));
  assert.ok(anchored.s.anchored && anchored.s.speed < 0.01, 'anchored');
});

test('the wind turns with height', () => {
  const a = wind(80, 0), b = wind(120, 0);
  const angle = Math.acos((a.x * b.x + a.z * b.z) / (a.speed * b.speed));
  assert.ok(angle > 0.5, `${angle}`);
});

test('nobody at the controls: everything comes down without crashing', () => {
  for (const [id, f] of Object.entries(byId)) {
    const start = { ...initial(0), speed: f.trim || f.maxSpeed * 0.7 || 0, throttle: 0.7, rotor: 1, heat: 0.5 };
    let s = start, y = 120, landed = false;
    for (let t = 0; t < 20 * 120 && !landed; t++) {
      s = step(s, NO_INPUT, f, env(y));
      y = Math.max(64, y + s.vy);
      landed = y <= 64;
      assert.ok(s.impact <= 0.6, `${id} hit the ground at ${s.impact}`);
    }
    assert.ok(landed, `${id} never came down`);
  }
});

test('the parachute sinks slower than a crash', () => {
  assert.ok(PARACHUTE.sink < 0.2 && PARACHUTE.minFall > 2);
});
