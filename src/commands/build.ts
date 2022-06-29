import fs from "fs";
import path from "path";
import util from "../modules/util";
import { build } from "../modules/build"

async function watchBuild(): Promise<void> {
	await build();
	util.log("Watching for changes...");
}

export default {
	name: "build",
	description: "Builds a luapacker project.",
	async run(options: string[]): Promise<void> {
		await build();
		if (!options.includes("--watch")) process.exit(); // If the user did not include a watch option, exit the process.
		const currentDir = process.cwd();
		const configDir = path.join(currentDir, "/luapacker.json");
		if (!fs.existsSync(configDir)) process.exit();
		
		const buildDir = path.join(currentDir, "/build");
		const config = JSON.parse(fs.readFileSync(configDir, "utf8"));
		const excludeDirs: string[] = [];
		if (config.exclude) {
			for (const excludeDir of config.exclude) {
				const absoluteExcludeDir = path.join(currentDir, `/${excludeDir}`);
				excludeDirs.push(absoluteExcludeDir);
			}
		}

		const files = await util.retrieveFiles(currentDir);
		util.log("Watching for changes...");
		for (const file of files) {
			if (file.startsWith(buildDir)) continue; // Skip files in the build directory.
			if (excludeDirs.includes(file)) continue; // Skip excluded files.
			fs.watchFile(file, { interval: 500 }, async () => {
				await watchBuild();
			});
		}

		const directories = await util.retrieveDirectories(currentDir);
		directories.push(currentDir);
		for (const directory of directories) {
			if (directory.startsWith(buildDir)) continue; // Skip files in the build directory.
			fs.watchFile(directory, { interval: 500 }, async () => {
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
}