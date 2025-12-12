# Script de diagnostico completo de conexao Supabase
Write-Host "=== DIAGNOSTICO DE CONEXAO SUPABASE ===" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Supabase CLI
Write-Host "1. Verificando Supabase CLI..." -ForegroundColor Yellow
$supabaseCli = Get-Command supabase -ErrorAction SilentlyContinue
if ($supabaseCli) {
    Write-Host "   OK - Supabase CLI encontrado em: $($supabaseCli.Source)" -ForegroundColor Green
    $version = supabase --version 2>&1
    Write-Host "   Versao: $version" -ForegroundColor White
} else {
    Write-Host "   ERRO - Supabase CLI NAO esta instalado" -ForegroundColor Red
    Write-Host "   Instale com: npm install -g supabase" -ForegroundColor Yellow
    Write-Host "   Ou baixe de: https://github.com/supabase/cli/releases" -ForegroundColor Yellow
}
Write-Host ""

# 2. Verificar conectividade de rede
Write-Host "2. Verificando conectividade de rede..." -ForegroundColor Yellow

# Testar HTTPS (API)
Write-Host "   Testando HTTPS (porta 443)..." -ForegroundColor White
$httpsTest = Test-NetConnection -ComputerName wmtftyaqucwfsnnjepiy.supabase.co -Port 443 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($httpsTest) {
    Write-Host "   OK - HTTPS (API) acessivel" -ForegroundColor Green
} else {
    Write-Host "   ERRO - HTTPS (API) NAO acessivel" -ForegroundColor Red
}

# Testar banco direto (normalmente nao funciona)
Write-Host "   Testando banco direto (porta 5432)..." -ForegroundColor White
$dbTest = Test-NetConnection -ComputerName db.wmtftyaqucwfsnnjepiy.supabase.co -Port 5432 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($dbTest) {
    Write-Host "   OK - Banco direto acessivel" -ForegroundColor Green
} else {
    Write-Host "   AVISO - Banco direto NAO acessivel (normal para Supabase - use connection pooler)" -ForegroundColor Yellow
}
Write-Host ""

# 3. Verificar variaveis de ambiente
Write-Host "3. Verificando variaveis de ambiente..." -ForegroundColor Yellow
$envVars = @("SUPABASE_URL", "SUPABASE_DB_URL", "SUPABASE_PROJECT_REF", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY")
$envSet = $false
foreach ($var in $envVars) {
    $value = [Environment]::GetEnvironmentVariable($var, "Process")
    if ($value) {
        Write-Host "   OK - $var esta definida" -ForegroundColor Green
        if ($var -match "KEY|PASSWORD|SECRET") {
            Write-Host "      Valor: [OCULTO]" -ForegroundColor Gray
        } else {
            Write-Host "      Valor: $value" -ForegroundColor Gray
        }
        $envSet = $true
    }
}
if (-not $envSet) {
    Write-Host "   AVISO - Nenhuma variavel de ambiente configurada" -ForegroundColor Yellow
    Write-Host "   Execute: .\supabase\connect.ps1" -ForegroundColor Cyan
}
Write-Host ""

# 4. Verificar arquivo de configuracao
Write-Host "4. Verificando configuracao local..." -ForegroundColor Yellow
$configPath = "supabase\config.toml"
if (Test-Path $configPath) {
    Write-Host "   OK - config.toml encontrado" -ForegroundColor Green
    $config = Get-Content $configPath -Raw
    if ($config -match 'project_id\s*=\s*"([^"]+)"') {
        Write-Host "   Project ID: $($matches[1])" -ForegroundColor White
    }
} else {
    Write-Host "   ERRO - config.toml NAO encontrado" -ForegroundColor Red
}
Write-Host ""

# 5. Verificar cliente TypeScript
Write-Host "5. Verificando cliente Supabase (TypeScript)..." -ForegroundColor Yellow
$clientPath = "src\integrations\supabase\client.ts"
if (Test-Path $clientPath) {
    Write-Host "   OK - client.ts encontrado" -ForegroundColor Green
    $clientContent = Get-Content $clientPath -Raw
    if ($clientContent -match 'SUPABASE_URL\s*=\s*"([^"]+)"') {
        Write-Host "   URL configurada: $($matches[1])" -ForegroundColor White
    }
    if ($clientContent -match 'SUPABASE_PUBLISHABLE_KEY') {
        Write-Host "   OK - Chave anon configurada" -ForegroundColor Green
    }
} else {
    Write-Host "   ERRO - client.ts NAO encontrado" -ForegroundColor Red
}
Write-Host ""

# 6. Testar conexao via API (se possivel)
Write-Host "6. Testando conexao via API REST..." -ForegroundColor Yellow
try {
    $supabaseUrl = "https://wmtftyaqucwfsnnjepiy.supabase.co"
    $response = Invoke-WebRequest -Uri "$supabaseUrl/rest/v1/" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   OK - API REST respondendo (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    $errorMsg = $_.Exception.Message
    if ($errorMsg -match "401|403") {
        Write-Host "   AVISO - API responde mas requer autenticacao (normal)" -ForegroundColor Yellow
    } elseif ($errorMsg -match "timeout|resolve") {
        Write-Host "   ERRO - Nao foi possivel conectar a API" -ForegroundColor Red
        Write-Host "      Erro: $errorMsg" -ForegroundColor Gray
    } else {
        Write-Host "   AVISO - Resposta inesperada: $errorMsg" -ForegroundColor Yellow
    }
}
Write-Host ""

# 7. Resumo e recomendacoes
Write-Host "=== RESUMO E RECOMENDACOES ===" -ForegroundColor Cyan
Write-Host ""

if (-not $supabaseCli) {
    Write-Host "ACAO NECESSARIA:" -ForegroundColor Red
    Write-Host "   1. Instale o Supabase CLI:" -ForegroundColor Yellow
    Write-Host "      npm install -g supabase" -ForegroundColor White
    Write-Host ""
}

Write-Host "Para trabalhar com migracoes:" -ForegroundColor Cyan
Write-Host "   1. Use o Supabase Studio (web):" -ForegroundColor White
Write-Host "      https://supabase.com/dashboard/project/wmtftyaqucwfsnnjepiy" -ForegroundColor Gray
Write-Host ""
Write-Host "   2. Ou configure o CLI e use:" -ForegroundColor White
Write-Host "      supabase link --project-ref wmtftyaqucwfsnnjepiy" -ForegroundColor Gray
Write-Host "      supabase db push" -ForegroundColor Gray
Write-Host ""

Write-Host "Para aplicacao frontend:" -ForegroundColor Cyan
Write-Host "   A conexao via client.ts deve funcionar normalmente" -ForegroundColor White
Write-Host "   URL: https://wmtftyaqucwfsnnjepiy.supabase.co" -ForegroundColor Gray
Write-Host ""

Write-Host "Para conexao direta ao banco:" -ForegroundColor Cyan
Write-Host "   Use o connection pooler (porta 6543) em vez da porta 5432" -ForegroundColor White
Write-Host "   URL: postgresql://postgres:[PASSWORD]@db.wmtftyaqucwfsnnjepiy.supabase.co:6543/postgres?pgbouncer=true" -ForegroundColor Gray
Write-Host ""

Write-Host "=== DIAGNOSTICO CONCLUIDO ===" -ForegroundColor Cyan
