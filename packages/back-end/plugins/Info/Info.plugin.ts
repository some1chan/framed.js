// import Command, { CommandClass } from "../../src/structures/Command";
import { Plugin, PluginClass } from "../../src/structures/Plugin";
import { logger } from "shared";
import path from "path";

@Plugin()
export default class extends PluginClass {
	public testVar = "owo";

	constructor() {
		super({
			info: {
				id: "default.bot.info",
				name: "Info",
				description:
					"Info commands.",
				version: "0.1.0",
			},
			paths: {
				commands: path.join(__dirname, "commands"),
				events: path.join(__dirname, "events"),
			},
		});
		logger.debug("Core plugin class constructor was called");
	}
}