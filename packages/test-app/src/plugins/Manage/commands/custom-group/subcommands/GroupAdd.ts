import {
	FramedMessage,
	BaseCommand,
	BaseSubcommand,
	PluginManager,
} from "back-end";
import { logger } from "shared";
import { oneLine } from "common-tags";

export default class CustomGroupAdd extends BaseSubcommand {
	constructor(command: BaseCommand) {
		super(command, {
			id: "add",
			aliases: ["a", "create", "cr"],
			about: "Adds a custom group.",
			usage: `"<emote + group name>"`,
			examples: oneLine`
			\`{{prefix}}{{id}} add "🍎 Food Stuff"\``,
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		// Checks for permission
		if (
			!this.baseCommand.hasPermission(msg, this.baseCommand.permissions)
		) {
			this.baseCommand.sendPermissionErrorMessage(msg);
			return false;
		}

		if (msg.args) {
			const parse = FramedMessage.parseEmojiAndString(msg, [this.id]);
			if (parse) {
				const { newContent, newEmote } = parse;
				try {
					await this.framedClient.databaseManager.addGroup(
						newContent,
						newEmote
					);

					if (newEmote) {
						await msg.discord?.channel.send(
							oneLine`${msg.discord.author}, I've added the group "${newContent}" with
							emote "${newEmote}" succesfully!`
						);
					} else {
						await msg.discord?.channel.send(
							`${msg.discord.author}, I've added the group "${newContent}" succesfully!`
						);
					}
				} catch (error) {
					if (error instanceof ReferenceError) {
						await msg.discord?.channel.send(
							`${msg.discord.author}, ${error.message}`
						);
					} else {
						logger.error(error);
					}
				}
			} else {
				await PluginManager.showHelpForCommand(msg);
				return false;
			}

			return true;
		}
		return false;
	}
}
