# Flights

A Minecraft **Bedrock Edition** add-on and **Java Edition** (Fabric) mod with seven aircraft you can fly: a paraglider, a hot-air balloon, a glider, a light aircraft, a business jet, a gyrocopter and a helicopter – and a parachute to bail out with.

**Download and info: https://ulfendk.github.io/minecraft-flights/** (på dansk: https://ulfendk.github.io/minecraft-flights/da/)

![All aircraft](https://ulfendk.github.io/minecraft-flights/img/aircraft/hot_air_balloon.png)

## Features
- **Seven aircraft**, each with its own model, spinning propellers and rotors, and a body that pitches and banks.
- **One flight model for both editions** (`src/lib/flight.mjs`, mirrored in Java): planes need a take-off run and stall when too slow; gliders and paragliders trade height for speed (1:30 and 1:8); the glider has a winch launch; the gyrocopter can't stall; the helicopter hovers; the balloon holds its height and drifts with a wind that turns with height.
- **Rising air** over campfires, lava, and sand in the daytime.
- **Bail out** with sneak in the air. Carry a parachute (wool and string) and it opens after a moment, or as soon as you jump. Steer it with the movement keys; it is packed away again when you land.
- **Hunting from the balloon** with [Realistic Hunting](https://ulfendk.github.io/minecraft-hunting/): anchor it with jump, your shots fly through the basket, and while you hold a hunting weapon, sneak zooms the scope instead of getting you out.
- Hard landings damage the aircraft. An aircraft with nobody at the controls glides or sinks down by itself.
- A Pilot's Handbook, given to every player. English and Danish.

## How to fly
Right-click an aircraft to climb in; the first seat flies. Sneak to get out.

| | Bedrock | Java Edition |
| --- | --- | --- |
| Light aircraft, business jet, gyrocopter | W/S throttle, look up/down to climb or dive, turn by looking (or A/D), S on the ground brakes | same |
| Glider | Jump on the ground: winch launch; look to pitch and turn | same |
| Paraglider | Hold W to run off a slope; W speed bar, S brakes | same |
| Hot-air balloon | W burner, S vent, let go to hold height, Jump: anchor, A/D turn the basket | same, Space: anchor |
| Helicopter | Wait for the rotor; W flies where you look (look down to descend), A/D sideways, Jump climbs | same, V descends |

On Java, H shows or hides the instrument panel.

## Install
1. Download `Flights.mcaddon` from the [latest release](https://github.com/ulfendk/minecraft-flights/releases/latest).
2. Open it on Windows, Android or iOS. Minecraft imports both packs.
3. In your world settings, turn on **Flights** under *Behavior Packs*.

Requires Minecraft Bedrock 1.21.90 or newer.

### Java Edition
1. Install [Fabric Loader](https://fabricmc.net/use/installer/) for Minecraft 26.3.
2. Download `flights-fabric-<version>.jar` from the [latest release](https://github.com/ulfendk/minecraft-flights/releases/latest), plus [Fabric API](https://modrinth.com/mod/fabric-api) and [GeckoLib](https://modrinth.com/mod/geckolib).
3. Put all three in your `mods` folder.

## Development
Everything is generated from code. Models, textures and animations come from the specs in `src/aircraft/`.

```sh
npm ci
npm run build      # writes build/behavior_pack, build/resource_pack and java/src/generated/resources
npm run validate   # static checks of the packs and the Java resources
npm test           # unit tests (flight model, specs)
npm run preview    # renders every aircraft to build/preview/*.png
npm run package    # dist/*.mcaddon and *.mcpack
npm run site       # the website, in build/site/
npm run test:server  # loads the packs in a Bedrock Dedicated Server and runs the selftest (needs Docker)

cd java                       # Java edition (needs JDK 25; run `npm run build` first)
./gradlew build               # the Fabric mod jar in java/build/libs, and the server game tests
./gradlew runClientGameTest   # starts a client, screenshots and flies every aircraft, bails out with a parachute
./gradlew runClient           # play it
```

The flight model is one deterministic step per tick, written once in JavaScript (`src/lib/flight.mjs`, which the Bedrock scripts run as `scripts/flight.js`) and line for line in Java (`dk.ulfen.flights.aircraft.Flight`). The build writes `flight_fixtures.json`, scripted flights through the JavaScript model, and a game test checks that the Java model gives the same numbers. On both editions the server flies the aircraft from the pilot's keys and look.

| Path | What it is |
| --- | --- |
| `src/aircraft/*.mjs` | One file per aircraft: model, materials, seats, flight parameters, visuals, recipe, icon |
| `src/lib/flight.mjs` | The flight model and the wind |
| `src/lib/` | Generators: model + UV packing, parts, textures, animations, entity JSON |
| `src/gear.mjs` | The parachute |
| `src/packs/` | Hand-written pack files, including the Script API code in `behavior_pack/scripts/` |
| `src/lang.mjs`, `src/i18n.mjs` | In-game texts and website texts, English and Danish |
| `tools/` | Build, validation, preview renderer, packaging, website, server test, Java resources |
| `java/` | The Fabric mod (Java edition) |

### Adding an aircraft
Copy a similar spec in `src/aircraft/`, add its id to `ORDER` in `src/lib/aircraft.mjs` and its Danish name and description to `src/i18n.mjs`. Run `npm run preview <id>` and look at `build/preview/<id>.png`.

### Releases
Bump `version` in `package.json`, add a section to `CHANGELOG.md`, then push a tag such as `v0.2.0`. The release workflow builds and tests both editions, publishes a GitHub Release with the files, and updates the website.

## License
MIT. Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.
