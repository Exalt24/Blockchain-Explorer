<#
.SYNOPSIS
    Run test suites
.DESCRIPTION
    Runs all or specific test suites with proper Docker environment
.PARAMETER Suite
    Test suite to run: all, unit, integration, performance, contracts
.EXAMPLE
    .\scripts\run-tests.ps1
    .\scripts\run-tests.ps1 -Suite unit
    .\scripts\run-tests.ps1 -Suite contracts
#>

param(
    [ValidateSet("all", "unit", "integration", "performance", "contracts")]
    [string]$Suite = "all"
)

$ErrorActionPreference = "Stop"

function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Error { Write-Host $args -ForegroundColor Red }

Write-Host "`n🧪 Running tests: $Suite`n" -ForegroundColor Cyan

$testsPassed = 0
$testsFailed = 0

function Run-TestSuite {
    param($Name, $Command, $WorkDir)
    
    Write-Info "Running $Name tests..."
    
    try {
        if ($WorkDir) {
            Push-Location $WorkDir
        }
        
        Invoke-Expression $Command
        Write-Success "✓ $Name tests passed"
        $script:testsPassed++
        
        if ($WorkDir) {
            Pop-Location
        }
    } catch {
        Write-Error "✗ $Name tests failed"
        $script:testsFailed++
        
        if ($WorkDir) {
            Pop-Location
        }
    }
}

switch ($Suite) {
    "all" {
        Write-Info "Running all test suites...`n"
        
        Run-TestSuite "Unit" "docker-compose exec -T backend npm run test:health" $null
        Run-TestSuite "Cache" "docker-compose exec -T backend npm run test:cache" $null
        Run-TestSuite "Batch" "docker-compose exec -T backend npm run test:batch" $null
        Run-TestSuite "Integration" "docker-compose exec -T backend npm run test:e2e" $null
        Run-TestSuite "API" "docker-compose exec -T backend npm run test:api-integration" $null
        Run-TestSuite "WebSocket" "docker-compose exec -T backend npm run test:ws-stress" $null
        Run-TestSuite "Contracts" "npm test" "contracts"
    }
    "unit" {
        Run-TestSuite "Health" "docker-compose exec -T backend npm run test:health" $null
        Run-TestSuite "Cache" "docker-compose exec -T backend npm run test:cache" $null
        Run-TestSuite "Batch" "docker-compose exec -T backend npm run test:batch" $null
    }
    "integration" {
        Run-TestSuite "E2E" "docker-compose exec -T backend npm run test:e2e" $null
        Run-TestSuite "API" "docker-compose exec -T backend npm run test:api-integration" $null
        Run-TestSuite "Concurrent" "docker-compose exec -T backend npm run test:concurrent" $null
    }
    "performance" {
        Run-TestSuite "Load" "docker-compose exec -T backend npm run test:load" $null
        Run-TestSuite "Cache Performance" "docker-compose exec -T backend npm run test:cache-perf" $null
    }
    "contracts" {
        Run-TestSuite "Solidity" "npm test" "contracts"
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TEST RESULTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Success "Passed: $testsPassed"
if ($testsFailed -gt 0) {
    Write-Error "Failed: $testsFailed"
} else {
    Write-Success "Failed: 0"
}
Write-Host ""

if ($testsFailed -gt 0) {
    exit 1
}