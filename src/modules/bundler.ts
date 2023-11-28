import fs from "fs";
import path from "path";
import util from "./util.js";
import { Config } from "../types.js";

const currentDir = process.cwd();
const luaFunctions = fs.readFileSync(path.join(__dirname, "../functions.lua"), "utf8");
const configDir = path.join(currentDir, "/luacompact.json");
const failedBuilds: string[] = [];
const excludeList = [
	"luacompact.json",
	".vscode",
	".git"
];

let config: Config = JSON.parse(fs.readFileSync(configDir, "utf8"));

// Checks if the file directory is excluded in config
function isExcluded(fileDir: string, config: Config) {
	if (!config.exclude) return false;
	if (fileDir.startsWith((config.exportDirectory || "build/")) || fileDir === config.main || (config.prelude && fileDir === config.prelude)) return true;

	const absoluteDir = path.join(currentDir, fileDir);
	for (const excludedItem of excludeList) {
		if (absoluteDir.includes(excludedItem)) {
			return true;
		}
	}

	fileDir = util.addMissingExtension(fileDir, [".lua", ".luau"]);
	const excludedFiles = config.exclude;
	for (const excludedFile of excludedFiles) {
		if (fileDir.includes(excludedFile)) {
			return true;
		}
	}
}

// Builds all .Lua and .Luau files
function buildModules(files: string[], config: Config) {
	const luaFiles: string[] = [];
	for (const file of files) {
		if (path.extname(file).endsWith("lua") || path.extname(file).endsWith("luau")) {
			luaFiles.push(file);
		}
	}

	let moduleBuild = "";
	for (const luaFile of luaFiles) {
		const relativePath = path.relative(currentDir, luaFile).replace(/\\/g, "/");
		if (isExcluded(relativePath, config)) continue;

		let formattedContents = "";
		const fileContents = fs.readFileSync(luaFile, "utf8");
		for (let line of fileContents.split("\n")) {
			if (line.length != 1) line = `\t${line}`;
			formattedContents += line;
		}
		
		moduleBuild += `luacompactModules["${relativePath}"] = function()\n${formattedContents}\nend\n`;
		if (luaFiles[luaFiles.length - 1] === luaFile) moduleBuild += "\n";
	}

	return moduleBuild;
}

// Builds .json files and files with other extensions
function buildImports(files: string[], config: Config) {
	const failedBuilds: string[] = [];
	let importBuild = "";
	for (const file of files) {
		const extension = path.extname(file);
		const relativePath = path.relative(currentDir, file).replace(/\\/g, "/");
		if (extension.endsWith("lua") || extension.endsWith("luau")) continue;
		if (isExcluded(relativePath, config)) continue;
		
		const fileContents = fs.readFileSync(file, "utf8");
		if (!extension.endsWith(".json")) {
			const byteEncodedContents: string = util.stringToByteArray(fileContents).join("\\");
			importBuild += `luacompactImports["${relativePath}"] = function()\n\treturn "\\${byteEncodedContents}"\nend\n`;
			continue;
		}
		
		try {
			const parsedJSON = JSON.parse(fileContents);
			importBuild += `luacompactImports["${relativePath}"] = function()\n\tlocal object = {}\n`;
			for (const key of Object.keys(parsedJSON)) {
				const value = parsedJSON[key];
				if (typeof(value) === "string") {
					importBuild += `\tobject["${key}"] = "${value}"\n`;
				} else {
					importBuild += `\tobject["${key}"] = ${value}\n`;
				}
				
				if (Object.keys(parsedJSON)[Object.keys(parsedJSON).length - 1] === key) {
					importBuild += "\treturn object\nend\n\n";
				}
			}
		} catch {
			util.error(`Failed to parse JSON file: ${relativePath}.\nThis file will not be included in the final build.`);
			failedBuilds.push(relativePath);
			continue;
		}
	}
	
	return importBuild;
}

function addPrelude(preludeBuild: string, preludeFile: string) {
	if (!fs.existsSync(preludeFile)) {
		util.error(`Unable to find prelude file: ${config.prelude}.\nThis file will not be included in the final build.`);
		failedBuilds.push(preludeFile);
		return;
	}

	const preludeContent = fs.readFileSync(preludeFile, "utf8");
	preludeBuild += `${preludeContent}\n`;
}

export function build() {
	const startTime: number = Date.now();
	if (!fs.existsSync(configDir)) {
		util.error("No LuaCompact project found. Please run \"luacompact init\" to create a new project.");
		return;
	}

	config = JSON.parse(fs.readFileSync(configDir, "utf8"));
	if (!config.main || !fs.existsSync(config.main)) {
		util.error("No entry file found. Please run \"luacompact init\" to create a new project.");
		return;
	}

	const buildDir = path.join(currentDir, (config.exportDirectory || "build"));
	const buildFileDir = path.join(buildDir, "/build.lua");
	if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir);

	const files = util.retrieveFiles(currentDir);
	const moduleBuild = buildModules(files, config);
	const importBuild = buildImports(files, config);

	let preludeBuild = "";
	if (config.prelude instanceof Array) {
		for (const preludeFile of config.prelude) {
			addPrelude(preludeBuild, preludeFile);
		}
	} else {
		if (config.prelude) {
			addPrelude(preludeBuild, config.prelude);
		}
	}

	let finalBuild = `${luaFunctions}\n\n`;
	finalBuild += importBuild + preludeBuild + moduleBuild;
	finalBuild += `${fs.readFileSync(config.main, "utf8")}`;
	fs.writeFileSync(buildFileDir, finalBuild);

	const timeTaken: number = (Date.now() - startTime) / 1000;
	if (failedBuilds.length > 0) {
		return util.warn(`Finished building in ${timeTaken} seconds. Failed to build the following files: ${failedBuilds.join(", ")}`);
	}
	return util.success(`Finished building in ${timeTaken} seconds with 0 issues.`);
}