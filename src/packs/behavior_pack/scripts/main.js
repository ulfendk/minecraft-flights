import { system, world } from '@minecraft/server';
import { forgetPlane, setupFlying } from './flying.js';
import { setupHunting } from './hunting.js';
import { setupManual } from './manual.js';
import { setupParachutes } from './parachute.js';
import { setupPlacing } from './place.js';
import { selfTest } from './selftest.js';
import { LOG, NS, specOf } from './util.js';

setupPlacing(); // registers custom components at startup

world.afterEvents.worldLoad.subscribe(() => {
  setupFlying();
  setupParachutes();
  setupHunting();
  setupManual();
  console.log(`${LOG} loaded`);
});

world.afterEvents.entityRemove.subscribe(({ removedEntityId, typeId }) => {
  if (specOf({ typeId })) forgetPlane(removedEntityId);
});

system.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id === `${NS}:selftest`) selfTest(event.message);
});
