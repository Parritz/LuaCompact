import fs from "fs";
import path from "path";
import util from "./util";
import { Config } from "../types";

const directory = process.cwd();
const luaFunctions = fs.readFileSync(path.join(__dirname, "../functions.lua"), "utf8");
const buildFileDir = path.join(directory, "/build/build.lua");
const configDir = path.join(directory, "/luapacker.json");

async function checkExcluded(fileDir: string, config: Config): Promise<boolean> {
	if (!config.exclude) return false;
	const excludedFiles = config.exclude;
	fileDir = await util.checkExtension(fileDir, ".lua", ".luau");

	let excluded: boolean = false;
	for (const excludedFile of excludedFiles) {
		if (fileDir.includes(excludedFile)) {
			excluded = true;
			break;
		}
	}
	return excluded;
}

async function buildModules(files: string[], config: Config): Promise<string> {
	const luaFiles: string[] = [];
	for (const file of files) {
		if (path.extname(file).endsWith("lua") || path.extname(file).endsWith("luau")) {
			luaFiles.push(file);
		}
	}

	let moduleBuild: string = "";
	for (const luaFile of luaFiles) {
		const relativePath = path.relative(directory, luaFile).replace(/\\/g, "/");
		if (luaFile == buildFileDir || luaFile == path.resolve(config.main)) continue; // Ignore build.lua and the entry point file.
		if (await checkExcluded(relativePath, config)) continue; // Ignore files in the exclude list.
		const fileContents = fs.readFileSync(luaFile, "utf8");

		let formattedContents = "";
		for (let line of fileContents.split("\n")) {
			if (line.length != 1) line = `\t${line}`;
			formattedContents += line;
		}
		moduleBuild += `luapackerModules["${relativePath}"] = function()\n${formattedContents}\nend\n`;
		if (luaFiles[luaFiles.length - 1] === luaFile) moduleBuild += "\n";
	}
	return moduleBuild;
}

async function buildImports(files: string[], config: Config): Promise<{ importBuild: string; failedBuilds: string[]; }> {
	const failedBuilds: string[] = [];
	let importBuild: string = "";
	for (const file of files) {
		const relativePath = path.relative(directory, file).replace(/\\/g, "/");
		const extension = path.extname(file);
		if (extension.endsWith("lua") || extension.endsWith("luau")) continue; // Ignore lua files
		if (file.includes("luapacker.json") || file.includes(".vscode") || file.includes(".git")) continue; // Ignore luapacker.json, .vscode, and .git files.
		if (await checkExcluded(relativePath, config)) continue; // Ignore files in the exclude list.

		const fileContents = fs.readFileSync(file, "utf8");
		if (extension.endsWith(".json")) {
			try {
				const parsedJSON = JSON.parse(fileContents);
				importBuild += `luapackerImports["${relativePath}"] = function()\n\tlocal object = {}\n`;
				for (const key of Object.keys(parsedJSON)) {
					const value = parsedJSON[key];
					if (typeof(value) === "string") {
						importBuild += `\tobject["${key}"] = "${value}"\n`;
						continue;
					}
					importBuild += `\tobject["${key}"] = ${value}\n`;
					
					if (Object.keys(parsedJSON)[Object.keys(parsedJSON).length - 1] === key) {
						importBuild += "\treturn object\nend\n\n";
					}
				}
			} catch {
				util.error(`Failed to parse JSON file: ${relativePath}.\nThis file will not be included in the final build.`);
				failedBuilds.push(relativePath);
				continue;
			}
			
		} else {
			const byteEncodedContents: string = util.stringToByteArray(fileContents).join("\\");
			importBuild += `luapackerImports["${relativePath}"] = function()\n\treturn "\\${byteEncodedContents}"\nend\n`;
		}
	}
	
	return {
		importBuild,
		failedBuilds
	};
}

export async function build() {
	const startTime: number = Date.now();
	if (!fs.existsSync(configDir)) {
		util.error("No Luapacker project found. Please run \"luapacker init\" to create a new project.");
		return;
	}
	const config: Config = JSON.parse(fs.readFileSync(configDir, "utf8"));
	if (!config.main || !fs.existsSync(config.main)) {
		util.error("No entry file found. Please run \"luapacker init\" to create a new project.");
		return;
	}
	
	const files = await util.retrieveFiles(directory);
	const moduleBuild = await buildModules(files, config);
	const { importBuild, failedBuilds } = await buildImports(files, config);

	let preludeBuild = "";
	if (config.prelude && config.prelude != "") {
		if (!fs.existsSync(config.prelude)) {
			util.error(`Unable to find prelude file: ${config.prelude}.\nThis file will not be included in the final build.`);
			failedBuilds.push(config.prelude);
		}
		const prelude = fs.readFileSync(config.prelude, "utf8");
		preludeBuild = `${prelude}\n`;
	}

	let finalBuild = `${luaFunctions}\n\n`;
	finalBuild += importBuild + preludeBuild + moduleBuild;
	finalBuild += `${fs.readFileSync(config.main, "utf8")}`;
	
	fs.writeFileSync(buildFileDir, finalBuild);
	const timeTaken: number = (Date.now() - startTime) / 1000 // Get the amount of time taken for the build to complete in seconds.
	if (failedBuilds.length > 0) {
		return util.warn(`Finished building in ${timeTaken} seconds. Failed to build the following files: ${failedBuilds.join(", ")}`);
	}
	return util.success(`Finished building in ${timeTaken} seconds with 0 issues.`);
}