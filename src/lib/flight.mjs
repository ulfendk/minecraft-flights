// The flight model, shared by the Bedrock scripts (copied to scripts/flight.js) and mirrored
// line for line in Java (dk.ulfen.flights.aircraft.Flight); a game test checks that both agree
// (tools/java.mjs writes flight_fixtures.json).
//
// One call to step() is one game tick. Speeds are blocks per tick, angles degrees.
// Minecraft's yaw: 0 faces south (+z), 90 west (-x); forward = (-sin yaw, 0, cos yaw).
// Pitch here is the aircraft's nose: positive = nose up. Roll: positive = right wing down.
//
// Kinds:
//   wing    fixed wing: planes, gliders, paragliders and gyrocopters. Thrust, drag and gravity
//           along the flight path (climbing costs speed, diving gains it); below stall speed
//           the wing stops lifting and the aircraft sinks (a gyrocopter's rotor keeps it slow).
//           They bank towards where the pilot looks, or with A/D.
//   heli    helicopter: hovers; flies where the pilot looks, strafes, climbs and descends.
//   balloon hot-air balloon: burner up, vent down, holds its height, drifts with the wind,
//           which turns with height. Jump drops or lifts the anchor.

export const G = 0.04;
/** Parachutes: a steady sink, steerable at walking pace. */
export const PARACHUTE = { sink: 0.12, steer: 0.12, minFall: 4 };

const D = Math.PI / 180;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const approach = (v, target, rate) => v + clamp(target - v, -rate, rate);
const wrap = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
const round = (n) => Math.round(n * 1e9) / 1e9;

/**
 * The wind at height y, time t (ticks): direction turns with height and slowly over the day,
 * so a balloon pilot steers by climbing or sinking into a different wind.
 */
export function wind(y, t) {
  const dir = t / 6000 + y / 18 + Math.sin(y / 23) * 1.4;
  const speed = 0.07 + 0.035 * Math.sin(y / 17 + t / 2400);
  return { x: -Math.sin(dir) * speed, z: Math.cos(dir) * speed, speed };
}

/** Every flight parameter with its default, so both editions read the same numbers. */
export const DEFAULTS = {
  kind: 'wing', thrust: 0, maxSpeed: 0, trim: 0, glide: 0, stall: 1, stallSink: 0.5, maxPitch: 20, maxBank: 30,
  turn: 3, ceiling: 320, pitchRate: 2.5, rollRate: 3, taxiTurn: 3, brake: 0.04, run: 0, winch: 0,
  fixedPitch: false, floats: false, liftFactor: 1, windFactor: 0, climb: 0, sink: 0, cool: 0, accel: 0,
};
export const normalize = (f) => ({ ...DEFAULTS, ...f });

/** A fresh state for an aircraft resting at `yaw`. */
export function initial(yaw = 0) {
  return {
    vx: 0, vy: 0, vz: 0, speed: 0, yaw, pitch: 0, roll: 0,
    throttle: 0, rotor: 0, heat: 0, holding: false, holdY: 0, anchored: true, burner: false,
    launch: 0, jumpWas: false, impact: 0,
  };
}

/** The default input: nobody at the controls. */
export const NO_INPUT = { pilot: false, fwd: 0, side: 0, jump: false, down: false, look: 0, lookYaw: 0 };

/**
 * One tick.
 *   s     state (see initial()); a new object is returned
 *   input { pilot, fwd -1..1 (W/S), side -1..1 (A = +1), jump, down, look (pitch, + = down), lookYaw }
 *   f     the aircraft's flight block, normalized (spec.flight with DEFAULTS)
 *   env   { onGround, y, time, lift (rising air, blocks/tick), hit (ran into something) }, all given
 */
export function step(s, input, f, env) {
  const n = { ...s, impact: 0 };
  const inp = input.pilot ? input : NO_INPUT;
  const jumpPressed = inp.jump && !s.jumpWas;
  n.jumpWas = !!inp.jump;
  if (f.kind === 'heli') heli(n, inp, f, env);
  else if (f.kind === 'balloon') balloon(n, inp, f, env, jumpPressed);
  else wing(n, inp, f, env, jumpPressed);
  for (const k of ['vx', 'vy', 'vz', 'speed', 'yaw', 'pitch', 'roll', 'throttle', 'rotor', 'heat', 'impact', 'holdY']) n[k] = round(n[k]);
  return n;
}

/** How much a wing lifts at a speed: 0 stalled, 1 flying. */
export function liftFraction(speed, stall) {
  const r = speed / stall;
  return clamp(r * r, 0, 1);
}

function wing(n, inp, f, env, jumpPressed) {
  const powered = f.thrust > 0;
  // Engine: W opens the throttle, S closes it. Nobody aboard: it idles down.
  if (powered) n.throttle = clamp(n.throttle + (inp.pilot ? inp.fwd * 0.02 : -0.02), 0, 1);
  // Drag that makes full throttle level out at maxSpeed; gliders at their best glide.
  const cd = powered ? f.thrust / (f.maxSpeed * f.maxSpeed) : (G * Math.sin(Math.atan(1 / f.glide))) / (f.trim * f.trim);
  const trimPitch = powered ? 0 : -Math.atan(1 / f.glide) / D;
  const ceiling = clamp((f.ceiling - env.y) / 32, 0, 1);

  // Glider winch launch: Jump on the ground pulls it up some 40 blocks.
  if (f.winch > 0 && jumpPressed && env.onGround && n.speed < f.stall) n.launch = f.winch;
  const launching = n.launch > 0;
  if (launching) n.launch--;

  // Where the nose wants to go: the pilot's look, with a small dead zone around 5 degrees down.
  let pitchTarget = trimPitch;
  if (f.fixedPitch) pitchTarget = trimPitch + (inp.fwd > 0 ? -3 : inp.fwd < 0 ? 4 : 0); // speed bar / brakes
  else if (inp.pilot) {
    const look = inp.look - 5;
    pitchTarget = trimPitch - Math.sign(look) * Math.max(0, Math.abs(look) - 6);
  }
  pitchTarget = clamp(pitchTarget, -f.maxPitch, f.maxPitch);
  const lf = liftFraction(n.speed, f.stall);
  // A stalled wing drops its nose (and so picks up speed again).
  pitchTarget -= (1 - lf) * (f.stallSink > 0.3 ? 20 : 4);
  if (launching) pitchTarget = 30;
  if (env.onGround) pitchTarget = n.speed >= f.stall ? Math.max(0, pitchTarget) : 0;
  n.pitch = approach(n.pitch, pitchTarget, f.pitchRate);

  // Speed along the flight path.
  const sinP = Math.sin(n.pitch * D);
  let accel = (powered ? f.thrust * n.throttle * ceiling : 0) - cd * n.speed * n.speed;
  if (!env.onGround) accel -= G * sinP;
  if (env.onGround) {
    // Rolling: friction, and wheel brakes when S is held with the throttle closed.
    const brake = inp.fwd < 0 && n.throttle === 0 ? f.brake : 0;
    const run = f.run > 0 && inp.fwd > 0 && n.speed < f.run ? 0.02 : 0; // a paraglider pilot runs
    accel += run - (n.speed > 0 ? Math.min(n.speed, 0.004 + brake) : 0);
  }
  if (launching) accel = Math.max(accel, (f.trim * 1.5 - n.speed) * 0.1);
  n.speed = Math.max(0, n.speed + accel);
  if (env.hit) {
    n.impact = n.speed;
    n.speed *= 0.2;
  }

  // Up and down: lift follows the flight path; stalled, it sinks towards stallSink.
  const lf2 = liftFraction(n.speed, f.stall);
  let vyTarget = lf2 * n.speed * Math.sin(n.pitch * D) - (1 - lf2) * f.stallSink + env.lift * f.liftFactor;
  if (launching) vyTarget = Math.max(vyTarget, 0.5);
  const wasAir = !env.onGround;
  n.vy = approach(n.vy, vyTarget, 0.06);
  if (env.onGround && n.vy < 0) {
    if (n.vy < -0.3) n.impact = Math.max(n.impact, -n.vy);
    n.vy = 0;
  }
  if (wasAir && env.onGround) n.vy = Math.max(0, n.vy);

  // Turning: A/D bank, or (without A/D) the aircraft banks towards where the pilot looks;
  // the bank turns it. On the ground: steer the nose wheel the same way.
  let side = inp.side;
  if (side === 0 && inp.pilot) {
    const d = wrap(inp.lookYaw - n.yaw);
    side = Math.abs(d) > 6 ? -clamp(d / 40, -1, 1) : 0;
  }
  if (env.onGround) {
    n.roll = approach(n.roll, 0, 3);
    n.yaw = wrap(n.yaw - side * f.taxiTurn * clamp(n.speed / 0.15, 0, 1));
  } else {
    n.roll = approach(n.roll, -side * f.maxBank, f.rollRate);
    n.yaw = wrap(n.yaw + (n.roll / f.maxBank) * f.turn * Math.max(0.3, lf2));
  }
  const yaw = n.yaw * D;
  const h = n.speed * Math.cos(n.pitch * D);
  const w = f.windFactor > 0 ? wind(env.y, env.time) : { x: 0, z: 0 };
  n.vx = -Math.sin(yaw) * h + w.x * f.windFactor * (env.onGround ? 0 : 1);
  n.vz = Math.cos(yaw) * h + w.z * f.windFactor * (env.onGround ? 0 : 1);
  n.rotor = powered ? n.throttle : clamp(n.speed / f.stall, 0, 1);
}

function heli(n, inp, f, env) {
  // The rotor spins up with a pilot aboard and winds down without one.
  n.rotor = clamp(n.rotor + (inp.pilot ? 0.01 : -0.003), 0, 1);
  n.throttle = n.rotor;
  const lift = n.rotor >= 0.6 ? 1 : 0;
  const yaw0 = n.yaw * D;
  const fx = -Math.sin(yaw0), fz = Math.cos(yaw0);
  const lx = Math.cos(yaw0), lz = Math.sin(yaw0); // to the left
  // Forward and backward along the heading, strafing with A/D.
  const fwd = lift ? inp.fwd * (inp.fwd > 0 ? 1 : 0.4) * f.maxSpeed : 0;
  const side = lift ? inp.side * f.maxSpeed * 0.35 : 0;
  const tx = fx * fwd + lx * side, tz = fz * fwd + lz * side;
  // Climb with Jump, descend with the dive key; flying forward follows the look up or down.
  let vyTarget = -f.stallSink * (1 - n.rotor);
  if (lift) {
    vyTarget = 0;
    if (inp.fwd > 0) {
      const look = inp.look;
      vyTarget = -Math.sign(look) * Math.max(0, Math.abs(look) - 12) * D * f.maxSpeed * 0.8;
    }
    if (inp.jump) vyTarget = f.climb;
    else if (inp.down) vyTarget = -f.climb;
    vyTarget = clamp(vyTarget, -f.climb, f.climb);
    if (env.y > f.ceiling) vyTarget = Math.min(vyTarget, 0);
  }
  vyTarget += env.lift * 0.2;
  const rate = env.onGround ? 0.08 : f.accel;
  n.vx = approach(n.vx, env.onGround && !lift ? 0 : tx, rate);
  n.vz = approach(n.vz, env.onGround && !lift ? 0 : tz, rate);
  n.vy = approach(n.vy, vyTarget, 0.04);
  if (env.onGround && n.vy < 0) {
    if (n.vy < -0.3) n.impact = -n.vy;
    n.vy = 0;
  }
  if (env.hit) {
    n.impact = Math.max(n.impact, Math.hypot(n.vx, n.vz));
    n.vx *= 0.2;
    n.vz *= 0.2;
  }
  // Turn towards where the pilot looks.
  const turn = inp.pilot && lift ? clamp(wrap(inp.lookYaw - n.yaw), -f.turn, f.turn) : 0;
  n.yaw = wrap(n.yaw + turn);
  n.speed = Math.hypot(n.vx, n.vz);
  // Nose down when flying forward, bank into strafes and turns (for the looks).
  const along = n.vx * fx + n.vz * fz, across = n.vx * lx + n.vz * lz;
  n.pitch = approach(n.pitch, env.onGround ? 0 : (-along / f.maxSpeed) * 14, 1.5);
  n.roll = approach(n.roll, env.onGround ? 0 : (-across / f.maxSpeed) * 30 + turn * 3, 2);
}

function balloon(n, inp, f, env, jumpPressed) {
  if (env.onGround) n.anchored = true;
  else if (jumpPressed) n.anchored = !n.anchored;
  let vyTarget;
  if (!inp.pilot) {
    // Nobody tending the burner: the envelope cools and the balloon sinks slowly.
    vyTarget = -f.cool;
    n.holding = false;
  } else if (inp.fwd > 0) {
    vyTarget = f.climb;
    n.holding = false;
  } else if (inp.fwd < 0) {
    vyTarget = -f.sink;
    n.holding = false;
  } else {
    // Hands off: the pilot light keeps it at this height.
    if (!n.holding) {
      n.holding = true;
      n.holdY = env.y;
    }
    vyTarget = env.onGround ? 0 : clamp((n.holdY - env.y) * 0.05, -0.05, 0.05);
  }
  if (env.y > f.ceiling) vyTarget = Math.min(vyTarget, -0.02);
  vyTarget += env.lift * 0.3;
  n.burner = !!inp.pilot && vyTarget > 0.005;
  n.heat = approach(n.heat, n.burner ? 1 : inp.pilot ? 0.5 : 0, 0.02);
  if (env.onGround && inp.pilot && inp.fwd > 0) n.anchored = false;
  n.vy = approach(n.vy, vyTarget, 0.01);
  if (env.onGround && n.vy < 0) {
    if (n.vy < -0.3) n.impact = -n.vy;
    n.vy = 0;
  }
  // Drifting with the wind, unless it is anchored or standing on the ground.
  const w = wind(env.y, env.time);
  const still = n.anchored || env.onGround;
  n.vx = approach(n.vx, still ? 0 : w.x, 0.004);
  n.vz = approach(n.vz, still ? 0 : w.z, 0.004);
  if (env.hit) {
    n.vx *= 0.2;
    n.vz *= 0.2;
  }
  // A/D turn the basket slowly (to face the game you are watching).
  n.yaw = wrap(n.yaw - inp.side * f.turn);
  n.speed = Math.hypot(n.vx, n.vz);
  n.pitch = 0;
  n.roll = 0;
  n.throttle = n.burner ? 1 : 0;
  n.rotor = n.heat;
}

/** Ticks of take-off roll and the distance covered, with full throttle and the stick pulled back. For tests and the site. */
export function takeoff(spec, maxTicks = 1200) {
  const f = normalize(spec);
  let s = initial(0);
  let dist = 0;
  let y = 64;
  for (let t = 0; t < maxTicks; t++) {
    const onGround = y <= 64;
    s = step(s, { ...NO_INPUT, pilot: true, fwd: 1, look: -20, lookYaw: 0 }, f, { onGround, y, time: 0, lift: 0, hit: false });
    dist += Math.hypot(s.vx, s.vz);
    y = Math.max(64, y + s.vy);
    if (y > 65) return { ticks: t, dist };
  }
  return null;
}
