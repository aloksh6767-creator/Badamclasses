$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:EXPO_NO_TELEMETRY = "1"
$env:EXPO_HOME = Join-Path $root ".expo-home"

if (-not (Test-Path $env:EXPO_HOME)) {
  New-Item -ItemType Directory -Force -Path $env:EXPO_HOME | Out-Null
}

Set-Location $root
& "C:\Program Files\nodejs\npm.cmd" run start -- --host localhost --port 8082 *>&1 |
  Tee-Object -FilePath (Join-Path $root "expo-runtime.log")
