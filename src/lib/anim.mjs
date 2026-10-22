// Aircraft animations for both editions. Moving parts are described as visuals:
//   { bone, prop: 'rotation'|'position'|'scale', axis (0..2, -1 = uniform scale), expr: '...' }
// Expressions use $-variables that each edition maps to its own Molang:
//   $pitch, $roll (degrees, nose up / right wing down), $spin (degrees a propeller or rotor
//   has turned, growing with $rotor), $rotor (0..1 how fast the engine or rotor turns),
//   $throttle (0..1), $burner (0/1, the balloon burner is lit), $anchored (0/1), $time (seconds)
// Every aircraft's "body" bone pitches and rolls with the aircraft.

import { NS } from './constants.mjs';

const BEDROCK = {
  pitch: 'v.pitch', roll: 'v.roll', spin: 'v.spin', rotor: 'v.rotor', throttle: `q.property('${NS}:throttle')`,
  burner: `q.property('${NS}:burner')`, anchored: `q.property('${NS}:anchored')`, time: 'q.life_time',
};
const JAVA = {
  pitch: 'variable.f_pitch', roll: 'variable.f_roll', spin: 'variable.f_spin', rotor: 'variable.f_rotor', throttle: 'variable.f_throttle',
  burner: 'variable.f_burner', anchored: 'variable.f_anchored', time: 'variable.f_time',
};

/** Variable names for one edition ('bedrock' | 'java' | 'preview'). */
export function variables(edition) {
  if (edition === 'java') return JAVA;
  if (edition === 'preview') return Object.fromEntries(Object.keys(BEDROCK).map((k) => [k, `$${k}`]));
  return BEDROCK;
}

/** Bedrock and GeckoLib turn bones left-handed: nose up is a negative x rotation. */
export const attitude = [
  { bone: 'body', prop: 'rotation', axis: 0, expr: '-$pitch' },
  { bone: 'body', prop: 'rotation', axis: 2, expr: '-$roll' },
];

function expr(d, vars) {
  return d.expr.replace(/\$([a-z0-9]+)/g, (m, name) => {
    if (!(name in vars)) throw new Error(`Unknown animation variable ${m}`);
    return vars[name];
  });
}

/** All visuals of an aircraft: attitude plus its own (propellers, rotors, flames ...). */
export const allVisuals = (spec) => [...(spec.attitude === false ? [] : attitude), ...(spec.visuals ?? [])];

/** One looping animation that applies every visual. */
export function aircraftAnimation(spec, edition) {
  const vars = variables(edition);
  const bones = {};
  // Several visuals may target the same bone channel: sum them per axis (multiply scales).
  const sums = {};
  for (const d of allVisuals(spec)) {
    const key = `${d.bone}|${d.prop}`;
    const entry = (sums[key] ??= { bone: d.bone, prop: d.prop, axes: [[], [], []], uniform: [] });
    if (d.axis === -1) entry.uniform.push(expr(d, vars));
    else entry.axes[d.axis].push(expr(d, vars));
  }
  for (const { bone, prop, axes, uniform } of Object.values(sums)) {
    const b = (bones[bone] ??= {});
    if (prop === 'scale') {
      if (uniform.length) b.scale = [0, 1, 2].map(() => uniform.map((e) => `(${e})`).join(' * '));
      else b.scale = axes.map((list) => (list.length ? list.map((e) => `(${e})`).join(' * ') : 1));
    } else {
      b[prop] = axes.map((list) => (list.length ? list.map((e) => `(${e})`).join(' + ') : 0));
    }
  }
  return {
    format_version: '1.8.0',
    animations: { [`animation.${NS}.${spec.id}.move`]: { loop: true, bones } },
  };
}
