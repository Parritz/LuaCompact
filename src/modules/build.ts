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

// Parses Luapacker reserved functions.
async function parseFunctions(excludedDirs: string[]): Promise<LoadedDirectories> {
	const luaFileDirs = await util.retrieveFiles(directory, [".lua", ".luau"]); // Get all files in the working directory that have a .lua or .luau extension.
	const loadedDirs: LoadedDirectories = {load: [], import: []}; // Create an object to store the loaded directories.

	const files: string[] = [];
	for (const fileDir of luaFileDirs) {
		if (fileDir === buildFileDir) continue; // Skip the build file.
		// Prevent excluded files from being parsed.
		let excludedLoad = false;
		for (const excludedDir of excludedDirs) {
			if (fileDir.startsWith(excludedDir) || fileDir.startsWith(excludedDir + ".lua") || fileDir.startsWith(excludedDir + ".luau")) {
				excludedLoad = true;
				break;
			}
		}
		if (excludedLoad) continue
		
		const file = fs.readFileSync(fileDir, "utf8");
		const lines = file.split("\n");
		for (const line of lines) {
			const words = line.split(" ");
			for (const word of words) {
				for (const reservedFunction of reservedFunctions) {
					if (!word.includes(`${reservedFunction}(`)) continue; // Skip words that don't contain a reserved Luapacker function.
					const splitRerservedFunc = word.split(`${reservedFunction}(`);
					if (splitRerservedFunc[0] != "") continue; // Ensure it's actually a reserved Luapacker function and not a function ending with the same keyword.
					
					const moduleDir = splitRerservedFunc[1].split(")")[0].replace(/"|'/g, ""); // Get the provided string from the function call.
					const absoluteModuleDir = path.join(directory, `/${moduleDir}`); // Get the absolute path of the string provided from the function call.

					// Prevent excluded files from being loaded/imported.
					let excludedLoad = false;
					for (const excludedDir of excludedDirs) {
						if (absoluteModuleDir.startsWith(excludedDir) || absoluteModuleDir.startsWith(excludedDir + ".lua") || absoluteModuleDir.startsWith(excludedDir + ".luau")) {
							excludedLoad = true;
							break;
						}
					}
					if (excludedLoad) continue
					loadedDirs[reservedFunction].push(moduleDir);
				}
			}
		}
	}
	console.log(loadedDirs)
	return loadedDirs;
}

// Handle load function calls.
function getModules(relativeLoadDirs: string[]): { modules: LoadedFiles; failedBuilds: string[]; } {
	const modules: LoadedFiles = {};
	const failedBuilds: string[] = [];
	for (let relativeLoadDir of relativeLoadDirs) {
		// If the module provided doesn't have a .lua or .luau extension, add it.
		// In this case, .lua takes priority over .luau. If somebody has two files with the same name but different extensions, then they will have to provide an extension.
		let loadDir = path.join(directory, `/${relativeLoadDir}`);
		if (!loadDir.endsWith(".lua") && !loadDir.endsWith(".luau")) {
			if (fs.existsSync(loadDir + ".lua")) {
				loadDir += ".lua";
			} else if (fs.existsSync(loadDir + ".luau")) {
				loadDir += ".luau";
			}
		}

		try {
			const module = fs.readFileSync(loadDir, "utf8");
			modules[relativeLoadDir] = module;
		} catch {
			util.error(`Unable to find module ${path.resolve(loadDir)}.\nThis file will not be included in the build.`);
			failedBuilds.push(relativeLoadDir);
		}	
	}

	return {
		modules,
		failedBuilds
	};
}

// Handle import function calls.
function getImports(relativeImportDirs: string[]): { [key: string]: LoadedFiles; } {
	const imports: LoadedFiles = {};
	const JSONImports: LoadedFiles = {};
	for (const relativeImportDir of relativeImportDirs) {
		const importDir = path.join(directory, `/${relativeImportDir}`);
		let importedFile: string = "";
		try {
			importedFile = fs.readFileSync(importDir, "utf8");
		} catch {
			util.error(`Unable to find import ${path.resolve(importDir)}.\nThis file will not be included in the build.`);
			continue;
		}

		try {
			if (importDir.endsWith(".json")) {
				JSONImports[relativeImportDir] = importedFile;
				continue;
			}
		} catch {
			util.error(`Invalid JSON provided in ${path.resolve(importDir)}.\nThis file will not be included in the build.`);
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
	// Check if a project exists in this directory and if not, exit.
	if (!fs.existsSync(configDir)) {
		util.error("No luapacker project found. Please run \"luapacker init\" to create a new project.");
		return;
	}

	// Parse config and get the entry directory.
	const config = JSON.parse(fs.readFileSync(configDir, "utf8"));
	const entryDir = path.join(directory, `/${config.main}`);
	const excludeDirs: string[] = [];
	if (config.exclude) {
		for (const excludeDir of config.exclude) {
			const absoluteExcludeDir = path.join(directory, `/${excludeDir}`);
			excludeDirs.push(absoluteExcludeDir);
		}
	}

	// Get loaded directories and modules.
	const loadedDirs = await parseFunctions(excludeDirs);
	const { modules, failedBuilds } = getModules(loadedDirs.load);
	const { imports, JSONImports } = getImports(loadedDirs.import);

	// Build the project.
	let finalBuild = "local luapackerImports = {}\nlocal luapackerModules = {}\n\n";

	const toBytes = (string: string) => {
		const buffer = Buffer.from(string, 'utf8');
		const result = Array(buffer.length);
		for (var i = 0; i < buffer.length; i++) {
			result[i] = buffer[i];
		}
		return result;
	};

	// Build the non-JSON imports.
	for (const importedFile in imports) {
		const importedFileContents: string = imports[importedFile];

		// Convert the imported file contents string to bytes
		const byteEncodedContents: string = toBytes(importedFileContents).join("\\");
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

	finalBuild += `\n${functions}\n\n${fs.readFileSync(entryDir, "utf8")}`;
	fs.writeFileSync(buildFileDir, finalBuild);

	if (failedBuilds.length > 0) {
		return util.warn("Completed build. Failed to build the following files: " + failedBuilds.join(", "));
	}
	return util.success("Completed build with 0 issues.");
}