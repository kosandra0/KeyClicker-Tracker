# Builds "KeyClick Tracker.exe" into the parent folder.
# Uses the portable Go in ..\_tools\go when present, otherwise the Go on PATH.
param([string]$Out = '..\KeyClick-Tracker-v1.1.0.exe')
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$tools = Join-Path (Split-Path $PSScriptRoot -Parent) '_tools'
$goExe = Join-Path $tools 'go\bin\go.exe'
if (Test-Path $goExe) {
  $env:GOROOT = Join-Path $tools 'go'; $env:GOPATH = Join-Path $tools 'gopath'; $env:GOCACHE = Join-Path $tools 'gocache'
  $env:GOTOOLCHAIN = 'local'
} else {
  $goExe = (Get-Command go -ErrorAction Stop).Source
}
$env:GOOS = 'windows'; $env:GOARCH = 'amd64'; $env:CGO_ENABLED = '0'
& $goExe version

# Icon: uses logo-source.png (square-ish PNG) when you place one here, otherwise the placeholder mark.
if (Test-Path 'logo-source.png') { & $goExe run ./tools/mkicon -in logo-source.png -crop 0.075 -round 0.23 -out app.ico -png ui/logo.png }
elseif (-not (Test-Path 'app.ico')) { & $goExe run ./tools/mkicon -out app.ico -png ui/logo.png }

# Windows resources (icon + DPI manifest) -> .syso picked up automatically by go build.
# Uses windres from MinGW (installed locally); no third-party download is needed.
$windres = (Get-Command windres -ErrorAction Stop).Source
& $windres -O coff -F pe-x86-64 -o rsrc_windows_amd64.syso app.rc
if ($LASTEXITCODE -ne 0) { throw 'windres failed' }

& $goExe build -trimpath -ldflags '-s -w -H windowsgui' -o $Out .
if ($LASTEXITCODE -ne 0) { throw 'go build failed' }
$f = Get-Item $Out
Write-Host ("Built {0} ({1:N0} bytes) SHA-256 {2}" -f $f.FullName, $f.Length, (Get-FileHash $f.FullName -Algorithm SHA256).Hash)
