# Start MedAI backend with .env loaded (Windows)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$RootEnv = Join-Path $Root ".env"
$BackendEnv = Join-Path $Backend ".env"
$VenvPython = Join-Path $Backend ".venv\Scripts\python.exe"
$VenvUvicorn = Join-Path $Backend ".venv\Scripts\uvicorn.exe"

function Import-DotEnv {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return }
    Get-Content $Path | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"').Trim("'")
            Set-Item -Path "env:$name" -Value $value
        }
    }
}

if (-not (Test-Path $VenvUvicorn)) {
    Write-Host "Backend venv missing. Run: npm run setup" -ForegroundColor Red
    exit 1
}

try {
    & $VenvPython -c "import sys" 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "venv broken" }
} catch {
    Write-Host "Backend Python venv is broken (Python was moved or uninstalled)." -ForegroundColor Red
    Write-Host "Run once from project root: npm run setup" -ForegroundColor Yellow
    exit 1
}

Import-DotEnv $RootEnv
Import-DotEnv $BackendEnv

$env:PYTHONUTF8 = "1"
Set-Location $Backend

if ($env:MISTRAL_API_KEY -and -not $env:MISTRAL_API_KEY.StartsWith("your_")) {
    Write-Host "MISTRAL_API_KEY: loaded" -ForegroundColor Green
} else {
    Write-Host "MISTRAL_API_KEY: missing - add to .env in project root, then restart" -ForegroundColor Yellow
}

Write-Host "Starting uvicorn on http://127.0.0.1:8000" -ForegroundColor Cyan
& .\.venv\Scripts\uvicorn.exe main:app --host 127.0.0.1 --port 8000
