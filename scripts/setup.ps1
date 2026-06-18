# MedAI - first-time setup (Windows)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "medai-frontend"
$EnvFile = Join-Path $Root ".env"

Write-Host "MedAI setup" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $EnvFile)) {
    Copy-Item (Join-Path $Root ".env.example") $EnvFile
    Write-Host "Created .env from .env.example - add your MISTRAL_API_KEY before using AI tutor." -ForegroundColor Yellow
} else {
    Write-Host ".env already exists - skipping" -ForegroundColor Green
}

Write-Host ""
Write-Host "Installing backend (Python 3.13 venv)..." -ForegroundColor Cyan
Set-Location $Backend
if (-not (Test-Path ".venv\Scripts\python.exe")) {
    py -3.13 -m venv .venv
}
.\.venv\Scripts\pip install --upgrade pip
.\.venv\Scripts\pip install -r requirements.txt

Write-Host ""
Write-Host "Installing frontend..." -ForegroundColor Cyan
Set-Location $Frontend
npm install

Set-Location $Root
Write-Host ""
Write-Host "Setup complete." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Edit .env - set MISTRAL_API_KEY (required for AI tutor)"
Write-Host "  2. npm start          - run backend + frontend"
Write-Host "  3. npm run download:assets  - optional CNN weights from Hugging Face"
Write-Host ""
