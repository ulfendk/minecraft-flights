// Flies every aircraft near a player, every tick: reads the pilot's input, runs the shared
// flight model (flight.js, the same as the Java edition's Flight.java) and moves the entity.
// The aircraft entities have no gravity and no input component of their own.
import { ItemStack, system, world } from '@minecraft/server';
import { initial, NO_INPUT, step, wind } from './flight.js';
import { blockAt, isGround, LOG, nearPlayers, NS, pilotOf, ridersOf, sound, specOf } from './util.js';

const SAVED = `${NS}:flight`;
/** aircraft id -> { s, last, intended, savedAt, lift, liftAt, props, asleep, tutorial } */
const planes = new Map();
let tracked = [];

function stateOf(e, spec) {
  let p = planes.get(e.id);
  if (p) return p;
  let s;
  try {
    const saved = e.getDynamicProperty(SAVED);
    if (typeof saved === 'string') s = { ...initial(e.getRotation().y), ...JSON.parse(saved) };
  } catch {}
  s ??= initial(e.getRotation().y);
  p = { s, last: e.location, intended: 0, savedAt: 0, lift: 0, liftAt: -99, props: {}, asleep: false };
  planes.set(e.id, p);
  return p;
}

export const flightOf = (e) => planes.get(e.id)?.s;
export const forgetPlane = (id) => planes.delete(id);

/** Standing on something: any of the blocks just under the hitbox's centre and corners. */
function onGround(e, spec) {
  const { x, y, z } = e.location;
  const h = spec.width / 2 - 0.05;
  for (const [dx, dz] of [[0, 0], [h, h], [h, -h], [-h, h], [-h, -h]]) {
    if (isGround(blockAt(e.dimension, x + dx, y - 0.06, z + dz))) return true;
  }
  return false;
}

/**
 * Rising air under an aircraft: warm air over campfires and lava, and over sand in the
 * daytime, fading out with height. Blocks per tick.
 */
export function thermalAt(dim, loc) {
  for (let d = 1; d <= 48; d++) {
    const b = blockAt(dim, loc.x, loc.y - d, loc.z);
    if (!b) return 0;
    if (b.isAir) continue;
    const id = b.typeId;
    const fade = (range) => Math.max(0, 1 - d / range);
    if (id.includes('campfire')) return 0.16 * fade(40);
    if (id === 'minecraft:lava' || id === 'minecraft:magma') return 0.12 * fade(48);
    if (id === 'minecraft:sand' || id === 'minecraft:red_sand') {
      const t = world.getTimeOfDay();
      return t > 1000 && t < 11000 ? 0.06 * fade(48) : 0;
    }
    return 0;
  }
  return 0;
}

function readInput(pilot) {
  if (!pilot) return NO_INPUT;
  try {
    const mv = pilot.inputInfo.getMovementVector();
    const r = pilot.getRotation();
    return {
      pilot: true,
      fwd: Math.abs(mv.y) < 0.3 ? 0 : Math.sign(mv.y),
      side: Math.abs(mv.x) < 0.3 ? 0 : Math.sign(mv.x),
      jump: pilot.inputInfo.getButtonState('Jump') === 'Pressed',
      down: false,
      look: r.x,
      lookYaw: r.y,
    };
  } catch {
    return NO_INPUT;
  }
}

function setProp(e, p, name, value, eps) {
  const old = p.props[name];
  if (old !== undefined && (typeof value === 'boolean' ? old === value : Math.abs(old - value) < eps)) return;
  p.props[name] = value;
  try {
    e.setProperty(`${NS}:${name}`, value);
  } catch {}
}

function crash(e, spec, p, impact) {
  const dmg = Math.round((impact - spec.crash) * 40 + 8);
  sound(e.dimension, 'random.explode', e.location, 0.6, 1.6);
  for (const r of ridersOf(e)) {
    try {
      r.applyDamage(Math.round((impact - spec.crash) * 12 + 2), { cause: 'flyIntoWall' });
      if (r.typeId === 'minecraft:player') r.onScreenDisplay.setActionBar({ translate: `${NS}.crash` });
    } catch {}
  }
  try {
    const health = e.getComponent('minecraft:health');
    const left = health.currentValue - dmg;
    if (left > 0) health.setCurrentValue(left);
    else {
      // Wrecked: everyone out, and the aircraft drops as its item.
      for (const r of ridersOf(e)) e.getComponent('minecraft:rideable')?.ejectRider(r);
      e.dimension.spawnItem(new ItemStack(e.typeId, 1), e.location);
      forgetPlane(e.id);
      e.remove();
    }
  } catch {}
}

const kmh = (blocksPerTick) => Math.round(blocksPerTick * 72);
const COMPASS = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];

function hud(pilot, e, spec, s) {
  const f = spec.flight;
  const alt = String(Math.round(e.location.y));
  const climb = (s.vy * 20).toFixed(1);
  let key = `${NS}.hud`, a = String(kmh(s.speed)), d = `${Math.round(s.throttle * 100)}%`;
  const extra = [];
  if (f.kind === 'balloon') {
    key = `${NS}.hud.balloon`;
    const w = wind(e.location.y, system.currentTick);
    a = String(kmh(w.speed));
    // Where the wind blows to (Minecraft yaw: 0 = south).
    const yaw = (Math.atan2(-w.x, w.z) * 180) / Math.PI;
    d = COMPASS[Math.round(((yaw + 360) % 360) / 45) % 8];
    if (s.anchored) extra.push({ text: ' ' }, { translate: `${NS}.hud.anchored` });
    if (s.burner) extra.push({ text: ' ' }, { translate: `${NS}.hud.burner` });
  } else if (f.kind === 'heli') {
    key = `${NS}.hud.heli`;
    d = `${Math.round(s.rotor * 100)}%`;
  } else if (!(f.thrust > 0)) {
    key = `${NS}.hud.glider`;
  }
  const stalled = f.kind === 'wing' && !(f.stallSink < 0.3) && s.speed < f.stall * 0.9 && !s.onGround;
  try {
    pilot.onScreenDisplay.setActionBar({
      rawtext: [
        ...(stalled ? [{ translate: `${NS}.hud.stall` }, { text: ' ' }] : []),
        { translate: key, with: { rawtext: [{ text: a }, { text: alt }, { text: climb }, { text: d }] } },
        ...extra,
      ],
    });
  } catch {}
}

function fly(e, now) {
  const spec = specOf(e);
  if (!spec) return;
  const p = stateOf(e, spec);
  const pilot = pilotOf(e);
  const ground = onGround(e, spec);
  const s0 = p.s;
  // Parked with nobody aboard: leave it be.
  if (!pilot && ground && s0.speed < 0.02 && Math.abs(s0.vy) < 0.02 && s0.rotor < 0.02 && s0.heat < 0.02) {
    if (!p.asleep) {
      p.asleep = true;
      p.s = { ...s0, vx: 0, vy: 0, vz: 0, speed: 0, rotor: 0, heat: 0, throttle: 0, burner: false, anchored: true };
      try { e.clearVelocity(); } catch {}
      setProp(e, p, 'rotor', 0, 0.01);
      setProp(e, p, 'throttle', 0, 0.01);
      setProp(e, p, 'burner', false);
      setProp(e, p, 'pitch', 0, 0.5);
      setProp(e, p, 'roll', 0, 0.5);
    }
    return;
  }
  p.asleep = false;

  const loc = e.location;
  // Ran into something: it moved much less than it was pushed last tick.
  const moved = Math.hypot(loc.x - p.last.x, loc.z - p.last.z);
  const hit = p.intended > 0.3 && moved < p.intended * 0.3;
  if (now - p.liftAt >= 10) {
    p.liftAt = now;
    p.lift = thermalAt(e.dimension, loc);
  }
  const input = readInput(pilot);
  const env = { onGround: ground, y: loc.y, time: now, lift: p.lift, hit };
  const s = step(s0, input, spec.flight, env);
  s.onGround = ground;
  p.s = s;
  p.last = loc;
  p.intended = Math.hypot(s.vx, s.vz);
  try {
    e.clearVelocity();
    e.applyImpulse({ x: s.vx, y: s.vy, z: s.vz });
    e.setRotation({ x: 0, y: s.yaw });
  } catch {}

  setProp(e, p, 'pitch', Math.max(-60, Math.min(60, s.pitch)), 0.5);
  setProp(e, p, 'roll', Math.max(-60, Math.min(60, s.roll)), 0.5);
  setProp(e, p, 'rotor', s.rotor, 0.03);
  setProp(e, p, 'throttle', s.throttle, 0.03);
  setProp(e, p, 'burner', !!s.burner);
  setProp(e, p, 'anchored', !!s.anchored);

  if (spec.flight.kind === 'balloon' && s.anchored !== s0.anchored && pilot && !ground) {
    pilot.onScreenDisplay.setActionBar({ translate: `${NS}.anchor.${s.anchored ? 'down' : 'up'}` });
    sound(e.dimension, s.anchored ? 'random.chestclosed' : 'random.chestopen', loc, 0.6, 0.8);
    p.hudAfter = now + 40;
  }
  if (s.impact > spec.crash) crash(e, spec, p, s.impact);
  if (s.burner && now % 8 === 0) sound(e.dimension, 'fire.ignite', loc, 0.8, 0.6);

  if (pilot && now % 5 === 0 && !(p.hudAfter > now)) hud(pilot, e, spec, s);
  if (pilot && !p.tutorial) {
    p.tutorial = true;
    try { pilot.sendMessage({ rawtext: [{ text: '§e' }, { translate: `entity.${NS}:${spec.id}.name` }, { text: ':§r ' }, { translate: `${NS}.controls.${spec.id}` }] }); } catch {}
  }
  if (!pilot) p.tutorial = false;
  if (now - p.savedAt > 40) {
    p.savedAt = now;
    try { e.setDynamicProperty(SAVED, JSON.stringify(s)); } catch {}
  }
}

function tick() {
  const now = system.currentTick;
  if (now % 20 === 0) {
    const all = new Map(nearPlayers({ families: ['aircraft'] }, 128).map((e) => [e.id, e]));
    for (const e of tracked) if (e.isValid && alwaysFly.has(e.id)) all.set(e.id, e);
    tracked = [...all.values()];
  }
  for (const e of tracked) {
    if (!e.isValid) continue;
    try {
      fly(e, now);
    } catch (err) {
      if (now % 200 === 0) console.warn(`${LOG} ${err}`);
    }
  }
}

/** Flies an aircraft even when no player is near (the selftest on a dedicated server). */
const alwaysFly = new Set();
export function track(e) {
  alwaysFly.add(e.id);
  if (!tracked.some((t) => t.id === e.id)) tracked.push(e);
}

/** A pilot's own aircraft is never "tracked" too late: start flying it the tick they board. */
export function setupFlying() {
  system.runInterval(tick, 1);
  world.afterEvents.playerInteractWithEntity.subscribe(({ target }) => {
    if (specOf(target) && !tracked.some((t) => t.id === target.id)) tracked.push(target);
  });
}
