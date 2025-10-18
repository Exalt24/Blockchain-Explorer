<#
.SYNOPSIS
    Deploy GameState contract
.DESCRIPTION
    Deploys contract to Hardhat node and updates environment configuration
.EXAMPLE
    .\scripts\deploy-contract.ps1
#>

$ErrorActionPreference = "Stop"

function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Error { Write-Host $args -ForegroundColor Red }

Write-Host "`n📜 Deploying GameState contract...`n" -ForegroundColor Cyan

$hardhatStatus = docker-compose ps hardhat --format json 2>$null | ConvertFrom-Json
if (-not $hardhatStatus -or $hardhatStatus.State -ne "running") {
    Write-Error "✗ Hardhat node is not running. Start it first with: .\scripts\start-dev.ps1"
    exit 1
}

Write-Info "Hardhat node is running, deploying contract..."

try {
    docker-compose exec -T hardhat npm run deploy-docker
    Write-Success "`n✓ Contract deployed successfully"
    
    $envContent = Get-Content "backend\.env.docker" -Raw
    if ($envContent -match 'CONTRACT_ADDRESS=0x[a-fA-F0-9]{40}') {
        Write-Success "✓ CONTRACT_ADDRESS updated in backend\.env.docker"
        
        Write-Info "`n⚠ Restart backend to use new contract:"
        Write-Host "  docker-compose restart backend`n"
    } else {
        Write-Error "✗ Failed to find CONTRACT_ADDRESS in backend\.env.docker"
    }
} catch {
    Write-Error "✗ Deployment failed: $_"
    exit 1
}