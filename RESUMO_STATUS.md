# 📊 Resumo do Status das Migrations

## ✅ Verificações Concluídas

Baseado nos resultados que você forneceu:

1. ✅ **Função `process_approval` EXISTE**
2. ✅ **Tabela `aprovacoes_unificada` EXISTE**  
3. ✅ **Campo `workflow_state` EXISTE** em `requisicoes_compra`

## 🔍 Próximo Passo - Verificação Crítica

Execute o script `verificar_funcao_process_approval.sql` para verificar se a função contém as correções necessárias.

Ou execute esta query simplificada:

```sql
-- Query corrigida (sem ambiguidade)
SELECT 
    pg_get_functiondef(p.oid) AS definicao_funcao
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'process_approval'
LIMIT 1;
```

Depois, procure na definição retornada por:

### ✅ O que você DEVE ver na função:

1. **Para `requisicao_compra`, deve ter:**
   ```sql
   WHEN 'requisicao_compra' THEN
       UPDATE compras.requisicoes_compra
       SET status = 'aprovada'::compras.status_requisicao,
           workflow_state = 'em_cotacao',
           ...
   ```

2. **Deve usar `'aprovada'` (não `'aprovado'`)**

3. **Deve ter `workflow_state = 'em_cotacao'`**

### ❌ Se NÃO encontrar:

- Se NÃO tem `workflow_state = 'em_cotacao'`:
  - **APLIQUE**: `20251210220000_fix_requisicao_workflow_after_approval.sql`

- Se NÃO usa `'aprovada'::compras.status_requisicao`:
  - **APLIQUE**: `20251210000001_fix_process_approval_status_requisicao.sql`

## 🎯 Ordem de Aplicação (se necessário)

Se a função NÃO estiver corrigida, aplique nesta ordem:

1. **`20251210000001_fix_process_approval_status_requisicao.sql`**
   - Corrige o status para usar 'aprovada'
   
2. **`20251210220000_fix_requisicao_workflow_after_approval.sql`**
   - Adiciona atualização de workflow_state

## 📝 Nota

Como todas as estruturas existem (tabela, função, coluna), provavelmente você só precisa aplicar as migrations de **correção** (#1 e #2 acima).

As migrations usam `CREATE OR REPLACE FUNCTION`, então são seguras para executar mesmo se a função já existir.











