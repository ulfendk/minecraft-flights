package dk.ulfen.flights.aircraft;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import dk.ulfen.flights.ModRegistry;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.LivingEntity;

/**
 * Opens the parachute for anyone carrying one who falls more than a few blocks with a long
 * way still to go (say, after bailing out of an aircraft): after a moment by itself, or at
 * once when they jump. Without one, they are told they should have brought one.
 */
public final class Parachutes {
	private static final class Fall {
		int ticks;
		boolean warned;
		boolean jumpWas = true;
	}

	private static final Map<UUID, Fall> FALLING = new HashMap<>();

	private Parachutes() {}

	public static boolean carries(LivingEntity e) {
		if (e instanceof ServerPlayer p) return p.getInventory().contains(s -> s.is(ModRegistry.PARACHUTE_ITEM));
		return false;
	}

	/** Air below an entity, up to `max` blocks. */
	public static int drop(ServerLevel level, LivingEntity e, int max) {
		BlockPos at = e.blockPosition();
		int d = 0;
		while (d < max && level.getBlockState(at.below(d + 1)).getCollisionShape(level, at.below(d + 1)).isEmpty() && level.getFluidState(at.below(d + 1)).isEmpty()) d++;
		return d;
	}

	public static boolean hasChute(ServerLevel level, LivingEntity e) {
		return !level.getEntitiesOfClass(ParachuteEntity.class, e.getBoundingBox().inflate(3), c -> e.getUUID().equals(c.owner())).isEmpty();
	}

	public static void tick(ServerPlayer player) {
		if (!(player.level() instanceof ServerLevel level)) return;
		boolean free = !player.onGround() && !player.isPassenger() && !player.isInWater() && !player.getAbilities().flying
			&& !player.isFallFlying() && !player.isSpectator() && player.fallDistance > 0.5;
		if (!free) {
			FALLING.remove(player.getUUID());
			return;
		}
		Fall f = FALLING.computeIfAbsent(player.getUUID(), k -> new Fall());
		f.ticks++;
		boolean jump = player.getLastClientInput().jump();
		boolean jumped = jump && !f.jumpWas;
		f.jumpWas = jump;
		if (player.fallDistance < Flight.PARACHUTE_MIN_FALL || drop(level, player, 12) < 6 || hasChute(level, player)) return;
		if (!carries(player)) {
			if (!f.warned && player.fallDistance > 10) {
				f.warned = true;
				player.sendOverlayMessage(Component.translatable("flights.parachute.none"));
			}
			return;
		}
		if (!f.warned) {
			f.warned = true;
			player.sendOverlayMessage(Component.translatable("flights.parachute.hint"));
		}
		if (jumped || f.ticks > 12) {
			ParachuteEntity.deploy(level, player);
			FALLING.remove(player.getUUID());
		}
	}
}
