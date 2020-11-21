import { BaseCommand } from "./BaseCommand";
import { logger } from "shared";
import FramedClient from "./FramedClient";
import DiscordUtils from "../utils/discord/DiscordUtils";
import util from "util";
import { PluginInfo } from "../interfaces/PluginInfo";
import { BaseEvent } from "./BaseEvent";
import PluginManager from "../managers/PluginManager";
import Options from "../interfaces/RequireAllOptions";

export abstract class BasePlugin {
	readonly framedClient: FramedClient;
	readonly pluginManager: PluginManager;

	id: string;
	defaultPrefix: string;
	name: string;
	description: string;
	version: string;
	authors?: [
		{
			discordTag?: string;
			discordId?: string;

			twitchUsername?: string;
			twitchId?: string;

			githubUsername?: string;
			// githubId?: string,

			twitterUsername?: string;
			// twitterId?: string,
		}
	];
	githubRepo?: string;
	githubRaw?: string;
	changelog?: [
		{
			version: string;
		}
	];
	paths: {
		commands?: string;
		events?: string;
	};

	commands = new Map<string, BaseCommand>();
	aliases = new Map<string, BaseCommand>();
	/**
	 * To get an event, put in its 
	 */
	// events = new Map<string, BaseEvent>();
	events: BaseEvent[] = [];

	constructor(framedClient: FramedClient, info: PluginInfo) {
		this.framedClient = framedClient;
		this.pluginManager = framedClient.pluginManager;

		this.id = info.id;
		this.defaultPrefix =
			info.defaultPrefix != undefined
				? info.defaultPrefix
				: framedClient.defaultPrefix;
		this.name = info.name;
		this.description = info.description;
		this.version = info.version;
		this.authors = info.authors;
		this.githubRepo = info.githubRepo;
		this.githubRaw = info.githubRaw;
		this.changelog = info.changelog;
		this.paths = info.paths;
	}

	//#region Command loading

	/**
	 *
	 * @param options
	 */
	loadCommandsIn(options: Options): void {
		const commands = DiscordUtils.importScripts(options);
		logger.debug(`Commands: ${util.inspect(commands)}`);
		this.loadCommands(commands);
	}

	/**
	 *
	 * @param commands
	 */
	loadCommands<T extends BaseCommand>(
		commands: (new (plugin: BasePlugin) => T)[]
	): void {
		for (const command of commands) {
			const initCommand = new command(this);
			this.loadCommand(initCommand);
		}
	}

	/**
	 *
	 * @param command
	 */
	loadCommand<T extends BaseCommand>(command: T): void {
		// Sets up some commands
		if (this.commands.get(command.id)) {
			logger.error(`Command with id ${command.id} already exists!`);
			return;
		}
		this.commands.set(command.id, command);

		// Sets up some aliases
		if (command.aliases) {
			for (const alias of command.aliases) {
				if (this.aliases.get(alias)) {
					logger.error(`Alias "${alias}" from command id ${command.id} already exists!`);
					continue;
				}
				this.aliases.set(alias, command);
			}
		}

		logger.verbose(`Finished loading command ${command.name}.`);
	}

	//#endregion

	//#region Event loading

	/**
	 *
	 * @param options
	 */
	loadEventsIn(options: Options): void {
		const events = DiscordUtils.importScripts(options);
		logger.debug(`Events: ${util.inspect(events)}`);
		this.loadEvents(events);
	}

	/**
	 *
	 * @param events
	 */
	loadEvents<T extends BaseEvent>(
		events: (new (plugin: BasePlugin) => T)[]
	): void {
		for (const event of events) {
			const initEvent = new event(this);
			this.loadEvent(initEvent);
		}
	}

	/**
	 *
	 * @param event
	 */
	loadEvent<T extends BaseEvent>(event: T): void {
		this.events.push(event);
		this.framedClient.client.on(event.name, event.run.bind(event));
		logger.verbose(`Finished loading event "${event.name}".`);
	}

	//#endregion
}