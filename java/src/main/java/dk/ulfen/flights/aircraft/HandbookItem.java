package dk.ulfen.flights.aircraft;

import java.util.ArrayList;
import java.util.List;

import dk.ulfen.flights.ModRegistry;
import net.minecraft.ChatFormatting;
import net.minecraft.core.component.DataComponents;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.server.network.Filterable;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.component.WrittenBookContent;
import net.minecraft.world.level.Level;

/** The Pilot's Handbook: a book with a page per aircraft, in the reader's language. */
public class HandbookItem extends Item {
	private static final String GIVEN = "flights.handbook_given";

	public HandbookItem(Item.Properties props) {
		super(props.component(DataComponents.WRITTEN_BOOK_CONTENT, content()));
	}

	private static WrittenBookContent content() {
		List<Filterable<Component>> pages = new ArrayList<>();
		pages.add(Filterable.passThrough(Component.empty()
			.append(Component.translatable("flights.handbook.title").withStyle(ChatFormatting.BOLD))
			.append("\n\n").append(Component.translatable("flights.handbook.intro"))));
		pages.add(Filterable.passThrough(Component.empty()
			.append(Component.translatable("flights.handbook.parachute").withStyle(ChatFormatting.BOLD))
			.append("\n\n").append(Component.translatable("flights.handbook.parachute_text"))));
		for (AircraftSpec s : ModRegistry.SPECS) {
			pages.add(Filterable.passThrough(Component.empty()
				.append(Component.translatable("entity.flights." + s.id).withStyle(ChatFormatting.BOLD))
				.append("\n\n").append(Component.translatable("flights.info." + s.id))));
			pages.add(Filterable.passThrough(Component.empty()
				.append(Component.translatable("entity.flights." + s.id).withStyle(ChatFormatting.BOLD))
				.append("\n\n").append(Component.translatable("flights.controls.java." + s.id))
				.append("\n\n").append(Component.translatable("flights.handbook.seats", s.seats.size()))));
		}
		return new WrittenBookContent(Filterable.passThrough("Pilot's Handbook"), "Flights", 0, pages, true);
	}

	@Override
	public InteractionResult use(Level level, Player player, InteractionHand hand) {
		if (player instanceof ServerPlayer sp) sp.openItemGui(player.getItemInHand(hand), hand);
		return InteractionResult.SUCCESS;
	}

	/** Gives a player the handbook the first time they join a world with the mod. */
	public static void giveOnce(ServerPlayer player) {
		if (player.entityTags().contains(GIVEN)) return;
		player.addTag(GIVEN);
		player.getInventory().add(new ItemStack(ModRegistry.HANDBOOK));
		player.sendSystemMessage(Component.translatable("flights.handbook.welcome"));
	}
}
