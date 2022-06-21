import fs from "fs";
import path from "path";
import util from "./util";
import { LoadedFiles, LoadedDirectories } from "../types";

// Retrieve reserved functions and their implementations.
const functions = fs.readFileSync(path.join(__dirname, "../functions.lua"), "utf8");
const reservedFunctions = ["load", "import"];

// Define some important directories.
const directory = process.cwd();
const buildDir = path.join(directory, "/build");
const buildFileDir = path.join(buildDir, "/build.lua");
const configDir = path.join(directory, "/luapacker.json");

// Checks if the directory provided is excluded from building.
async function checkExcluded(dir: string, excludedDirs: string[]): Promise<boolean> {
	dir = await util.checkExtension(dir, ".lua", ".luau");
	let excluded = false;
	for (const excludedDir of excludedDirs) {
		if (dir.includes(excludedDir)) {
			excluded = true;
			break;
		}
	}
	return excluded;
}

// Parses Luapacker reserved functions.
async function parseFunctions(excludedDirs: string[]): Promise<LoadedDirectories> {
	const luaFileDirs = await util.retrieveFiles(directory, [".lua", ".luau"]); // Get all files in the working directory that have a .lua or .luau extension.
	const loadedDirs: LoadedDirectories = {load: [], import: []}; // Create an object to store the loaded directories.

	for (const fileDir of luaFileDirs) {
		if (fileDir === buildFileDir) continue; // Skip the build file.
		if (await checkExcluded(fileDir, excludedDirs)) continue; // Skip excluded files.
		
		const file = fs.readFileSync(fileDir, "utf8");
		const lines = file.split("\n");
		for (const line of lines) {
			const words = line.split(" ");
			if (words[0].includes("--")) continue; // Skip comments.
			for (const word of words) {
				for (const reservedFunction of reservedFunctions) {
					if (!word.includes(`${reservedFunction}(`)) continue; // Skip words that don't contain a reserved Luapacker function.
					const splitRerservedFunc = word.split(`${reservedFunction}(`);
					if (splitRerservedFunc[0] != "") continue; // Ensure it's actually a reserved Luapacker function and not a function ending with the same keyword.
					
					const moduleDir = splitRerservedFunc[1].split(")")[0].replace(/"|'/g, ""); // Get the provided string from the function call.
					if (await checkExcluded(path.join(directory, `/${moduleDir}`), excludedDirs)) continue; // Don't include excluded files.
					loadedDirs[reservedFunction].push(moduleDir);
				}
			}
		}
	}
	return loadedDirs;
}

// Handle load function calls.
async function getModules(relativeLoadDirs: string[]): Promise<{ modules: LoadedFiles; failedBuilds: string[]; }> {
	const modules: LoadedFiles = {};
	const failedBuilds: string[] = [];
	for (let relativeLoadDir of relativeLoadDirs) {
		// If the module provided doesn't have a .lua or .luau extension, add it.
		// In this case, .lua takes priority over .luau. If somebody has two files with the same name but different extensions, then they will have to provide an extension.
		const loadDir = await util.checkExtension(path.join(directory, `/${relativeLoadDir}`), ".lua", ".luau");
		try {
			const module = fs.readFileSync(loadDir, "utf8");
			modules[relativeLoadDir] = module;
		} catch {
			util.error(`Unable to find module: ${path.resolve(loadDir)}.\nThis file will not be included in the build.`);
			failedBuilds.push(relativeLoadDir);
		}	
	}

	return {
		modules,
		failedBuilds
	};
}

// Handle import function calls.
async function getImports(relativeImportDirs: string[]): Promise<{ [key: string]: LoadedFiles; }> {
	const imports: LoadedFiles = {};
	const JSONImports: LoadedFiles = {};
	for (const relativeImportDir of relativeImportDirs) {
		const importDir = path.join(directory, `/${relativeImportDir}`);
		let importedFile: string = "";
		try {
			importedFile = fs.readFileSync(importDir, "utf8");
		} catch {
			util.error(`Unable to find import: ${path.resolve(importDir)}.\nThis file will not be included in the build.`);
			continue;
		}

		try {
			if (importDir.endsWith(".json")) {
				JSONImports[relativeImportDir] = importedFile;
				continue;
			}
		} catch {
			util.error(`Invalid JSON provided in import: ${path.resolve(importDir)}.\nThis file will not be included in the build.`);
			continue;
		}
		imports[relativeImportDir] = importedFile;
	}
	
	return {
		imports,
		JSONImports
	};
}

export async function build() {
	const startTime = Date.now(); // Get the start time for later use
	// Check if a project exists in this directory and if not, exit.
	if (!fs.existsSync(configDir)) {
		util.error("No luapacker project found. Please run \"luapacker init\" to create a new project.");
		return;
	}

	// Parse config and get the entry, prelude, and excluded directories.
	const config = JSON.parse(fs.readFileSync(configDir, "utf8"));
	const entryDir = path.join(directory, `/${config.main}`);
	const preludeDir = config.prelude;
	const excludeDirs: string[] = [];
	if (config.exclude) {
		for (const excludeDir of config.exclude) {
			const absoluteExcludeDir = path.join(directory, `/${excludeDir}`);
			excludeDirs.push(absoluteExcludeDir);
		}
	}

	// Get loaded directories and modules.
	const loadedDirs = await parseFunctions(excludeDirs);
	const { modules, failedBuilds } = await getModules(loadedDirs.load);
	const { imports, JSONImports } = await getImports(loadedDirs.import);

	// Initialize the final build with some default objects.
	let finalBuild = "local luapackerImports = {}\nlocal luapackerModules = {}\n\n";

	// Build the non-JSON imports.
	for (const importedFile in imports) {
		const importedFileContents: string = imports[importedFile];

		// Convert the imported file contents string to bytes
		const byteEncodedContents: string = util.stringToByteArray(importedFileContents).join("\\");
		finalBuild += `luapackerImports["${importedFile}"] = function()\n\treturn "\\${byteEncodedContents}"\nend\n`;
		
		// If the last imported file is being iterated, then add a line break.
		if (Object.keys(imports)[Object.keys(imports).length - 1] === importedFile) finalBuild += "\n";
	}
	
	// Build the JSON imports.
	for (const importedJSONFile in JSONImports) {
		finalBuild += `luapackerImports["${importedJSONFile}"] = function()\n\tlocal object = {}\n`;

		const parsedJSON = JSON.parse(JSONImports[importedJSONFile]);
		for (const key of Object.keys(parsedJSON)) {
			const value = parsedJSON[key];
			if (typeof(value) === "string") {
				finalBuild += `\tobject["${key}"] = "${value}"\n`;
				continue;
			}
			finalBuild += `\tobject["${key}"] = ${value}\n`;
			
			// If the last key is being iterated, then add a return and end statement then a line break.
			if (Object.keys(parsedJSON)[Object.keys(parsedJSON).length - 1] === key) finalBuild += "\treturn object\nend\n\n";
		}
	}

	// If a prelude directory is provided, then include that in the final build.
	if (preludeDir) {
		// Add an extension if one isn't already provided.
		const preludeAbsoluteDir = await util.checkExtension(path.join(directory, `/${preludeDir}`), ".lua", ".luau");

		try {
			const preludeLines = fs.readFileSync(preludeAbsoluteDir, "utf8").split("\n");
			for (const line of preludeLines) {
				finalBuild += line + "\n";
				if (preludeLines[preludeLines.length - 1] === line) finalBuild += "\n"; // If it's the last line, then add a line break.
			}
		} catch {
			util.error(`Invalid prelude directory provided: ${path.resolve(preludeAbsoluteDir)}.\nThis file will not be included in the build.`);
			failedBuilds.push(preludeDir);
		}
	}

	// Build the modules.
	for (const module in modules) {
		const originalModuleContents = modules[module];
		let formattedModuleContents = "";
		for (let line of originalModuleContents.split("\n")) {
			if (line.length != 1) line = `\t${line}`; // If the line is not empty, add a tab before it.
			formattedModuleContents += line;
		}
		finalBuild += `luapackerModules["${module}"] = function()\n${formattedModuleContents}\nend\n`;
	}

	finalBuild += `${functions}\n\n${fs.readFileSync(entryDir, "utf8")}`;
	fs.writeFileSync(buildFileDir, finalBuild);

	const timeTaken = (Date.now() - startTime) / 1000 // Get the amount of time taken for the build.
	if (failedBuilds.length > 0) {
		return util.warn(`Completed build in ${timeTaken} seconds. Failed to build the following files: ${failedBuilds.join(", ")}`);
	}
	return util.success(`Completed build in ${timeTaken} seconds with 0 issues.`);
}