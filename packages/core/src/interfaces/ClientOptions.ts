import * as TypeORM from "typeorm";

/**
 * Used with initializing Framed client.
 */
export interface ClientOptions {
	/**
	 * TypeORM connection options. This will be merged with other things, such as where
	 * the default entities are.
	 */
	defaultConnection: TypeORM.ConnectionOptions;

	/**
	 * The prefix used for all commands, except when a plugin or commands explicitly uses something else
	 */
	defaultPrefix?: string;

	/**
	 * Help command list
	 */
	defaultHelpCommands?: string[];

	/**
	 * A version number, separate from the Framed framework itself.
	 */
	appVersion?: string;

	/** 
	 * Import default API routes
	 */
	loadDefaultRoutes?: boolean;

	/**
	 * Import default plugins
	 */
	loadDefaultPlugins?: boolean;
}
