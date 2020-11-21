import Discord from "discord.js";
import { logger } from "shared";
import { emotes, oneOptionMsg, optionEmotes } from ".././Fun.plugin";
import { BaseEvent } from "packages/back-end/src/structures/BaseEvent";
import Emoji from "node-emoji"; // Doing this only because Windows can't render emotes for some reason
import { BasePlugin } from "packages/back-end/src/structures/BasePlugin";
import { oneLine } from "common-tags";
import Poll from "../commands/Poll";
import FramedMessage from "packages/back-end/src/structures/FramedMessage";
// import util from "util";

export default class extends BaseEvent {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			name: "messageReactionAdd",
		});
	}

	async run(
		reaction: Discord.MessageReaction,
		user: Discord.User | Discord.PartialUser
	): Promise<void> {
		logger.debug(`Reaction Add From: ${user.id}`);
		// logger.debug(`OnMsgRA: ${util.inspect(this)}`);

		if (user.bot) return;

		// https://discordjs.guide/popular-topics/reactions.html#listening-for-reactions-on-old-messages
		// When we receive a reaction we check if the reaction is partial or not
		if (reaction.partial) {
			// If the message this reaction belongs to was removed the fetching
			// might result in an API error, which we need to handle
			try {
				await reaction.fetch();
			} catch (error) {
				logger.error(
					"Something went wrong when fetching the message: ",
					error.stack
				);
				// Return as `reaction.message.author` may be undefined/null
				return;
			}
		}

		const embedDescription:
			| string
			| undefined = reaction.message.embeds[0]?.description?.toLocaleLowerCase();

		const isPollEmbed: boolean | undefined = embedDescription?.includes(
			"poll by <@"
		);

		const parsedResults = await Poll.customParse(
			new FramedMessage({
				framedClient: this.framedClient,
				discord: {
					msg: reaction.message,
				},
			}),
			true
		);

		const singleVoteOnly: boolean | undefined =
			embedDescription?.endsWith(oneOptionMsg.toLocaleLowerCase()) ||
			parsedResults?.askingForSingle;

		const isPollCommand =
			reaction.message.content.startsWith(".poll") || isPollEmbed;

		//; // ||
		// reaction.message.content.startsWith("+poll") ||
		// reaction.message.content.startsWith("poll:") ||
		// reaction.message.author.id == "298673420181438465"; // This last one is for Poll Bot#0082

		if (isPollCommand && singleVoteOnly) {
			// https://discordjs.guide/popular-topics/reactions.html#removing-reactions-by-user
			const extraUserReactions = reaction.message.reactions.cache.filter(
				reactionElement =>
					reactionElement.users.cache.has(user.id) &&
					(emotes.includes(reactionElement.emoji.name) ||
						optionEmotes.includes(reactionElement.emoji.name)) &&
					reactionElement != reaction
			);

			try {
				logger.debug(oneLine`
					Current reaction: ${reaction.emoji.name} 
					(${Emoji.unemojify(reaction.emoji.name)} unemojified)`);

				for await (const reaction of extraUserReactions.values()) {
					logger.debug(oneLine`
						Removing ${reaction.emoji.name} 
						(${Emoji.unemojify(reaction.emoji.name)} unemojified)`);
					await reaction.users.remove(user.id);
				}
			} catch (error) {
				logger.error("Failed to remove reactions.");
			}
		}
	}
}
