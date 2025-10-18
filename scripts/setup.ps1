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

# Step 4: Start PostgreSQL
Write-Info "`nStep 4/8: Starting PostgreSQL..."

try {
    docker-compose up -d postgres 2>&1 | Out-Null
    Write-Info "  Waiting for PostgreSQL to be healthy..."
    
    $retries = 0
    $maxRetries = 30
    while ($retries -lt $maxRetries) {
        $status = docker-compose ps postgres --format json | ConvertFrom-Json
        if ($status.Health -eq "healthy") {
            Write-Success "✓ PostgreSQL is healthy"
            break
        }
        Start-Sleep -Seconds 2
        $retries++
    }
    
    if ($retries -eq $maxRetries) {
        Write-Error "✗ PostgreSQL failed to become healthy"
        exit 1
    }
} catch {
    Write-Error "✗ Failed to start PostgreSQL"
    exit 1
}

# Step 5: Run Migrations
Write-Info "`nStep 5/8: Running database migrations..."

try {
    docker-compose exec -T backend npm run migrate 2>&1 | Out-Null
    Write-Success "✓ Database migrations completed"
} catch {
    Write-Error "✗ Database migrations failed"
    exit 1
}

# Step 6: Start Hardhat and Deploy Contract
Write-Info "`nStep 6/8: Starting Hardhat node and deploying contract..."

try {
    docker-compose up -d hardhat 2>&1 | Out-Null
    Write-Info "  Waiting for Hardhat to be healthy (this may take 60+ seconds)..."
    
    $retries = 0
    $maxRetries = 40
    while ($retries -lt $maxRetries) {
        $status = docker-compose ps hardhat --format json | ConvertFrom-Json
        if ($status.Health -eq "healthy") {
            Write-Success "✓ Hardhat node is healthy"
            break
        }
        Start-Sleep -Seconds 3
        $retries++
    }
    
    if ($retries -eq $maxRetries) {
        Write-Error "✗ Hardhat failed to become healthy"
        exit 1
    }
} catch {
    Write-Error "✗ Failed to start Hardhat"
    exit 1
}

Write-Info "  Deploying GameState contract..."
try {
    docker-compose exec -T hardhat npm run deploy-docker 2>&1 | Out-Null
    Write-Success "✓ Contract deployed"
} catch {
    Write-Error "✗ Contract deployment failed"
    exit 1
}

# Step 7: Start Backend and Frontend
Write-Info "`nStep 7/8: Starting backend and frontend services..."

try {
    docker-compose up -d backend frontend 2>&1 | Out-Null
    Write-Info "  Waiting for services to be healthy..."
    
    Start-Sleep -Seconds 10
    
    $backendStatus = docker-compose ps backend --format json | ConvertFrom-Json
    $frontendStatus = docker-compose ps frontend --format json | ConvertFrom-Json
    
    if ($backendStatus.Health -eq "healthy") {
        Write-Success "✓ Backend is healthy"
    } else {
        Write-Warning "⚠ Backend is starting..."
    }
    
    if ($frontendStatus.Health -eq "healthy") {
        Write-Success "✓ Frontend is healthy"
    } else {
        Write-Warning "⚠ Frontend is starting..."
    }
} catch {
    Write-Error "✗ Failed to start services"
    exit 1
}

# Step 8: Generate Test Events
Write-Info "`nStep 8/8: Generating test events..."

$response = Read-Host "Generate ~69 test events? (y/n)"
if ($response -eq 'y' -or $response -eq 'Y') {
    try {
        docker-compose exec -T hardhat npm run generate-events 2>&1 | Out-Null
        Write-Success "✓ Test events generated"
    } catch {
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