# MedAI — start backend + frontend (Windows)
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
# Placeholder HF repo breaks the 3D viewer — use backend proxy instead
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

Write-Host "Starting frontend on http://localhost:3000 ..." -ForegroundColor Cyan
$reactEnv = @()
Get-ChildItem env:REACT_APP_* -ErrorAction SilentlyContinue | ForEach-Object {
    $val = $_.Value -replace "'", "''"
    $reactEnv += "`$env:$($_.Name)='$val'"
}
if ($reactEnv.Count -eq 0) {
    $reactEnv += "`$env:REACT_APP_API_URL='http://localhost:8000'"
}
$frontendCmd = "Set-Location '$Frontend'; $($reactEnv -join '; '); npm start"
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
