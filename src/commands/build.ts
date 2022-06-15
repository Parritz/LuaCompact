import { build } from "../modules/build"

export default {
	name: "build",
	description: "Builds a luapacker project.",
	async run(): Promise<void> {
		await build();
		process.exit();
	}
}