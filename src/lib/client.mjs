// Aircraft spec -> Bedrock resource-pack client entity and render controller.
import { NS } from './constants.mjs';

/**
 * Smooths the synced attitude on the client so the aircraft tilts smoothly between property
 * updates, and turns propellers and rotors by how fast their engine runs.
 */
function preAnimation() {
  const p = (name) => `q.property('${NS}:${name}')`;
  return [
    `v.pitch = (v.pitch ?? ${p('pitch')}) + (${p('pitch')} - (v.pitch ?? ${p('pitch')})) * 0.3;`,
    `v.roll = (v.roll ?? ${p('roll')}) + (${p('roll')} - (v.roll ?? ${p('roll')})) * 0.3;`,
    `v.rotor = (v.rotor ?? 0) + (${p('rotor')} - (v.rotor ?? 0)) * 0.1;`,
    'v.spin = math.mod((v.spin ?? 0) + q.delta_time * 1440 * v.rotor, 360);',
  ];
}

export function buildClientEntity(m, { simple = false } = {}) {
  return {
    format_version: '1.10.0',
    'minecraft:client_entity': {
      description: {
        identifier: `${NS}:${m.id}`,
        materials: { default: 'entity_alphablend' },
        textures: { default: `textures/entity/${NS}/${m.id}` },
        geometry: { default: `geometry.${NS}.${m.id}` },
        animations: { move: `animation.${NS}.${m.id}.move` },
        scripts: {
          ...(simple ? {} : { pre_animation: preAnimation() }),
          animate: ['move'],
          ...(m.scale !== 1 ? { scale: String(m.scale) } : {}),
        },
        render_controllers: [`controller.render.${NS}.${m.id}`],
        enable_attachables: false,
      },
    },
  };
}

export function buildRenderController(m) {
  return {
    format_version: '1.8.0',
    render_controllers: {
      [`controller.render.${NS}.${m.id}`]: {
        geometry: 'Geometry.default',
        materials: [{ '*': 'Material.default' }],
        textures: ['Texture.default'],
      },
    },
  };
}
