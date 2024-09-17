#! /usr/bin/env node
import fs from "fs";
import path from "path";
import util from "./modules/util.js";
import { Command } from "./types.js";

const commands: { [cmdName: string]: Command } = {};
const commandFolder: string = path.join(__dirname, "/commands");
fs.readdirSync(commandFolder).forEach((file) => {
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
	if (arg.startsWith("-")) {
		flags.push(arg);
	} else {
		args.unshift(arg);
		break;
	}
}

if (commandProvided && commands[commandProvided]) {
	(async () => {
		await commands[commandProvided].run(flags);
		if (!flags.includes("-w") && !flags.includes("-watch")) {
			process.exit();
		}
	})();
} else {
	util.error("Invalid command provided.");
}