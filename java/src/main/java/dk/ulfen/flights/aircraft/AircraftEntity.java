package dk.ulfen.flights.aircraft;

import com.geckolib.animatable.GeoEntity;
import com.geckolib.animatable.instance.AnimatableInstanceCache;
import com.geckolib.animatable.manager.AnimatableManager;
import com.geckolib.animation.AnimationController;
import com.geckolib.animation.RawAnimation;
import com.geckolib.util.GeckoLibUtil;
import com.google.gson.Gson;
import dk.ulfen.flights.ModRegistry;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.network.syncher.EntityDataAccessor;
import net.minecraft.network.syncher.EntityDataSerializers;
import net.minecraft.network.syncher.SynchedEntityData;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.tags.BlockTags;
import net.minecraft.tags.DamageTypeTags;
import net.minecraft.util.Mth;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.damagesource.DamageTypes;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityDimensions;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.MoverType;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.storage.ValueInput;
import net.minecraft.world.level.storage.ValueOutput;
import net.minecraft.world.phys.Vec3;
import org.jspecify.annotations.Nullable;

/**
 * An aircraft. The server flies it every tick with {@link Flight} (the same model the Bedrock
 * add-on runs), from the pilot's movement keys, jump and look, which the server already knows;
 * clients only draw it where the server says. Seat 0 flies, the others are passengers. Sneak
 * gets you out, in the air too (bail out, and carry a parachute). Breaks like a boat when hit.
 */
public class AircraftEntity extends Mob implements GeoEntity {
	private static final EntityDataAccessor<Float> PITCH = SynchedEntityData.defineId(AircraftEntity.class, EntityDataSerializers.FLOAT);
	private static final EntityDataAccessor<Float> ROLL = SynchedEntityData.defineId(AircraftEntity.class, EntityDataSerializers.FLOAT);
	private static final EntityDataAccessor<Float> ROTOR = SynchedEntityData.defineId(AircraftEntity.class, EntityDataSerializers.FLOAT);
	private static final EntityDataAccessor<Float> THROTTLE = SynchedEntityData.defineId(AircraftEntity.class, EntityDataSerializers.FLOAT);
	private static final EntityDataAccessor<Boolean> BURNER = SynchedEntityData.defineId(AircraftEntity.class, EntityDataSerializers.BOOLEAN);
	private static final EntityDataAccessor<Boolean> ANCHORED = SynchedEntityData.defineId(AircraftEntity.class, EntityDataSerializers.BOOLEAN);
	private static final Gson GSON = new Gson();

	public final AircraftSpec spec;
	private final AnimatableInstanceCache geoCache = GeckoLibUtil.createInstanceCache(this);

	// Server: the flight, and input that doesn't come with vanilla's movement packets.
	private Flight.State state;
	private boolean down;
	private int downAge = 100;
	private double lift;
	private boolean asleep;
	private @Nullable Player greeted;
	/** Tests fly an aircraft without a player in it. */
	public Flight.@Nullable Input testInput;

	private float damage;
	private int hurtTicks;

	// Client-side animation state
	public float prevPitch, prevRoll, spin, prevSpin, rotorShown;

	public AircraftEntity(EntityType<? extends AircraftEntity> type, Level level) {
		super(type, level);
		this.spec = ModRegistry.spec(type);
		this.setPersistenceRequired();
		this.setNoGravity(true);
		this.state = Flight.State.initial(0);
	}

	public static AttributeSupplier.Builder createAttributes(AircraftSpec s) {
		return Mob.createMobAttributes()
			.add(Attributes.MAX_HEALTH, s.health)
			.add(Attributes.MOVEMENT_SPEED, 0)
			.add(Attributes.STEP_HEIGHT, 1.0)
			.add(Attributes.KNOCKBACK_RESISTANCE, 1.0)
			.add(Attributes.CAMERA_DISTANCE, s.camera);
	}

	@Override
	protected void defineSynchedData(SynchedEntityData.Builder builder) {
		super.defineSynchedData(builder);
		builder.define(PITCH, 0F);
		builder.define(ROLL, 0F);
		builder.define(ROTOR, 0F);
		builder.define(THROTTLE, 0F);
		builder.define(BURNER, false);
		builder.define(ANCHORED, true);
	}

	public float pitch() { return this.entityData.get(PITCH); }
	public float roll() { return this.entityData.get(ROLL); }
	public float rotor() { return this.entityData.get(ROTOR); }
	public float throttle() { return this.entityData.get(THROTTLE); }
	public boolean burner() { return this.entityData.get(BURNER); }
	public boolean anchored() { return this.entityData.get(ANCHORED); }

	/** The flight state (server). */
	public Flight.State flight() {
		return state;
	}

	/** For tests and saved worlds: put the aircraft into a flight state. */
	public void setFlight(Flight.State s) {
		this.state = s;
		this.asleep = false;
	}

	public @Nullable Player pilot() {
		return this.getFirstPassenger() instanceof Player p ? p : null;
	}

	/** The helicopter's descend key (from the pilot's client). */
	public void setDown(boolean down) {
		this.down = down;
		this.downAge = 0;
	}

	// ------------------------------------------------------------ flying

	@Override
	public void tick() {
		if (this.level().isClientSide()) {
			prevPitch = pitch();
			prevRoll = roll();
			prevSpin = spin;
			rotorShown += (rotor() - rotorShown) * 0.1F;
			spin = (spin + rotorShown * 72F) % 360F;
			if (spin < prevSpin) prevSpin -= 360F;
		}
		super.tick();
		if (hurtTicks > 0) hurtTicks--;
		else if (damage > 0) damage = Math.max(0, damage - 1.0F);
		this.yBodyRot = this.yHeadRot = this.getYRot();
		if (this.level() instanceof ServerLevel level) fly(level);
	}

	/** Vanilla doesn't move it: {@link #fly} does. */
	@Override
	public void travel(Vec3 input) {
	}

	private Flight.Input input(@Nullable Player pilot) {
		if (pilot instanceof ServerPlayer sp) {
			var in = sp.getLastClientInput();
			if (++downAge > 6) down = false;
			return new Flight.Input(true, (in.forward() ? 1 : 0) - (in.backward() ? 1 : 0), (in.left() ? 1 : 0) - (in.right() ? 1 : 0),
				in.jump(), down, sp.getXRot(), sp.getYRot());
		}
		if (pilot != null) return new Flight.Input(true, 0, 0, false, false, pilot.getXRot(), pilot.getYRot());
		return testInput != null ? testInput : Flight.Input.NONE;
	}

	private boolean standing() {
		return !this.level().noCollision(this, this.getBoundingBox().move(0, -0.06, 0));
	}

	private void fly(ServerLevel level) {
		Player pilot = pilot();
		boolean ground = standing();
		Flight.State s0 = state;
		// Parked with nobody aboard: leave it be.
		if (pilot == null && testInput == null && ground && s0.speed < 0.02 && Math.abs(s0.vy) < 0.02 && s0.rotor < 0.02 && s0.heat < 0.02) {
			if (!asleep) {
				asleep = true;
				state = Flight.State.initial(this.getYRot());
				this.setDeltaMovement(Vec3.ZERO);
				sync(state);
			}
			return;
		}
		asleep = false;
		if (this.tickCount % 10 == 0) lift = thermal(level, this.blockPosition());
		Flight.Env env = new Flight.Env(ground, this.getY(), level.getGameTime(), lift, this.horizontalCollision);
		Flight.State s = Flight.step(s0, input(pilot), spec.flight, env);
		state = s;
		Vec3 v = new Vec3(s.vx, s.vy, s.vz);
		this.setDeltaMovement(v);
		this.move(MoverType.SELF, v);
		this.setYRot((float) s.yaw);
		this.yRotO = this.getYRot();
		this.yBodyRot = this.yHeadRot = this.getYRot();
		this.resetFallDistance();
		sync(s);

		if (spec.isBalloon() && s.anchored != s0.anchored && pilot instanceof ServerPlayer sp && !ground) {
			sp.sendOverlayMessage(Component.translatable(s.anchored ? "flights.anchor.down" : "flights.anchor.up"));
			level.playSound(null, this.blockPosition(), s.anchored ? SoundEvents.CHAIN_PLACE : SoundEvents.CHAIN_BREAK, SoundSource.NEUTRAL, 0.8F, 0.8F);
		}
		if (s.burner && this.tickCount % 8 == 0) level.playSound(null, this.blockPosition(), SoundEvents.FIRECHARGE_USE, SoundSource.NEUTRAL, 0.5F, 0.6F);
		if (s.impact > spec.crash) crash(level, s.impact);
		if (pilot instanceof ServerPlayer sp && greeted != sp) {
			greeted = sp;
			sp.sendSystemMessage(Component.empty().append(Component.translatable("entity.flights." + spec.id).withStyle(net.minecraft.ChatFormatting.YELLOW))
				.append(": ").append(Component.translatable("flights.controls.java." + spec.id)));
		}
		if (pilot == null) greeted = null;
	}

	private void sync(Flight.State s) {
		this.entityData.set(PITCH, (float) Mth.clamp(s.pitch, -60, 60));
		this.entityData.set(ROLL, (float) Mth.clamp(s.roll, -60, 60));
		this.entityData.set(ROTOR, (float) s.rotor);
		this.entityData.set(THROTTLE, (float) s.throttle);
		this.entityData.set(BURNER, s.burner);
		this.entityData.set(ANCHORED, s.anchored);
		// Other mods (Realistic Hunting: game hears the burner) can see it without depending on this one.
		if (s.burner) this.addTag(BURNER_TAG);
		else this.removeTag(BURNER_TAG);
	}

	/** Entity tag while the balloon's burner is lit. */
	public static final String BURNER_TAG = "flights.burner";

	/**
	 * Rising air under an aircraft: over campfires and lava, and over sand in the daytime,
	 * fading out with height (the same as the Bedrock add-on).
	 */
	public static double thermal(Level level, BlockPos at) {
		for (int d = 1; d <= 48; d++) {
			BlockState b = level.getBlockState(at.below(d));
			if (b.isAir()) continue;
			if (b.is(BlockTags.CAMPFIRES)) return 0.16 * Math.max(0, 1 - d / 40.0);
			if (b.is(Blocks.LAVA) || b.is(Blocks.MAGMA_BLOCK)) return 0.12 * Math.max(0, 1 - d / 48.0);
			if (b.is(Blocks.SAND) || b.is(Blocks.RED_SAND)) {
				long t = level.getOverworldClockTime() % 24000;
				return t > 1000 && t < 11000 ? 0.06 * Math.max(0, 1 - d / 48.0) : 0;
			}
			return 0;
		}
		return 0;
	}

	private void crash(ServerLevel level, double impact) {
		level.playSound(null, this.blockPosition(), SoundEvents.GENERIC_EXPLODE.value(), SoundSource.NEUTRAL, 0.6F, 1.6F);
		for (Entity p : this.getPassengers()) {
			p.hurtServer(level, this.damageSources().flyIntoWall(), (float) Math.round((impact - spec.crash) * 12 + 2));
			if (p instanceof ServerPlayer sp) sp.sendOverlayMessage(Component.translatable("flights.crash"));
		}
		this.damage += (float) ((impact - spec.crash) * 40 + 8);
		this.hurtTicks = 10;
		if (this.damage > spec.health) breakApart(level, true);
	}

	// ------------------------------------------------------------ no AI, no despawn, no death drops

	@Override
	protected void registerGoals() {
	}

	@Override
	public boolean removeWhenFarAway(double distSqr) {
		return false;
	}

	@Override
	public boolean requiresCustomPersistence() {
		return true;
	}

	@Override
	public boolean causeFallDamage(double fallDistance, float damageModifier, DamageSource damageSource) {
		return false;
	}

	@Override
	protected void checkFallDamage(double ya, boolean onGround, BlockState onState, BlockPos pos) {
	}

	@Override
	public boolean canBreatheUnderwater() {
		return true;
	}

	@Override
	public boolean isAffectedByPotions() {
		return false;
	}

	@Override
	public boolean canBeLeashed() {
		return false;
	}

	@Override
	public boolean isPushable() {
		return false;
	}

	@Override
	public boolean canBeCollidedWith(@Nullable Entity other) {
		return other == null || !other.isPassengerOfSameVehicle(this);
	}

	@Override
	protected boolean shouldDropLoot(ServerLevel level) {
		return false;
	}

	@Override
	public boolean shouldRenderAtSqrDistance(double distance) {
		double d = 128 + spec.camera * 8;
		return distance < d * d;
	}

	// ------------------------------------------------------------ breaking (players only, like boats)

	@Override
	public boolean hurtServer(ServerLevel level, DamageSource source, float amount) {
		if (this.isRemoved()) return true;
		if (source.is(DamageTypes.GENERIC_KILL) || source.is(DamageTypeTags.BYPASSES_INVULNERABILITY)) {
			breakApart(level, false);
			return true;
		}
		if (!(source.getEntity() instanceof Player player) || this.hasPassenger(player)) return false;
		if (player.getAbilities().instabuild) {
			breakApart(level, false);
			return true;
		}
		this.hurtTicks = 10;
		this.damage += Math.max(1.0F, amount) * 10.0F;
		this.playSound(SoundEvents.WOOD_HIT, 0.8F, 1.0F);
		if (this.damage > 40.0F + spec.mass) breakApart(level, true);
		return true;
	}

	/** Ejects everyone and removes it, dropping it as an item. */
	public void breakApart(ServerLevel level, boolean dropItem) {
		this.ejectPassengers();
		if (dropItem) {
			this.spawnAtLocation(level, new ItemStack(ModRegistry.placer(spec.id)));
			this.playSound(SoundEvents.ITEM_BREAK.value(), 1.0F, 0.8F);
		}
		this.discard();
	}

	// ------------------------------------------------------------ riding

	@Override
	public InteractionResult interact(Player player, InteractionHand hand, Vec3 location) {
		if (player.isSecondaryUseActive() || this.getPassengers().size() >= spec.seats.size()) return InteractionResult.PASS;
		if (!this.level().isClientSide()) player.startRiding(this);
		return InteractionResult.SUCCESS;
	}

	@Override
	protected boolean canAddPassenger(Entity passenger) {
		return this.getPassengers().size() < spec.seats.size();
	}

	/** Nobody steers it the vanilla way: the server flies it from the pilot's input. */
	@Override
	public @Nullable LivingEntity getControllingPassenger() {
		return null;
	}

	/** A seat in world space, relative to the aircraft's position. */
	public Vec3 seat(int i) {
		double[] at = spec.seats.get(Math.min(Math.max(0, i), spec.seats.size() - 1));
		return new Vec3(at[0], at[1], at[2]).yRot(-this.getYRot() * Mth.DEG_TO_RAD);
	}

	@Override
	protected Vec3 getPassengerAttachmentPoint(Entity passenger, EntityDimensions dimensions, float scale) {
		return seat(this.getPassengers().indexOf(passenger));
	}

	@Override
	protected void positionRider(Entity passenger, Entity.MoveFunction moveFunction) {
		super.positionRider(passenger, moveFunction);
		if (passenger instanceof LivingEntity living) living.setYBodyRot(this.getYRot());
	}

	/** Beside the aircraft. In the air that means bailing out: at its height, not on the ground. */
	@Override
	public Vec3 getDismountLocationForPassenger(LivingEntity passenger) {
		Vec3 side = new Vec3(this.getBbWidth() * 0.5 + 0.7, 0, 0).yRot(-this.getYRot() * Mth.DEG_TO_RAD);
		Vec3 rel = passenger.position().subtract(this.position());
		Vec3 pos = this.position().add(rel.dot(side) >= 0 ? side : side.scale(-1));
		return new Vec3(pos.x, this.getY(), pos.z);
	}

	// ------------------------------------------------------------ saving

	@Override
	protected void addAdditionalSaveData(ValueOutput out) {
		super.addAdditionalSaveData(out);
		out.putString("Flight", GSON.toJson(state));
	}

	@Override
	protected void readAdditionalSaveData(ValueInput in) {
		super.readAdditionalSaveData(in);
		in.getString("Flight").ifPresent(json -> {
			try {
				Flight.State s = GSON.fromJson(json, Flight.State.class);
				if (s != null) state = s;
			} catch (RuntimeException ignored) {
			}
		});
		sync(state);
	}

	// ------------------------------------------------------------ GeckoLib

	@Override
	public void registerControllers(AnimatableManager.ControllerRegistrar controllers) {
		RawAnimation move = RawAnimation.begin().thenLoop("animation.flights." + spec.id + ".move");
		controllers.add(new AnimationController<>("move", 0, state -> state.setAndContinue(move)));
	}

	@Override
	public AnimatableInstanceCache getAnimatableInstanceCache() {
		return geoCache;
	}
}
