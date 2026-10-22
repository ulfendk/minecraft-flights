package dk.ulfen.flights.client;

import dk.ulfen.flights.ModRegistry;
import dk.ulfen.flights.aircraft.AircraftEntity;
import dk.ulfen.flights.aircraft.Flight;
import net.fabricmc.fabric.api.client.rendering.v1.hud.HudElementRegistry;
import net.fabricmc.fabric.api.client.rendering.v1.hud.VanillaHudElements;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.network.chat.Component;

/** A small panel in the corner with the instruments of the aircraft you fly, and its controls. */
public final class AircraftHud {
	public static boolean visible = true;
	private static final String[] COMPASS = {"S", "SW", "W", "NW", "N", "NE", "E", "SE"};

	private AircraftHud() {}

	public static void register() {
		HudElementRegistry.attachElementAfter(VanillaHudElements.HOTBAR, ModRegistry.id("instruments"), (g, delta) -> draw(g));
		// Aircraft are not animals: no hearts for them above the hotbar.
		HudElementRegistry.replaceElement(VanillaHudElements.MOUNT_HEALTH, vanilla -> (g, delta) -> {
			if (!(Minecraft.getInstance().player != null && Minecraft.getInstance().player.getVehicle() instanceof AircraftEntity)) vanilla.extractRenderState(g, delta);
		});
	}

	private static void draw(GuiGraphicsExtractor g) {
		Minecraft mc = Minecraft.getInstance();
		AircraftEntity a = AircraftKeys.piloting(mc);
		if (a == null || mc.gui.hud.isHidden()) return;
		Font font = mc.font;
		int x = 6, y = 6, line = 11;
		double dx = a.getX() - a.xo, dy = a.getY() - a.yo, dz = a.getZ() - a.zo;
		String kmh = String.valueOf(Math.round(Math.sqrt(dx * dx + dz * dz) * 72));
		String alt = String.valueOf(Math.round(a.getY()));
		String climb = String.format("%.1f", dy * 20);
		Component main;
		if (a.spec.isBalloon()) {
			Flight.Wind w = Flight.wind(a.getY(), a.level().getGameTime());
			double yaw = Math.toDegrees(Math.atan2(-w.x(), w.z()));
			String dir = COMPASS[(int) Math.round(((yaw + 360) % 360) / 45) % 8];
			main = Component.translatable("flights.hud.balloon", String.valueOf(Math.round(w.speed() * 72)), alt, climb, dir);
			if (a.anchored()) main = main.copy().append(" ").append(Component.translatable("flights.hud.anchored"));
			if (a.burner()) main = main.copy().append(" ").append(Component.translatable("flights.hud.burner"));
		} else if (a.spec.isHeli()) {
			main = Component.translatable("flights.hud.heli", kmh, alt, climb, Math.round(a.rotor() * 100) + "%");
		} else if (a.spec.flight.thrust > 0) {
			main = Component.translatable("flights.hud", kmh, alt, climb, Math.round(a.throttle() * 100) + "%");
		} else {
			main = Component.translatable("flights.hud.glider", kmh, alt, climb);
		}
		boolean stalled = "wing".equals(a.spec.flight.kind) && a.spec.flight.stallSink >= 0.3 && !a.onGround()
			&& Math.sqrt(dx * dx + dz * dz) < a.spec.flight.stall * 0.9 && dy < -0.1;
		Component name = Component.translatable("entity.flights." + a.spec.id);
		Component controls = Component.translatable("flights.controls.java." + a.spec.id);
		int width = Math.max(font.width(main), font.width(name)) + (stalled ? 40 : 0);
		var lines = visible ? font.split(controls, 260) : java.util.List.<net.minecraft.util.FormattedCharSequence>of();
		for (var l : lines) width = Math.max(width, font.width(l));
		g.fill(x - 3, y - 3, x + width + 4, y + (2 + lines.size()) * line + 1, 0x88000000);
		g.text(font, name, x, y, 0xFF7FC8F8, true);
		if (stalled) g.text(font, Component.translatable("flights.hud.stall"), x + font.width(name) + 8, y, 0xFFFF5555, true);
		y += line;
		g.text(font, main, x, y, 0xFFFFFFFF, true);
		y += line;
		for (var l : lines) {
			g.text(font, l, x, y, 0xFFCCCCCC, true);
			y += line;
		}
	}
}
