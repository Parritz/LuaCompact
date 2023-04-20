import fs from "fs";
import path from "path";
import util from "../modules/util";
import { build } from "../modules/build";
import { Config } from "../types";

async function watchBuild(): Promise<void> {
	await build();
	util.log("Watching for changes...");
}

export default {
	name: "build",
	description: "Builds a LuaCompact project.",
	async run(options: string[]): Promise<void> {
		await build();
		if (!options.includes("--watch")) process.exit(); // If the user did not include a watch option, exit the process.
		
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

		const files = await util.retrieveFiles(currentDir);
		const directories = await util.retrieveDirectories(currentDir);
		util.log("Watching for changes...");
		for (const file of files) {
			if (file.startsWith(buildDir)) continue; // Skip files in the build directory.
			if (excludeDirs.includes(file)) continue; // Skip excluded files.
			fs.watchFile(file, { interval: 500 }, async () => {
				await watchBuild();
			});
		}

		files.push(currentDir);
		for (const file of files) {
			if (file.startsWith(buildDir)) continue; // Skip files in the build directory.
			fs.watchFile(file, { interval: 500 }, async () => {
				const currentFiles = await util.retrieveFiles(currentDir);
				for (const file of currentFiles) {
					// Watch files that are added to the project.
					if (!files.includes(file)) {
						files.push(file);
						await watchBuild();
						fs.watchFile(file, { interval: 500 }, async () => {
							await watchBuild();
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