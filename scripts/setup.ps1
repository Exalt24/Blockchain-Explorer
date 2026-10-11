<#
.SYNOPSIS
    First-time setup wizard for Blockchain Explorer
.DESCRIPTION
    Automates complete project setup including:
    - Dependency verification
    - Environment configuration
    - Docker initialization
    - Database setup
    - Contract deployment
    - Test event generation
.EXAMPLE
    .\scripts\setup.ps1
#>

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "  BLOCKCHAIN EXPLORER - SETUP WIZARD" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

# Step 1: Verify Prerequisites
Write-Info "Step 1/8: Verifying prerequisites..."

try {
    $nodeVersion = node --version
    Write-Success "✓ Node.js: $nodeVersion"
} catch {
    Write-Error "✗ Node.js not found. Please install Node.js v22.11.0+"
    exit 1
}

try {
    $npmVersion = npm --version
    Write-Success "✓ npm: v$npmVersion"
} catch {
    Write-Error "✗ npm not found"
    exit 1
}

try {
    docker --version | Out-Null
    Write-Success "✓ Docker installed"
} catch {
    Write-Error "✗ Docker not found. Please install Docker Desktop"
    exit 1
}

try {
    docker-compose --version | Out-Null
    Write-Success "✓ Docker Compose installed"
} catch {
    Write-Error "✗ Docker Compose not found"
    exit 1
}

# Step 2: Install Dependencies
Write-Info "`nStep 2/8: Installing dependencies..."

$directories = @("backend", "contracts", "frontend")
foreach ($dir in $directories) {
    Write-Info "  Installing $dir dependencies..."
    Push-Location $dir
    try {
        npm install --silent 2>&1 | Out-Null
        Write-Success "  ✓ $dir dependencies installed"
    } catch {
        Write-Error "  ✗ Failed to install $dir dependencies"
        Pop-Location
        exit 1
    }
    Pop-Location
}

# Step 3: Environment Configuration
Write-Info "`nStep 3/8: Configuring environment files..."

if (-not (Test-Path "backend\.env")) {
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Success "✓ Created backend\.env"
} else {
    Write-Warning "⚠ backend\.env already exists (skipped)"
}

if (-not (Test-Path "frontend\.env")) {
    Copy-Item "frontend\.env.example" "frontend\.env"
    Write-Success "✓ Created frontend\.env"
} else {
    Write-Warning "⚠ frontend\.env already exists (skipped)"
}

if (-not (Test-Path "backend\.env.docker")) {
    Write-Warning "⚠ backend\.env.docker not found, will be created by Docker"
}

# Runs a native command quietly. Windows PowerShell 5.1 turns anything a native tool writes to
# stderr (docker compose prints its progress there) into a terminating error under
# $ErrorActionPreference = "Stop", so the preference is relaxed for the call and the exit code is checked instead.
function Invoke-Quiet {
    param([scriptblock]$Command)
    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $null | & $Command 2>&1 | Out-Null
        return $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previous
    }
}

# Returns the Health field of a compose service ("healthy", "starting", ...)
function Get-ServiceHealth {
    param([string]$Service)
    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $json = docker-compose ps $Service --format json 2>$null
        if (-not $json) { return "" }
        return ($json | ConvertFrom-Json).Health
    } finally {
        $ErrorActionPreference = $previous
    }
}

function Wait-Healthy {
    param([string]$Service, [int]$MaxTries)
    for ($i = 0; $i -lt $MaxTries; $i++) {
        if ((Get-ServiceHealth $Service) -eq "healthy") { return $true }
        Start-Sleep -Seconds 3
    }
    return $false
}

# Step 4: Build and start the stack
Write-Info "`nStep 4/8: Building and starting the services (the first build takes a few minutes)..."

if ((Invoke-Quiet { docker-compose up -d --build }) -ne 0) {
    Write-Error "✗ docker-compose up failed. Run 'docker-compose up -d' to see why."
    exit 1
}

Write-Info "  Waiting for PostgreSQL and the Hardhat node to be healthy (Hardhat can take 60+ seconds)..."
foreach ($service in @("postgres", "hardhat")) {
    if (Wait-Healthy $service 40) {
        Write-Success "✓ $service is healthy"
    } else {
        Write-Error "✗ $service failed to become healthy"
        exit 1
    }
}

# Step 5: Run Migrations
Write-Info "`nStep 5/8: Running database migrations..."

if ((Invoke-Quiet { docker-compose exec -T backend npm run migrate }) -ne 0) {
    Write-Error "✗ Database migrations failed"
    exit 1
}
Write-Success "✓ Database migrations completed"

# Step 6: Deploy the contract
Write-Info "`nStep 6/8: Deploying the GameState contract to the Hardhat node..."

if ((Invoke-Quiet { docker-compose exec -T hardhat npm run deploy-docker }) -ne 0) {
    Write-Error "✗ Contract deployment failed"
    exit 1
}
Write-Success "✓ Contract deployed"

# Step 7: Restart the backend so its event listener picks up the contract address
Write-Info "`nStep 7/8: Restarting the backend..."

if ((Invoke-Quiet { docker-compose restart backend }) -ne 0) {
    Write-Error "✗ Backend restart failed"
    exit 1
}
if (Wait-Healthy "backend" 20) {
    Write-Success "✓ Backend is healthy"
} else {
    Write-Warning "⚠ Backend is still starting, check 'docker-compose logs backend'"
}
if (Wait-Healthy "frontend" 20) {
    Write-Success "✓ Frontend is healthy"
} else {
    Write-Warning "⚠ Frontend is still starting, check 'docker-compose logs frontend'"
}

# Step 8: Generate Test Events
Write-Info "`nStep 8/8: Generating test events..."

$response = Read-Host "Generate 79 test events (about 20 seconds)? (y/n)"
if ($response -eq 'y' -or $response -eq 'Y') {
    if ((Invoke-Quiet { docker-compose exec -T hardhat npm run generate-events }) -eq 0) {
        Write-Success "✓ Test events generated"
    } else {
        Write-Warning "⚠ Failed to generate test events (you can run this later)"
    }
} else {
    Write-Info "⊘ Skipped test event generation"
}

# Final Status
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  SETUP COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Info "Services are running at:"
Write-Host "  • Frontend:  http://localhost:3000" -ForegroundColor Yellow
Write-Host "  • Backend:   http://localhost:4000" -ForegroundColor Yellow
Write-Host "  • Health:    http://localhost:4000/health" -ForegroundColor Yellow
Write-Host "  • Hardhat:   http://localhost:8545" -ForegroundColor Yellow
Write-Host "  • Postgres:  localhost:5432`n" -ForegroundColor Yellow

Write-Info "Useful commands:"
Write-Host "  • View logs:       docker-compose logs -f"
Write-Host "  • Stop services:   .\scripts\stop-dev.ps1"
Write-Host "  • Health check:    .\scripts\health-check.ps1"
Write-Host "  • View all logs:   .\scripts\view-logs.ps1`n"

Write-Success "Open http://localhost:3000 in your browser to view the dashboard!"