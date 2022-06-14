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
	}
}