# MedAI - first-time setup (Windows)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "medai-frontend"
$EnvFile = Join-Path $Root ".env"

function Get-PythonLauncher {
    foreach ($ver in @("3.13", "3.12", "3.11", "3.10")) {
        try {
            $out = & py "-$ver" -c "import sys; print(sys.executable)" 2>$null
            if ($LASTEXITCODE -eq 0 -and $out) {
                return @{ Flag = "-$ver"; Executable = $out.Trim() }
            }
        } catch { }
    }
    $fallback = & py -c "import sys; print(sys.executable)" 2>$null
    if ($LASTEXITCODE -eq 0 -and $fallback) {
        return @{ Flag = ""; Executable = $fallback.Trim() }
    }
    return $null
}

function Test-VenvHealthy {
    param([string]$BackendPath)
    $py = Join-Path $BackendPath ".venv\Scripts\python.exe"
    if (-not (Test-Path $py)) { return $false }
    try {
        & $py -c "import sys; print(sys.version)" 2>$null | Out-Null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

Write-Host "MedAI setup" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $EnvFile)) {
    Copy-Item (Join-Path $Root ".env.example") $EnvFile
    Write-Host "Created .env from .env.example - add your MISTRAL_API_KEY before using AI tutor." -ForegroundColor Yellow
} else {
    Write-Host ".env already exists - skipping" -ForegroundColor Green
}

$pyInfo = Get-PythonLauncher
if (-not $pyInfo) {
    Write-Host "Python not found. Install Python 3.11+ from https://www.python.org/downloads/" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Using Python: $($pyInfo.Executable)" -ForegroundColor Cyan
Set-Location $Backend

if (-not (Test-VenvHealthy $Backend)) {
    if (Test-Path ".venv") {
        Write-Host "Removing broken .venv (wrong Python path)..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force ".venv"
    }
    if ($pyInfo.Flag) {
        & py $pyInfo.Flag -m venv .venv
    } else {
        & py -m venv .venv
    }
}

.\.venv\Scripts\pip install --upgrade pip

# PyTorch CPU wheels (faster than default index)
.\.venv\Scripts\pip install torch==2.4.0 torchvision==0.19.0 --index-url https://download.pytorch.org/whl/cpu

# chromadb + mistralai cannot be resolved in one pip pass (OpenTelemetry conflict)
$coreReq = Join-Path $Backend "_req_core.txt"
Get-Content "requirements.txt" | Where-Object {
    $_ -notmatch '^\s*#' -and $_.Trim() -ne '' -and
    $_ -notmatch '^\s*torch' -and $_ -notmatch '^\s*torchvision' -and
    $_ -notmatch '^\s*mistralai' -and $_ -notmatch '^\s*chromadb'
} | Set-Content $coreReq
.\.venv\Scripts\pip install -r $coreReq
.\.venv\Scripts\pip install chromadb==0.5.23
.\.venv\Scripts\pip install mistralai==2.4.4 --no-deps
.\.venv\Scripts\pip install eval-type-backport jsonpath-python
Remove-Item $coreReq -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Installing frontend..." -ForegroundColor Cyan
Set-Location $Frontend
if (Test-Path "package-lock.json") {
    npm ci
} else {
    npm install
}

Set-Location $Root
Write-Host ""
Write-Host "Setup complete." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Edit .env - set MISTRAL_API_KEY (required for AI tutor)"
Write-Host "  2. npm start          - run backend + frontend"
Write-Host "  3. npm run download:assets  - optional CNN weights from Hugging Face"
Write-Host ""
