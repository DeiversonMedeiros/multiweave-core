# Script para testar conexão com Supabase
Write-Host "=== Testando Conexão Supabase ===" -ForegroundColor Cyan
Write-Host ""

# Configurar variáveis de ambiente
$env:SUPABASE_DB_URL = "postgresql://postgres:81hbcoNDXaGiPIpp!@db.wmtftyaqucwfsnnjepiy.supabase.co:5432/postgres"
$env:SUPABASE_URL = "https://wmtftyaqucwfsnnjepiy.supabase.co"
$env:SUPABASE_PROJECT_REF = "wmtftyaqucwfsnnjepiy"

Write-Host "Variáveis de ambiente configuradas:" -ForegroundColor Green
Write-Host "  SUPABASE_DB_URL: $env:SUPABASE_DB_URL"
Write-Host "  SUPABASE_URL: $env:SUPABASE_URL"
Write-Host "  SUPABASE_PROJECT_REF: $env:SUPABASE_PROJECT_REF"
Write-Host ""

# Tentar conectar ao projeto remoto
Write-Host "Conectando ao projeto remoto..." -ForegroundColor Yellow
try {
    $linkOutput = supabase link --project-ref wmtftyaqucwfsnnjepiy --password 81hbcoNDXaGiPIpp! 2>&1
    Write-Host "Saída do comando link:" -ForegroundColor Cyan
    Write-Host $linkOutput
    Write-Host ""
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Conexão estabelecida com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Código de saída: $LASTEXITCODE" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erro ao conectar: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Teste de conexão concluído ===" -ForegroundColor Cyan

