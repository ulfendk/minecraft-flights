package dk.ulfen.flights.mixin;

import dk.ulfen.flights.aircraft.AircraftEntity;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.world.entity.player.Player;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Hunting from the hot-air balloon (with the Realistic Hunting mod): its scoped rifles use
 * sneak to zoom and hold your breath, so while you hold a hunting weapon in the basket,
 * sneaking doesn't get you out. Put it away to climb out.
 */
@Mixin(Player.class)
abstract class PlayerMixin {
	@Inject(method = "wantsToStopRiding", at = @At("HEAD"), cancellable = true)
	private void flights$keepHunterInBasket(CallbackInfoReturnable<Boolean> cir) {
		Player self = (Player) (Object) this;
		if (self.getVehicle() instanceof AircraftEntity a && a.spec.isBalloon() && isHuntingWeapon(self)) cir.setReturnValue(false);
	}

	private static boolean isHuntingWeapon(Player player) {
		var id = BuiltInRegistries.ITEM.getKey(player.getMainHandItem().getItem());
		if (!"hunting".equals(id.getNamespace())) return false;
		String p = id.getPath();
		return p.startsWith("rifle_") || p.equals("shotgun") || p.equals("compound_bow") || p.equals("binoculars");
	}
}
