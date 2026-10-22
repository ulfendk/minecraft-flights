package dk.ulfen.flights;

import dk.ulfen.flights.aircraft.HandbookItem;
import dk.ulfen.flights.aircraft.Parachutes;
import dk.ulfen.flights.net.ControlPayload;
import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.fabricmc.fabric.api.networking.v1.ServerPlayConnectionEvents;

public class Flights implements ModInitializer {
	public static final String MOD_ID = "flights";

	@Override
	public void onInitialize() {
		ModRegistry.register();
		ControlPayload.register();
		// Everyone gets a Pilot's Handbook the first time they join.
		ServerPlayConnectionEvents.JOIN.register((handler, sender, server) -> HandbookItem.giveOnce(handler.getPlayer()));
		// Falling players with a parachute get it opened.
		ServerTickEvents.END_SERVER_TICK.register(server -> server.getPlayerList().getPlayers().forEach(Parachutes::tick));
	}
}
