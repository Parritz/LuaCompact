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
		const directory = process.cwd();
		const configDir = path.join(directory, "/luapacker.json");
		if (!fs.existsSync(configDir)) process.exit();
		
		const buildFileDir = path.join(directory, "/build/build.lua");
		const config = JSON.parse(fs.readFileSync(configDir, "utf8"));
		const excludeDirs: string[] = [];
		if (config.exclude) {
			for (const excludeDir of config.exclude) {
				const absoluteExcludeDir = path.join(directory, `/${excludeDir}`);
				excludeDirs.push(absoluteExcludeDir);
			}
		}

		const files = await util.retrieveFiles(directory);
		util.log("Watching for changes...");
		for (const file of files) {
			if (file == buildFileDir) continue; // Skip build file.
			if (excludeDirs.includes(file)) continue; // Skip excluded files.
			fs.watchFile(file, { interval: 500 }, async () => {
				await watchBuild();
			});
		}

		fs.watchFile(directory, { interval: 500 }, async () => {
			await watchBuild();
			const newFiles = await util.retrieveFiles(directory);
			for (const newFile of newFiles) {
				if (!files.includes(newFile)) {
					files.push(newFile);
					fs.watchFile(newFile, { interval: 500 }, async () => {
						await watchBuild();
					});
				}
			}
		});
	}
}