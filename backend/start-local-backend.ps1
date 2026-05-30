$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$stdoutLog = Join-Path $projectRoot "server-live.out"
$stderrLog = Join-Path $projectRoot "server-live.err"
$nodeExe = "C:\Program Files\nodejs\node.exe"
$backendEntry = Join-Path $projectRoot "src\server.js"

if (-not (Test-Path $nodeExe)) {
  throw "Node.js executable not found at $nodeExe"
}

if (-not (Test-Path $backendEntry)) {
  throw "Backend entry file not found at $backendEntry"
}

$existingConnection = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($existingConnection) {
  Write-Output "Backend already listening on port 5000."
  exit 0
}

if (Test-Path $stdoutLog) {
  Remove-Item -LiteralPath $stdoutLog -Force
}

if (Test-Path $stderrLog) {
  Remove-Item -LiteralPath $stderrLog -Force
}

$launchInfo = New-Object System.Diagnostics.ProcessStartInfo
$launchInfo.FileName = "C:\Windows\System32\cmd.exe"
$launchInfo.Arguments = "/d /c `"`"$nodeExe`" src/server.js 1>> `"$stdoutLog`" 2>> `"$stderrLog`"`""
$launchInfo.WorkingDirectory = $projectRoot
$launchInfo.UseShellExecute = $false
$launchInfo.CreateNoWindow = $true
[System.Diagnostics.Process]::Start($launchInfo) | Out-Null

Start-Sleep -Seconds 4

$healthOk = $false
try {
  $health = Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/health" -TimeoutSec 5
  if ($health.status -eq "ok") {
    $healthOk = $true
  }
} catch {
  $healthOk = $false
}

if (-not $healthOk) {
  Write-Output "Backend process launched, but health check is not responding yet. Check server-live.err for details."
  exit 1
}

Write-Output "Backend started successfully on http://127.0.0.1:5000"
