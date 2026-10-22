// The Pilot's Handbook: a page per aircraft with what it is and how to fly it.
import { ItemStack, system, world } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { AIRCRAFT } from './data.js';
import { NS } from './util.js';

const GIVEN = `${NS}:handbook_given`;
const nameOf = (a) => ({ translate: `entity.${NS}:${a.id}.name` });

function openIndex(player) {
  const form = new ActionFormData().title({ translate: `${NS}.handbook.title` }).body({ translate: `${NS}.handbook.intro` });
  form.button({ translate: `${NS}.handbook.parachute` }, `textures/items/${NS}/parachute`);
  for (const a of AIRCRAFT) form.button(nameOf(a), `textures/ui/${NS}/${a.id}`);
  form.show(player).then((res) => {
    if (res.canceled || res.selection === undefined) return;
    if (res.selection === 0) return back(player, { translate: `${NS}.handbook.parachute` }, [{ translate: `${NS}.handbook.parachute_text` }]);
    openEntry(player, AIRCRAFT[res.selection - 1]);
  });
}

function back(player, title, body) {
  new ActionFormData().title(title).body({ rawtext: body }).button({ translate: `${NS}.handbook.back` }).show(player).then((res) => {
    if (!res.canceled) openIndex(player);
  });
}

function openEntry(player, a) {
  const top = a.flight.kind === 'balloon' ? null : a.flight.kind === 'heli' || a.flight.thrust > 0 ? a.flight.maxSpeed : a.flight.trim * 1.6;
  const body = [
    { translate: `${NS}.info.${a.id}` }, { text: '\n\n§2' }, { translate: `${NS}.controls.${a.id}` }, { text: '§r\n\n' },
    { translate: `${NS}.handbook.seats`, with: [String(a.seats.length)] },
  ];
  if (top) body.push({ text: '\n' }, { translate: `${NS}.handbook.speed`, with: [String(Math.round(top * 72))] });
  back(player, nameOf(a), body);
}

export function setupManual() {
  world.afterEvents.itemUse.subscribe(({ itemStack, source }) => {
    if (itemStack?.typeId !== `${NS}:pilots_handbook`) return;
    source.playSound('item.book.page_turn');
    system.run(() => openIndex(source));
  });
  // Everyone gets a handbook the first time they join a world with the add-on.
  world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
    if (!initialSpawn || player.getDynamicProperty(GIVEN)) return;
    player.setDynamicProperty(GIVEN, true);
    system.runTimeout(() => {
      try {
        player.getComponent('minecraft:inventory')?.container?.addItem(new ItemStack(`${NS}:pilots_handbook`, 1));
        player.sendMessage({ translate: `${NS}.handbook.welcome` });
      } catch {
        // Player left before the timeout.
      }
    }, 60);
  });
}
