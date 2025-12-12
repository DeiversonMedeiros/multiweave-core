# Solução para Problemas de Conexão Supabase

## Problemas Identificados

1. **Supabase CLI não está instalado** - Necessário para executar migrações localmente
2. **Variáveis de ambiente não configuradas** - Para comandos do CLI

## Soluções

### 1. Instalar Supabase CLI

```powershell
npm install -g supabase
```

Depois de instalar, verifique:
```powershell
supabase --version
```

### 2. Para Executar Migrações

**Opção A: Usando Supabase CLI (Recomendado)**

1. Configure as variáveis de ambiente:
```powershell
.\supabase\connect.ps1
```

2. Conecte ao projeto remoto:
```powershell
supabase link --project-ref wmtftyaqucwfsnnjepiy --password 81hbcoNDXaGiPIpp!
```

3. Execute as migrações:
```powershell
supabase db push
```

**Opção B: Usando Supabase Studio (Web)**

1. Acesse: https://supabase.com/dashboard/project/wmtftyaqucwfsnnjepiy
2. Vá em "SQL Editor"
3. Cole o conteúdo da migração e execute

**Opção C: Aplicar migração específica via API**

Use o script `supabase\connect_remote.ps1` para configurar variáveis e depois execute:
```powershell
supabase db push --db-url $env:SUPABASE_DB_URL
```

### 3. Para Aplicação Frontend

A conexão via `client.ts` deve funcionar normalmente. A URL e chave estão configuradas corretamente:
- URL: https://wmtftyaqucwfsnnjepiy.supabase.co
- Chave anon: Configurada em `src/integrations/supabase/client.ts`

### 4. Para Conexão Direta ao Banco

O Supabase não permite conexão direta na porta 5432. Use o **connection pooler** na porta 6543:

```
postgresql://postgres:81hbcoNDXaGiPIpp!@db.wmtftyaqucwfsnnjepiy.supabase.co:6543/postgres?pgbouncer=true
```

## Testar Conexão

Execute o script de diagnóstico:
```powershell
.\supabase\diagnostico_conexao.ps1
```

## Próximos Passos

1. Instale o Supabase CLI
2. Execute o diagnóstico novamente para confirmar
3. Aplique suas migrações usando uma das opções acima
