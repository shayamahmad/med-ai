# Start MedAI backend with .env loaded (Windows)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$EnvFile = Join-Path $Root ".env"

if (-not (Test-Path (Join-Path $Backend ".venv\Scripts\uvicorn.exe"))) {
    Write-Host "Backend venv missing. Run: npm run setup" -ForegroundColor Red
    exit 1
}

if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"').Trim("'")
            Set-Item -Path "env:$name" -Value $value
        }
    }
} else {
    Write-Host "Warning: .env not found at $EnvFile" -ForegroundColor Yellow
}

$env:PYTHONUTF8 = "1"
Set-Location $Backend

if ($env:MISTRAL_API_KEY -and -not $env:MISTRAL_API_KEY.StartsWith("your_")) {
    Write-Host "MISTRAL_API_KEY: loaded" -ForegroundColor Green
} else {
    Write-Host "MISTRAL_API_KEY: missing - AI tutor and symptom checker disabled" -ForegroundColor Yellow
}

Write-Host "Starting uvicorn on http://127.0.0.1:8000" -ForegroundColor Cyan
& .\.venv\Scripts\uvicorn.exe main:app --host 127.0.0.1 --port 8000
