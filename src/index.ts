#! /usr/bin/env node
import fs from "fs";
import path from "path";
import util from "./modules/util";
import { Command, Commands } from "./types";

const commands: Commands = {};
const commandFolder: string = path.join(__dirname, "/commands");
fs.readdirSync(commandFolder).forEach((file) => {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const command: Command = require(path.join(commandFolder, file)).default;
	commands[command.name] = command;
});

// Get all flags provided with the command.
const args: string[] = process.argv.splice(2);
const commandProvided: string | undefined = args.shift();
const flags: string[] = [];
while (args.length > 0) {
	const arg = args.shift();
	if (!arg) continue;
	if (arg.startsWith("--")) {
		flags.push(arg);
	} else {
		args.unshift(arg);
		break;
	}
}

if (commandProvided && commands[commandProvided]) {
	commands[commandProvided].run(flags);
} else {
	util.error("Invalid command provided.");
	process.exit();
}