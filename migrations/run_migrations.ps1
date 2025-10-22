<#
Run SQL migrations against a Supabase/Postgres database using psql.

Usage:
  - Set environment variable SUPABASE_DB_URL to your Postgres connection string, e.g.:
      postgresql://<user>:<pass>@<host>:5432/<db>?sslmode=require

  - From PowerShell run:
      .\migrations\run_migrations.ps1

Notes:
  - Requires psql (Postgres client) to be installed and on PATH.
  - Migrations are applied in lexical order by filename (prefix with numbers).
  - The script stops on the first failed migration.
#>

param(
  [string]$MigrationsDir = "$PSScriptRoot",
  [switch]$Verbose
)

# Allow user to pass directory explicitly
if ($MigrationsDir -eq "$PSScriptRoot") {
  $MigrationsDir = Join-Path -Path $PSScriptRoot -ChildPath '..\migrations' | Resolve-Path -ErrorAction SilentlyContinue
  if ($MigrationsDir) { $MigrationsDir = $MigrationsDir.Path } else { $MigrationsDir = Join-Path $PSScriptRoot -ChildPath '.' }
}

Write-Host "Migrations directory: $MigrationsDir"

# Get DB URL
$DbUrl = $env:SUPABASE_DB_URL
if (-not $DbUrl) {
  Write-Host "Environment variable SUPABASE_DB_URL not set."
  $DbUrl = Read-Host -Prompt 'Enter Postgres connection string (or set SUPABASE_DB_URL)'
}

if (-not $DbUrl) {
  Write-Error "No database URL provided. Aborting."
  exit 1
}

# Check psql
$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
  Write-Error "psql not found. Please install PostgreSQL client tools or use Supabase SQL editor."
  Write-Host "https://www.postgresql.org/download/"
  exit 1
}

# Find SQL files
$files = Get-ChildItem -Path $MigrationsDir -Filter '*.sql' -File -ErrorAction SilentlyContinue | Sort-Object Name
if (-not $files -or $files.Count -eq 0) {
  Write-Host "No .sql migration files found in $MigrationsDir"
  exit 0
}

# Apply migrations
foreach ($file in $files) {
  Write-Host "Applying migration: $($file.Name)"
  & psql $DbUrl -f $file.FullName
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Migration failed: $($file.Name). psql exit code: $LASTEXITCODE"
    exit $LASTEXITCODE
  }
  Write-Host "Applied: $($file.Name)"
}

Write-Host "All migrations applied successfully." -ForegroundColor Green
exit 0
