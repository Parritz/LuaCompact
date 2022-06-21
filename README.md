# Luapacker

Luapacker is a Lua bundler written in Typescript that combines multiple Lua files into one. This makes managing large-scale projects a breeze.<br>

## Installation

to-do

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
Unlike the load function, the import function requires the file extension in the function call.<br>

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