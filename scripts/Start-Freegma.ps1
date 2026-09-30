[CmdletBinding()]
param([int]$Port=4330,[string]$NodePath='node')
$ErrorActionPreference='Stop'
$source=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$env:FREEGMA_PORT=[string]$Port
Set-Location -LiteralPath $source
& $NodePath (Join-Path $source 'scripts/build.mjs')
if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
& $NodePath (Join-Path $source 'server/http.mjs')
exit $LASTEXITCODE
