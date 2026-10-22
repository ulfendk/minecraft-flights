// Items: a placer for every aircraft, the parachute and the Pilot's Handbook.
import { NS } from './lib/constants.mjs';
import { pixelIcon } from './lib/texture.mjs';
import { bedrockId } from './ids.mjs';
import { PARACHUTE_ICON } from './gear.mjs';

const HANDBOOK_ICON = pixelIcon([
  '................',
  '..kkkkkkkkkkk...',
  '..kbbbbbbbbbbk..',
  '..kbbbbbbbbbbk..',
  '..kbbbbwbbbbbk..',
  '..kbbbwwwbbbbk..',
  '..kbwwwwwwwbbk..',
  '..kbbbbwbbbbbk..',
  '..kbbbbwbbbbbk..',
  '..kbbbwwwbbbbk..',
  '..kbbbbbbbbbbk..',
  '..kbbbbbbbbbbk..',
  '..kwwwwwwwwwwk..',
  '..kkkkkkkkkkk...',
  '................',
  '................',
], { k: '#222222', b: '#1f4e9a', w: '#f4ecd8' });

/** Placer items plus the extras, as { id, name, icon, stack, aircraft?, recipe? }. */
export function items(aircraft) {
  const out = aircraft.map((a) => ({
    id: a.id, name: a.name, icon: pixelIcon(a.icon.rows, a.icon.palette), stack: 1, aircraft: a.id, recipe: a.recipe,
  }));
  out.push({
    id: 'parachute', name: 'Parachute', icon: PARACHUTE_ICON, stack: 1,
    recipe: { pattern: ['WWW', 'S S', ' S '], key: { W: 'white_wool', S: 'string' } },
  });
  out.push({ id: 'pilots_handbook', name: "Pilot's Handbook", icon: HANDBOOK_ICON, stack: 1 });
  return out;
}

export function buildItem(item) {
  const components = {
    'minecraft:icon': `${NS}_${item.id}`,
    'minecraft:display_name': { value: `item.${NS}:${item.id}.name` },
    'minecraft:max_stack_size': item.stack ?? 64,
  };
  // Aircraft are placed by the script (scripts/place.js), which turns them to face the way the
  // player looks and checks that there is room.
  if (item.aircraft) components[`${NS}:placer`] = {};
  return {
    format_version: '1.21.90',
    'minecraft:item': {
      description: { identifier: `${NS}:${item.id}`, menu_category: { category: item.aircraft ? 'items' : 'equipment' } },
      components,
    },
  };
}

/** Recipes (Bedrock format; tools/java.mjs converts them). */
export function recipes(itemList) {
  const out = [];
  for (const item of itemList) {
    if (!item.recipe) continue;
    out.push({
      'minecraft:recipe_shaped': {
        description: { identifier: `${NS}:${item.id}` },
        tags: ['crafting_table'],
        pattern: item.recipe.pattern,
        key: Object.fromEntries(Object.entries(item.recipe.key).map(([k, v]) => [k, { item: bedrockId(v) }])),
        result: { item: `${NS}:${item.id}`, count: 1 },
        unlock: [{ item: bedrockId(Object.values(item.recipe.key)[0]) }],
      },
    });
  }
  out.push({
    'minecraft:recipe_shapeless': {
      description: { identifier: `${NS}:pilots_handbook` },
      tags: ['crafting_table'],
      ingredients: [{ item: 'minecraft:book' }, { item: 'minecraft:feather' }],
      result: { item: `${NS}:pilots_handbook`, count: 1 },
      unlock: [{ item: 'minecraft:book' }],
    },
  });
  return out;
}
