local luapackerImports = {}
local luapackerModules = {}

function resolvePath(dir, luapackerTable)
	while string.sub(dir, 1, 1) == "." or string.sub(dir, 1, 1) == "/" do
		dir = string.sub(dir, 2)
	end

	if luapackerTable[dir..".lua"] then
		dir = dir..".lua"
	elseif luapackerTable[dir..".luau"] then
		dir = dir..".luau"
	end
	return dir
end

function load(dir)
	local path = resolvePath(dir, luapackerModules)
	local loadedScript = luapackerModules[path]
	if typeof(loadedScript) == "function" then
		return loadedScript()
	end
	return "Invalid script path."
end

function import(dir)
	local path = resolvePath(dir, luapackerImports)
	local importedFile = luapackerImports[path]
	if typeof(importedFile) == "function" then
		return importedFile()
	end
	return "Invalid file path."
end