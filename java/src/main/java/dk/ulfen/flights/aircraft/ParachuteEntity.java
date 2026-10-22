package dk.ulfen.flights.aircraft;

import java.util.UUID;

import com.geckolib.animatable.GeoEntity;
import com.geckolib.animatable.instance.AnimatableInstanceCache;
import com.geckolib.animatable.manager.AnimatableManager;
import com.geckolib.animation.AnimationController;
import com.geckolib.animation.RawAnimation;
import com.geckolib.util.GeckoLibUtil;
import dk.ulfen.flights.ModRegistry;
import net.minecraft.network.chat.Component;
import net.minecraft.network.protocol.game.ClientboundSetEntityMotionPacket;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.util.Mth;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntitySpawnReason;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;
import org.jspecify.annotations.Nullable;

/**
 * The canopy over someone who jumped or bailed out with a parachute. It follows its owner and
 * holds their fall to parachute speed, so they take no fall damage; players steer it with the
 * movement keys. Gone (packed away again) once they land.
 */
public class ParachuteEntity extends Mob implements GeoEntity {
	private final AnimatableInstanceCache geoCache = GeckoLibUtil.createInstanceCache(this);
	private @Nullable UUID owner;

	public ParachuteEntity(EntityType<? extends ParachuteEntity> type, Level level) {
		super(type, level);
		this.setNoGravity(true);
		this.noPhysics = true;
	}

	public static AttributeSupplier.Builder createAttributes() {
		return Mob.createMobAttributes().add(Attributes.MAX_HEALTH, 1).add(Attributes.MOVEMENT_SPEED, 0);
	}

	/** Opens a parachute over `entity`. */
	public static @Nullable ParachuteEntity deploy(ServerLevel level, LivingEntity entity) {
		ParachuteEntity chute = ModRegistry.PARACHUTE.create(level, EntitySpawnReason.EVENT);
		if (chute == null) return null;
		chute.owner = entity.getUUID();
		chute.snapTo(entity.getX(), entity.getY(), entity.getZ(), entity.getYRot(), 0);
		level.addFreshEntity(chute);
		entity.resetFallDistance();
		level.playSound(null, entity.getX(), entity.getY(), entity.getZ(), SoundEvents.ARMOR_EQUIP_LEATHER.value(), SoundSource.PLAYERS, 1F, 0.8F);
		return chute;
	}

	public @Nullable UUID owner() {
		return owner;
	}

	@Override
	public void tick() {
		super.tick();
		if (!(this.level() instanceof ServerLevel level)) return;
		Entity e = owner == null ? null : level.getEntity(owner);
		if (!(e instanceof LivingEntity who) || !who.isAlive() || who.isPassenger() || who.onGround() || who.isInWater() || this.tickCount > 20 * 300) {
			if (e instanceof ServerPlayer sp && sp.isAlive()) sp.sendOverlayMessage(Component.translatable("flights.parachute.packed"));
			if (e != null) level.playSound(null, e.getX(), e.getY(), e.getZ(), SoundEvents.ARMOR_EQUIP_LEATHER.value(), SoundSource.PLAYERS, 0.8F, 1.2F);
			this.discard();
			return;
		}
		this.snapTo(who.getX(), who.getY(), who.getZ(), who.getYRot(), 0);
		this.yBodyRot = this.yHeadRot = who.getYRot();
		// Hold the fall to parachute speed and steer with the movement keys; slow falling keeps
		// the client's prediction close.
		who.resetFallDistance();
		who.addEffect(new MobEffectInstance(MobEffects.SLOW_FALLING, 40, 0, false, false));
		Vec3 v = who.getDeltaMovement();
		double hx = v.x, hz = v.z;
		if (who instanceof ServerPlayer sp) {
			var in = sp.getLastClientInput();
			double fwd = (in.forward() ? 1 : 0) - (in.backward() ? 1 : 0), left = (in.left() ? 1 : 0) - (in.right() ? 1 : 0);
			double a = sp.getYRot() * Mth.DEG_TO_RAD;
			hx = (-Math.sin(a) * fwd + Math.cos(a) * left) * 0.12;
			hz = (Math.cos(a) * fwd + Math.sin(a) * left) * 0.12;
		}
		who.setDeltaMovement(hx, -Flight.PARACHUTE_SINK, hz);
		who.needsSync = true;
		if (who instanceof ServerPlayer sp && this.tickCount % 2 == 0) sp.connection.send(new ClientboundSetEntityMotionPacket(sp));
	}

	@Override
	public void travel(Vec3 input) {
	}

	@Override
	public boolean hurtServer(ServerLevel level, DamageSource source, float amount) {
		return false;
	}

	@Override
	public boolean isPickable() {
		return false;
	}

	@Override
	public boolean isPushable() {
		return false;
	}

	@Override
	public boolean canBeCollidedWith(@Nullable Entity other) {
		return false;
	}

	@Override
	protected void registerGoals() {
	}

	@Override
	public boolean causeFallDamage(double fallDistance, float damageModifier, DamageSource damageSource) {
		return false;
	}

	@Override
	protected boolean shouldDropLoot(ServerLevel level) {
		return false;
	}

	@Override
	public boolean canBeLeashed() {
		return false;
	}

	@Override
	public void registerControllers(AnimatableManager.ControllerRegistrar controllers) {
		RawAnimation move = RawAnimation.begin().thenLoop("animation.flights.parachute.move");
		controllers.add(new AnimationController<>("move", 0, state -> state.setAndContinue(move)));
	}

	@Override
	public AnimatableInstanceCache getAnimatableInstanceCache() {
		return geoCache;
	}
}
