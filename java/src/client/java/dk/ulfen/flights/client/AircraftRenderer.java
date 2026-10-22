package dk.ulfen.flights.client;

import com.geckolib.model.DefaultedEntityGeoModel;
import com.geckolib.renderer.GeoEntityRenderer;
import com.geckolib.renderer.base.GeoRenderState;
import dk.ulfen.flights.ModRegistry;
import dk.ulfen.flights.aircraft.AircraftEntity;
import dk.ulfen.flights.aircraft.AircraftSpec;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.state.LivingEntityRenderState;
import net.minecraft.client.renderer.rendertype.RenderType;
import net.minecraft.client.renderer.rendertype.RenderTypes;
import net.minecraft.resources.Identifier;
import org.jspecify.annotations.Nullable;

/** GeckoLib renderer for the aircraft, scaled like the Bedrock version, with see-through glass. */
public class AircraftRenderer<R extends LivingEntityRenderState & GeoRenderState> extends GeoEntityRenderer<AircraftEntity, R> {
	public AircraftRenderer(EntityRendererProvider.Context ctx, AircraftSpec spec) {
		super(ctx, new DefaultedEntityGeoModel<>(ModRegistry.id(spec.id)));
		this.withScale(spec.scale);
		this.shadowRadius = spec.width * 0.45F;
	}

	@Override
	public @Nullable RenderType getRenderType(R renderState, Identifier texture) {
		// glass texels are half transparent; cutout would draw them solid
		if (!renderState.isInvisible) return RenderTypes.entityTranslucent(texture);
		return super.getRenderType(renderState, texture);
	}

	/** Wings, rotors and envelopes reach far outside the hitbox: keep drawing them. */
	@Override
	protected boolean affectedByCulling(AircraftEntity entity) {
		return false;
	}
}
