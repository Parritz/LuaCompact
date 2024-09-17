import fs from "fs";
import path from "path";
import util from "../modules/util.js";

const defaultJSON = {
	main: "index.lua",
	prelude: [],
	exclude: [],
	exportDirectory: "build"
};

export default {
	name: "init",
	description: "Initializes a new LuaCompact project",
	async run() {
		const currentDir = process.cwd();
		const configDir = path.join(currentDir, "/luacompact.json");
		if (fs.existsSync(configDir)) {
			return util.error("A LuaCompact project already exists here.");
		}

		const entryDirInput = await util.prompt("Please enter the entry file name: ");
		if (entryDirInput) {
			let entryDir = entryDirInput;
			if (!entryDirInput.endsWith(".lua") && !entryDirInput.endsWith(".luau")) entryDir += ".lua";
			defaultJSON.main = entryDir;
		}

		// Create the config file and the entry point file if it doesn't already exist.
		const entryDir = path.join(currentDir, `/${defaultJSON.main}`);
		fs.writeFileSync(configDir, JSON.stringify(defaultJSON, null, 4));
		if (!fs.existsSync(entryDir)) {
			fs.writeFileSync(entryDir, "print(\"Hello World!\")");
			util.log(`No entry point found. Created ${defaultJSON.main}.`);
		}
		
		util.success("Initialized project!");
	}
};