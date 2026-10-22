import { world } from '@minecraft/server';
import { AIRCRAFT } from './data.js';

export const NS = 'flights';
export const LOG = '[Flights]';
export const SPECS = Object.fromEntries(AIRCRAFT.map((a) => [`${NS}:${a.id}`, a]));
export const specOf = (entity) => SPECS[entity?.typeId];

/** Entities of a family (or type) near at least one player (cheap enough to poll). */
export function nearPlayers({ families, type }, radius = 96) {
  const out = new Map();
  for (const player of world.getPlayers()) {
    let found;
    try {
      found = player.dimension.getEntities({ families, type, location: player.location, maxDistance: radius });
    } catch {
      continue;
    }
    for (const e of found) out.set(e.id, e);
  }
  return [...out.values()];
}

export function ridersOf(entity) {
  try {
    return entity.getComponent('minecraft:rideable')?.getRiders() ?? [];
  } catch {
    return [];
  }
}

/** Who flies an aircraft: the first rider, if it is a player. */
export function pilotOf(entity) {
  const r = ridersOf(entity)[0];
  return r?.typeId === 'minecraft:player' ? r : undefined;
}

/** What a player is riding, if anything. */
export function vehicleOf(player) {
  try {
    return player.getComponent('minecraft:riding')?.entityRidingOn;
  } catch {
    return undefined;
  }
}

export function blockAt(dim, x, y, z) {
  try {
    return dim.getBlock({ x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) });
  } catch {
    return undefined;
  }
}

/** Plants, snow layers and the like don't hold an aircraft up. */
const PASSABLE = /(short_grass|tall_grass|fern|flower|tulip|poppy|dandelion|orchid|allium|bluet|daisy|cornflower|lily_of|rose|sapling|deadbush|dead_bush|vine|torch|snow_layer|button|rail|carpet|sign|banner|pressure_plate|tripwire|redstone_wire|lever|kelp|seagrass|sugar_cane|wheat|carrots|potatoes|beetroot|bush|mushroom|lantern|ladder|web|frame|candle|pumpkin_stem|melon_stem)/;

export function isGround(block) {
  if (!block || block.isAir || block.isLiquid) return false;
  return !PASSABLE.test(block.typeId);
}

export const hasItem = (player, id) => {
  try {
    const c = player.getComponent('minecraft:inventory').container;
    for (let i = 0; i < c.size; i++) if (c.getItem(i)?.typeId === id) return true;
  } catch {}
  return false;
};

export const heldItem = (player) => {
  try {
    return player.getComponent('minecraft:inventory').container.getItem(player.selectedSlotIndex);
  } catch {
    return undefined;
  }
};

export function sound(dim, id, location, volume = 1, pitch = 1) {
  try {
    dim.playSound(id, location, { volume, pitch });
  } catch {}
}

export const isCreative = (player) => {
  try {
    return player.getGameMode() === 'Creative' || player.getGameMode() === 'creative';
  } catch {
    return false;
  }
};
