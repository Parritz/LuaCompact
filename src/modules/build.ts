import fs from "fs";
import path from "path";
import util from "./util";
import { Module } from "../types";

const functions = fs.readFileSync(path.join(__dirname, "../functions.lua"), "utf8");

export async function getModules(directory: string): Promise<{ modules: Module; failedBuilds: string[]}> {
	const luaFileDirectories = await util.retrieveFiles(directory, [".lua", ".luau"]);
	const modules: Module = {}

	let failedBuilds: string[] = [];
	for (const fileDir of luaFileDirectories) {
		const file = fs.readFileSync(fileDir, "utf8");
		const firstLine = file.split("\n")[0].replace(/\s/g, ""); // Remove all whitespace and convert the first line to lowercase.
		if (firstLine.toLowerCase().includes("_name=")) {
			const _NAME = firstLine.split("=")[1].replace(/"|'/g, ""); // Remove all quotes to get the name from the first line.
			modules[_NAME] = file.split("\n").slice(1).join("\n"); // Remove the first line and join the rest of the file into a string.
		} else {
			util.error("Unable to find _NAME at the start of file: " + fileDir + "\nThis file will not be included in the final build.");
			failedBuilds.push(path.basename(fileDir));
		}
	}

	return {
		modules, 
		failedBuilds
	}
}

export async function build() {
	const directory = process.cwd();
	const buildDir = path.join(directory, "/build");
	const buildFileDir = path.join(buildDir, "/build.lua");
	const configDir = path.join(directory, "/luapacker.json");
	if (!fs.existsSync(configDir)) {
		util.error("No luapacker project found. Please run \"luapacker init\" to create a new project.");
		process.exit();
	}

	const config = JSON.parse(fs.readFileSync(configDir, "utf8"));
	const entryDir = path.join(directory, `/${config.main}`);
	const rootDir = path.join(directory, `/${config.rootDir}`);

	// Check if the entry file and root directory exists.
	if (!fs.existsSync(entryDir)) {
		util.error("No entry point found.");
		process.exit();
	}
	if (!fs.existsSync(rootDir)) {
		util.error("No root directory found.");
		process.exit();
	}
	if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir); // Create a build directory if one doesn't already exist.
	if (!fs.existsSync(buildFileDir)) fs.writeFileSync(buildFileDir, ""); // Create a build file if one doesn't already exist.

	const { modules, failedBuilds } = await getModules(rootDir);
	let finalBuild = "local luapackerModules = {}\n";
	for (const module in modules) {
		const originalModuleContents = modules[module];
		let formattedModuleContents = "";
		for (let line of originalModuleContents.split("\n")) {
			line = `\t${line}`;
			formattedModuleContents += line;
		}
		finalBuild += `luapackerModules["${module}"] = function()\n${formattedModuleContents}\nend\n`;
	}

	finalBuild += `\n${functions}\n\n${fs.readFileSync(entryDir, "utf8")}`;
	fs.writeFileSync(buildFileDir, finalBuild);

	if (failedBuilds.length > 0) {
		return util.warn("Completed build. Failed to build the following files: " + failedBuilds.join(", "));
	}
	return util.success("Completed build with 0 issues.");
}