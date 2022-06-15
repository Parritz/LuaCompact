import fs from "fs";
import path from "path";
import chalk from "chalk";
import readline from "readline"
import util from "util";

const readlineInterface = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});
const promptUser = util.promisify(readlineInterface.question).bind(readlineInterface);

export default {
	success(message: string): void {
		console.log(chalk.green("[SUCCESS]: ") + message);
	},

	log(message: string): void {
		console.log(chalk.blue("[INFO]: ") + message);
	},

	warn(message: string): void {
		console.log(chalk.yellow("[WARNING]: ") + message);
	},

	error(message: string): void {
		console.log(chalk.red("[ERROR]: ") + message);
	},

	async prompt(question: string): Promise<string> {
		return await promptUser(question) as unknown as string;
	},

	async retrieveFiles(directory: string, extensions: string[]): Promise<string[]> {
		const files: string[] = [];
		fs.readdirSync(directory).forEach(async (file) => {
			const extension = path.extname(file);
			if (extensions.includes(extension)) {
				files.push(path.resolve(path.join(directory, file)));
			}
	
			// Walk through subdirectories and add any files matching the wanted extensions to the list.
			if (fs.lstatSync(path.join(directory, file)).isDirectory()) {
				const filesWithinDir = await this.retrieveFiles(path.join(directory, file), extensions);
				files.push(...filesWithinDir);
			}
		});
		return files;
	}
}