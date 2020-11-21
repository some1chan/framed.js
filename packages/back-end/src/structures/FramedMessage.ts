import { oneLine } from "common-tags";
import Discord from "discord.js";
import { logger } from "shared";
import { FramedMessageInfo } from "../interfaces/FramedMessageInfo";

export default class FramedMessage {
	public readonly framedClient;

	public discord?: {
		readonly msg?: Discord.Message;
		readonly client: Discord.Client;
		readonly id?: string;
		readonly channel:
			| Discord.TextChannel
			| Discord.DMChannel
			| Discord.NewsChannel;
		readonly author: Discord.User;
		readonly guild: Discord.Guild | null;
	};

	public content = "";

	public prefix?: string;
	public args?: Array<string>;
	public command?: string;

	constructor(info: FramedMessageInfo) {
		if (info.discord) {
			if (info.discord.msg) {
				// If there's an msg object, we set all the relevant values here
				this.discord = {
					msg: info.discord.msg,
					client: info.discord.msg.client,
					id: info.discord.msg.id,
					channel: info.discord.msg.channel,
					author: info.discord.msg.author,
					guild: info.discord.msg.guild,
				};

				this.content = info.discord.msg.content;
			} else {
				// If there isn't an msg object, we check to see if they've been
				// inputted into the data manually.

				// Gets client or throws error
				const discordClient = info.discord.client;
				if (!discordClient) {
					throw new Error(
						oneLine`Parameter discord.client wasn't set when creating FramedMessage!
						This value should be set if the discord.msg parameter hasn't been set.`
					);
				}

				// Gets message ID or throws error
				const id = info.discord.id;
				// if (!id) {
				// 	throw new Error(
				// 		oneLine`Parameter discord.id wasn't set when creating FramedMessage!
				// 		This value should be set if the discord.msg parameter hasn't been set.`
				// 	);
				// }

				// Gets channel or throws error
				const channel = info.discord.channel;
				if (!channel) {
					throw new Error(
						oneLine`Parameter discord.channel wasn't set when creating FramedMessage!
						This value should be set if the discord.msg parameter hasn't been set.`
					);
				}

				// Gets author or throws error
				const author = info.discord.author
					? info.discord.author
					: discordClient.user;
				if (!author) {
					throw new Error(
						oneLine`discordClient.user is null, and discord.author is undefined.`
					);
				}

				// Gets content or throws error
				const content = info.discord.content
					? info.discord.content
					: id ? channel.messages.cache.get(id)?.content : undefined;
				logger.debug(`FramedMessage content: ${content}`);
				if (!content) {
					throw new Error(
						oneLine`Parameter discord.content wasn't set when creating FramedMessage!
						This value should be set if the discord.msg or discord.id parameter hasn't been set.`
					);
				}
				this.content = content;

				// Sets Discord-specific data
				this.discord = {
					client: discordClient,
					id: info.discord.id,
					channel: channel,
					author: author,
					guild: info.discord.guild ? info.discord.guild : null,
				};
			}
		}

		this.framedClient = info.framedClient;
		this.prefix = this.getPrefix();
		this.args = this.getArgs();
		this.command = this.getCommand();
	}

	/**
	 * Gets the prefix of the message.
	 */
	getPrefix(): string | undefined {
		const prefixes = [...this.framedClient.pluginManager.prefixesArray];
		let prefix: string | undefined;
		for (const testPrefix of prefixes) {
			if (this.content.startsWith(testPrefix)) {
				prefix = testPrefix;
				break;
			}
		}
		return prefix;
	}

	/**
	 * Gets the command of the message.
	 */
	private getCommand(): string | undefined {
		return this.prefix && this.args
			? this.args.shift()?.toLocaleLowerCase()
			: undefined;
	}

	/**
	 * Gets the arguments of the message.
	 *
	 * Example: `.test "woah spaces" that is 2 cool "aaaa"`
	 * would return the following arguments:
	 *
	 * ```ts
	 * ["test", "woah spaces", "that", "is", 2, "cool", "aaa"]
	 * ```
	 */
	private getArgs(): string[] | undefined {
		if (this.prefix) {
			// Note that this content will still include the command inside
			// the arguments, and will be removed when getCommand() is called
			const content = this.content.slice(this.prefix.length).trim();
			const args = FramedMessage.getArgs(content);

			logger.debug(`Args -> ${args}`);
			return args;
		} else {
			return undefined;
		}

		// return this.prefix
		// 	? this.content.slice(this.prefix.length).trim().split(/ +/g)
		// 	: undefined;
	}

	/**
	 * If an argument parameter is empty, it will be removed.
	 */
	static trimArgs(args: string[]): string[] {
		return args.filter(function (e) {
			return e;
		});
	}

	/**
	 * Removes unescaped quotes from arguments
	 * @param args Message arguments
	 */
	static removeQuotesFromArgs(args: string[]): string[] {
		const newArgs: string[] = [];
		for (const arg of args) {
			let newArg = "";

			// Scans through the string
			for (let i = 0; i < arg.length; i++) {
				const lastChar = arg[i - 1];
				const char = arg[i];

				// Checks if this current char is not a ", and before that wasn't escaping it
				if (char != `"` || lastChar == "\\") {
					newArg += char;
				}
			}

			// Push results
			newArgs.push(newArg);
		}

		return newArgs;
	}

	/**
	 * Voodoo magic that grabs parameters off of string, by grouping
	 * (properly) quoted strings in text, excluding codeblocks and escaped characters.
	 *
	 * @param content Message content
	 * @param showWrapperQuotes
	 */
	static getArgs(content: string, showWrapperQuotes?: boolean): string[] {
		const args: string[] = [];

		// Stores whether if we're in a codebloack or not
		let hasCodeBlock = false;

		// Stores whether there was a quote character
		// that has happened, and is waiting to be closed
		let hasDoubleQuote = false;

		// Contains the string between the two quote characters
		// or for anything other type of argument
		let quotedString = "";

		// Goes through all the arguments
		for (let i = 0; i < content.length; i++) {
			const element = content[i];
			const isDoubleQuote = element == `"`;
			const isSpace = element == " ";
			const isCodeBlock = element == "`";
			const isEndOfString = i + 1 == content.length;
			const isEscaped = content[i - 1] == "\\";

			// hasCodeBlock will be true when the message has codeblocks
			if (isCodeBlock) {
				hasCodeBlock = !hasCodeBlock;
			}
			// console.log(
			// 	`hasCodeBlock: ${hasCodeBlock} | hasDoubleQuote: ${hasDoubleQuote} | isEndOfString: ${isEndOfString}`
			// );

			if (hasDoubleQuote) {
				if (isDoubleQuote && !isEscaped && !hasCodeBlock) {
					// We are inside a double quote, and are about to seemingly close it
					// Closes double quote
					hasDoubleQuote = false;

					// Adds the quote if it's set as an option to
					if (showWrapperQuotes) {
						quotedString += element;
					}

					// Stops adding to the quoted string
					args.push(quotedString);
					// console.log(`END: "${quotedString}"\n`);
					quotedString = "";
				} else if (!isDoubleQuote || hasCodeBlock) {
					// Adds to the quoted string, if it isn't a quote, or it is
					// but it's suppsoed to be escaped in some way
					quotedString += element;
					hasDoubleQuote = true;
					// console.log(`Add: ${quotedString}` + "\n");

					// If it's the end of the string, and the user forgot
					// to add a closing ", we close it for them
					if (isEndOfString) {
						args.push(quotedString);
						quotedString = "";
					}
				}
			} else if (isDoubleQuote && !isEscaped) {
				// We are starting a double quote potentially
				if (!hasCodeBlock) {
					// Set it to check for the string between quotes
					hasDoubleQuote = true;

					// Add to arguments of what happened before, if anything
					// was contained in quotedString
					if (quotedString.length > 0) {
						args.push(quotedString);
						quotedString = "";
					}

					// Adds the quote if it's set as an option to
					if (showWrapperQuotes) {
						quotedString += element;
					}
				} else if (hasCodeBlock) {
					// If there's a codeblock, make sure we add codeblock characters
					// it in, since it doesn't add it otherwise.
					// We also don't enter into a "real" double quote.
					quotedString += element;
				}
			} else {
				// Where we're not going into a quote, nor are in one currently

				// Will add to the quotedString if a space
				// that splits things apart doesn't exist
				if (!isSpace || (isSpace && hasCodeBlock)) {
					// Adds to the argument text
					quotedString += element;
					// console.log("else: " + quotedString + "\n");
				}

				// console.log(`else: ${(!isSpace || hasCodeBlock)}`)

				if (
					// Checks if there's a space, but there's content in
					// quotedString and not in a codeblock
					(isSpace && quotedString.length > 0 && !hasCodeBlock) ||
					// Checks if there's no space and it's the last character
					(!isSpace && isEndOfString)
				) {
					// Pushes the string as an argument, if it's not empty
					// console.log(`ELSE END: "${quotedString}"\n`);
					args.push(quotedString);
					quotedString = "";
				}
			}
		}

		return args;
	}
}