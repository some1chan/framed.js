import Discord from "discord.js";

export interface UserPermissions {
	/**
	 * Should the user's permissions be handled by the framework automatically?
	 * This is set to true by default. If you'd like handle this yourself, set this
	 * variable to false.
	 *
	 * If you simply want to not immediately check for permissions, check the example!
	 *
	 * @example
	 * ```ts
	 * // Put this inside your run() function in the command:
	 * if (!this.hasPermission(msg, this.userPermissions)) {
	 * 	await this.sendPermissionErrorMessage(msg);
	 * 	return false;
	 * }
	 * ```
	 */
	checkAutomatically?: boolean;

	/**
	 * Discord permission options. These will be checked in the following order:
	 *
	 * 1. Discord Users
	 * 2. Discord Permissions
	 * 3. Discord Roles
	 *
	 * If this variable has nothing set in here, only
	 * the owner(s) of this bot can run this command.
	 */
	discord?: {
		/**
		 * Checks if the user matches one of these IDs in the list.
		 * If you need a blacklist rather than a whitelist,
		 * you'll need to check for this manually for now.
		 */
		users?: Discord.UserResolvable[];

		/**
		 * Checks if the user can match these permissions.
		 */
		permissions?: Discord.PermissionResolvable[];

		/**
		 * Checks if the user has one of the roles in the list.
		 * If you need more control over these checks,
		 * you'll need to check for this manually for now.
		 */
		roles?: Discord.RoleResolvable[];

		// /**
		//  * Checks if the user has one of the roles in the list. If there is,
		//  * the permission will be denied unless the user is the owner, adminstrator, or bot owner.
		//  */
		// excludedRoles?: Discord.RoleResolvable[];
	};
}
