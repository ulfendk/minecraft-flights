package dk.ulfen.flights.aircraft;

/**
 * The flight model: a line-for-line copy of src/lib/flight.mjs, which the Bedrock scripts run.
 * FlightGameTests.flightMatchesJs checks that both give the same numbers. One step is one tick;
 * speeds are blocks per tick, angles degrees. Minecraft's yaw: 0 faces south (+z), 90 west (-x).
 * Pitch is the aircraft's nose (positive = up); roll positive = right wing down.
 */
public final class Flight {
	public static final double G = 0.04;
	/** Parachutes: a steady sink, steerable at walking pace. */
	public static final double PARACHUTE_SINK = 0.12;
	public static final double PARACHUTE_MIN_FALL = 4;

	private static final double D = Math.PI / 180;

	private Flight() {}

	/** The flight block of an aircraft (aircraft.json, with every default filled in by the build). */
	public static final class Params {
		public String kind = "wing";
		public double thrust, maxSpeed, trim, glide, stall = 1, stallSink = 0.5, maxPitch = 20, maxBank = 30;
		public double turn = 3, ceiling = 320, pitchRate = 2.5, rollRate = 3, taxiTurn = 3, brake = 0.04, run;
		public int winch;
		public boolean fixedPitch;
		/** on floats: water counts as ground */
		public boolean floats;
		public double liftFactor = 1, windFactor, climb, sink, cool, accel;
	}

	public static final class State {
		public double vx, vy, vz, speed, yaw, pitch, roll, throttle, rotor, heat;
		public boolean holding;
		public double holdY;
		public boolean anchored = true, burner;
		public int launch;
		public boolean jumpWas;
		public double impact;

		public static State initial(double yaw) {
			State s = new State();
			s.yaw = yaw;
			return s;
		}

		public State copy() {
			State n = new State();
			n.vx = vx; n.vy = vy; n.vz = vz; n.speed = speed; n.yaw = yaw; n.pitch = pitch; n.roll = roll;
			n.throttle = throttle; n.rotor = rotor; n.heat = heat; n.holding = holding; n.holdY = holdY;
			n.anchored = anchored; n.burner = burner; n.launch = launch; n.jumpWas = jumpWas; n.impact = impact;
			return n;
		}
	}

	/** fwd/side -1..1 (W/S, A = +1); look = the pilot's pitch (+ = down), lookYaw = their yaw. */
	public record Input(boolean pilot, double fwd, double side, boolean jump, boolean down, double look, double lookYaw) {
		public static final Input NONE = new Input(false, 0, 0, false, false, 0, 0);
	}

	/** lift = rising air (blocks/tick); hit = ran into something last tick. */
	public record Env(boolean onGround, double y, double time, double lift, boolean hit) {}

	public record Wind(double x, double z, double speed) {}

	private static double clamp(double v, double lo, double hi) {
		return Math.max(lo, Math.min(hi, v));
	}

	private static double approach(double v, double target, double rate) {
		return v + clamp(target - v, -rate, rate);
	}

	public static double wrap(double a) {
		return ((((a + 180) % 360) + 360) % 360) - 180;
	}

	private static double round(double n) {
		return Math.round(n * 1e9) / 1e9;
	}

	/** The wind at height y, time t (ticks); its direction turns with height. */
	public static Wind wind(double y, double t) {
		double dir = t / 6000 + y / 18 + StrictMath.sin(y / 23) * 1.4;
		double speed = 0.07 + 0.035 * StrictMath.sin(y / 17 + t / 2400);
		return new Wind(-StrictMath.sin(dir) * speed, StrictMath.cos(dir) * speed, speed);
	}

	public static double liftFraction(double speed, double stall) {
		double r = speed / stall;
		return clamp(r * r, 0, 1);
	}

	public static State step(State s, Input input, Params f, Env env) {
		State n = s.copy();
		n.impact = 0;
		Input inp = input.pilot() ? input : Input.NONE;
		boolean jumpPressed = inp.jump() && !s.jumpWas;
		n.jumpWas = inp.jump();
		if ("heli".equals(f.kind)) heli(n, inp, f, env);
		else if ("balloon".equals(f.kind)) balloon(n, inp, f, env, jumpPressed);
		else wing(n, inp, f, env, jumpPressed);
		n.vx = round(n.vx); n.vy = round(n.vy); n.vz = round(n.vz); n.speed = round(n.speed); n.yaw = round(n.yaw);
		n.pitch = round(n.pitch); n.roll = round(n.roll); n.throttle = round(n.throttle); n.rotor = round(n.rotor);
		n.heat = round(n.heat); n.impact = round(n.impact); n.holdY = round(n.holdY);
		return n;
	}

	private static void wing(State n, Input inp, Params f, Env env, boolean jumpPressed) {
		boolean powered = f.thrust > 0;
		if (powered) n.throttle = clamp(n.throttle + (inp.pilot() ? inp.fwd() * 0.02 : -0.02), 0, 1);
		double cd = powered ? f.thrust / (f.maxSpeed * f.maxSpeed) : (G * StrictMath.sin(StrictMath.atan(1 / f.glide))) / (f.trim * f.trim);
		double trimPitch = powered ? 0 : -StrictMath.atan(1 / f.glide) / D;
		double ceiling = clamp((f.ceiling - env.y()) / 32, 0, 1);

		if (f.winch > 0 && jumpPressed && env.onGround() && n.speed < f.stall) n.launch = f.winch;
		boolean launching = n.launch > 0;
		if (launching) n.launch--;

		double pitchTarget = trimPitch;
		if (f.fixedPitch) pitchTarget = trimPitch + (inp.fwd() > 0 ? -3 : inp.fwd() < 0 ? 4 : 0);
		else if (inp.pilot()) {
			double look = inp.look() - 5;
			pitchTarget = trimPitch - Math.signum(look) * Math.max(0, Math.abs(look) - 6);
		}
		pitchTarget = clamp(pitchTarget, -f.maxPitch, f.maxPitch);
		double lf = liftFraction(n.speed, f.stall);
		pitchTarget -= (1 - lf) * (f.stallSink > 0.3 ? 20 : 4);
		if (launching) pitchTarget = 30;
		if (env.onGround()) pitchTarget = n.speed >= f.stall ? Math.max(0, pitchTarget) : 0;
		n.pitch = approach(n.pitch, pitchTarget, f.pitchRate);

		double sinP = StrictMath.sin(n.pitch * D);
		double accel = (powered ? f.thrust * n.throttle * ceiling : 0) - cd * n.speed * n.speed;
		if (!env.onGround()) accel -= G * sinP;
		if (env.onGround()) {
			double brake = inp.fwd() < 0 && n.throttle == 0 ? f.brake : 0;
			double run = f.run > 0 && inp.fwd() > 0 && n.speed < f.run ? 0.02 : 0;
			accel += run - (n.speed > 0 ? Math.min(n.speed, 0.004 + brake) : 0);
		}
		if (launching) accel = Math.max(accel, (f.trim * 1.5 - n.speed) * 0.1);
		n.speed = Math.max(0, n.speed + accel);
		if (env.hit()) {
			n.impact = n.speed;
			n.speed *= 0.2;
		}

		double lf2 = liftFraction(n.speed, f.stall);
		double vyTarget = lf2 * n.speed * StrictMath.sin(n.pitch * D) - (1 - lf2) * f.stallSink + env.lift() * f.liftFactor;
		if (launching) vyTarget = Math.max(vyTarget, 0.5);
		boolean wasAir = !env.onGround();
		n.vy = approach(n.vy, vyTarget, 0.06);
		if (env.onGround() && n.vy < 0) {
			if (n.vy < -0.3) n.impact = Math.max(n.impact, -n.vy);
			n.vy = 0;
		}
		if (wasAir && env.onGround()) n.vy = Math.max(0, n.vy);

		double side = inp.side();
		if (side == 0 && inp.pilot()) {
			double d = wrap(inp.lookYaw() - n.yaw);
			side = Math.abs(d) > 6 ? -clamp(d / 40, -1, 1) : 0;
		}
		if (env.onGround()) {
			n.roll = approach(n.roll, 0, 3);
			n.yaw = wrap(n.yaw - side * f.taxiTurn * clamp(n.speed / 0.15, 0, 1));
		} else {
			n.roll = approach(n.roll, -side * f.maxBank, f.rollRate);
			n.yaw = wrap(n.yaw + (n.roll / f.maxBank) * f.turn * Math.max(0.3, lf2));
		}
		double yaw = n.yaw * D;
		double h = n.speed * StrictMath.cos(n.pitch * D);
		Wind w = f.windFactor > 0 ? wind(env.y(), env.time()) : new Wind(0, 0, 0);
		n.vx = -StrictMath.sin(yaw) * h + w.x() * f.windFactor * (env.onGround() ? 0 : 1);
		n.vz = StrictMath.cos(yaw) * h + w.z() * f.windFactor * (env.onGround() ? 0 : 1);
		n.rotor = powered ? n.throttle : clamp(n.speed / f.stall, 0, 1);
	}

	private static void heli(State n, Input inp, Params f, Env env) {
		n.rotor = clamp(n.rotor + (inp.pilot() ? 0.01 : -0.003), 0, 1);
		n.throttle = n.rotor;
		boolean lift = n.rotor >= 0.6;
		double yaw0 = n.yaw * D;
		double fx = -StrictMath.sin(yaw0), fz = StrictMath.cos(yaw0);
		double lx = StrictMath.cos(yaw0), lz = StrictMath.sin(yaw0);
		double fwd = lift ? inp.fwd() * (inp.fwd() > 0 ? 1 : 0.4) * f.maxSpeed : 0;
		double side = lift ? inp.side() * f.maxSpeed * 0.35 : 0;
		double tx = fx * fwd + lx * side, tz = fz * fwd + lz * side;
		double vyTarget = -f.stallSink * (1 - n.rotor);
		if (lift) {
			vyTarget = 0;
			if (inp.fwd() > 0) {
				double look = inp.look();
				vyTarget = -Math.signum(look) * Math.max(0, Math.abs(look) - 12) * D * f.maxSpeed * 0.8;
			}
			if (inp.jump()) vyTarget = f.climb;
			else if (inp.down()) vyTarget = -f.climb;
			vyTarget = clamp(vyTarget, -f.climb, f.climb);
			if (env.y() > f.ceiling) vyTarget = Math.min(vyTarget, 0);
		}
		vyTarget += env.lift() * 0.2;
		double rate = env.onGround() ? 0.08 : f.accel;
		n.vx = approach(n.vx, env.onGround() && !lift ? 0 : tx, rate);
		n.vz = approach(n.vz, env.onGround() && !lift ? 0 : tz, rate);
		n.vy = approach(n.vy, vyTarget, 0.04);
		if (env.onGround() && n.vy < 0) {
			if (n.vy < -0.3) n.impact = -n.vy;
			n.vy = 0;
		}
		if (env.hit()) {
			n.impact = Math.max(n.impact, Math.hypot(n.vx, n.vz));
			n.vx *= 0.2;
			n.vz *= 0.2;
		}
		double turn = inp.pilot() && lift ? clamp(wrap(inp.lookYaw() - n.yaw), -f.turn, f.turn) : 0;
		n.yaw = wrap(n.yaw + turn);
		n.speed = Math.hypot(n.vx, n.vz);
		double along = n.vx * fx + n.vz * fz, across = n.vx * lx + n.vz * lz;
		n.pitch = approach(n.pitch, env.onGround() ? 0 : (-along / f.maxSpeed) * 14, 1.5);
		n.roll = approach(n.roll, env.onGround() ? 0 : (-across / f.maxSpeed) * 30 + turn * 3, 2);
	}

	private static void balloon(State n, Input inp, Params f, Env env, boolean jumpPressed) {
		if (env.onGround()) n.anchored = true;
		else if (jumpPressed) n.anchored = !n.anchored;
		double vyTarget;
		if (!inp.pilot()) {
			vyTarget = -f.cool;
			n.holding = false;
		} else if (inp.fwd() > 0) {
			vyTarget = f.climb;
			n.holding = false;
		} else if (inp.fwd() < 0) {
			vyTarget = -f.sink;
			n.holding = false;
		} else {
			if (!n.holding) {
				n.holding = true;
				n.holdY = env.y();
			}
			vyTarget = env.onGround() ? 0 : clamp((n.holdY - env.y()) * 0.05, -0.05, 0.05);
		}
		if (env.y() > f.ceiling) vyTarget = Math.min(vyTarget, -0.02);
		vyTarget += env.lift() * 0.3;
		n.burner = inp.pilot() && vyTarget > 0.005;
		n.heat = approach(n.heat, n.burner ? 1 : inp.pilot() ? 0.5 : 0, 0.02);
		if (env.onGround() && inp.pilot() && inp.fwd() > 0) n.anchored = false;
		n.vy = approach(n.vy, vyTarget, 0.01);
		if (env.onGround() && n.vy < 0) {
			if (n.vy < -0.3) n.impact = -n.vy;
			n.vy = 0;
		}
		Wind w = wind(env.y(), env.time());
		boolean still = n.anchored || env.onGround();
		n.vx = approach(n.vx, still ? 0 : w.x(), 0.004);
		n.vz = approach(n.vz, still ? 0 : w.z(), 0.004);
		if (env.hit()) {
			n.vx *= 0.2;
			n.vz *= 0.2;
		}
		n.yaw = wrap(n.yaw - inp.side() * f.turn);
		n.speed = Math.hypot(n.vx, n.vz);
		n.pitch = 0;
		n.roll = 0;
		n.throttle = n.burner ? 1 : 0;
		n.rotor = n.heat;
	}
}
