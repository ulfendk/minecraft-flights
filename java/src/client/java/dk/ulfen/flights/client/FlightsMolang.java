package dk.ulfen.flights.client;

import com.geckolib.loading.math.MolangQueries;
import dk.ulfen.flights.aircraft.AircraftEntity;
import net.minecraft.util.Mth;

/** The animation variables the generated aircraft animations read (see src/lib/anim.mjs). */
public final class FlightsMolang {
	private FlightsMolang() {}

	public static void register() {
		MolangQueries.<Object>setActorVariable("variable.f_pitch", a -> a.animatable() instanceof AircraftEntity m ? Mth.lerp(a.partialTick(), m.prevPitch, m.pitch()) : 0);
		MolangQueries.<Object>setActorVariable("variable.f_roll", a -> a.animatable() instanceof AircraftEntity m ? Mth.lerp(a.partialTick(), m.prevRoll, m.roll()) : 0);
		MolangQueries.<Object>setActorVariable("variable.f_spin", a -> a.animatable() instanceof AircraftEntity m ? Mth.lerp(a.partialTick(), m.prevSpin, m.spin) : 0);
		MolangQueries.<Object>setActorVariable("variable.f_rotor", a -> a.animatable() instanceof AircraftEntity m ? m.rotorShown : 0);
		MolangQueries.<Object>setActorVariable("variable.f_throttle", a -> a.animatable() instanceof AircraftEntity m ? m.throttle() : 0);
		MolangQueries.<Object>setActorVariable("variable.f_burner", a -> a.animatable() instanceof AircraftEntity m && m.burner() ? 1 : 0);
		MolangQueries.<Object>setActorVariable("variable.f_anchored", a -> a.animatable() instanceof AircraftEntity m && m.anchored() ? 1 : 0);
		MolangQueries.<Object>setActorVariable("variable.f_time", a -> (a.animatable() instanceof net.minecraft.world.entity.Entity e ? e.tickCount + a.partialTick() : 0) / 20.0);
	}
}
