$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $root "frontend"
$backendDir = Join-Path $root "backend"
$frontendLog = Join-Path $root "frontend-runtime.log"
$backendLog = Join-Path $root "backend-runtime.log"
$frontendUrl = "http://127.0.0.1:3001/"
$backendHealthUrl = "http://127.0.0.1:5000/api/health"
$frontendDistDir = ".next-dev"
$frontendBuildId = Join-Path $frontendDir "$frontendDistDir\BUILD_ID"

function Test-Endpoint {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url
  )

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 5
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

function Start-BackgroundService {
  param(
    [Parameter(Mandatory = $true)]
    [string]$WorkingDirectory,
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  $scriptPath = Join-Path $root ("tmp-start-" + [guid]::NewGuid().ToString("N") + ".cmd")
  $escapedArgs = $Arguments | ForEach-Object {
    '"' + ($_ -replace '"', '\"') + '"'
  }
  $commandLine = '"' + $FilePath + '" ' + ($escapedArgs -join " ")
  $scriptContent = @(
    "@echo off",
    "cd /d `"$WorkingDirectory`"",
    $commandLine
  ) -join "`r`n"

  Set-Content -LiteralPath $scriptPath -Value $scriptContent -Encoding ASCII

  Start-Process -FilePath "C:\Windows\System32\cmd.exe" -ArgumentList @("/d", "/c", "start", "`"BadamClasses service`"", "/min", "`"$scriptPath`"") -WindowStyle Hidden | Out-Null
}

if (-not (Test-Endpoint -Url $backendHealthUrl)) {
  Start-BackgroundService `
    -WorkingDirectory $backendDir `
    -FilePath "C:\Program Files\nodejs\node.exe" `
    -Arguments @("src/server.js")
  Start-Sleep -Seconds 6
}

if (-not (Test-Endpoint -Url $frontendUrl)) {
  $frontendReady = $false

  if (Test-Path $frontendBuildId) {
    $frontendCommand = "`$env:NEXT_DIST_DIR='$frontendDistDir'; & 'C:\Program Files\nodejs\npm.cmd' run start -- --hostname 127.0.0.1 --port 3001 *> '$frontendLog'"
    Start-BackgroundService `
      -WorkingDirectory $frontendDir `
      -FilePath "C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe" `
      -Arguments @("-NoProfile", "-WindowStyle", "Hidden", "-Command", $frontendCommand)
    Start-Sleep -Seconds 6
    $frontendReady = Test-Endpoint -Url $frontendUrl
  }

  if (-not $frontendReady) {
    $frontendCommand = "`$env:NEXT_DIST_DIR='$frontendDistDir'; & 'C:\Program Files\nodejs\npm.cmd' run dev -- --hostname 127.0.0.1 --port 3001 *> '$frontendLog'"
    Start-BackgroundService `
      -WorkingDirectory $frontendDir `
      -FilePath "C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe" `
      -Arguments @("-NoProfile", "-WindowStyle", "Hidden", "-Command", $frontendCommand)

    for ($i = 0; $i -lt 6; $i++) {
      Start-Sleep -Seconds 5
      if (Test-Endpoint -Url $frontendUrl) {
        $frontendReady = $true
        break
      }
    }
  }
}

$frontendReady = Test-Endpoint -Url $frontendUrl
$backendReady = Test-Endpoint -Url $backendHealthUrl

Write-Host ""
Write-Host "Frontend: $frontendUrl => $frontendReady"
Write-Host "Backend:  $backendHealthUrl => $backendReady"
Write-Host ""
Write-Host "Admin:    http://127.0.0.1:3001/admin"
Write-Host "Checkout: http://127.0.0.1:3001/checkout?course=phoolbagh-branch-new-batch-2026"
