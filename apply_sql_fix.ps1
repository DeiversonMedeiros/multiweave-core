# Script para aplicar correção da função get_entity_data
Write-Host "Aplicando correção da função get_entity_data com logs detalhados..." -ForegroundColor Green

# Ler o arquivo SQL
$sqlContent = Get-Content -Path "fix_get_entity_data_with_logs.sql" -Raw

Write-Host "Conteúdo do arquivo SQL carregado. Tamanho: $($sqlContent.Length) caracteres" -ForegroundColor Yellow

Write-Host "Por favor, execute o seguinte comando no seu cliente PostgreSQL:" -ForegroundColor Cyan
Write-Host "psql -h localhost -U postgres -d multiweave_core -f fix_get_entity_data_with_logs.sql" -ForegroundColor White

Write-Host "Ou copie e cole o conteúdo do arquivo fix_get_entity_data_with_logs.sql diretamente no seu cliente PostgreSQL." -ForegroundColor Yellow
