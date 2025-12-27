# Script para aplicar migrações do módulo de logística
# Sistema ERP MultiWeave Core

$connectionString = "postgresql://postgres:81hbcoNDXaGiPIpp!@db.wmtftyaqucwfsnnjepiy.supabase.co:5432/postgres"

$migrations = @(
    "supabase\migrations\20251220000020_create_logistica_schema.sql",
    "supabase\migrations\20251220000021_create_logistica_rpc_functions.sql",
    "supabase\migrations\20251220000022_add_logistica_to_approval_system.sql"
)

Write-Host "Aplicando migrações do módulo de logística..." -ForegroundColor Green

foreach ($migration in $migrations) {
    if (Test-Path $migration) {
        Write-Host "Aplicando: $migration" -ForegroundColor Yellow
        $sql = Get-Content -Path $migration -Raw -Encoding UTF8
        $sql | psql $connectionString
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Migração aplicada com sucesso: $migration" -ForegroundColor Green
        } else {
            Write-Host "✗ Erro ao aplicar migração: $migration" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "⚠ Arquivo não encontrado: $migration" -ForegroundColor Yellow
    }
}

Write-Host "`nTodas as migrações foram aplicadas com sucesso!" -ForegroundColor Green

