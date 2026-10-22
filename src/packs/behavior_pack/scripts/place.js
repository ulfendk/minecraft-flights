// Placing aircraft: use the item on a block and the aircraft appears there, facing the way
// you look.
import { GameMode, system } from '@minecraft/server';
import { NS, sound } from './util.js';

const FACES = { Up: [0, 1, 0], Down: [0, -1, 0], North: [0, 0, -1], South: [0, 0, 1], East: [1, 0, 0], West: [-1, 0, 0] };

function consume(player) {
  try {
    if (player.getGameMode() === GameMode.Creative) return;
    const inv = player.getComponent('minecraft:inventory').container;
    const slot = player.selectedSlotIndex;
    const item = inv.getItem(slot);
    if (!item) return;
    if (item.amount > 1) {
      item.amount -= 1;
      inv.setItem(slot, item);
    } else {
      inv.setItem(slot);
    }
  } catch {}
}

export function spawnAircraft(dim, id, loc, yaw) {
  const e = dim.spawnEntity(`${NS}:${id}`, loc);
  e.setRotation({ x: 0, y: yaw });
  return e;
}

export function setupPlacing() {
  system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) => {
    itemComponentRegistry.registerCustomComponent(`${NS}:placer`, {
      onUseOn(e) {
        const player = e.source;
        if (player?.typeId !== 'minecraft:player') return;
        const id = e.itemStack.typeId.split(':')[1];
        const [dx, dy, dz] = FACES[e.blockFace] ?? [0, 1, 0];
        const at = { x: e.block.location.x + dx + 0.5, y: e.block.location.y + dy, z: e.block.location.z + dz + 0.5 };
        const yaw = player.getRotation().y;
        system.run(() => {
          try {
            spawnAircraft(player.dimension, id, at, yaw);
          } catch {
            return;
          }
          sound(player.dimension, 'random.anvil_use', at, 0.5, 1.4);
          consume(player);
        });
      },
    });
  });
}
