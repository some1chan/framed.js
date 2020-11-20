import util from "util";
import { BasePlugin } from "../structures/BasePlugin";
import { logger } from "shared";
import FramedClient from "../structures/FramedClient";
import * as DiscordUtils from "../utils/DiscordUtils";
import FramedMessage from "../structures/FramedMessage";
import { BaseCommand } from "../structures/BaseCommand";
import { BaseEvent } from "../structures/BaseEvent";

export default class PluginManager {
	public plugins = new Map<string, BasePlugin>();
	// public importingCommand?: BaseCommand;

	/**
	 *
	 * @param framedClient
	 */
	constructor(public readonly framedClient: FramedClient) {}

	/**
	 * Loads the plugins
	 * @param options RequireAll options
	 */
	loadPluginsIn(options: DiscordUtils.Options): void {
		const plugins = DiscordUtils.importScripts(options);
		logger.debug(`Plugins: ${util.inspect(plugins)}`);
		this.loadPlugins(plugins);
	}

	/**
	 *
	 * @param plugins
	 */
	loadPlugins<T extends BasePlugin>(
		plugins: (new (framedClient: FramedClient) => T)[]
	): void {
		for (const plugin of plugins) {
			const initPlugin = new plugin(this.framedClient);
			// logger.debug(`initPlugin: ${util.inspect(initPlugin)}`);
			this.loadPlugin(initPlugin);
		}
	}

	/**
	 *
	 * @param plugin
	 */
	loadPlugin<T extends BasePlugin>(plugin: T): void {
		if (this.plugins.get(plugin.id)) {
			logger.error(`Plugin with id ${plugin.id} already exists!`);
			return;
		}

		this.plugins.set(plugin.id, plugin);

		// Load commands
		if (plugin.paths.commands) {
			plugin.loadCommandsIn({
				dirname: plugin.paths.commands,
				filter: /^(.*)\.(js|ts)$/,
			});
		}

		// Load events
		if (plugin.paths.events) {
			plugin.loadEventsIn({
				dirname: plugin.paths.events,
				filter: /^(.*)\.(js|ts)$/,
			});
		}

		logger.verbose(
			`Finished loading plugin ${plugin.name} v${plugin.version}.`
		);
	}

	get pluginsArray(): BasePlugin[] {
		return Array.from(this.plugins.values());
	}

	get commandsArray(): BaseCommand[] {
		const commands: BaseCommand[] = [];
		this.plugins.forEach(plugin => {
			commands.push(...Array.from(plugin.commands.values()));
		});
		return commands;
	}

	get prefixesArray(): string[] {
		const prefixes: string[] = [
			this.framedClient.defaultPrefix,
			`${this.framedClient.client.user}`,
			`<@!${this.framedClient.client.user?.id}>`,
		];

		// Adds to the list of potential prefixes
		this.commandsArray.forEach(command => {
			command.prefixes.forEach(element => {
				if (!prefixes.includes(element)) {
					prefixes.push(element);
				}
			});
		});

		// logger.debug(`PluginManager.ts: Prefixes: ${prefixes}`);
		return prefixes;
	}

	get eventsArray(): BaseEvent[] {
		const events: BaseEvent[] = [];
		this.plugins.forEach(plugin => {
			events.push(...plugin.events);
		});
		return events;
	}

	async runCommand(msg: FramedMessage): Promise<void> {
		if (msg.command && msg.prefix) {
			logger.warn(`- ${msg.prefix}${msg.command}`);

			// Removes undefined type
			const commandString = msg.command;
			const prefix = msg.prefix;

			const commandList: BaseCommand[] = [];

			for await (const pluginElement of this.plugins) {
				const plugin = pluginElement[1];
				// Gets a command from the plugin
				const command = plugin.commands.get(commandString);

				const hasMatchingPrefix = this.prefixesArray.includes(prefix);

				// First tries to find the command from the command map
				if (command && hasMatchingPrefix) {
					await command.run(msg);
					commandList.push(command);
					logger.warn(`B ${msg.prefix}${command.id}`);
				} else {
					// Tries to find the command from an alias
					const alias = plugin.aliases.get(commandString);
					if (alias && hasMatchingPrefix) {
						alias.run(msg);
						commandList.push(alias);
						logger.warn("b");
					}
				}
			}

			logger.warn("C");
		}
	}
}
