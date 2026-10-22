package dk.ulfen.flights.client;

import com.mojang.blaze3d.platform.InputConstants;
import dk.ulfen.flights.ModRegistry;
import dk.ulfen.flights.aircraft.AircraftEntity;
import dk.ulfen.flights.net.ControlPayload;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keymapping.v1.KeyMappingHelper;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayNetworking;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import org.jspecify.annotations.Nullable;

/**
 * The keys vanilla doesn't have: V makes the helicopter descend, H shows or hides the flight
 * panel. Everything else is W/A/S/D, jump and the mouse. Both can be rebound.
 */
public final class AircraftKeys {
	public static final KeyMapping.Category CATEGORY = KeyMapping.Category.register(ModRegistry.id("flights"));
	public static KeyMapping DOWN;
	public static KeyMapping HUD;

	private static boolean lastDown;
	private static int quiet;

	private AircraftKeys() {}

	public static void register() {
		DOWN = KeyMappingHelper.registerKeyMapping(new KeyMapping("key.flights.down", InputConstants.KEY_V, CATEGORY));
		HUD = KeyMappingHelper.registerKeyMapping(new KeyMapping("key.flights.hud", InputConstants.KEY_H, CATEGORY));
		ClientTickEvents.END_CLIENT_TICK.register(AircraftKeys::tick);
	}

	/** The aircraft the local player flies (seat 0), if any. */
	public static @Nullable AircraftEntity piloting(Minecraft mc) {
		if (mc.player != null && mc.player.getVehicle() instanceof AircraftEntity a && a.pilot() == mc.player) return a;
		return null;
	}

	private static void tick(Minecraft mc) {
		while (HUD.consumeClick()) AircraftHud.visible = !AircraftHud.visible;
		AircraftEntity a = piloting(mc);
		if (a == null || !a.spec.isHeli()) {
			lastDown = false;
			return;
		}
		boolean down = DOWN.isDown();
		// Send while held (the server lets go when packets stop coming).
		if (down || down != lastDown || ++quiet > 20) {
			quiet = 0;
			lastDown = down;
			ClientPlayNetworking.send(new ControlPayload(a.getId(), down));
		}
	}
}
