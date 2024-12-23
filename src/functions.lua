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

function getFileType(filePath,file)
    if not filePath or not file then
        return
    end

    local currentFileExtension = filePath:match("^.+%.([^.]+)$")

    if currentFileExtension == "luau" then
        return typeof(file)
    end

    return type(file)
end

function load(dir)
	local path = resolvePath(dir, luacompactModules)
	local loadedScript = luacompactModules[path]
	if getFileType(path,loadedScript) == "function" then
		return loadedScript()
	end
	return "Invalid script path."
end

function import(dir)
	local path = resolvePath(dir, luacompactImports)
	local importedFile = luacompactImports[path]
	if getFileType(path,importedFile) == "function" then
		return importedFile()
	end
	return "Invalid file path."
end