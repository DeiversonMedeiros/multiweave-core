# Script para aplicar migração do bucket training-files
# Sistema ERP MultiWeave Core

$connectionString = "postgresql://postgres:81hbcoNDXaGiPIpp!@db.wmtftyaqucwfsnnjepiy.supabase.co:5432/postgres"

$migration = "supabase\migrations\20260115000001_create_training_files_bucket.sql"

Write-Host "Aplicando migração do bucket training-files..." -ForegroundColor Green

if (Test-Path $migration) {
    Write-Host "Aplicando: $migration" -ForegroundColor Yellow
    
    # Ler o conteúdo do arquivo SQL
    $sql = Get-Content -Path $migration -Raw -Encoding UTF8
    
    # Verificar se psql está disponível
    $psqlPath = Get-Command psql -ErrorAction SilentlyContinue
    if ($psqlPath) {
        # Aplicar via psql
        $sql | & $psqlPath.Source $connectionString
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Migração aplicada com sucesso!" -ForegroundColor Green
            Write-Host "`nO bucket 'training-files' foi criado e está pronto para uso." -ForegroundColor Cyan
        } else {
            Write-Host "✗ Erro ao aplicar migração" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "⚠ psql não encontrado. Por favor, aplique a migração manualmente:" -ForegroundColor Yellow
        Write-Host "`n1. Acesse o Supabase Dashboard: https://supabase.com/dashboard/project/wmtftyaqucwfsnnjepiy" -ForegroundColor Cyan
        Write-Host "2. Vá em 'SQL Editor'" -ForegroundColor Cyan
        Write-Host "3. Cole o conteúdo do arquivo: $migration" -ForegroundColor Cyan
        Write-Host "4. Execute o SQL" -ForegroundColor Cyan
        Write-Host "`nOu instale o PostgreSQL client tools e tente novamente." -ForegroundColor Yellow
    }
} else {
    Write-Host "✗ Arquivo de migração não encontrado: $migration" -ForegroundColor Red
    exit 1
}
