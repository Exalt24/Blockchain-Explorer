<#
.SYNOPSIS
    View service logs
.DESCRIPTION
    Displays logs from Docker services with various filtering options
.PARAMETER Service
    Service to view logs for: all, postgres, hardhat, backend, frontend
.PARAMETER Follow
    Follow log output (like tail -f)
.PARAMETER Lines
    Number of lines to show (default: 50)
.PARAMETER Since
    Show logs since time (e.g., "5m", "1h")
.EXAMPLE
    .\scripts\view-logs.ps1
    .\scripts\view-logs.ps1 -Service backend -Follow
    .\scripts\view-logs.ps1 -Service backend -Lines 100
    .\scripts\view-logs.ps1 -Service all -Since 5m
#>

param(
    [ValidateSet("all", "postgres", "hardhat", "backend", "frontend")]
    [string]$Service = "all",
    
    [switch]$Follow,
    
    [int]$Lines = 50,
    
    [string]$Since
)

$ErrorActionPreference = "Stop"

function Write-Info { Write-Host $args -ForegroundColor Cyan }

$cmd = "docker-compose logs"

if ($Follow) {
    $cmd += " -f"
}

if ($Lines -gt 0) {
    $cmd += " --tail=$Lines"
}

if ($Since) {
    $cmd += " --since=$Since"
}

if ($Service -ne "all") {
    $cmd += " $Service"
    Write-Info "📋 Viewing $Service logs (last $Lines lines)`n"
} else {
    Write-Info "📋 Viewing all service logs (last $Lines lines)`n"
}

if ($Follow) {
    Write-Info "Following logs... (Ctrl+C to stop)`n"
}

Invoke-Expression $cmd