# 🔧 Correção: Erro ao Criar Veículo - audit_logs não existe

## 📋 Problema Identificado

Ao criar um novo veículo na página "frota/veiculos", o sistema apresentava o erro:

```
Error: relation "public.audit_logs" does not exist
```

## 🔍 Causa Raiz

O trigger `audit_vehicles_trigger` na tabela `frota.vehicles` estava usando a função `frota.audit_vehicle_changes()` que tentava inserir logs em `public.audit_logs`, mas:

1. A tabela `audit_logs` está no schema `rh`, não no `public`
2. A estrutura da tabela `rh.audit_logs` é diferente da esperada pelo trigger:
   - Campos corretos: `action`, `entity_type`, `entity_id`, `old_values`, `new_values`, `company_id`
   - Campos incorretos usados: `table_name`, `operation`, `old_data`, `new_data`

## ✅ Solução Implementada

Foi criada uma migração (`20251227000001_fix_frota_audit_trigger.sql`) que corrige a função `frota.audit_vehicle_changes()` para:

1. Usar `rh.audit_logs` em vez de `public.audit_logs`
2. Usar os campos corretos da tabela de auditoria
3. Mapear corretamente as ações (INSERT → CREATE, UPDATE → UPDATE, DELETE → DELETE)
4. Incluir `company_id` e `entity_id` obrigatórios

## 🚀 Como Aplicar a Correção

### Opção 1: Via Supabase CLI (Recomendado)
```bash
supabase db push --db-url "postgresql://postgres:81hbcoNDXaGiPIpp!@db.wmtftyaqucwfsnnjepiy.supabase.co:5432/postgres"
```

### Opção 2: Via psql direto
```bash
psql "postgresql://postgres:81hbcoNDXaGiPIpp!@db.wmtftyaqucwfsnnjepiy.supabase.co:5432/postgres" -f supabase/migrations/20251227000001_fix_frota_audit_trigger.sql
```

### Opção 3: Via Supabase Dashboard
1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Cole o conteúdo do arquivo `supabase/migrations/20251227000001_fix_frota_audit_trigger.sql`
4. Execute o script

### Opção 4: Via PowerShell (Windows)
```powershell
$connectionString = "postgresql://postgres:81hbcoNDXaGiPIpp!@db.wmtftyaqucwfsnnjepiy.supabase.co:5432/postgres"
$sql = Get-Content -Path "supabase\migrations\20251227000001_fix_frota_audit_trigger.sql" -Raw -Encoding UTF8
$sql | psql $connectionString
```

## 📝 Arquivo de Migração

- `supabase/migrations/20251227000001_fix_frota_audit_trigger.sql`

## ✅ Verificação

Após aplicar a migração, teste criando um novo veículo. O erro não deve mais ocorrer e os logs de auditoria devem ser registrados corretamente em `rh.audit_logs`.

## 🔄 Nota sobre o Arquivo frota_triggers_automations.sql

O arquivo `frota_triggers_automations.sql` ainda contém a versão antiga incorreta da função. Isso não é um problema, pois:

1. A migração sobrescreve a função no banco de dados
2. O arquivo `frota_triggers_automations.sql` parece ser um arquivo de documentação/configuração manual, não uma migração executada automaticamente

Se desejar, você pode atualizar o arquivo `frota_triggers_automations.sql` para refletir a correção, mas isso é opcional.

