import fs from "fs";
import path from "path"
import util from "../util";

const defaultJSON = {
	main: "index.lua",
	rootDir: "src"
}

export default {
	name: "init",
	description: "Initializes a new luapacker project",
	async run(): Promise<void> {
		const directory = process.cwd();
		const configPath = path.join(directory, "/luapacker.json");

		if (!fs.existsSync(configPath)) {
			const entryFileInput = await util.prompt("Please enter the project's entry file: ");
			const rootDir = await util.prompt("Please enter the module directory: ");

			// If the user provides both an entry file and a root directory, we'll use those.
			// If not, it's safe to assume they want to use the default values.
			if (entryFileInput) {
				let entryFile = entryFileInput;
				if (!entryFileInput.endsWith(".lua") || !entryFileInput.endsWith(".luau")) {
					entryFile += ".lua";
				}
				defaultJSON.main = entryFile;
			}
			if (rootDir) defaultJSON.rootDir = rootDir;
			fs.writeFileSync(configPath, JSON.stringify(defaultJSON, null, 4)); // Create the config file in the user's working dfirectory.

			// Create the entry point file if it doesn't already exist.
			const entryFilePath = path.join(directory, `/${defaultJSON.main}`);
			if (!fs.existsSync(entryFilePath)) {
				fs.writeFileSync(entryFilePath, "print(\"Hello World!\")");
				util.log(`No entry point found. Created ${defaultJSON.main}.`);
			}
			util.success("Initialized project!");
		} else {
			util.error("A luapacker project already exists here.");
		}
		process.exit();
	}
}