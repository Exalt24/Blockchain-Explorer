<#
.SYNOPSIS
    Stop development environment
.DESCRIPTION
    Stops all Docker services while preserving data
.PARAMETER KeepVolumes
    Keep database volumes (default: true)
.EXAMPLE
    .\scripts\stop-dev.ps1
    .\scripts\stop-dev.ps1 -RemoveVolumes
#>

param(
    [switch]$RemoveVolumes
)

$ErrorActionPreference = "Stop"

function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }

Write-Host "`n🛑 Stopping development environment...`n" -ForegroundColor Cyan

try {
    if ($RemoveVolumes) {
        Write-Warning "⚠ Removing volumes (database data will be lost)"
        docker-compose down -v
        Write-Success "✓ Services stopped and volumes removed"
    } else {
        docker-compose down
        Write-Success "✓ Services stopped (data preserved)"
    }
    
    Write-Info "`n💡 To start again: .\scripts\start-dev.ps1"
    
} catch {
    Write-Host "✗ Failed to stop services: $_" -ForegroundColor Red
    exit 1
}