import fs from "fs";
import path from "path";
import util from "../modules/util.js";
import { build } from "../modules/bundler.js";
import { Config } from "../types.js";

function watchBuild() {
	build();
	util.log("Watching for changes...");
}

export default {
	name: "build",
	description: "Builds a LuaCompact project.",
	async run(options: string[]) {
		build();
		if (!options.includes("-watch") && !options.includes("-w")) process.exit(); // If the user did not include a watch option, exit the process.
		
		const currentDir = process.cwd();
		const config: Config = JSON.parse(fs.readFileSync(path.join(currentDir, "/luacompact.json"), "utf8"));
		const buildDir = path.join(currentDir, (config.exportDirectory || "/build"));
		const excludeDirs: string[] = [];
		if (config.exclude) {
			for (const excludeDir of config.exclude) {
				const absoluteExcludeDir = path.join(currentDir, `/${excludeDir}`);
				excludeDirs.push(absoluteExcludeDir);
			}
		}

		const files = util.retrieveFiles(currentDir);
		// const directories = util.retrieveDirectories(currentDir); (to be removed?)

		util.log("Watching for changes...");
		for (const file of files) {
			if (file.startsWith(buildDir)) continue; // Skip files in the build directory.
			if (excludeDirs.includes(file)) continue; // Skip excluded files.
			fs.watchFile(file, { interval: 500 }, async () => {
				watchBuild();
			});
		}

		files.push(currentDir);
		for (const file of files) {
			if (file.startsWith(buildDir)) continue; // Skip files in the build directory.
			fs.watchFile(file, { interval: 500 }, async () => {
				const currentFiles = util.retrieveFiles(currentDir);
				for (const file of currentFiles) {
					// Watch files that are added to the project.
					if (!files.includes(file)) {
						files.push(file);
						watchBuild();
						fs.watchFile(file, { interval: 500 }, async () => {
							watchBuild();
						});
					}

					// Stop watching files when they're removed from the project.
					if (!currentFiles.includes(file)) {
						files.splice(files.indexOf(file), 1);
						fs.unwatchFile(file);
					}
				}
			});
		}
	}
};