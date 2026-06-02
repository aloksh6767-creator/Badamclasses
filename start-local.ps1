$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $root "frontend"
$backendDir = Join-Path $root "backend"
$frontendLog = Join-Path $root "frontend-runtime.log"
$frontendErrLog = Join-Path $root "frontend-runtime.err.log"
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

function Start-FrontendService {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Mode
  )

  $scriptPath = Join-Path $root ("tmp-start-" + [guid]::NewGuid().ToString("N") + ".cmd")
  $nextCli = Join-Path $frontendDir "node_modules\next\dist\bin\next"
  $scriptContent = @(
    "@echo off",
    "cd /d `"$frontendDir`"",
    "set `"NEXT_DIST_DIR=$frontendDistDir`"",
    "`"C:\Program Files\nodejs\node.exe`" `"$nextCli`" $Mode --hostname 127.0.0.1 --port 3001 > `"$frontendLog`" 2> `"$frontendErrLog`""
  ) -join "`r`n"

  Set-Content -LiteralPath $scriptPath -Value $scriptContent -Encoding ASCII

  Start-Process -FilePath "C:\Windows\System32\cmd.exe" -ArgumentList @("/d", "/c", "start", "`"BadamClasses frontend`"", "/min", "`"$scriptPath`"") -WindowStyle Hidden | Out-Null
}

function Test-FrontendBuildFresh {
  if (-not (Test-Path $frontendBuildId)) {
    return $false
  }

  $buildTime = (Get-Item -LiteralPath $frontendBuildId).LastWriteTime
  $sourceRoots = @(
    (Join-Path $frontendDir "app"),
    (Join-Path $frontendDir "components"),
    (Join-Path $frontendDir "lib")
  )

  foreach ($sourceRoot in $sourceRoots) {
    if (-not (Test-Path $sourceRoot)) {
      continue
    }

    $newerSource = Get-ChildItem -LiteralPath $sourceRoot -Recurse -File -Include *.js,*.jsx,*.ts,*.tsx,*.css |
      Where-Object { $_.LastWriteTime -gt $buildTime } |
      Select-Object -First 1

    if ($newerSource) {
      return $false
    }
  }

  return $true
}

function Stop-FrontendServiceOnPort {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  $listeners = netstat -ano | Select-String ":$Port\s+.*LISTENING\s+(\d+)"
  foreach ($listener in $listeners) {
    $processId = [int]$listener.Matches[0].Groups[1].Value
    try {
      Stop-Process -Id $processId -Force -ErrorAction Stop
    } catch {
      Write-Host "Could not stop stale frontend process ${processId}: $($_.Exception.Message)"
    }
  }
}

if (-not (Test-Endpoint -Url $backendHealthUrl)) {
  Start-BackgroundService `
    -WorkingDirectory $backendDir `
    -FilePath "C:\Program Files\nodejs\node.exe" `
    -Arguments @("src/server.js")
  Start-Sleep -Seconds 6
}

$frontendReady = Test-Endpoint -Url $frontendUrl
if ($frontendReady -and -not (Test-FrontendBuildFresh)) {
  Stop-FrontendServiceOnPort -Port 3001
  Start-Sleep -Seconds 2
  $frontendReady = Test-Endpoint -Url $frontendUrl
}

if (-not $frontendReady) {
  $frontendReady = $false

  if (Test-FrontendBuildFresh) {
    Start-FrontendService -Mode "start"
    Start-Sleep -Seconds 6
    $frontendReady = Test-Endpoint -Url $frontendUrl
  }

  if (-not $frontendReady) {
    Start-FrontendService -Mode "dev"

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
