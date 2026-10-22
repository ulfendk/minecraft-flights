// Hunting from the hot-air balloon (with the Realistic Hunting add-on). Its scoped rifles use
// sneak to zoom and to hold your breath, but sneak would also get you out of the basket: while
// someone in a balloon holds a hunting weapon, sneaking doesn't dismount them. Put it away to
// climb out. The balloon is 'inanimate', so the hunting add-on's bullets fly through it.
import { InputPermissionCategory, system, world } from '@minecraft/server';
import { heldItem, NS, vehicleOf } from './util.js';

const BALLOON = `${NS}:hot_air_balloon`;
const WEAPON = /^hunting:(rifle_|shotgun|compound_bow|binoculars|speargun)/;
const locked = new Set();

function setDismount(player, on) {
  try {
    if (InputPermissionCategory.Dismount === undefined) return false;
    player.inputPermissions.setPermissionCategory(InputPermissionCategory.Dismount, on);
    return true;
  } catch {
    return false;
  }
}

export const holdsHuntingWeapon = (player) => WEAPON.test(heldItem(player)?.typeId ?? '');

function tick() {
  for (const player of world.getPlayers()) {
    const inBalloon = vehicleOf(player)?.typeId === BALLOON;
    const lock = inBalloon && holdsHuntingWeapon(player);
    if (lock && !locked.has(player.id)) {
      if (setDismount(player, false)) locked.add(player.id);
    } else if (!lock && locked.has(player.id)) {
      setDismount(player, true);
      locked.delete(player.id);
    }
  }
}

export function setupHunting() {
  system.runInterval(tick, 2);
  world.afterEvents.playerLeave.subscribe(({ playerId }) => locked.delete(playerId));
}
