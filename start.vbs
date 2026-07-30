Set WshShell = CreateObject("WScript.Shell")

' Change directory to script directory
strPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strPath

' Launch backend directly with node (completely hidden)
WshShell.Run "cmd /c node node_modules/tsx/dist/cli.mjs server/index.ts > .backend.log 2>&1", 0, False

' Wait 2 seconds
WScript.Sleep 2000

' Launch frontend directly with node (completely hidden)
WshShell.Run "cmd /c node node_modules/vite/bin/vite.js --port 5173 > .frontend.log 2>&1", 0, False

' Wait 3 seconds then open browser
WScript.Sleep 3000
WshShell.Run "http://localhost:5173"
