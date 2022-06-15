export type Command = {
	name: string;
	description: string;
	run(): Promise<void> | void;
}

export type Commands = {
	[key: string]: Command;
}

export type Module = {
	[key: string]: string;
}