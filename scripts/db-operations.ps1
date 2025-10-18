<#
.SYNOPSIS
    Database management operations
.DESCRIPTION
    Provides database utilities: migrate, reset, shell, stats
.PARAMETER Operation
    Operation to perform: migrate, reset, shell, stats
.EXAMPLE
    .\scripts\db-operations.ps1 -Operation migrate
    .\scripts\db-operations.ps1 -Operation stats
    .\scripts\db-operations.ps1 -Operation shell
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("migrate", "reset", "shell", "stats")]
    [string]$Operation
)

$ErrorActionPreference = "Stop"

function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

$postgresStatus = docker-compose ps postgres --format json 2>$null | ConvertFrom-Json
if (-not $postgresStatus -or $postgresStatus.State -ne "running") {
    Write-Error "✗ PostgreSQL is not running"
    exit 1
}

switch ($Operation) {
    "migrate" {
        Write-Info "🔄 Running database migrations...`n"
        
        try {
            docker-compose exec -T backend npm run migrate
            Write-Success "`n✓ Migrations completed"
        } catch {
            Write-Error "✗ Migrations failed: $_"
            exit 1
        }
    }
    
    "reset" {
        Write-Warning "`n⚠️  DATABASE RESET ⚠️"
        Write-Host "This will:"
        Write-Host "  • Drop all tables"
        Write-Host "  • Re-run migrations"
        Write-Host "  • All data will be lost`n"
        
        $confirmation = Read-Host "Continue? (yes/no)"
        if ($confirmation -ne "yes") {
            Write-Info "Reset cancelled"
            exit 0
        }
        
        Write-Info "`nDropping tables..."
        
        $dropSQL = @"
DROP TABLE IF EXISTS blockchain_events CASCADE;
DROP TABLE IF EXISTS sync_status CASCADE;
"@
        
        try {
            $dropSQL | docker-compose exec -T postgres psql -U postgres -d blockchain_explorer
            Write-Success "✓ Tables dropped"
            
            Write-Info "`nRunning migrations..."
            docker-compose exec -T backend npm run migrate
            Write-Success "✓ Database reset complete"
        } catch {
            Write-Error "✗ Reset failed: $_"
            exit 1
        }
    }
    
    "shell" {
        Write-Info "🐘 PostgreSQL Shell (type \q to exit)`n"
        docker-compose exec postgres psql -U postgres -d blockchain_explorer
    }
    
    "stats" {
        Write-Info "📊 Database Statistics`n"
        
        $statsSQL = @"
SELECT 
    'blockchain_events' AS table_name,
    COUNT(*) AS row_count,
    pg_size_pretty(pg_total_relation_size('blockchain_events')) AS total_size
FROM blockchain_events
UNION ALL
SELECT 
    'sync_status' AS table_name,
    COUNT(*) AS row_count,
    pg_size_pretty(pg_total_relation_size('sync_status')) AS total_size
FROM sync_status;

SELECT 
    event_name,
    COUNT(*) AS count,
    MIN(timestamp) AS first_event,
    MAX(timestamp) AS last_event
FROM blockchain_events
GROUP BY event_name
ORDER BY count DESC;
"@
        
        try {
            Write-Host "Tables:" -ForegroundColor Yellow
            $statsSQL | docker-compose exec -T postgres psql -U postgres -d blockchain_explorer
        } catch {
            Write-Error "✗ Failed to get stats: $_"
            exit 1
        }
    }
}