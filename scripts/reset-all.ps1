<#
.SYNOPSIS
    Complete environment reset
.DESCRIPTION
    Stops services, removes volumes, and restarts fresh
    Equivalent to: down -v, up -d, migrate, deploy, generate-events
.EXAMPLE
    .\scripts\reset-all.ps1
#>

$ErrorActionPreference = "Stop"

function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

Write-Host "`n⚠️  COMPLETE ENVIRONMENT RESET ⚠️`n" -ForegroundColor Yellow
Write-Warning "This will:"
Write-Host "  • Stop all services"
Write-Host "  • Remove all data (database, cache)"
Write-Host "  • Start fresh environment"
Write-Host "  • Run migrations"
Write-Host "  • Deploy contract"
Write-Host "  • Generate test events`n"

$confirmation = Read-Host "Continue? (yes/no)"
if ($confirmation -ne 'yes') {
    Write-Info "Reset cancelled"
    exit 0
}

Write-Host "`n🔄 Starting reset process...`n" -ForegroundColor Cyan

# Step 1: Stop and remove everything
Write-Info "Step 1/6: Stopping services and removing volumes..."
try {
    docker-compose down -v 2>&1 | Out-Null
    Write-Success "✓ Services stopped and volumes removed"
} catch {
    Write-Error "✗ Failed to stop services"
    exit 1
}

# Step 2: Start PostgreSQL
Write-Info "`nStep 2/6: Starting PostgreSQL..."
try {
    docker-compose up -d postgres 2>&1 | Out-Null
    Write-Info "  Waiting for PostgreSQL..."
    
    $retries = 0
    while ($retries -lt 30) {
        $status = docker-compose ps postgres --format json | ConvertFrom-Json
        if ($status.Health -eq "healthy") {
            Write-Success "✓ PostgreSQL ready"
            break
        }
        Start-Sleep -Seconds 2
        $retries++
    }
} catch {
    Write-Error "✗ PostgreSQL failed to start"
    exit 1
}

# Step 3: Run migrations
Write-Info "`nStep 3/6: Running migrations..."
try {
    docker-compose exec -T backend npm run migrate 2>&1 | Out-Null
    Write-Success "✓ Migrations completed"
} catch {
    Write-Error "✗ Migrations failed"
    exit 1
}

# Step 4: Start Hardhat
Write-Info "`nStep 4/6: Starting Hardhat node..."
try {
    docker-compose up -d hardhat 2>&1 | Out-Null
    Write-Info "  Waiting for Hardhat (60+ seconds)..."
    
    $retries = 0
    while ($retries -lt 40) {
        $status = docker-compose ps hardhat --format json | ConvertFrom-Json
        if ($status.Health -eq "healthy") {
            Write-Success "✓ Hardhat ready"
            break
        }
        Start-Sleep -Seconds 3
        $retries++
    }
} catch {
    Write-Error "✗ Hardhat failed to start"
    exit 1
}

# Step 5: Deploy contract
Write-Info "`nStep 5/6: Deploying contract..."
try {
    docker-compose exec -T hardhat npm run deploy-docker 2>&1 | Out-Null
    Write-Success "✓ Contract deployed"
} catch {
    Write-Error "✗ Contract deployment failed"
    exit 1
}

# Step 6: Start remaining services
Write-Info "`nStep 6/6: Starting backend and frontend..."
try {
    docker-compose up -d 2>&1 | Out-Null
    Start-Sleep -Seconds 10
    Write-Success "✓ All services started"
} catch {
    Write-Error "✗ Failed to start services"
    exit 1
}

# Generate events
Write-Info "`nGenerating test events..."
try {
    docker-compose exec -T hardhat npm run generate-events 2>&1 | Out-Null
    Write-Success "✓ Test events generated"
} catch {
    Write-Warning "⚠ Event generation failed (non-critical)"
}

Write-Host "`n✅ Reset complete! Environment is fresh and ready.`n" -ForegroundColor Green
Write-Info "Services:"
Write-Host "  • Frontend:  http://localhost:3000"
Write-Host "  • Backend:   http://localhost:4000"
Write-Host "  • Health:    http://localhost:4000/health`n"