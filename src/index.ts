#! /usr/bin/env node
import fs from "fs";
import path from "path";
import util from "./modules/util";
import { Command, Commands } from "./types";

const commands: Commands = {};
const commandFolder: string = path.join(__dirname, "/commands");
fs.readdirSync(commandFolder).forEach((file) => {
	const command: Command = require(path.join(commandFolder, file)).default;
	commands[command.name] = command;
});

const args: string[] = process.argv.splice(2);
const commandProvided: string | undefined = args.shift();
if (commandProvided && commands[commandProvided]) {
	commands[commandProvided].run();
} else {
	util.error("Invalid command provided.");
	process.exit();
}