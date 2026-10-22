package dk.ulfen.flights.test;

import java.util.List;

import dk.ulfen.flights.ModRegistry;
import dk.ulfen.flights.aircraft.AircraftEntity;
import dk.ulfen.flights.aircraft.AircraftSpec;
import dk.ulfen.flights.aircraft.ParachuteEntity;
import net.fabricmc.fabric.api.client.gametest.v1.FabricClientGameTest;
import net.fabricmc.fabric.api.client.gametest.v1.context.ClientGameTestContext;
import net.fabricmc.fabric.api.client.gametest.v1.context.TestServerContext;
import net.fabricmc.fabric.api.client.gametest.v1.context.TestSingleplayerContext;
import net.minecraft.client.CameraType;
import net.minecraft.world.phys.AABB;

/**
 * Starts a real client: screenshots every aircraft (images land in build/run/clientGameTest/screenshots),
 * climbs in and flies it with simulated keys (the planes take off, the helicopter and the balloon climb,
 * the glider is winched up), then bails out of the helicopter with a parachute in the inventory and checks
 * that it opens. `-Pflights.screenshot=glider,helicopter` limits it to those aircraft.
 */
public class FlightClientGameTest implements FabricClientGameTest {
	@Override
	public void runTest(ClientGameTestContext context) {
		try (TestSingleplayerContext world = context.worldBuilder().create()) {
			TestServerContext server = world.getServer();
			server.runCommand("time set noon");
			server.runCommand("weather clear");
			server.runCommand("gamerule advance_time false");
			server.runCommand("gamerule spawn_mobs false");
			server.runCommand("gamemode creative @a");
			context.waitTicks(40);

			String filter = System.getProperty("flights.screenshot");
			List<String> only = filter == null ? List.of() : List.of(filter.split(","));
			for (AircraftSpec spec : ModRegistry.SPECS) {
				if (!only.isEmpty() && !only.contains(spec.id)) continue;
				String type = "flights:" + spec.id;
				server.runCommand("ride @p dismount");
				server.runCommand("kill @e[type=!player]");
				// A runway along +z (fill is limited to 32768 blocks per command).
				for (int z = -20; z < 300; z += 100) server.runCommand("fill -12 -61 " + z + " 12 -61 " + (z + 99) + " minecraft:smooth_stone");
				for (int z = -20; z < 300; z += 40) server.runCommand("fill -12 -60 " + z + " 12 -30 " + (z + 39) + " minecraft:air");
				server.runCommand("tp @a 0 -60 -12");
				server.runCommand("summon " + type + " 0.5 -60 0.5 {Rotation:[0f,0f]}");
				context.waitTicks(10);
				look(context, server, 9, -56, -9, 45, 15);
				context.takeScreenshot("aircraft_" + spec.id);

				// Climb in (third person, so the screenshots show it).
				server.runCommand("ride @p mount @e[type=" + type + ",limit=1]");
				server.runCommand("rotate @p 0 0");
				context.runOnClient(mc -> mc.options.setCameraType(CameraType.THIRD_PERSON_BACK));
				context.waitTicks(10);
				double[] start = state(server, type);
				fly(context, server, spec);
				double[] end = state(server, type);
				context.takeScreenshot("aircraft_" + spec.id + "_flying");
				double climbed = end[1] - start[1];
				double moved = Math.hypot(end[0] - start[0], end[2] - start[2]);
				System.out.printf("[flights-test] %s climbed %.1f blocks and moved %.1f%n", spec.id, climbed, moved);
				if ("paraglider".equals(spec.id)) {
					if (moved < 2) throw new AssertionError("the paraglider pilot did not run forward (" + moved + ")");
				} else if (climbed < 3) {
					throw new AssertionError(spec.id + " did not take off (climbed " + climbed + ")");
				}

				if ("helicopter".equals(spec.id)) {
					// Bail out with a parachute: it opens, and the pilot comes down slowly.
					server.runCommand("give @p flights:parachute");
					server.runCommand("gamemode survival @a");
					context.waitTicks(5);
					context.getInput().holdKey(o -> o.keyShift);
					context.waitTicks(3);
					context.getInput().releaseKey(o -> o.keyShift);
					context.waitTicks(45);
					context.takeScreenshot("aircraft_parachute");
					boolean open = server.computeOnServer(s -> !s.overworld().getEntitiesOfClass(ParachuteEntity.class, new AABB(-300, -100, -300, 300, 300, 300)).isEmpty());
					boolean riding = server.computeOnServer(s -> s.getPlayerList().getPlayers().getFirst().isPassenger());
					System.out.printf("[flights-test] bailed out: still riding %s, parachute open %s%n", riding, open);
					if (riding) throw new AssertionError("sneak did not get the pilot out in the air");
					if (!open) throw new AssertionError("the parachute did not open");
					server.runCommand("gamemode creative @a");
				}
				context.runOnClient(mc -> mc.options.setCameraType(CameraType.FIRST_PERSON));
			}
		}
	}

	/** Flies an aircraft for a while with the keys its kind needs. */
	private static void fly(ClientGameTestContext context, TestServerContext server, AircraftSpec spec) {
		var input = context.getInput();
		switch (spec.flight.kind) {
			case "heli" -> {
				context.waitTicks(70); // spin up
				input.holdKey(o -> o.keyJump);
				context.waitTicks(100);
				input.releaseKey(o -> o.keyJump);
				context.waitTicks(10);
			}
			case "balloon" -> {
				input.holdKey(o -> o.keyUp);
				context.waitTicks(120);
				input.releaseKey(o -> o.keyUp);
				context.waitTicks(10);
			}
			default -> {
				if (spec.flight.winch > 0) {
					input.holdKey(o -> o.keyJump);
					context.waitTicks(3);
					input.releaseKey(o -> o.keyJump);
					context.waitTicks(60);
				} else {
					// Full throttle down the runway, then look up to lift off.
					input.holdKey(o -> o.keyUp);
					context.waitTicks(spec.flight.thrust > 0 ? 50 : 30);
					server.runCommand("rotate @p 0 -25");
					context.waitTicks(spec.flight.thrust > 0 ? 130 : 20);
					input.releaseKey(o -> o.keyUp);
					server.runCommand("rotate @p 0 5");
					context.waitTicks(5);
				}
			}
		}
	}

	/** Puts the camera somewhere and makes sure the client has taken the new view. */
	private static void look(ClientGameTestContext context, TestServerContext server, double x, double y, double z, float yaw, float pitch) {
		server.runCommand("tp @p " + x + " " + y + " " + z + " " + yaw + " " + pitch);
		context.waitTicks(5);
		context.runOnClient(mc -> {
			mc.player.setPos(x, y, z);
			mc.player.setYRot(yaw);
			mc.player.setXRot(pitch);
		});
		context.waitTicks(10);
	}

	private static AircraftEntity aircraft(net.minecraft.server.level.ServerLevel level, String type) {
		return level.getEntitiesOfClass(AircraftEntity.class, new AABB(-300, -100, -300, 300, 300, 300),
			e -> ("flights:" + e.spec.id).equals(type)).getFirst();
	}

	private static double[] state(TestServerContext server, String type) {
		return server.computeOnServer(s -> {
			AircraftEntity e = aircraft(s.overworld(), type);
			return new double[] {e.getX(), e.getY(), e.getZ(), e.getYRot()};
		});
	}
}
