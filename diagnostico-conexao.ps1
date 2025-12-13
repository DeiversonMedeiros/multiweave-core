# Script de Diagnostico de Conexao - Multiweave Core
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DIAGNOSTICO DE CONEXAO - MULTIWEAVE CORE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar conexao com Supabase remoto
Write-Host "[1/6] Testando conexao com Supabase remoto..." -ForegroundColor Yellow
$supabaseUrl = "wmtftyaqucwfsnnjepiy.supabase.co"
try {
    $result = Test-NetConnection -ComputerName $supabaseUrl -Port 443 -WarningAction SilentlyContinue
    if ($result.TcpTestSucceeded) {
        Write-Host "OK - Conexao com Supabase remoto: OK" -ForegroundColor Green
        Write-Host "   IP: $($result.RemoteAddress)" -ForegroundColor Gray
    } else {
        Write-Host "ERRO - Conexao com Supabase remoto: FALHOU" -ForegroundColor Red
    }
} catch {
    Write-Host "ERRO - Erro ao testar conexao: $_" -ForegroundColor Red
}
Write-Host ""

# 2. Verificar se Docker esta rodando
Write-Host "[2/6] Verificando Docker Desktop..." -ForegroundColor Yellow
try {
    $dockerRunning = docker ps 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK - Docker Desktop: RODANDO" -ForegroundColor Green
        $containers = docker ps --format "{{.Names}}" 2>&1
        if ($containers -match "supabase") {
            Write-Host "   Containers Supabase encontrados:" -ForegroundColor Gray
            $containers | Where-Object { $_ -match "supabase" } | ForEach-Object { Write-Host "   - $_" -ForegroundColor Gray }
        } else {
            Write-Host "   AVISO - Nenhum container Supabase rodando" -ForegroundColor Yellow
        }
    } else {
        Write-Host "ERRO - Docker Desktop: NAO ESTA RODANDO" -ForegroundColor Red
        Write-Host "   (Necessario apenas para Supabase local)" -ForegroundColor Gray
    }
} catch {
    Write-Host "ERRO - Docker Desktop: NAO INSTALADO OU NAO NO PATH" -ForegroundColor Red
}
Write-Host ""

# 3. Verificar se Supabase CLI esta instalado
Write-Host "[3/6] Verificando Supabase CLI..." -ForegroundColor Yellow
try {
    $supabaseVersion = supabase --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK - Supabase CLI: INSTALADO" -ForegroundColor Green
        Write-Host "   $supabaseVersion" -ForegroundColor Gray
    } else {
        Write-Host "ERRO - Supabase CLI: NAO ENCONTRADO" -ForegroundColor Red
        Write-Host "   Instale com: npm install -g supabase" -ForegroundColor Gray
    }
} catch {
    Write-Host "ERRO - Supabase CLI: NAO INSTALADO OU NAO NO PATH" -ForegroundColor Red
    Write-Host "   Instale com: npm install -g supabase" -ForegroundColor Gray
}
Write-Host ""

# 4. Verificar portas locais
Write-Host "[4/6] Verificando portas locais do Supabase..." -ForegroundColor Yellow
$ports = @(54321, 54322, 54323)
$allFree = $true
foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        Write-Host "AVISO - Porta ${port}: EM USO" -ForegroundColor Yellow
        Write-Host "   Estado: $($connection.State)" -ForegroundColor Gray
        $allFree = $false
    } else {
        Write-Host "   Porta ${port}: Livre" -ForegroundColor Gray
    }
}
if ($allFree) {
    Write-Host "OK - Todas as portas estao livres (Supabase local nao esta rodando)" -ForegroundColor Green
}
Write-Host ""

# 5. Verificar se aplicacao esta rodando
Write-Host "[5/6] Verificando se aplicacao esta rodando..." -ForegroundColor Yellow
$devServerPort = 8080
$devServerConnection = Get-NetTCPConnection -LocalPort $devServerPort -ErrorAction SilentlyContinue
$testConnection = Test-NetConnection -ComputerName localhost -Port $devServerPort -InformationLevel Quiet -WarningAction SilentlyContinue

if ($devServerConnection -or $testConnection) {
    Write-Host "OK - Aplicacao (Vite): RODANDO na porta $devServerPort" -ForegroundColor Green
    Write-Host "   Acesse: http://localhost:$devServerPort" -ForegroundColor Cyan
    if ($devServerConnection) {
        Write-Host "   Processo ID: $($devServerConnection.OwningProcess)" -ForegroundColor Gray
    }
} else {
    Write-Host "ERRO - Aplicacao (Vite): NAO ESTA RODANDO" -ForegroundColor Red
    Write-Host "   Execute: npm run dev" -ForegroundColor Gray
    Write-Host "   Porta configurada: $devServerPort (verifique vite.config.ts)" -ForegroundColor Gray
}
Write-Host ""

# 6. Verificar configuracao do cliente Supabase
Write-Host "[6/6] Verificando configuracao do cliente..." -ForegroundColor Yellow
$clientFile = "src\integrations\supabase\client.ts"
if (Test-Path $clientFile) {
    $clientContent = Get-Content $clientFile -Raw
    if ($clientContent -match "https://wmtftyaqucwfsnnjepiy.supabase.co") {
        Write-Host "OK - Cliente configurado para Supabase REMOTO" -ForegroundColor Green
        Write-Host "   URL: https://wmtftyaqucwfsnnjepiy.supabase.co" -ForegroundColor Gray
    } else {
        Write-Host "AVISO - Cliente pode estar configurado para Supabase LOCAL" -ForegroundColor Yellow
    }
} else {
    Write-Host "ERRO - Arquivo do cliente nao encontrado: $clientFile" -ForegroundColor Red
}
Write-Host ""

# Resumo e recomendacoes
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RESUMO E RECOMENDACOES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "CONFIGURACAO ATUAL:" -ForegroundColor Yellow
Write-Host "  - Usando Supabase REMOTO (nao local)" -ForegroundColor Gray
Write-Host "  - URL: https://wmtftyaqucwfsnnjepiy.supabase.co" -ForegroundColor Gray
Write-Host ""
Write-Host "PROXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "  1. Se a aplicacao nao esta rodando:" -ForegroundColor White
Write-Host "     npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. Se estiver usando Supabase LOCAL, inicie:" -ForegroundColor White
Write-Host "     - Docker Desktop" -ForegroundColor Cyan
Write-Host "     - supabase start" -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. Verifique erros no console do navegador (F12)" -ForegroundColor White
Write-Host ""
Write-Host "  4. Verifique se ha problemas de autenticacao/token" -ForegroundColor White
Write-Host ""
