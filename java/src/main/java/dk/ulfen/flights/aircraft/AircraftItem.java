package dk.ulfen.flights.aircraft;

import dk.ulfen.flights.ModRegistry;
import net.minecraft.core.Direction;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.EntitySpawnReason;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.context.UseOnContext;

/** Places an aircraft on the clicked block, facing the same way as the player. */
public class AircraftItem extends Item {
	private final String id;

	public AircraftItem(Item.Properties props, String id) {
		super(props);
		this.id = id;
	}

	@Override
	public InteractionResult useOn(UseOnContext ctx) {
		if (ctx.getClickedFace() == Direction.DOWN) return InteractionResult.FAIL;
		if (!(ctx.getLevel() instanceof ServerLevel level)) return InteractionResult.SUCCESS;
		var pos = ctx.getClickedPos().relative(ctx.getClickedFace());
		AircraftEntity a = ModRegistry.type(id).create(level, EntitySpawnReason.SPAWN_ITEM_USE);
		if (a == null) return InteractionResult.FAIL;
		float yaw = ctx.getPlayer() != null ? ctx.getPlayer().getYRot() : ctx.getRotation();
		a.snapTo(pos.getX() + 0.5, pos.getY(), pos.getZ() + 0.5, yaw, 0);
		a.setYBodyRot(yaw);
		a.setYHeadRot(yaw);
		a.setFlight(Flight.State.initial(yaw));
		if (!level.noCollision(a, a.getBoundingBox())) {
			if (ctx.getPlayer() != null) ctx.getPlayer().sendOverlayMessage(Component.translatable("flights.no_room"));
			return InteractionResult.FAIL;
		}
		level.addFreshEntity(a);
		level.playSound(null, pos, SoundEvents.ARMOR_EQUIP_IRON.value(), a.getSoundSource(), 0.8F, 1.0F);
		ctx.getItemInHand().consume(1, ctx.getPlayer());
		return InteractionResult.SUCCESS_SERVER;
	}
}
