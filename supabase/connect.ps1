# Script de conexão ao Supabase remoto
# Uso: .\supabase\connect.ps1

$env:SUPABASE_DB_URL = "postgresql://postgres:81hbcoNDXaGiPIpp!@db.wmtftyaqucwfsnnjepiy.supabase.co:5432/postgres"
$env:SUPABASE_URL = "https://wmtftyaqucwfsnnjepiy.supabase.co"
$env:SUPABASE_PROJECT_REF = "wmtftyaqucwfsnnjepiy"

Write-Host "✅ Variáveis de ambiente configuradas para conexão Supabase" -ForegroundColor Green
Write-Host ""
Write-Host "Variáveis configuradas:" -ForegroundColor Cyan
Write-Host "  SUPABASE_DB_URL: $env:SUPABASE_DB_URL"
Write-Host "  SUPABASE_URL: $env:SUPABASE_URL"
Write-Host "  SUPABASE_PROJECT_REF: $env:SUPABASE_PROJECT_REF"
Write-Host ""
Write-Host "Exemplo de uso:" -ForegroundColor Yellow
Write-Host "  supabase db dump --db-url `"$env:SUPABASE_DB_URL`" --schema public --data-only"
Write-Host ""



