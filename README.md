# Luapacker

Luapacker is a Lua bundler written in Typescript that combines multiple Lua files into one. This makes managing large-scale projects a breeze.

## Installation

Before installing Luapacker, ensure that you have [Node.js](https://nodejs.org/en/) installed.<br>
After that, you can install Luapacker using one of the commands below depending on which package manager you prefer.

```bash
# Using NPM
npm i lua-packer -g

# Using Yarn
yarn global add lua-packer
```

After installation, you should be able to use Luapacker either by using `luapacker` or `lpk` in CLI. 

## Usage

### Creating a project

Once Luapacker is installed, you will first have to create a Luapacker project.<br>
To create a Luapacker project, open the directory you want the project in and run the command below.

```bash
luapacker init
```

### Building a project
To build a project, all you need to do is run the command below.<br>
Optionally, you can also include a --watch parameter to the command to automatically have Luapacker build the project once a file is changed.

```bash
# Building without --watch
luapacker build

# Building with --watch
luapacker build --watch
```

### Loading modules/scripts

Loading a module/script is made pretty simple.<br> 
All you need to do is use the `load` function and pass through a relative path to the script you want to load.<br>
The `load` function supports both .lua and .luau files.

index.lua Example:
```lua
local core = load("src/core.lua")
core.helloWorld()
```

core.lua Example:
```lua
local core = {}

function core.helloWorld()
    print("Hello world!")
end

return core
```

### Importing other files

Not only can you load modules, but you can also import other files using the `import` function.<br>
Unlike the `load` function, the `import` function requires the file extension in the function call.<br>

JSON files are automatically converted to Lua dictionaries, while every other file will be converted to text.<br>

index.lua Example:
```lua
local defaultConfig = import("assets/config.json")
print(defaultConfig.Enabled)
```

config.json Example:
```json
{
    "Enabled": true
}
```

### Config

Every Luapacker project has a config file called `luapacker.json`.<br>
Below, you can see the options and what each option is used for.

| Key | Description | Input | Type | Required |
| --- | --- | --- | --- | --- |
| main | The program entry point. | A directory to a lua file. | string | true |
| prelude | Code that runs after imports are defined but before modules are defined. | A directory to a lua file. | string | false |
| exclude | Files that aren't included in the final output. | A list of directories. | string[] | false |