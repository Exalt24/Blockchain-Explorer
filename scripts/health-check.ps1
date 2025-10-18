<#
.SYNOPSIS
    System health check
.DESCRIPTION
    Comprehensive health check of all services and components
.EXAMPLE
    .\scripts\health-check.ps1
#>

$ErrorActionPreference = "Continue"

function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

Write-Host "`n🏥 SYSTEM HEALTH CHECK`n" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$allHealthy = $true

Write-Info "Docker Services:"
$services = @("postgres", "hardhat", "backend", "frontend")
foreach ($service in $services) {
    try {
        $status = docker-compose ps $service --format json 2>$null | ConvertFrom-Json
        if ($status.State -eq "running") {
            $health = $status.Health
            if ($health -eq "healthy") {
                Write-Success "  ✓ $service - healthy"
            } elseif ($health -eq "starting") {
                Write-Warning "  ⚠ $service - starting"
                $allHealthy = $false
            } else {
                Write-Error "  ✗ $service - $health"
                $allHealthy = $false
            }
        } else {
            Write-Error "  ✗ $service - not running"
            $allHealthy = $false
        }
    } catch {
        Write-Error "  ✗ $service - error checking status"
        $allHealthy = $false
    }
}

Write-Host "`n" -NoNewline
Write-Info "Backend Health Endpoint:"
try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/health" -TimeoutSec 5
    
    if ($response.status -eq "healthy") {
        Write-Success "  ✓ Status: $($response.status)"
    } else {
        Write-Warning "  ⚠ Status: $($response.status)"
        $allHealthy = $false
    }
    
    Write-Info "`n  Database:"
    if ($response.services.database.connected) {
        Write-Success "    ✓ Connected (${($response.services.database.latency)}ms)"
    } else {
        Write-Error "    ✗ Not connected"
        $allHealthy = $false
    }
    
    Write-Info "`n  Blockchain:"
    if ($response.services.blockchain.connected) {
        Write-Success "    ✓ Connected (${($response.services.blockchain.latency)}ms)"
        Write-Info "    ℹ Latest block: $($response.services.blockchain.latestBlock)"
    } else {
        Write-Error "    ✗ Not connected"
        $allHealthy = $false
    }
    
    Write-Info "`n  EventListener:"
    if ($response.services.eventListener.running) {
        Write-Success "    ✓ Running (errors: $($response.services.eventListener.errorCount))"
    } else {
        Write-Error "    ✗ Not running"
        $allHealthy = $false
    }
    
    Write-Info "`n  WebSocket:"
    if ($response.services.websocket.enabled) {
        Write-Success "    ✓ Enabled ($($response.services.websocket.connectedClients) clients)"
    } else {
        Write-Warning "    ⚠ Disabled"
    }
    
    if ($response.services.cache) {
        Write-Info "`n  Cache:"
        Write-Success "    ✓ Enabled ($($response.services.cache.entries) entries, $([math]::Round($response.services.cache.hitRate * 100))% hit rate)"
    }
} catch {
    Write-Error "  ✗ Backend health endpoint unreachable"
    $allHealthy = $false
}

Write-Host "`n" -NoNewline
Write-Info "Frontend:"
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Success "  ✓ Frontend accessible"
    } else {
        Write-Warning "  ⚠ Frontend returned status: $($response.StatusCode)"
        $allHealthy = $false
    }
} catch {
    Write-Error "  ✗ Frontend unreachable"
    $allHealthy = $false
}

Write-Host "`n========================================`n" -ForegroundColor Cyan

if ($allHealthy) {
    Write-Success "✅ ALL SYSTEMS HEALTHY`n"
    exit 0
} else {
    Write-Warning "⚠️  SOME ISSUES DETECTED`n"
    Write-Info "💡 Tips:"
    Write-Host "  • Check logs: .\scripts\view-logs.ps1"
    Write-Host "  • Restart services: docker-compose restart"
    Write-Host "  • Full reset: .\scripts\reset-all.ps1`n"
    exit 1
}