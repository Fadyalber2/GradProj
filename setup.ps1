# AXIOM-V2 Setup Script
# Run on a new machine: powershell -ExecutionPolicy Bypass -File setup.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Step { param($msg) Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok   { param($msg) Write-Host "    OK: $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "    WARN: $msg" -ForegroundColor Yellow }

function Fail {
    param($msg)
    Write-Host "    FAIL: $msg" -ForegroundColor Red
    exit 1
}

# 1. Execution policy
Write-Step "Setting PowerShell execution policy"
try {
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
    Write-Ok "Execution policy set to RemoteSigned"
} catch {
    Write-Warn "Could not set policy: $_"
}

# 2. Node.js
Write-Step "Checking Node.js"
$nodeOk = $false
try {
    $v = node --version 2>$null
    if ($v -match "v(\d+)" -and [int]$Matches[1] -ge 20) {
        Write-Ok "Node.js $v"
        $nodeOk = $true
    }
} catch {}

if (-not $nodeOk) {
    Write-Warn "Node.js 20+ not found. Installing via winget..."
    winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    Write-Ok "Node.js installed. Reopen this terminal and run the script again."
    exit 0
}

# 3. Python 3.12
Write-Step "Checking Python 3.12"
$pyOk = $false
try {
    $v = py -3.12 --version 2>$null
    if ($v -match "3\.12") {
        Write-Ok "Python $v"
        $pyOk = $true
    }
} catch {}

if (-not $pyOk) {
    Write-Warn "Python 3.12 not found. Installing via winget..."
    winget install Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements
    Write-Ok "Python 3.12 installed. Reopen this terminal and run the script again."
    exit 0
}

# 4. Frontend - fix package.json
Write-Step "Setting up frontend"
$frontendDir = Join-Path $root "frontend"
$pkgJsonPath = Join-Path $frontendDir "package.json"
$pkgContent  = Get-Content $pkgJsonPath -Raw

if ($pkgContent -match "--turbopack") {
    $pkgContent = $pkgContent -replace '"next dev --turbopack"', '"next dev"'
    [System.IO.File]::WriteAllText($pkgJsonPath, $pkgContent, [System.Text.UTF8Encoding]::new($false))
    Write-Ok "Removed --turbopack from package.json"
} else {
    Write-Ok "package.json already clean"
}

# Fix SignUpForm: remove phone OTP verification requirement (Twilio not configured)
$signUpForm = Join-Path $frontendDir "src\components\auth\SignUpForm.tsx"
if (Test-Path $signUpForm) {
    $sfContent = Get-Content $signUpForm -Raw
    if ($sfContent -match "&& phoneVerified") {
        $sfContent = $sfContent -replace "&& phoneVerified", ""
        [System.IO.File]::WriteAllText($signUpForm, $sfContent, [System.Text.UTF8Encoding]::new($false))
        Write-Ok "Removed phone OTP requirement from SignUpForm"
    } else {
        Write-Ok "SignUpForm already patched"
    }
}

# 5. npm install
Write-Host "    Running npm install..." -ForegroundColor Gray
Push-Location $frontendDir
npm install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) { Pop-Location; Fail "npm install failed" }
Pop-Location
Write-Ok "npm install done"

# 6. Frontend .env.local
Write-Step "Checking frontend .env.local"
$envLocal = Join-Path $frontendDir ".env.local"
if (-not (Test-Path $envLocal)) {
    $lines = @(
        "NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key",
        "NEXT_PUBLIC_API_URL=http://localhost:8000"
    )
    [System.IO.File]::WriteAllText($envLocal, ($lines -join "`n"), [System.Text.UTF8Encoding]::new($false))
    Write-Warn "Created .env.local - fill in your Supabase URL and anon key"
} else {
    Write-Ok ".env.local already exists"
}

# 7. Backend venv
Write-Step "Setting up backend Python venv"
$backendDir = Join-Path $root "backend"
$venvDir    = Join-Path $backendDir "venv"

if (Test-Path $venvDir) {
    Write-Host "    Removing old venv..." -ForegroundColor Gray
    Remove-Item -Recurse -Force $venvDir
    Write-Ok "Old venv removed"
}

Push-Location $backendDir
py -3.12 -m venv venv
if ($LASTEXITCODE -ne 0) { Pop-Location; Fail "Failed to create venv" }
Write-Ok "venv created with Python 3.12"

Write-Host "    Upgrading pip..." -ForegroundColor Gray
& "$venvDir\Scripts\python.exe" -m pip install --upgrade pip --quiet

Write-Host "    Running pip install (this takes a few minutes)..." -ForegroundColor Gray
& "$venvDir\Scripts\pip.exe" install -r requirements.txt
if ($LASTEXITCODE -ne 0) { Pop-Location; Fail "pip install failed" }
Pop-Location
Write-Ok "pip install done"

# 8. Backend .env
Write-Step "Checking backend .env"
$backendEnv     = Join-Path $backendDir ".env"
$backendExample = Join-Path $backendDir ".env.example"

if (-not (Test-Path $backendEnv)) {
    if (Test-Path $backendExample) {
        Copy-Item $backendExample $backendEnv
        Write-Warn "Created .env from .env.example - fill in your keys"
    } else {
        $lines = @(
            "SUPABASE_URL=https://your-project.supabase.co",
            "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key",
            "SUPABASE_ANON_KEY=your-anon-key",
            "JWT_SECRET=your-supabase-jwt-secret",
            "OLLAMA_BASE_URL=http://localhost:11434",
            "OLLAMA_MODEL=axiom-llm",
            "UPSTASH_REDIS_URL=",
            "UPSTASH_REDIS_TOKEN=",
            "TWILIO_ACCOUNT_SID=",
            "TWILIO_AUTH_TOKEN=",
            "TWILIO_VERIFY_SERVICE_SID="
        )
        [System.IO.File]::WriteAllText($backendEnv, ($lines -join "`n"), [System.Text.UTF8Encoding]::new($false))
        Write-Warn "Created .env template - fill in your Supabase keys"
    }
} else {
    Write-Ok ".env already exists"
}

# Done
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Fill in  frontend\.env.local   (Supabase URL + anon key)" -ForegroundColor Yellow
Write-Host "  2. Fill in  backend\.env           (Supabase keys)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Start backend:" -ForegroundColor Cyan
Write-Host "  cd backend ; venv\Scripts\activate ; uvicorn app.main:app --reload --port 8000" -ForegroundColor Gray
Write-Host ""
Write-Host "Start frontend:" -ForegroundColor Cyan
Write-Host "  cd frontend ; npm run dev" -ForegroundColor Gray
Write-Host ""
