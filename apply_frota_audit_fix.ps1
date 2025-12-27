# Script para aplicar correção do trigger de auditoria de veículos
# Sistema ERP MultiWeave Core

$connectionString = "postgresql://postgres:81hbcoNDXaGiPIpp!@db.wmtftyaqucwfsnnjepiy.supabase.co:5432/postgres"

$migration = "supabase\migrations\20251227000001_fix_frota_audit_trigger.sql"

Write-Host "Aplicando correção do trigger de auditoria de veículos..." -ForegroundColor Green

if (Test-Path $migration) {
    Write-Host "Aplicando: $migration" -ForegroundColor Yellow
    $sql = Get-Content -Path $migration -Raw -Encoding UTF8
    $sql | psql $connectionString
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Migração aplicada com sucesso: $migration" -ForegroundColor Green
        Write-Host "`nAgora você pode testar criando um novo veículo na página frota/veiculos." -ForegroundColor Cyan
    } else {
        Write-Host "✗ Erro ao aplicar migração: $migration" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "⚠ Arquivo não encontrado: $migration" -ForegroundColor Yellow
    exit 1
}

