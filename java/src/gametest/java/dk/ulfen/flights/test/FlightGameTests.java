package dk.ulfen.flights.test;

import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import dk.ulfen.flights.ModRegistry;
import dk.ulfen.flights.aircraft.AircraftEntity;
import dk.ulfen.flights.aircraft.AircraftSpec;
import dk.ulfen.flights.aircraft.Flight;
import dk.ulfen.flights.aircraft.ParachuteEntity;
import net.fabricmc.fabric.api.gametest.v1.GameTest;
import net.minecraft.core.BlockPos;
import net.minecraft.gametest.framework.GameTestHelper;
import net.minecraft.world.entity.EntityTypes;
import net.minecraft.world.entity.animal.pig.Pig;
import net.minecraft.world.phys.Vec3;

/** Server-side checks run by `./gradlew runGameTest` (and in CI). */
public class FlightGameTests {
	private static AircraftEntity spawn(GameTestHelper helper, String id, BlockPos pos, float yaw) {
		AircraftEntity a = helper.spawn(ModRegistry.type(id), pos);
		a.snapTo(a.getX(), a.getY(), a.getZ(), yaw, 0);
		a.setYBodyRot(yaw);
		a.setYHeadRot(yaw);
		a.setFlight(Flight.State.initial(yaw));
		return a;
	}

	private static Flight.Input pilot(double fwd, double look, double lookYaw, boolean jump) {
		return new Flight.Input(true, fwd, 0, jump, false, look, lookYaw);
	}

	/** Every aircraft can be placed and is still there, on the ground, two seconds later. */
	@GameTest(maxTicks = 100, structure = "flights-test:empty_large")
	public void everyAircraftSpawns(GameTestHelper helper) {
		List<AircraftEntity> all = new ArrayList<>();
		int i = 0;
		for (AircraftSpec s : ModRegistry.SPECS) {
			all.add(spawn(helper, s.id, new BlockPos(4 + (i % 4) * 9, 1, 4 + (i / 4) * 12), 0));
			i++;
		}
		helper.runAfterDelay(40, () -> {
			for (AircraftEntity a : all) {
				if (!a.isAlive()) helper.fail("Aircraft vanished: " + a.spec.id);
				if (Math.abs(a.getY() - helper.absoluteVec(new Vec3(0, 1, 0)).y) > 0.1) helper.fail(a.spec.id + " did not stay parked: y " + a.getY());
			}
			helper.succeed();
		});
	}

	/** The Java flight model gives the same numbers as the JavaScript one (flight_fixtures.json). */
	@GameTest
	public void flightMatchesJs(GameTestHelper helper) {
		try (var in = FlightGameTests.class.getResourceAsStream("/flights/flight_fixtures.json")) {
			var fixtures = JsonParser.parseReader(new InputStreamReader(in, StandardCharsets.UTF_8)).getAsJsonArray();
			for (JsonElement el : fixtures) {
				JsonObject fx = el.getAsJsonObject();
				AircraftSpec spec = ModRegistry.spec(fx.get("id").getAsString());
				Flight.State s = Flight.State.initial(10);
				int t = 0;
				for (JsonElement tickEl : fx.getAsJsonArray("ticks")) {
					JsonObject tick = tickEl.getAsJsonObject();
					JsonObject i = tick.getAsJsonObject("input"), e = tick.getAsJsonObject("env"), want = tick.getAsJsonObject("state");
					Flight.Input input = new Flight.Input(i.get("pilot").getAsBoolean(), i.get("fwd").getAsDouble(), i.get("side").getAsDouble(),
						i.get("jump").getAsBoolean(), i.get("down").getAsBoolean(), i.get("look").getAsDouble(), i.get("lookYaw").getAsDouble());
					Flight.Env env = new Flight.Env(e.get("onGround").getAsBoolean(), e.get("y").getAsDouble(), e.get("time").getAsDouble(),
						e.get("lift").getAsDouble(), e.get("hit").getAsBoolean());
					s = Flight.step(s, input, spec.flight, env);
					double[][] pairs = {
						{s.vx, want.get("vx").getAsDouble()}, {s.vy, want.get("vy").getAsDouble()}, {s.vz, want.get("vz").getAsDouble()},
						{s.speed, want.get("speed").getAsDouble()}, {s.yaw, want.get("yaw").getAsDouble()}, {s.pitch, want.get("pitch").getAsDouble()},
						{s.roll, want.get("roll").getAsDouble()}, {s.throttle, want.get("throttle").getAsDouble()}, {s.rotor, want.get("rotor").getAsDouble()},
						{s.heat, want.get("heat").getAsDouble()}, {s.impact, want.get("impact").getAsDouble()},
					};
					String[] names = {"vx", "vy", "vz", "speed", "yaw", "pitch", "roll", "throttle", "rotor", "heat", "impact"};
					for (int k = 0; k < pairs.length; k++) {
						if (Math.abs(pairs[k][0] - pairs[k][1]) > 1e-6) helper.fail(spec.id + " tick " + t + ": " + names[k] + " is " + pairs[k][0] + " in Java, " + pairs[k][1] + " in JavaScript");
					}
					if (s.anchored != want.get("anchored").getAsBoolean() || s.burner != want.get("burner").getAsBoolean() || s.launch != want.get("launch").getAsInt()) {
						helper.fail(spec.id + " tick " + t + ": flags differ from JavaScript");
					}
					t++;
				}
			}
		} catch (java.io.IOException ex) {
			helper.fail(ex.toString());
		}
		helper.succeed();
	}

	/** With the stick pulled back at flying speed, the light aircraft climbs. */
	@GameTest(maxTicks = 100, structure = "flights-test:empty_large")
	public void planeClimbs(GameTestHelper helper) {
		AircraftEntity a = spawn(helper, "light_aircraft", new BlockPos(20, 6, 2), 0);
		Flight.State s = Flight.State.initial(0);
		s.speed = 1.4;
		s.throttle = 1;
		a.setFlight(s);
		a.testInput = pilot(1, -30, 0, false);
		double y0 = a.getY();
		helper.runAfterDelay(22, () -> {
			if (a.getY() < y0 + 2) helper.fail("climbed only " + (a.getY() - y0));
			a.discard();
			helper.succeed();
		});
	}

	/** Let go high up with nobody aboard, the glider glides down instead of dropping. */
	@GameTest(maxTicks = 100, structure = "flights-test:empty_large")
	public void gliderGlides(GameTestHelper helper) {
		AircraftEntity a = spawn(helper, "glider", new BlockPos(20, 18, 4), 0);
		Flight.State s = Flight.State.initial(0);
		s.speed = 1.1;
		a.setFlight(s);
		double y0 = a.getY();
		helper.runAfterDelay(20, () -> {
			double dropped = y0 - a.getY();
			if (dropped < 0.2 || dropped > 4) helper.fail("dropped " + dropped + " blocks in a second");
			a.discard();
			helper.succeed();
		});
	}

	/** The balloon climbs on the burner and holds its height when you let go. */
	@GameTest(maxTicks = 300, structure = "flights-test:empty_large")
	public void balloonClimbsAndHolds(GameTestHelper helper) {
		AircraftEntity a = spawn(helper, "hot_air_balloon", new BlockPos(20, 1, 20), 0);
		a.testInput = pilot(1, 0, 0, false);
		double y0 = a.getY();
		double[] y1 = new double[1];
		helper.runAfterDelay(100, () -> {
			if (a.getY() < y0 + 5) helper.fail("burner: climbed only " + (a.getY() - y0));
			if (!a.burner()) helper.fail("the burner is not lit");
			a.testInput = pilot(0, 0, 0, false);
		});
		helper.runAfterDelay(180, () -> y1[0] = a.getY());
		helper.runAfterDelay(260, () -> {
			if (Math.abs(a.getY() - y1[0]) > 0.6) helper.fail("hands off: moved from " + y1[0] + " to " + a.getY());
			helper.succeed();
		});
	}

	/** The helicopter spins up and lifts off on Jump. */
	@GameTest(maxTicks = 200, structure = "flights-test:empty_large")
	public void helicopterLiftsOff(GameTestHelper helper) {
		AircraftEntity a = spawn(helper, "helicopter", new BlockPos(20, 1, 20), 0);
		a.testInput = pilot(0, 0, 0, true);
		double y0 = a.getY();
		helper.runAfterDelay(150, () -> {
			if (a.getY() < y0 + 3) helper.fail("climbed only " + (a.getY() - y0));
			helper.succeed();
		});
	}

	/** The seaplane floats on a pond, and takes off from it. A land plane would sink. */
	@GameTest(maxTicks = 300, structure = "flights-test:empty_large")
	public void seaplaneFloatsAndTakesOff(GameTestHelper helper) {
		for (int x = 2; x < 38; x++) for (int z = 2; z < 38; z++) helper.setBlock(new BlockPos(x, 1, z), net.minecraft.world.level.block.Blocks.WATER);
		AircraftEntity sea = spawn(helper, "seaplane", new BlockPos(20, 4, 4), 0);
		AircraftEntity land = spawn(helper, "light_aircraft", new BlockPos(30, 4, 30), 0);
		double surface = helper.absoluteVec(new Vec3(0, 2, 0)).y;
		helper.runAfterDelay(60, () -> {
			if (Math.abs(sea.getY() - surface) > 0.3) helper.fail("seaplane at " + sea.getY() + ", water surface at " + surface);
			if (land.getY() > surface - 0.5) helper.fail("the land plane floats too (" + land.getY() + ")");
			// Full throttle across the pond, stick back.
			Flight.State s = Flight.State.initial(0);
			s.speed = 0.75;
			s.throttle = 1;
			sea.setFlight(s);
			sea.testInput = pilot(1, -25, 0, false);
		});
		helper.runAfterDelay(80, () -> {
			if (sea.getY() < surface + 1) helper.fail("did not take off from the water (y " + sea.getY() + ")");
			sea.discard();
			helper.succeed();
		});
	}

	/** Getting out in the air leaves you at the aircraft's height (to bail out), not on the ground. */
	@GameTest(maxTicks = 60, structure = "flights-test:empty_large")
	public void bailOutInTheAir(GameTestHelper helper) {
		AircraftEntity a = spawn(helper, "helicopter", new BlockPos(20, 14, 20), 0);
		Flight.State s = Flight.State.initial(0);
		s.rotor = 1;
		a.setFlight(s);
		a.testInput = pilot(0, 0, 0, false);
		Pig pig = helper.spawn(EntityTypes.PIG, new BlockPos(20, 1, 22));
		pig.startRiding(a, true, true);
		helper.runAfterDelay(5, () -> {
			pig.stopRiding();
			if (pig.getY() < a.getY() - 1) helper.fail("dismounted to the ground (" + pig.getY() + ") from " + a.getY());
			helper.succeed();
		});
	}

	/** A parachute holds its owner's fall to parachute speed, and is packed away on landing. */
	@GameTest(maxTicks = 300, structure = "flights-test:empty_large")
	public void parachuteHoldsTheFall(GameTestHelper helper) {
		Pig pig = helper.spawn(EntityTypes.PIG, new BlockPos(20, 20, 20));
		ParachuteEntity chute = ParachuteEntity.deploy(helper.getLevel(), pig);
		if (chute == null) helper.fail("no parachute");
		helper.runAfterDelay(30, () -> {
			if (pig.getDeltaMovement().y < -Flight.PARACHUTE_SINK - 0.05) helper.fail("falling at " + pig.getDeltaMovement().y);
			if (!chute.isAlive()) helper.fail("the parachute closed in the air");
		});
		helper.succeedWhen(() -> {
			if (!pig.onGround()) helper.fail("still in the air");
			if (chute.isAlive()) helper.fail("the parachute is still open on the ground");
			if (pig.getHealth() < pig.getMaxHealth()) helper.fail("the pig was hurt by the landing");
		});
	}
}
