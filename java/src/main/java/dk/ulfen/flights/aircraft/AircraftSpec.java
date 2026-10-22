package dk.ulfen.flights.aircraft;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;

/** Aircraft data generated from the shared specs by tools/build.mjs (resource /flights/aircraft.json). */
public final class AircraftSpec {
	public String id;
	public String group;
	public float scale;
	public float width;
	public float height;
	public float health;
	public float mass;
	public float camera;
	/** entity-space seat positions (blocks, +z forward) */
	public List<double[]> seats;
	/** hitting something faster than this (blocks/tick) damages the aircraft */
	public double crash;
	public Flight.Params flight;

	public boolean isBalloon() {
		return "balloon".equals(flight.kind);
	}

	public boolean isHeli() {
		return "heli".equals(flight.kind);
	}

	public static List<AircraftSpec> load() {
		try (var in = AircraftSpec.class.getResourceAsStream("/flights/aircraft.json")) {
			if (in == null) throw new IllegalStateException("missing /flights/aircraft.json - run `npm run build` first");
			return new Gson().fromJson(new InputStreamReader(in, StandardCharsets.UTF_8), new TypeToken<List<AircraftSpec>>() {}.getType());
		} catch (java.io.IOException e) {
			throw new RuntimeException(e);
		}
	}
}
