# Dump do schema public (apenas dados) do Supabase remoto
# Executar no terminal do projeto: .\scripts\dump_remote_public_data.ps1
# Requer: Supabase CLI instalado (supabase --version)

$DbUrl = "postgresql://postgres:81hbcoNDXaGiPIpp!@db.wmtftyaqucwfsnnjepiy.supabase.co:5432/postgres"
$OutputFile = Join-Path $PSScriptRoot "dump_public_data.sql"

Write-Host "Conectando ao Supabase e gerando dump (schema public, data-only)..." -ForegroundColor Cyan
supabase db dump --db-url $DbUrl --schema public --data-only | Set-Content -Path $OutputFile -Encoding UTF8
if ($LASTEXITCODE -eq 0) {
    Write-Host "Dump salvo em: $OutputFile" -ForegroundColor Green
} else {
    Write-Host "Falha no dump. Verifique a conexão e o Supabase CLI." -ForegroundColor Red
    exit 1
}
