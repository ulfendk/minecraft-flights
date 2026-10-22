package dk.ulfen.flights.net;

import dk.ulfen.flights.aircraft.AircraftEntity;
import net.fabricmc.fabric.api.networking.v1.PayloadTypeRegistry;
import net.fabricmc.fabric.api.networking.v1.ServerPlayNetworking;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import dk.ulfen.flights.ModRegistry;

/**
 * The one control vanilla doesn't send: the helicopter's descend key, sent while it is held.
 * (Movement keys, jump and look reach the server with the normal player packets.)
 */
public record ControlPayload(int entityId, boolean down) implements CustomPacketPayload {
	public static final Type<ControlPayload> TYPE = new Type<>(ModRegistry.id("control"));
	public static final StreamCodec<RegistryFriendlyByteBuf, ControlPayload> CODEC = StreamCodec.composite(
		ByteBufCodecs.VAR_INT, ControlPayload::entityId,
		ByteBufCodecs.BOOL, ControlPayload::down,
		ControlPayload::new);

	@Override
	public Type<? extends CustomPacketPayload> type() {
		return TYPE;
	}

	public static void register() {
		PayloadTypeRegistry.serverboundPlay().register(TYPE, CODEC);
		ServerPlayNetworking.registerGlobalReceiver(TYPE, (payload, ctx) -> {
			var player = ctx.player();
			// Only the pilot (seat 0) flies it.
			if (player.level().getEntity(payload.entityId()) instanceof AircraftEntity a && a.pilot() == player) a.setDown(payload.down());
		});
	}
}
