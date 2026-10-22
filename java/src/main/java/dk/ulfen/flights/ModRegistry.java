package dk.ulfen.flights;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import dk.ulfen.flights.aircraft.AircraftEntity;
import dk.ulfen.flights.aircraft.AircraftItem;
import dk.ulfen.flights.aircraft.AircraftSpec;
import dk.ulfen.flights.aircraft.HandbookItem;
import dk.ulfen.flights.aircraft.ParachuteEntity;
import net.fabricmc.fabric.api.creativetab.v1.FabricCreativeModeTab;
import net.fabricmc.fabric.api.object.builder.v1.entity.FabricDefaultAttributeRegistry;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.Identifier;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.MobCategory;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;

/** Everything the mod adds to the game registries. */
public final class ModRegistry {
	public static List<AircraftSpec> SPECS = List.of();
	public static final Map<String, EntityType<AircraftEntity>> TYPES = new LinkedHashMap<>();
	private static final Map<EntityType<?>, AircraftSpec> BY_TYPE = new HashMap<>();
	private static final Map<String, Item> PLACERS = new LinkedHashMap<>();

	public static EntityType<ParachuteEntity> PARACHUTE;
	public static Item PARACHUTE_ITEM;
	public static Item HANDBOOK;

	private ModRegistry() {}

	public static Identifier id(String path) {
		return Identifier.fromNamespaceAndPath(Flights.MOD_ID, path);
	}

	public static AircraftSpec spec(EntityType<?> type) {
		AircraftSpec s = BY_TYPE.get(type);
		if (s == null) throw new IllegalStateException("no aircraft spec for " + type);
		return s;
	}

	public static AircraftSpec spec(String id) {
		return BY_TYPE.get(TYPES.get(id));
	}

	public static EntityType<AircraftEntity> type(String id) {
		return TYPES.get(id);
	}

	/** The item that places an aircraft. */
	public static Item placer(String id) {
		return PLACERS.get(id);
	}

	static void register() {
		SPECS = AircraftSpec.load();
		for (AircraftSpec s : SPECS) {
			ResourceKey<EntityType<?>> key = ResourceKey.create(Registries.ENTITY_TYPE, id(s.id));
			EntityType<AircraftEntity> type = EntityType.Builder.<AircraftEntity>of(AircraftEntity::new, MobCategory.MISC)
				.sized(s.width, s.height)
				.fireImmune()
				.clientTrackingRange(16)
				.updateInterval(1)
				.build(key);
			BY_TYPE.put(type, s);
			Registry.register(BuiltInRegistries.ENTITY_TYPE, key, type);
			TYPES.put(s.id, type);
			FabricDefaultAttributeRegistry.register(type, AircraftEntity.createAttributes(s));
			PLACERS.put(s.id, item(s.id, p -> new AircraftItem(p, s.id), new Item.Properties().stacksTo(1)));
		}

		ResourceKey<EntityType<?>> chuteKey = ResourceKey.create(Registries.ENTITY_TYPE, id("parachute"));
		PARACHUTE = Registry.register(BuiltInRegistries.ENTITY_TYPE, chuteKey, EntityType.Builder.<ParachuteEntity>of(ParachuteEntity::new, MobCategory.MISC)
			.sized(0.4F, 0.4F).fireImmune().noSave().clientTrackingRange(10).updateInterval(1).build(chuteKey));
		FabricDefaultAttributeRegistry.register(PARACHUTE, ParachuteEntity.createAttributes());

		PARACHUTE_ITEM = item("parachute", Item::new, new Item.Properties().stacksTo(1));
		HANDBOOK = item("pilots_handbook", HandbookItem::new, new Item.Properties().stacksTo(1));

		CreativeModeTab tab = FabricCreativeModeTab.builder()
			.title(Component.translatable("itemGroup.flights"))
			.icon(() -> new ItemStack(PLACERS.get("hot_air_balloon")))
			.displayItems((params, out) -> {
				PLACERS.values().forEach(out::accept);
				out.accept(PARACHUTE_ITEM);
				out.accept(HANDBOOK);
			})
			.build();
		Registry.register(BuiltInRegistries.CREATIVE_MODE_TAB, ResourceKey.create(Registries.CREATIVE_MODE_TAB, id("flights")), tab);
	}

	private static <T extends Item> T item(String name, Function<Item.Properties, T> factory, Item.Properties props) {
		ResourceKey<Item> key = ResourceKey.create(Registries.ITEM, id(name));
		return Registry.register(BuiltInRegistries.ITEM, key, factory.apply(props.setId(key)));
	}
}
