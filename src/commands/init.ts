import fs from "fs";
import path from "path";
import util from "../modules/util";

const defaultJSON = {
	main: "index.lua",
	prelude: "",
	exclude: []
};

export default {
	name: "init",
	description: "Initializes a new LuaCompact project",
	async run(): Promise<void> {
		const currentDirectory = process.cwd();
		const configDir = path.join(currentDirectory, "/luacompact.json");

		if (!fs.existsSync(configDir)) {
			const entryDirInput = await util.prompt("Please enter the entry file name: ");
			if (entryDirInput) {
				let entryDir = entryDirInput;
				if (!entryDirInput.endsWith(".lua") && !entryDirInput.endsWith(".luau")) entryDir += ".lua";
				defaultJSON.main = entryDir;
			}

			// Create the config file and the entry point file if it doesn't already exist.
			const entryDir = path.join(currentDirectory, `/${defaultJSON.main}`);
			fs.writeFileSync(configDir, JSON.stringify(defaultJSON, null, 4));
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
};