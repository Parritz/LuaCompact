export type Command = {
	name: string;
	description: string;
	run(options: string[]): Promise<void> | void;
}

export type Config = {
	main: string;
	prelude?: string | string[];
	exclude?: string[];
	exportDirectory?: string;
}