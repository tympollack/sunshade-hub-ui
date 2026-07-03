# db-migrate.ps1
# Usage:
#   .\scripts\db-migrate.ps1 -Env staging
#   .\scripts\db-migrate.ps1 -Env prod
#
# Requires SUPABASE_STAGING_PROJECT_REF and SUPABASE_PROD_PROJECT_REF
# to be set in your environment (or a local .env.local file).

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("staging", "prod")]
    [string]$Env
)

$ProjectRefs = @{
    staging = $env:SUPABASE_STAGING_PROJECT_REF
    prod    = $env:SUPABASE_PROD_PROJECT_REF
}

# Fallback: load from .env.local if env vars not set
$EnvFile = Join-Path $PSScriptRoot "..\\.env.local"
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.+)$') {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim()
            if (-not [System.Environment]::GetEnvironmentVariable($key)) {
                [System.Environment]::SetEnvironmentVariable($key, $val)
            }
        }
    }
    $ProjectRefs = @{
        staging = $env:SUPABASE_STAGING_PROJECT_REF
        prod    = $env:SUPABASE_PROD_PROJECT_REF
    }
}

$Ref = $ProjectRefs[$Env]

if (-not $Ref) {
    Write-Error "Missing project ref for '$Env'. Set SUPABASE_$($Env.ToUpper())_PROJECT_REF in your environment or .env.local."
    exit 1
}

Write-Host ""
Write-Host "Target environment : $Env" -ForegroundColor Cyan
Write-Host "Project ref        : $Ref" -ForegroundColor Cyan
Write-Host ""

if ($Env -eq "prod") {
    Write-Host "WARNING: You are about to push migrations to PRODUCTION." -ForegroundColor Red
    $confirm = Read-Host "Type 'yes' to continue"
    if ($confirm -ne "yes") {
        Write-Host "Aborted." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "Linking to $Env ($Ref)..." -ForegroundColor Gray
npx supabase link --project-ref $Ref
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Running migration list..." -ForegroundColor Gray
npx supabase migration list
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
npx supabase db push
$PushExit = $LASTEXITCODE

# Always re-link to staging after any operation so prod is never left as default
Write-Host ""
Write-Host "Re-linking to staging ($($ProjectRefs['staging']))..." -ForegroundColor Gray
npx supabase link --project-ref $ProjectRefs['staging']

exit $PushExit
