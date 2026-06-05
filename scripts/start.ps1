# MedAI — start backend + frontend (Windows)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "medai-frontend"
$VenvUvicorn = Join-Path $Backend ".venv\Scripts\uvicorn.exe"
$EnvFile = Join-Path $Root ".env"

if (-not (Test-Path $VenvUvicorn)) {
    Write-Host "Backend not set up yet. Run once:" -ForegroundColor Yellow
    Write-Host "  npm run setup"
    exit 1
}

if (-not (Test-Path $EnvFile)) {
    Write-Host "No .env file found. Run once:" -ForegroundColor Yellow
    Write-Host "  npm run setup"
    exit 1
}

# Load .env into this process (child shells inherit these vars)
Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim().Trim('"').Trim("'")
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

$env:PYTHONUTF8 = "1"
if (-not $env:REACT_APP_API_URL) {
    $env:REACT_APP_API_URL = "http://localhost:8000"
}

# Free port 8000 if a stale/hung backend is still listening
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1

Write-Host "Starting backend on http://127.0.0.1:8000 ..." -ForegroundColor Cyan
Write-Host "(First start may take 1-2 min while models load)" -ForegroundColor DarkGray

$backendCmd = "Set-Location '$Backend'; `$env:PYTHONUTF8='1'; .\.venv\Scripts\uvicorn main:app --host 127.0.0.1 --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

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
    Write-Host "Backend not responding yet - check the backend terminal window." -ForegroundColor Yellow
}

Write-Host "Starting frontend on http://localhost:3000 ..." -ForegroundColor Cyan
$frontendCmd = "Set-Location '$Frontend'; `$env:REACT_APP_API_URL='$($env:REACT_APP_API_URL)'; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host ""
Write-Host "Wait ~30s for compile, then open:" -ForegroundColor Green
Write-Host "  App:     http://localhost:3000"
Write-Host "  API:     http://127.0.0.1:8000/docs"
Write-Host ""
Write-Host "If AI tutor fails, add MISTRAL_API_KEY to .env and restart." -ForegroundColor Yellow

Start-Sleep -Seconds 8
Start-Process "http://localhost:3000"
