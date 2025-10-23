# Script para corrigir todas as migrações que usam check_access_permission
$migrations = Get-ChildItem -Path "supabase/migrations" -Filter "*.sql"

foreach ($migration in $migrations) {
    $content = Get-Content $migration.FullName -Raw
    
    # Substituir padrões problemáticos
    $content = $content -replace "company_id = ANY\(get_user_companies\(\)\) AND\s*check_access_permission\([^)]*\)", "user_has_company_access(company_id)"
    $content = $content -replace "company_id = ANY\(get_user_companies\(\)\)", "user_has_company_access(company_id)"
    
    # Salvar arquivo corrigido
    Set-Content -Path $migration.FullName -Value $content -NoNewline
}

Write-Host "Migrações corrigidas com sucesso!"

