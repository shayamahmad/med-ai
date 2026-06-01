# MedAI — start backend + frontend (Windows)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "medai-frontend"
$VenvUvicorn = Join-Path $Backend ".venv\Scripts\uvicorn.exe"

if (-not (Test-Path $VenvUvicorn)) {
    Write-Host "Backend venv missing. Run once:" -ForegroundColor Yellow
    Write-Host "  py -3.13 -m venv backend\.venv"
    Write-Host "  backend\.venv\Scripts\pip install -r backend\requirements.txt"
    exit 1
}

$env:PYTHONUTF8 = "1"
if (Test-Path (Join-Path $Root ".env")) {
    Get-Content (Join-Path $Root ".env") | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
        }
    }
}

# Free port 8000 if a stale/hung backend is still listening
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1

Write-Host "Starting backend on http://localhost:8000 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$Backend'; `$env:PYTHONUTF8='1'; .\.venv\Scripts\uvicorn main:app --host 127.0.0.1 --port 8000"
)

Start-Sleep -Seconds 2

Write-Host "Starting frontend on http://localhost:3000 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$Frontend'; `$env:REACT_APP_API_URL='http://localhost:8000'; npm start"
)

Write-Host ""
Write-Host "Wait ~30s for compile, then open:" -ForegroundColor Green
Write-Host "  App:     http://localhost:3000"
Write-Host "  API:     http://localhost:8000/docs"
Write-Host ""
Write-Host "If port 3000 is busy, check the frontend terminal for another port (e.g. 3001)." -ForegroundColor Yellow

Start-Sleep -Seconds 8
Start-Process "http://localhost:3000"
