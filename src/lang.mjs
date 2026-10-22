// In-game texts (.lang files on Bedrock; tools/java.mjs converts them for Java).
import { NS } from './lib/constants.mjs';
import { STRINGS } from './i18n.mjs';

export const LOCALES = ['en_US', 'da_DK'];

/** How to fly each kind of aircraft (the tutorial line and the handbook): [Bedrock, Java] x [en, da]. */
export const CONTROLS = {
  plane: [
    ['W/S: throttle · look up or down to climb or dive · turn by looking (or A/D) · S on the ground: brakes · Sneak: get out (in the air: bail out)',
      'W/S: gas · kig op eller ned for at stige eller dykke · drej ved at kigge (eller A/D) · S på jorden: bremse · Snig: stig ud (i luften: spring ud)'],
    ['W/S: throttle · look up or down to climb or dive · turn by looking (or A/D) · S on the ground: brakes · Shift: get out (in the air: bail out)',
      'W/S: gas · kig op eller ned for at stige eller dykke · drej ved at kigge (eller A/D) · S på jorden: bremse · Shift: stig ud (i luften: spring ud)'],
  ],
  glider: [
    ['Jump on the ground: winch launch · look up or down: pitch · turn by looking (or A/D) · find rising air over campfires, lava and sand',
      'Hop på jorden: spilstart · kig op eller ned: højderor · drej ved at kigge (eller A/D) · find opvind over lejrbål, lava og sand'],
    ['Jump on the ground: winch launch · look up or down: pitch · turn by looking (or A/D) · find rising air over campfires, lava and sand',
      'Hop på jorden: spilstart · kig op eller ned: højderor · drej ved at kigge (eller A/D) · find opvind over lejrbål, lava og sand'],
  ],
  paraglider: [
    ['Hold W to run off a slope · in the air W: speed bar, S: brakes · turn by looking (or A/D) · rising air over campfires, lava and sand',
      'Hold W for at løbe ud over en skrænt · i luften W: speeder, S: bremser · drej ved at kigge (eller A/D) · opvind over lejrbål, lava og sand'],
    ['Hold W to run off a slope · in the air W: speed bar, S: brakes · turn by looking (or A/D) · rising air over campfires, lava and sand',
      'Hold W for at løbe ud over en skrænt · i luften W: speeder, S: bremser · drej ved at kigge (eller A/D) · opvind over lejrbål, lava og sand'],
  ],
  heli: [
    ['Wait for the rotor · W: fly where you look (look down to descend) · S: back · A/D: sideways · Jump: climb',
      'Vent på rotoren · W: flyv derhen du kigger (kig ned for at gå ned) · S: baglæns · A/D: sidelæns · Hop: stig'],
    ['Wait for the rotor · W: fly where you look · S: back · A/D: sideways · Space: climb · V: descend',
      'Vent på rotoren · W: flyv derhen du kigger · S: baglæns · A/D: sidelæns · Mellemrum: stig · V: gå ned'],
  ],
  balloon: [
    ['W: burner (up) · S: vent (down) · let go: hold height · Jump: anchor · A/D: turn the basket · steer by finding another wind higher or lower',
      'W: brænder (op) · S: ventil (ned) · slip: hold højden · Hop: anker · A/D: drej kurven · styr ved at finde en anden vind højere eller lavere'],
    ['W: burner (up) · S: vent (down) · let go: hold height · Space: anchor · A/D: turn the basket · steer by finding another wind higher or lower',
      'W: brænder (op) · S: ventil (ned) · slip: hold højden · Mellemrum: anker · A/D: drej kurven · styr ved at finde en anden vind højere eller lavere'],
  ],
};

/** Which controls an aircraft uses. */
export const controlsOf = (a) => (a.flight.kind === 'heli' ? 'heli' : a.flight.kind === 'balloon' ? 'balloon'
  : a.flight.fixedPitch ? 'paraglider' : a.flight.thrust > 0 ? 'plane' : 'glider');

/** Messages and HUD texts: key -> [English, Danish]. %s / %1$s are filled in at runtime. */
const UI = {
  [`action.interact.${NS}.board`]: ['Board', 'Stig om bord'],
  [`${NS}.hud`]: ['%1$s km/h · altitude %2$s · climb %3$s m/s · throttle %4$s', '%1$s km/t · højde %2$s · stig %3$s m/s · gas %4$s'],
  [`${NS}.hud.glider`]: ['%1$s km/h · altitude %2$s · climb %3$s m/s', '%1$s km/t · højde %2$s · stig %3$s m/s'],
  [`${NS}.hud.heli`]: ['rotor %4$s · %1$s km/h · altitude %2$s · climb %3$s m/s', 'rotor %4$s · %1$s km/t · højde %2$s · stig %3$s m/s'],
  [`${NS}.hud.balloon`]: ['altitude %2$s · climb %3$s m/s · wind %1$s km/h %4$s', 'højde %2$s · stig %3$s m/s · vind %1$s km/t %4$s'],
  [`${NS}.hud.anchored`]: ['· anchored', '· ankret'],
  [`${NS}.hud.burner`]: ['· burner', '· brænder'],
  [`${NS}.hud.stall`]: ['§cSTALL§r', '§cSTALL§r'],
  [`${NS}.anchor.down`]: ['Anchor down: the balloon holds its place', 'Ankeret er ude: ballonen bliver, hvor den er'],
  [`${NS}.anchor.up`]: ['Anchor up: drifting with the wind', 'Ankeret er hevet: ballonen driver med vinden'],
  [`${NS}.crash`]: ['Crash! The aircraft is damaged', 'Styrt! Flyet er beskadiget'],
  [`${NS}.no_room`]: ['Not enough room here', 'Ikke plads nok her'],
  [`${NS}.parachute.hint`]: ['Jump to open your parachute!', 'Hop for at åbne din faldskærm!'],
  [`${NS}.parachute.none`]: ['No parachute! Craft one from wool and string before you jump.', 'Ingen faldskærm! Lav en af uld og snor, før du springer.'],
  [`${NS}.parachute.packed`]: ['Parachute packed away again', 'Faldskærmen er pakket sammen igen'],
  [`${NS}.handbook.title`]: ["Pilot's Handbook", 'Pilothåndbog'],
  [`${NS}.handbook.intro`]: [
    'Place an aircraft and right-click it to climb in. Sneak to get out; in the air you bail out, so carry a parachute. Pick an aircraft to read how to fly it.',
    'Stil et luftfartøj, og højreklik på det for at stige ind. Snig for at stige ud; i luften springer du ud, så hav en faldskærm med. Vælg et luftfartøj for at læse, hvordan det flyves.',
  ],
  [`${NS}.handbook.parachute`]: ['Parachutes', 'Faldskærme'],
  [`${NS}.handbook.parachute_text`]: [
    'Carry a parachute anywhere in your inventory. When you fall (or bail out of an aircraft) it opens by itself after a moment, or straight away when you jump. Steer it with the movement keys. Once you land it is packed away again.',
    'Hav en faldskærm et sted i din inventar. Når du falder (eller springer ud af et luftfartøj), åbner den af sig selv efter et øjeblik, eller med det samme når du hopper. Styr den med bevægelsestasterne. Når du lander, bliver den pakket sammen igen.',
  ],
  [`${NS}.handbook.back`]: ['Back', 'Tilbage'],
  [`${NS}.handbook.seats`]: ['Seats: %s', 'Sæder: %s'],
  [`${NS}.handbook.speed`]: ['Top speed: %s km/h', 'Tophastighed: %s km/t'],
  [`${NS}.handbook.welcome`]: [
    "§6You received a Pilot's Handbook!§r Use it to see how the aircraft fly.",
    '§6Du har fået en pilothåndbog!§r Brug den til at se, hvordan luftfartøjerne flyves.',
  ],
  [`key.category.${NS}.${NS}`]: ['Flights', 'Flights'],
  [`key.${NS}.down`]: ['Descend (helicopter)', 'Gå ned (helikopter)'],
  [`key.${NS}.hud`]: ['Show/hide flight controls', 'Vis/skjul flyveknapper'],
};

/** Lang entries for one locale as [key, value] pairs. */
export function langEntries(locale, { aircraft, items, description, version }) {
  const i = Math.max(0, LOCALES.indexOf(locale));
  const da = locale === 'da_DK' ? STRINGS.da : null;
  const pick = (pair) => pair[i] ?? pair[0];
  const out = [];
  out.push(['pack.description', da
    ? `Flights: paraglidere, luftballoner, svævefly, fly, vandfly, et jetfly, en gyrokopter og en helikopter, som du kan flyve (v${version})`
    : `${description} (v${version})`]);
  for (const a of aircraft) {
    out.push([`entity.${NS}:${a.id}.name`, da?.names[a.id] ?? a.name]);
    out.push([`${NS}.info.${a.id}`, da?.info[a.id] ?? a.info]);
    const c = CONTROLS[controlsOf(a)];
    out.push([`${NS}.controls.${a.id}`, pick(c[0])]);
    out.push([`${NS}.controls.java.${a.id}`, pick(c[1])]);
  }
  out.push([`entity.${NS}:parachute.name`, da ? 'Faldskærm' : 'Parachute']);
  for (const item of items) out.push([`item.${NS}:${item.id}.name`, da?.names[item.id] ?? item.name]);
  for (const [key, pair] of Object.entries(UI)) out.push([key, pick(pair)]);
  return out;
}
