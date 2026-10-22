package dk.ulfen.flights.client;

import com.geckolib.model.DefaultedEntityGeoModel;
import com.geckolib.renderer.GeoEntityRenderer;
import dk.ulfen.flights.ModRegistry;
import net.fabricmc.api.ClientModInitializer;
import net.minecraft.client.renderer.entity.EntityRenderers;

public class FlightsClient implements ClientModInitializer {
	@Override
	public void onInitializeClient() {
		FlightsMolang.register();
		for (var spec : ModRegistry.SPECS) EntityRenderers.register(ModRegistry.type(spec.id), ctx -> new AircraftRenderer<>(ctx, spec));
		EntityRenderers.register(ModRegistry.PARACHUTE, ctx -> new GeoEntityRenderer<>(ctx, new DefaultedEntityGeoModel<>(ModRegistry.id("parachute"))));
		AircraftKeys.register();
		AircraftHud.register();
	}
}
