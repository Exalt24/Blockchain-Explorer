<#
.SYNOPSIS
    Start development environment
.DESCRIPTION
    Starts all Docker services and performs health checks
.EXAMPLE
    .\scripts\start-dev.ps1
#>

$ErrorActionPreference = "Stop"

function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

Write-Host "`n🚀 Starting development environment...`n" -ForegroundColor Cyan

try {
    docker-compose up -d
    Write-Info "Waiting for services to be healthy..."
    Start-Sleep -Seconds 15
    
    $services = @("postgres", "hardhat", "backend", "frontend")
    $allHealthy = $true
    
    foreach ($service in $services) {
        try {
            $status = docker-compose ps $service --format json | ConvertFrom-Json
            if ($status.State -eq "running") {
                if ($status.Health -eq "healthy") {
                    Write-Success "✓ $service is healthy"
                } else {
                    Write-Warning "⚠ $service is $($status.Health)"
                    $allHealthy = $false
                }
            } else {
                Write-Error "✗ $service is not running"
                $allHealthy = $false
            }
        } catch {
            Write-Warning "⚠ Could not check $service status"
            $allHealthy = $false
        }
    }
    
    if ($allHealthy) {
        Write-Host "`n✅ All services are healthy!" -ForegroundColor Green
    } else {
        Write-Host "`n⚠ Some services are still starting. Run health-check.ps1 to verify." -ForegroundColor Yellow
    }
    
    Write-Host "`n📍 Services:" -ForegroundColor Cyan
    Write-Host "  • Frontend:  http://localhost:3000"
    Write-Host "  • Backend:   http://localhost:4000"
    Write-Host "  • Health:    http://localhost:4000/health"
    Write-Host "  • Hardhat:   http://localhost:8545"
    Write-Host "  • Postgres:  localhost:5432`n"
    
    Write-Info "💡 Run .\scripts\health-check.ps1 for detailed status"
    
} catch {
    Write-Error "✗ Failed to start services: $_"
    exit 1
}