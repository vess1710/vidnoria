Set Fso = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = Fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.Run "node scripts/cloudflare-manager.js", 0, False
Set WshShell = Nothing
Set Fso = Nothing
