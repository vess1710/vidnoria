Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\pc\.gemini\antigravity\scratch\vidnoria"
WshShell.Run "node scripts/cloudflare-manager.js", 0, False
Set WshShell = Nothing
