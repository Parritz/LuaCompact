function load(dir)
    local loadedScript = luapackerModules[dir]
	if typeof(loadedScript) == "function" then
		return loadedScript()
	end
    return "Invalid script path."
end

function import(dir)
	local importedFile = luapackerImports[dir]
	if typeof(importedFile) == "function" then
		return importedFile()
	end
    return "Invalid file path."
end