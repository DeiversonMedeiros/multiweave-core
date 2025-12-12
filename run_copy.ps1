# Script PowerShell para executar a cópia de dados
$connectionString = "postgresql://postgres:81hbcoNDXaGiPIpp!@db.wmtftyaqucwfsnnjepiy.supabase.co:5432/postgres"

Write-Host "Criando função de cópia..." -ForegroundColor Yellow
Get-Content create_copy_function.sql | supabase db execute --db-url $connectionString

Write-Host "`nExecutando cópia de dados..." -ForegroundColor Yellow
Get-Content execute_copy.sql | supabase db execute --db-url $connectionString

Write-Host "`nVerificando resultados..." -ForegroundColor Yellow
Get-Content verify_copy.sql | supabase db execute --db-url $connectionString

Write-Host "`nProcesso concluído!" -ForegroundColor Green










