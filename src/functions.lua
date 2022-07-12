local luacompactImports = {}
local luacompactModules = {}

function resolvePath(dir, luacompactTable)
	while string.sub(dir, 1, 1) == "." or string.sub(dir, 1, 1) == "/" do
		dir = string.sub(dir, 2)
	end

	if luacompactTable[dir..".lua"] then
		dir = dir..".lua"
	elseif luacompactTable[dir..".luau"] then
		dir = dir..".luau"
	end
	return dir
end

function load(dir)
	local path = resolvePath(dir, luacompactModules)
	local loadedScript = luacompactModules[path]
	if typeof(loadedScript) == "function" then
		return loadedScript()
	end
	return "Invalid script path."
end

function import(dir)
	local path = resolvePath(dir, luacompactImports)
	local importedFile = luacompactImports[path]
	if typeof(importedFile) == "function" then
		return importedFile()
	end
	return "Invalid file path."
end