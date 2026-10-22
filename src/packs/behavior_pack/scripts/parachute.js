// Parachutes. Anyone carrying one who falls more than a few blocks (say, after bailing out
// of an aircraft with sneak) gets it opened after a moment, or straight away by jumping. They
// hang under a canopy (an entity they ride, so they take no fall damage) that sinks steadily
// and can be steered with the movement keys. On landing it is packed away again.
import { system, world } from '@minecraft/server';
import { PARACHUTE } from './flight.js';
import { blockAt, hasItem, isGround, NS, ridersOf, sound, vehicleOf } from './util.js';

const ITEM = `${NS}:parachute`;
/** Open parachutes: chute id -> { chute, rider } */
const chutes = new Map();
/** Falling players: id -> { from (y), ticks, warned } */
const falling = new Map();

export function deployParachute(player) {
  const dim = player.dimension;
  const at = player.location;
  let chute;
  try {
    chute = dim.spawnEntity(`${NS}:parachute`, at);
    chute.setRotation({ x: 0, y: player.getRotation().y });
    chute.getComponent('minecraft:rideable').addRider(player);
  } catch {
    // Can't ride it: slow falling keeps them safe instead.
    try { chute?.remove(); } catch {}
    try { player.addEffect('slow_falling', 200, { showParticles: false }); } catch {}
    return undefined;
  }
  chutes.set(chute.id, { chute, rider: player });
  falling.delete(player.id);
  sound(dim, 'armor.equip_leather', at, 1, 0.8);
  return chute;
}

function steer(rider) {
  try {
    const v = rider.inputInfo.getMovementVector();
    const a = (rider.getRotation().y * Math.PI) / 180;
    const fwd = { x: -Math.sin(a), z: Math.cos(a) }, left = { x: Math.cos(a), z: Math.sin(a) };
    return { x: (fwd.x * v.y + left.x * v.x) * PARACHUTE.steer, z: (fwd.z * v.y + left.z * v.x) * PARACHUTE.steer };
  } catch {
    return { x: 0, z: 0 };
  }
}

function land(id, c, message = true) {
  chutes.delete(id);
  try {
    if (c.rider?.isValid) {
      c.chute.getComponent('minecraft:rideable')?.ejectRider(c.rider);
      if (message) c.rider.onScreenDisplay.setActionBar({ translate: `${NS}.parachute.packed` });
    }
  } catch {}
  try {
    sound(c.chute.dimension, 'armor.equip_leather', c.chute.location, 0.8, 1.2);
    c.chute.remove();
  } catch {}
}

function chuteTick() {
  for (const [id, c] of chutes) {
    if (!c.chute.isValid) {
      chutes.delete(id);
      continue;
    }
    const rider = ridersOf(c.chute)[0];
    if (!rider) {
      // Sneaked out of the harness in mid-air: fall slowly the rest of the way.
      try { c.rider?.addEffect('slow_falling', 200, { showParticles: false }); } catch {}
      land(id, c, false);
      continue;
    }
    c.rider = rider;
    const loc = c.chute.location;
    const dim = c.chute.dimension;
    const ground = isGround(blockAt(dim, loc.x, loc.y - 0.3, loc.z)) || isGround(blockAt(dim, loc.x, loc.y - 1, loc.z));
    const wet = blockAt(dim, loc.x, loc.y, loc.z)?.isLiquid;
    if (ground || wet || loc.y <= dim.heightRange.min + 1) {
      land(id, c);
      continue;
    }
    const h = steer(rider);
    try {
      c.chute.clearVelocity();
      c.chute.applyImpulse({ x: h.x, y: -PARACHUTE.sink, z: h.z });
      c.chute.setRotation({ x: 0, y: rider.getRotation().y });
    } catch {}
  }
}

/** Watches falling players: opens the parachute for them after a moment, or warns them. */
function fallTick() {
  for (const player of world.getPlayers()) {
    let f = falling.get(player.id);
    let v;
    try { v = player.getVelocity(); } catch { continue; }
    const free = !player.isOnGround && !player.isFlying && !player.isGliding && !player.isInWater && !vehicleOf(player) && v.y < -0.3;
    if (!free) {
      if (f) falling.delete(player.id);
      continue;
    }
    if (!f) falling.set(player.id, (f = { from: player.location.y, ticks: 0, warned: false }));
    f.ticks++;
    if (f.from - player.location.y < PARACHUTE.minFall) continue;
    // Is there a long way down? (Don't open it for a short drop off a ledge.)
    let drop = 0;
    while (drop < 12 && !isGround(blockAt(player.dimension, player.location.x, player.location.y - drop - 1, player.location.z))) drop++;
    if (drop < 6) continue;
    if (!hasItem(player, ITEM)) {
      if (!f.warned && f.from - player.location.y > 10) {
        f.warned = true;
        try { player.onScreenDisplay.setActionBar({ translate: `${NS}.parachute.none` }); } catch {}
      }
      continue;
    }
    if (!f.warned) {
      f.warned = true;
      try { player.onScreenDisplay.setActionBar({ translate: `${NS}.parachute.hint` }); } catch {}
    }
    if (f.ticks > 12) deployParachute(player);
  }
}

/** Jump while falling with a parachute: open it now. */
function onJump({ player, button, newButtonState }) {
  if (button !== 'Jump' || newButtonState !== 'Pressed') return;
  const f = falling.get(player.id);
  if (!f || f.from - player.location.y < 2 || !hasItem(player, ITEM)) return;
  system.run(() => deployParachute(player));
}

/** Parachutes left over from a saved world: take them up again, or clear them away. */
function resume() {
  for (const dim of ['overworld', 'nether', 'the_end']) {
    let list = [];
    try { list = world.getDimension(dim).getEntities({ type: `${NS}:parachute` }); } catch {}
    for (const chute of list) {
      if (chutes.has(chute.id)) continue;
      const rider = ridersOf(chute)[0];
      if (!rider) {
        try { chute.remove(); } catch {}
        continue;
      }
      chutes.set(chute.id, { chute, rider });
    }
  }
}

export function setupParachutes() {
  system.runInterval(chuteTick, 1);
  system.runInterval(fallTick, 1);
  system.runInterval(resume, 100);
  world.afterEvents.playerButtonInput.subscribe(onJump);
}

export const openParachutes = () => [...chutes.values()];
