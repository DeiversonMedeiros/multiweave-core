# 📋 Status das Migrations - Sistema de Aprovação

## 🔍 Como Verificar o Status

Execute o script SQL `check_migrations_status.sql` no seu banco de dados para verificar:
- Quais migrations já foram aplicadas
- Se as tabelas e funções existem
- Qual versão da função `process_approval` está ativa

## 📦 Migrations Essenciais (Ordem de Aplicação)

### ✅ BASE - Devem estar aplicadas primeiro:

1. **`20250116000001_create_unified_approval_system.sql`**
   - Cria tabela `aprovacoes_unificada`
   - Cria tabela `configuracoes_aprovacao_unificada`
   - Cria tabela `historico_edicoes_solicitacoes`
   - **Status**: ⚠️ Deve estar aplicada primeiro
   - **Erro comum**: "relation aprovacoes_unificada already exists" → Tabela já existe, pule esta

2. **`20250116000002_create_approval_functions.sql`**
   - Cria função `process_approval` (versão inicial)
   - Usa `'aprovada'` para requisicao_compra (linha 204) ✅
   - Mas **não atualiza** `workflow_state` ❌
   - **Status**: Provavelmente já aplicada

3. **`20250116000003_create_approval_reset_triggers.sql`**
   - Cria triggers para reset de aprovações
   - **Status**: Provavelmente já aplicada

### 🔧 CORREÇÕES - Essenciais para o seu problema:

4. **`20251209000002_add_requisicao_compra_to_pending_approvals.sql`**
   - Adiciona suporte a `requisicao_compra` nas aprovações pendentes
   - **Status**: ⚠️ Verificar se aplicada

5. **`20251210000001_fix_process_approval_status_requisicao.sql`** ⭐ **IMPORTANTE**
   - Corrige mapeamento de status para `requisicao_compra`
   - Garante uso de `'aprovada'` (ENUM correto)
   - **Status**: ⚠️ **DEVE SER APLICADA**

6. **`20251210220000_fix_requisicao_workflow_after_approval.sql`** ⭐ **IMPORTANTE**
   - Adiciona atualização de `workflow_state = 'em_cotacao'`
   - Refina a função `process_approval`
   - **Status**: ⚠️ **DEVE SER APLICADA**

### 📝 AJUSTES - Migrations de dados e correções:

7. **`20251211143000_force_em_cotacao_for_approved_requisicoes.sql`**
   - Atualiza requisições já aprovadas para `workflow_state = 'em_cotacao'`
   - Migration de dados (retroativa)
   - **Status**: Opcional, mas recomendada

8. **`20251211140000_add_updated_by_compras.sql`**
   - Adiciona campo `updated_by`
   - **Status**: Opcional

9. **`20251211142000_fix_record_edit_and_reset_approvals.sql`**
   - Correção de triggers
   - **Status**: Opcional

10. **`20251211144500_fix_record_edit_and_reset_no_row_expansion.sql`**
    - Correção de bug "row expansion"
    - **Status**: Opcional

## 🎯 Checklist de Verificação

Execute estas queries no seu banco:

```sql
-- 1. Verificar se tabela existe
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'aprovacoes_unificada'
) AS tabela_aprovacoes_existe;

-- 2. Verificar se função existe
SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'process_approval'
) AS funcao_existe;

-- 3. Verificar se workflow_state existe
SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'compras' 
    AND table_name = 'requisicoes_compra'
    AND column_name = 'workflow_state'
) AS workflow_state_existe;

-- 4. Verificar se a função atualiza workflow_state
-- (verifique a definição da função process_approval)
SELECT pg_get_functiondef(oid) 
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'process_approval';
```

## 🚀 O Que Fazer Agora

1. **Execute o script `check_migrations_status.sql`** para verificar o status atual
2. **Se a tabela `aprovacoes_unificada` não existir**: Aplique migration #1
3. **Se a função `process_approval` não existir**: Aplique migration #2
4. **APLIQUE SEMPRE as migrations #5 e #6** (as correções essenciais)
5. **Opcionalmente aplique #7** para atualizar dados existentes

## ⚠️ Problema Atual

Se o status não está mudando para `'aprovada'`:
- ✅ Verifique se migration #5 foi aplicada
- ✅ Verifique se migration #6 foi aplicada
- ✅ Verifique se `workflow_state` existe na tabela `requisicoes_compra`

## 📝 Nota sobre o Erro "relation already exists"

Se você receber esse erro, significa que a tabela já foi criada. Nesse caso:
- ✅ Pule a migration que cria a tabela
- ✅ Aplique apenas as migrations de correção (#5 e #6)
- ✅ Use `CREATE OR REPLACE` nas funções (já está nas migrations)










