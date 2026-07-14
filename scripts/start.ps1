# MedAI - start backend + frontend (Windows)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "medai-frontend"
$VenvUvicorn = Join-Path $Backend ".venv\Scripts\uvicorn.exe"
$EnvFile = Join-Path $Root ".env"

$VenvPython = Join-Path $Backend ".venv\Scripts\python.exe"
$BackendEnv = Join-Path $Backend ".env"

if (-not (Test-Path $VenvUvicorn)) {
    Write-Host "Backend not set up yet. Run once:" -ForegroundColor Yellow
    Write-Host "  npm run setup"
    exit 1
}

try {
    & $VenvPython -c "import sys" 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "broken venv" }
} catch {
    Write-Host "Backend Python venv is broken. Run once:" -ForegroundColor Red
    Write-Host "  npm run setup"
    exit 1
}

if (-not (Test-Path $EnvFile)) {
    Write-Host "No .env file found. Run once:" -ForegroundColor Yellow
    Write-Host "  npm run setup"
    exit 1
}

# Load root .env then backend/.env (same order as env_config.py)
foreach ($file in @($EnvFile, $BackendEnv)) {
    if (-not (Test-Path $file)) { continue }
    Get-Content $file | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"').Trim("'")
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

$env:PYTHONUTF8 = "1"
if (-not $env:REACT_APP_API_URL) {
    $env:REACT_APP_API_URL = "http://localhost:8000"
}
# Placeholder HF repo breaks the 3D viewer - use backend proxy instead
if ($env:REACT_APP_HF_ASSETS_REPO -match 'your-username|placeholder|example') {
    Remove-Item Env:REACT_APP_HF_ASSETS_REPO -ErrorAction SilentlyContinue
}

# Free port 8000 if a stale/hung backend is still listening
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1

Write-Host "Starting backend on http://127.0.0.1:8000 ..." -ForegroundColor Cyan
Write-Host "(First start may take 1-2 min while models load)" -ForegroundColor DarkGray

$runBackend = Join-Path $Root "scripts\run-backend.ps1"
Start-Process powershell -ArgumentList "-NoExit", "-File", $runBackend

Write-Host "Waiting for backend health check..." -ForegroundColor Cyan
$ready = $false
$deadline = (Get-Date).AddSeconds(180)
while ((Get-Date) -lt $deadline) {
    try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:8000/health" -UseBasicParsing -TimeoutSec 5
        if ($resp.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch {
        # backend still starting
    }
    Start-Sleep -Seconds 2
}

if ($ready) {
    Write-Host "Backend is ready." -ForegroundColor Green
} else {
    Write-Host "Backend not responding - open the backend terminal window." -ForegroundColor Red
    Write-Host "If it says Python/venv error, run: npm run setup" -ForegroundColor Yellow
    exit 1
}

function Test-FrontendReact {
    param([string]$FrontendPath)
    $reactIndex = Join-Path $FrontendPath "node_modules\react\index.js"
    if (-not (Test-Path $reactIndex)) { return $false }
    Push-Location $FrontendPath
    node -e "const r=require('react'); if (typeof r.useState !== 'function') process.exit(1)" 2>$null | Out-Null
    $ok = $LASTEXITCODE -eq 0
    Pop-Location
    return $ok
}

function Install-FrontendDeps {
    param([string]$FrontendPath)
    Write-Host "Repairing frontend dependencies (npm ci)..." -ForegroundColor Yellow
    Push-Location $FrontendPath
    npm ci
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        Write-Host "npm ci failed. Run from repo root: npm run setup" -ForegroundColor Red
        exit 1
    }
    Pop-Location
}

function Clear-FrontendWebpackCache {
    param([string]$FrontendPath)
    $webpackCache = Join-Path $FrontendPath "node_modules\.cache"
    if (Test-Path $webpackCache) {
        Remove-Item -Recurse -Force $webpackCache -ErrorAction SilentlyContinue
    }
}

Write-Host "Starting frontend on http://localhost:3000 ..." -ForegroundColor Cyan

# Stop stale dev server so webpack does not reuse a broken compile cache
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1

$webpackLoader = Join-Path $Frontend "node_modules\html-webpack-plugin\lib\loader.js"
$lodashTemplate = Join-Path $Frontend "node_modules\lodash\template.js"
$needsInstall = (-not (Test-Path $webpackLoader)) -or (-not (Test-Path $lodashTemplate)) -or (-not (Test-FrontendReact $Frontend))
if ($needsInstall) {
    if ((Test-Path (Join-Path $Frontend "node_modules")) -and (Test-Path (Join-Path $Frontend "package-lock.json"))) {
        Install-FrontendDeps -FrontendPath $Frontend
    } else {
        Write-Host "Frontend node_modules missing - run: npm run setup" -ForegroundColor Red
        exit 1
    }
}

if (-not (Test-FrontendReact $Frontend)) {
    Write-Host "React install is still broken after npm ci. Run: npm run setup" -ForegroundColor Red
    exit 1
}

Clear-FrontendWebpackCache -FrontendPath $Frontend

$reactEnv = @()
Get-ChildItem env:REACT_APP_* -ErrorAction SilentlyContinue | ForEach-Object {
    $val = $_.Value -replace "'", "''"
    $reactEnv += "`$env:$($_.Name)='$val'"
}
if ($reactEnv.Count -eq 0) {
    $reactEnv += "`$env:REACT_APP_API_URL='http://localhost:8000'"
}
$envSetup = $reactEnv -join "; "
$frontendCmd = "Set-Location -LiteralPath `"$Frontend`"; $envSetup; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host ""
Write-Host "Wait ~30s for compile, then open:" -ForegroundColor Green
Write-Host "  App:     http://localhost:3000"
Write-Host "  API:     http://127.0.0.1:8000/docs"
Write-Host ""
if (-not $env:MISTRAL_API_KEY -or $env:MISTRAL_API_KEY.StartsWith("your_")) {
    Write-Host "MISTRAL_API_KEY missing in .env - AI tutor and symptom checker will fail." -ForegroundColor Yellow
}

Start-Sleep -Seconds 8
Start-Process "http://localhost:3000"
