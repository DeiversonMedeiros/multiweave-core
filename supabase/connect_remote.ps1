# Script para conectar ao Supabase remoto usando URL direta
# Não executa migrações, apenas estabelece a conexão para uso com comandos do CLI

Write-Host "=== Configuração de Conexão Supabase Remoto ===" -ForegroundColor Cyan
Write-Host ""

# Configurar variáveis de ambiente
$env:SUPABASE_DB_URL = "postgresql://postgres:81hbcoNDXaGiPIpp!@db.wmtftyaqucwfsnnjepiy.supabase.co:5432/postgres"
$env:SUPABASE_URL = "https://wmtftyaqucwfsnnjepiy.supabase.co"
$env:SUPABASE_PROJECT_REF = "wmtftyaqucwfsnnjepiy"

Write-Host "✅ Variáveis de ambiente configuradas:" -ForegroundColor Green
Write-Host "  SUPABASE_DB_URL: $env:SUPABASE_DB_URL" -ForegroundColor White
Write-Host "  SUPABASE_URL: $env:SUPABASE_URL" -ForegroundColor White
Write-Host "  SUPABASE_PROJECT_REF: $env:SUPABASE_PROJECT_REF" -ForegroundColor White
Write-Host ""

# Testar conexão
Write-Host "Testando conexão com o banco de dados..." -ForegroundColor Yellow
$testResult = supabase db dump --db-url "$env:SUPABASE_DB_URL" --schema public --data-only --dry-run 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Conexão estabelecida com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Informações da conexão:" -ForegroundColor Cyan
    Write-Host "  Host: db.wmtftyaqucwfsnnjepiy.supabase.co" -ForegroundColor White
    Write-Host "  Porta: 5432" -ForegroundColor White
    Write-Host "  Database: postgres" -ForegroundColor White
    Write-Host "  URL: https://wmtftyaqucwfsnnjepiy.supabase.co" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️ IMPORTANTE:" -ForegroundColor Yellow
    Write-Host "  - Nenhuma migração foi executada" -ForegroundColor Yellow
    Write-Host "  - Use --db-url em comandos do Supabase CLI para operações remotas" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Exemplos de uso:" -ForegroundColor Cyan
    Write-Host "  supabase db dump --db-url `"$env:SUPABASE_DB_URL`" --schema public --data-only" -ForegroundColor White
    Write-Host "  supabase db dump --db-url `"$env:SUPABASE_DB_URL`" --schema public" -ForegroundColor White
} else {
    Write-Host "❌ Erro ao testar conexão" -ForegroundColor Red
    Write-Host $testResult
}

Write-Host ""
Write-Host "=== Configuração concluída ===" -ForegroundColor Cyan

