# Bypass npm (which spawns cmd.exe). Run: powershell -ExecutionPolicy Bypass -File .\dev.ps1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Test-Path '.\node_modules\next\package.json')) {
  Write-Error 'Run npm install in this folder first.'
}
node .\node_modules\next\dist\bin\next dev
