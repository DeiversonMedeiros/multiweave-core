# Script para conectar ao Supabase remoto
# Não executa migrações, apenas estabelece a conexão

Write-Host "=== Conectando ao Supabase Remoto ===" -ForegroundColor Cyan
Write-Host ""

# Configurar variáveis de ambiente
$env:SUPABASE_DB_URL = "postgresql://postgres:81hbcoNDXaGiPIpp!@db.wmtftyaqucwfsnnjepiy.supabase.co:5432/postgres"
$env:SUPABASE_URL = "https://wmtftyaqucwfsnnjepiy.supabase.co"
$env:SUPABASE_PROJECT_REF = "wmtftyaqucwfsnnjepiy"

Write-Host "Variáveis de ambiente configuradas:" -ForegroundColor Green
Write-Host "  SUPABASE_DB_URL: $env:SUPABASE_DB_URL" -ForegroundColor White
Write-Host "  SUPABASE_URL: $env:SUPABASE_URL" -ForegroundColor White
Write-Host "  SUPABASE_PROJECT_REF: $env:SUPABASE_PROJECT_REF" -ForegroundColor White
Write-Host ""

# Conectar ao projeto remoto usando link
Write-Host "Estabelecendo link com o projeto remoto..." -ForegroundColor Yellow
$linkResult = supabase link --project-ref wmtftyaqucwfsnnjepiy --password 81hbcoNDXaGiPIpp! 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Conexão estabelecida com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Projeto vinculado: wmtftyaqucwfsnnjepiy" -ForegroundColor Cyan
    Write-Host "URL: https://wmtftyaqucwfsnnjepiy.supabase.co" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⚠️ IMPORTANTE: Nenhuma migração foi executada." -ForegroundColor Yellow
} else {
    Write-Host "⚠️ Código de saída: $LASTEXITCODE" -ForegroundColor Yellow
    Write-Host "Saída do comando:" -ForegroundColor Yellow
    Write-Host $linkResult
}

Write-Host ""
Write-Host "=== Conexão concluída ===" -ForegroundColor Cyan
