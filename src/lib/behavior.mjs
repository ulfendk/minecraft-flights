// Aircraft spec -> Bedrock behavior-pack entity, loot table, and the runtime record that
// both the Bedrock scripts (scripts/data.js) and the Java mod (aircraft.json) read.
import { NS } from './constants.mjs';
import { toLocal } from './aircraft.mjs';
import { normalize } from './flight.mjs';

const r3 = (n) => Math.round(n * 1000) / 1000;

/**
 * Bedrock wants float properties written as decimals (0.0, not 0), which JSON.stringify
 * can't do: floats are tagged here and written out by floatJson().
 */
const float = (n) => `F:${Number(n)}`;
export const floatJson = (data) => JSON.stringify(data, null, 2)
  .replace(/"F:(-?[\d.e-]+)"/g, (_, n) => (n.includes('.') ? n : `${n}.0`)) + '\n';

/** Entity properties that carry the flight state to the client (for the animations). */
export function properties() {
  const f = (lo, hi) => ({ type: 'float', range: [float(lo), float(hi)], default: float(0), client_sync: true });
  return {
    [`${NS}:pitch`]: f(-60, 60),
    [`${NS}:roll`]: f(-60, 60),
    [`${NS}:rotor`]: f(0, 1),
    [`${NS}:throttle`]: f(0, 1),
    [`${NS}:burner`]: { type: 'bool', default: false, client_sync: true },
    [`${NS}:anchored`]: { type: 'bool', default: true, client_sync: true },
  };
}

/** Seat positions in entity space (blocks, +z forward); riders sit a little into the seat. */
export const seatPositions = (m) => m.seats.map((s) => {
  const [x, y, z] = toLocal(s.at, m.scale);
  return [r3(x), r3(y - 0.15), r3(z)];
});

const no = (cause) => ({ cause, deals_damage: 'no' });

export function buildEntity(m) {
  const seats = seatPositions(m).map((position) => ({
    min_rider_count: 0, max_rider_count: m.seats.length, position, third_person_camera_radius: m.camera ?? 8,
  }));
  return {
    format_version: '1.21.90',
    'minecraft:entity': {
      description: { identifier: `${NS}:${m.id}`, is_spawnable: false, is_summonable: true, properties: properties() },
      components: {
        // 'inanimate': hunting add-ons (and others) don't treat it as a creature, and bullets fired
        // from the basket don't stop at it.
        'minecraft:type_family': { family: ['aircraft', m.group, 'inanimate'] },
        'minecraft:collision_box': { width: m.hitbox.width, height: m.hitbox.height },
        'minecraft:health': { value: m.health, max: m.health },
        // The script flies it (scripts/flying.js): no gravity of its own, but it still collides.
        'minecraft:physics': { has_gravity: false },
        'minecraft:pushable': { is_pushable: false, is_pushable_by_piston: false },
        'minecraft:knockback_resistance': { value: 1 },
        'minecraft:nameable': {},
        'minecraft:persistent': {},
        'minecraft:rideable': {
          seat_count: m.seats.length, crouching_skip_interact: true, pull_in_entities: false, family_types: ['player'],
          interact_text: `action.interact.${NS}.board`, seats,
        },
        'minecraft:breathable': { breathes_air: true, breathes_water: true, suffocate_time: 0, total_supply: 15 },
        'minecraft:fire_immune': {},
        'minecraft:damage_sensor': {
          triggers: [
            no('fall'), no('drowning'), no('suffocation'), no('fly_into_wall'), no('lava'), no('fire'), no('fire_tick'),
            // Only players can wreck an aircraft (and get it back as an item); crashes are the script's.
            { on_damage: { filters: { test: 'is_family', subject: 'other', operator: '!=', value: 'player' } }, deals_damage: 'no' },
          ],
        },
        'minecraft:loot': { table: `loot_tables/entities/${NS}_${m.id}.json` },
        'minecraft:conditional_bandwidth_optimization': {
          default_values: { max_optimized_distance: 0, max_dropped_ticks: 0, use_motion_prediction_hints: true },
        },
      },
    },
  };
}

/** The parachute a player hangs under on the way down; the script lowers and steers it. */
export function buildParachuteEntity() {
  return {
    format_version: '1.21.90',
    'minecraft:entity': {
      description: { identifier: `${NS}:parachute`, is_spawnable: false, is_summonable: true },
      components: {
        'minecraft:type_family': { family: ['parachute', 'inanimate'] },
        'minecraft:collision_box': { width: 0.4, height: 0.4 },
        'minecraft:health': { value: 1, max: 1 },
        'minecraft:physics': { has_gravity: false, has_collision: false },
        'minecraft:pushable': { is_pushable: false, is_pushable_by_piston: false },
        'minecraft:knockback_resistance': { value: 1 },
        'minecraft:damage_sensor': { triggers: [{ cause: 'all', deals_damage: 'no' }] },
        'minecraft:breathable': { breathes_air: true, breathes_water: true, suffocate_time: 0, total_supply: 15 },
        'minecraft:fire_immune': {},
        'minecraft:rideable': {
          seat_count: 1, crouching_skip_interact: true, pull_in_entities: false,
          seats: [{ position: [0, -0.2, 0], min_rider_count: 0, max_rider_count: 1, third_person_camera_radius: 6 }],
        },
        'minecraft:conditional_bandwidth_optimization': {
          default_values: { max_optimized_distance: 0, max_dropped_ticks: 0, use_motion_prediction_hints: true },
        },
      },
    },
  };
}

export const buildLoot = (m) => ({
  pools: [{ rolls: 1, entries: [{ type: 'item', name: `${NS}:${m.id}`, weight: 1 }] }],
});

/** Everything the game logic needs about an aircraft, for both editions. */
export function runtimeRecord(m) {
  return {
    id: m.id,
    group: m.group,
    scale: m.scale,
    width: m.hitbox.width,
    height: m.hitbox.height,
    health: m.health,
    mass: m.mass,
    camera: m.camera ?? 8,
    seats: seatPositions(m),
    // Hitting the ground or a wall faster than this (blocks/tick) damages the aircraft.
    crash: m.crash ?? 0.6,
    flight: normalize(m.flight),
  };
}
