import fs from "fs";
import path from "path"
import util from "../modules/util";

const defaultJSON = {
	main: "index.lua",
	prelude: "",
	exclude: [],
}

export default {
	name: "init",
	description: "Initializes a new LuaCompact project",
	async run(): Promise<void> {
		const currentDirectory = process.cwd();
		const configDir = path.join(currentDirectory, "/luacompact.json");

		if (!fs.existsSync(configDir)) {
			// Prompt the user for the entry file and module directory.
			const entryDirInput = await util.prompt("Please enter the entry file: ");

			// If the user provides both an entry file and a root directory, we'll use those.
			// If not, it's safe to assume they want to use the default values.
			if (entryDirInput) {
				let entryDir = entryDirInput;
				if (!entryDirInput.endsWith(".lua") && !entryDirInput.endsWith(".luau")) entryDir += ".lua";
				defaultJSON.main = entryDir;
			}
			fs.writeFileSync(configDir, JSON.stringify(defaultJSON, null, 4)); // Create the config file in the user's working directory.

			// Create the entry point file and root directory if they don't already exists.
			const entryDir = path.join(currentDirectory, `/${defaultJSON.main}`);
			if (!fs.existsSync(entryDir)) {
				fs.writeFileSync(entryDir, "print(\"Hello World!\")");
				util.log(`No entry point found. Created ${defaultJSON.main}.`);
			}
			util.success("Initialized project!");
		} else {
			util.error("A LuaCompact project already exists here.");
		}
		process.exit();
	}
}