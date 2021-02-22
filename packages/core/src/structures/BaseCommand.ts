import { BaseMessage } from "./BaseMessage";
import { BasePlugin } from "./BasePlugin";
import { Client } from "./Client";
import { BaseCommandOptions } from "../interfaces/BaseCommandOptions";
import Discord from "discord.js";
import { EmbedHelper } from "../utils/discord/EmbedHelper";
import { Logger } from "@framedjs/logger";
import Options from "../interfaces/other/RequireAllOptions";
import { DiscordUtils } from "../utils/discord/DiscordUtils";
import { BaseSubcommand } from "./BaseSubcommand";
import { oneLine, oneLineCommaListsOr } from "common-tags";
import { Prefixes } from "../interfaces/Prefixes";
import { InlineOptions } from "../interfaces/InlineOptions";
import { Place } from "../interfaces/Place";
import { UserPermissions } from "../interfaces/UserPermissions";
import { DiscordMessage } from "./DiscordMessage";
import { TwitchMessage } from "./TwitchMessage";

export abstract class BaseCommand {
	// static readonly type: string = "BaseCommand";

	readonly client: Client;

	/**
	 * The plugin this command is attached to.
	 */
	plugin: BasePlugin;

	/**
	 * Stores an ID for the command that should be completely unique between plugins.
	 */
	fullId: string;

	/**
	 * The ID of the command, which cannot use spaces. All plugin IDs should try to be unique,
	 * to make sure that no plugin from different developers would overlap.
	 *
	 * Commands will use the ID to be able to be triggered.
	 *
	 * For example, if the ID was "test", then one way to be able to trigger it would
	 * be !test if the default prefix was "!".
	 */
	id: string;

	/**
	 * The command tries to import scripts from paths found in this object.
	 */
	paths?: {
		subcommands?: string;
	};

	/**
	 * Subcommands.
	 */
	subcommands: Map<string, BaseSubcommand>;

	/**
	 * Subcommands aliases
	 */
	subcommandAliases: Map<string, BaseSubcommand>;

	/**
	 * Stores a list of command aliases possible to trigger the command.
	 */
	aliases?: string[];

	/**
	 * The default prefix of the command. This will be seen on the help embed.
	 */
	defaultPrefix: Prefixes;

	/**
	 * Has defaultPrefix been explicitly set by the script, or were the values gained implicitly?
	 */
	defaultPrefixExplicitlySet = false;

	/**
	 * A list of all possible prefixes.
	 */
	// prefixes: string[];

	/**
	 * Group name
	 */
	group: string;

	/**
	 * Group emote
	 */
	groupEmote?: string;

	/**
	 * A brief, one-liner about section to talk about what the command does.
	 */
	about?: string;

	/**
	 * A description of what the command does. This is encouraged to span multiple lines.
	 */
	description?: string;

	/**
	 * Info on how to use the command.
	 */
	usage?: string;

	/**
	 * Should this command hide its usage instructions on the help embed?
	 */
	hideUsageInHelp?: boolean;

	/**
	 * Examples on how to use the command.
	 */
	examples?: string;

	/**
	 * Extra notes about the command, that isn't in the description.
	 */
	notes?: string;

	/**
	 * User permissions to compare to.
	 */
	userPermissions?: UserPermissions;

	/**
	 * Use inline in help?
	 */
	inline?: boolean | InlineOptions;

	/**
	 * This variable contains the raw info of what a plugin has returned as data. This data may be incomplete,
	 * or may have not been parsed yet. The constructor of BaseCommand is designed
	 * to parse it all at once.
	 *
	 * **DO NOT USE THIS** unless you're re-constructing through the constructor,
	 * or know what you're doing.
	 *
	 * If you're unsure whether to use this, **USE THE BASE VARIABLES INSTEAD**.
	 */
	rawInfo: BaseCommandOptions;

	/**
	 * Create a new BaseCommand.
	 *
	 * @param plugin Plugin that this command will be attached to
	 * @param info Command information
	 */
	constructor(plugin: BasePlugin, info: BaseCommandOptions) {
		this.client = plugin.client;
		this.plugin = plugin;

		this.id = info.id.toLocaleLowerCase();
		this.paths = info.paths;
		this.fullId = `${this.plugin.id}.command.${this.id}`;
		this.group = info.group
			? info.group
			: plugin.group
			? plugin.group
			: "Other";
		this.groupEmote = plugin.groupEmote;
		this.aliases = info.aliases;

		if (typeof info.defaultPrefix == "string") {
			this.defaultPrefix = {
				discord: info.defaultPrefix,
				twitch: info.defaultPrefix,
				default: info.defaultPrefix,
			};
			this.defaultPrefixExplicitlySet = true;
		} else if (info.defaultPrefix != undefined) {
			this.defaultPrefix = info.defaultPrefix;
			this.defaultPrefixExplicitlySet = true;
		} else {
			this.defaultPrefix = {
				discord: this.client.discord.defaultPrefix,
				twitch: this.client.twitch.defaultPrefix,
				default: this.client.defaultPrefix,
			};
		}

		this.about = info.about;
		this.description = info.description;
		this.usage = info.usage;
		this.examples = info.examples;
		this.notes = info.notes;
		this.userPermissions = info.userPermissions;
		this.hideUsageInHelp = info.hideUsageInHelp;

		this.inline = info.inline ?? false;

		this.rawInfo = info;
		this.subcommands = new Map();
		this.subcommandAliases = new Map();
	}

	/**
	 * Gets the default prefix for the command.
	 *
	 * @param place Place data
	 */
	getDefaultPrefix(place: Place): string {
		// If the prefix is set explicitly in the script, use that instead
		if (this.defaultPrefixExplicitlySet) {
			switch (place.platform) {
				case "discord":
					return this.defaultPrefix.discord;
				case "twitch":
					return this.defaultPrefix.twitch;
				case "none":
					Logger.warn(
						oneLine`defaultPrefixExplicitSet:
						Couldn't find default prefix from client;
						falling back to defaultPrefix.default`
					);
					return this.defaultPrefix.default;
			}
		}

		const prefix = this.client.provider.prefixes.get(place.id);
		if (!prefix) {
			Logger.warn(
				oneLine`Couldn't find default prefix from
				place ID ${place.id}; falling back to defaultPrefix.default`
			);
			return this.defaultPrefix.default;
		}

		return prefix;
	}

	getDefaultPrefixFallback(place?: Place): string {
		switch (place?.platform) {
			case "discord":
				return this.defaultPrefix.discord;
			case "twitch":
				return this.defaultPrefix.twitch;
		}
		return this.defaultPrefix.default;
	}

	get defaultPlaceFallback(): Place {
		return {
			id: "default",
			platform: "none",
		};
	}

	/**
	 * Returns a list of prefixes that the command can use.
	 *
	 * @param placeOrPlatformId Place data, or a platform ID (ex. Discord guild ID, Twitch channel ID)
	 * @param checkDefault Checks if the default prefix is duplicated in the array
	 */
	getPrefixes(
		placeOrPlatformId: Place | string,
		checkDefault = true
	): string[] {
		const prefixes: string[] = [];

		// Puts all the command prefixes in an array
		if (this.rawInfo.prefixes) {
			prefixes.push(...this.rawInfo.prefixes);
		}

		// Get's this place's prefixes, and puts them into the array
		// for comparing if it contains the default prefix
		let place =
			typeof placeOrPlatformId == "string"
				? this.client.provider.place.get(placeOrPlatformId)
				: placeOrPlatformId;

		if (!place) {
			Logger.warn(
				oneLine`place for place ID ${placeOrPlatformId} wasn't found!`
			);
			place = this.defaultPlaceFallback;
		}

		if (checkDefault) {
			// Gets the default prefix
			const prefix = this.getDefaultPrefix(place);

			// If this list doesn't include the default prefix from there, add it to the array
			if (prefix && !prefixes.includes(prefix)) {
				prefixes.push(prefix);
			}
		}

		return prefixes;
	}

	/**
	 * Puts all text entry fields into formatting
	 *
	 * @param place Place data
	 */
	getCommandNotationFormatting(
		place: Place
	): {
		about: string | undefined;
		description: string | undefined;
		examples: string | undefined;
		notes: string | undefined;
		usage: string | undefined;
	} {
		return {
			about: this.client.formatting.formatCommandNotation(
				this.about,
				this,
				place
			),
			description: this.client.formatting.formatCommandNotation(
				this.description,
				this,
				place
			),
			examples: this.client.formatting.formatCommandNotation(
				this.examples,
				this,
				place
			),
			notes: this.client.formatting.formatCommandNotation(
				this.notes,
				this,
				place
			),
			usage: this.client.formatting.formatCommandNotation(
				this.usage,
				this,
				place
			),
		};
	}

	/**
	 * Run the command.
	 *
	 * @param msg Framed Message
	 *
	 * @returns true if successful
	 */
	abstract run(msg: BaseMessage): Promise<boolean>;

	//#region Permissions

	/**
	 * Checks for if a user has a permission to do something.
	 *
	 * NOTE: If permissions is null, this returns true.
	 *
	 * @param msg
	 * @param permissions
	 * @param checkAdmin
	 * @param checkOwner
	 */
	hasPermission(
		msg: BaseMessage,
		permissions = this.userPermissions,
		checkAdmin = true,
		checkOwner = true
	): boolean {
		if (!permissions) {
			// If the command doesn't specify permissions, assume it's fine
			return true;
		}

		if (msg instanceof DiscordMessage) {
			if (checkOwner) {
				if (
					msg.client.discord.owners?.includes(msg.discord.author.id)
				) {
					return true;
				}
			}

			if (checkAdmin) {
				if (
					msg.client.discord.admins?.includes(msg.discord.author.id)
				) {
					return true;
				}
			}

			// If there's a discord entry, safely assume to block it
			if (!permissions.discord) {
				return false;
			}

			// Discord checks
			if (permissions.discord) {
				const member = msg.discord.member;
				if (member) {
					// Discord permissions
					let hasPermission = false;

					const perms = permissions.discord.permissions
						? permissions.discord.permissions
						: new Discord.Permissions("ADMINISTRATOR");

					hasPermission = member.hasPermission(perms, {
						checkAdmin,
						checkOwner,
					});

					// Goes through Discord roles, if the permission wasn't granted
					if (!hasPermission && permissions.discord.roles) {
						permissions.discord.roles.every(role => {
							let roleId = "";
							if (role instanceof Discord.Role) {
								roleId = role.id;
							} else {
								roleId = role;
							}

							hasPermission = member.roles.cache.has(roleId);
							if (hasPermission) {
								return;
							}
						});
					}

					return hasPermission;
				} else {
					// It should've catched even with DM
					return false;
				}
			}
		} else if (msg instanceof TwitchMessage) {
			// TODO: Twitch Message permissions
			Logger.warn("Twitch permissions haven't been implemented");
			return true;
		}

		// Return false by default, just in case
		return false;
	}

	/**
	 * Sends an error message, with what perms the user needs to work with.
	 *
	 * @param msg
	 * @param permissions
	 */
	async sendPermissionErrorMessage(
		msg: BaseMessage,
		permissions = this.userPermissions
	): Promise<boolean> {
		if (msg.discord && permissions?.discord) {
			const discord = msg.discord;
			const embedFields: Discord.EmbedFieldData[] = [];
			const embed = EmbedHelper.getTemplate(
				msg.discord,
				await EmbedHelper.getCheckOutFooter(msg, this.id)
			)
				.setTitle("Permission Denied")
				.setDescription(
					`${msg.discord.author}, you aren't allowed to do that! `
				);

			// TODO: Finish
			if (permissions.discord.permissions) {
				const perms = new Discord.Permissions(
					permissions.discord.permissions
				);
				const permsArray = perms.toArray();
				let value = "";

				// Puts Discord permissions into a string
				permsArray.forEach(permString => {
					value += `\`${permString}\` `;
				});

				if (value.length > 0) {
					embedFields.push({
						name: "Discord Permissions",
						value,
					});
				}
			}

			// Goes through roles
			if (permissions.discord.roles) {
				const roles: Discord.Role[] = [];
				permissions.discord.roles.forEach(role => {
					// Correctly parses the resolvable
					if (typeof role == "string") {
						const newRole = discord.guild?.roles.cache.get(role);
						if (newRole) {
							roles.push(newRole);
						} else {
							Logger.error(
								`BaseCommand.ts: Couldn't find role with role ID "${role}".`
							);
						}
					} else {
						roles.push(role);
					}
				});

				let value = "";
				for await (const role of roles) {
					value += `${role} `;
				}

				if (value.length > 0) {
					embedFields.push({
						name: "Discord Roles",
						value,
					});
				}
			}

			if (permissions.discord.users) {
				const listOfUsers: string[] = [];

				for (const user of permissions.discord.users) {
					listOfUsers.push(`<@${user}>`);
				}

				embedFields.push({
					name: "User(s)",
					value: oneLineCommaListsOr`${listOfUsers}`,
				});
			}

			if (embedFields.length > 0) {
				embed
					.setDescription(
						`${embed.description}\nYou need the following permissions, roles, or be certain user(s):`
					)
					.addFields(embedFields);
			}

			await msg.discord.channel.send(embed);
			return true;
		}
		return false;
	}

	//#endregion

	//#region Loading in the subcommand

	/**
	 * Loads the plugins
	 * @param options RequireAll options
	 */
	loadSubcommandsIn(options: Options): void {
		try {
			const subcommands = DiscordUtils.importScripts(options) as (new (
				command: BaseCommand
			) => BaseSubcommand)[];
			this.loadSubcommands(subcommands);
		} catch (error) {
			Logger.error(error.stack);
		}
	}

	/**
	 *
	 * @param subcommands
	 */
	loadSubcommands<T extends BaseSubcommand>(
		subcommands: (new (command: BaseCommand) => T)[]
	): void {
		for (const subcommand of subcommands) {
			const initSubcommand = new subcommand(this);
			this.loadSubcommand(initSubcommand);
		}
	}

	/**
	 *
	 * @param subcommand
	 */
	loadSubcommand<T extends BaseSubcommand>(subcommand: T): void {
		// Sets up the subcommand into the Map
		if (this.subcommands.get(subcommand.id)) {
			Logger.error(`Subcommand with id ${subcommand.id} already exists!`);
			return;
		}
		this.subcommands.set(subcommand.id, subcommand);

		if (subcommand.aliases) {
			for (const alias of subcommand.aliases) {
				if (this.subcommandAliases.get(alias)) {
					Logger.error(
						`Alias "${alias}" from subcommand "${subcommand.fullId}" already exists!`
					);
					continue;
				}
				this.subcommandAliases.set(alias, subcommand);
			}
		}

		Logger.debug(`Loaded subcommand ${subcommand.id}`);
	}

	//#endregion

	/**
	 * Gets the subcommand to run from command arguments.
	 *
	 * @param args Message arguments. This should likely equal
	 * `msg.args` from the Message class.
	 *
	 * @returns Subcommand or undefined
	 */
	getSubcommand(args: string[]): BaseSubcommand | undefined {
		const maxSubcommandNesting = 3;
		let finalSubcommand: BaseSubcommand | undefined;
		let newSubcommand: BaseSubcommand | undefined;

		for (let i = 0; i < maxSubcommandNesting + 1; i++) {
			const commandToCompare = newSubcommand ? newSubcommand : this;
			let subcommand = commandToCompare.subcommands.get(args[i]);
			if (!subcommand)
				subcommand = commandToCompare.subcommandAliases.get(args[i]);

			if (subcommand) {
				// If it hit max and isn't done
				if (i == maxSubcommandNesting) {
					Logger.error(oneLine`
					There are too many nested subcommands! The maximum is 3.
					The ${finalSubcommand?.fullId} subcommand will be ran anyway.`);
					break;
				}

				// Else, simply add it as a possible subcommand
				newSubcommand = subcommand;
			} else if (newSubcommand) {
				// Gets the previous new command as the final one, to be ran
				finalSubcommand = newSubcommand;
				break;
			} else {
				// There was no subcommand, so we return undefined
				return undefined;
			}
		}

		// If there was a final subcommand, return it
		if (finalSubcommand) {
			return finalSubcommand;
		}
	}

	/**
	 * Gets the nested subcommands.
	 *
	 * @param args Message arguments
	 */
	getSubcommandChain(args: string[]): BaseSubcommand[] {
		const maxSubcommandNesting = 3;
		const subcommands: BaseSubcommand[] = [];

		let finalSubcommand: BaseSubcommand | undefined;
		let newSubcommand: BaseSubcommand | undefined;

		for (let i = 0; i < maxSubcommandNesting + 1; i++) {
			const commandToCompare = newSubcommand ? newSubcommand : this;
			let subcommand = commandToCompare.subcommands.get(args[i]);
			if (!subcommand)
				subcommand = commandToCompare.subcommandAliases.get(args[i]);

			if (subcommand) {
				// If it hit max and isn't done
				if (i == maxSubcommandNesting) {
					Logger.error(oneLine`
					There are too many nested subcommands! The maximum is 3.
					The ${finalSubcommand?.fullId} subcommand will be ran anyway.`);
					break;
				}

				// Else, simply add the new subcommand to our list
				subcommands.push(subcommand);
				newSubcommand = subcommand;
			} else {
				// There are no new subcommand, so we return the array
				return subcommands;
			}
		}

		return subcommands;
	}
}
