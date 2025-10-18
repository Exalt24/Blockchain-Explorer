<#
.SYNOPSIS
    Generate test events
.DESCRIPTION
    Generates ~69 test events for development and testing
.EXAMPLE
    .\scripts\generate-events.ps1
#>

$ErrorActionPreference = "Stop"

function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Error { Write-Host $args -ForegroundColor Red }

Write-Host "`n🎲 Generating test events...`n" -ForegroundColor Cyan

$hardhatStatus = docker-compose ps hardhat --format json 2>$null | ConvertFrom-Json
if (-not $hardhatStatus -or $hardhatStatus.State -ne "running") {
    Write-Error "✗ Hardhat node is not running"
    exit 1
}

$backendStatus = docker-compose ps backend --format json 2>$null | ConvertFrom-Json
if (-not $backendStatus -or $backendStatus.State -ne "running") {
    Write-Error "✗ Backend is not running (events won't be indexed)"
    Write-Info "Start backend first: docker-compose up -d backend"
    exit 1
}

try {
    docker-compose exec -T hardhat npm run generate-events
    
    Write-Success "`n✓ Test events generated successfully"
    Write-Info "`nGenerated ~69 events:"
    Write-Host "  • 10 PlayerJoined events"
    Write-Host "  • 55 ScoreUpdated events"
    Write-Host "  • 3 ItemPurchased events"
    Write-Host "  • 1 GameReset event`n"
    
    Write-Info "Events are being indexed by backend. Wait 5-10 seconds, then check:"
    Write-Host "  • Dashboard: http://localhost:3000"
    Write-Host "  • API: http://localhost:4000/api/events`n"
    
} catch {
    Write-Error "✗ Failed to generate events: $_"
    exit 1
}