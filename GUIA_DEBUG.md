# 🐛 Guia de Debug - Status não muda para 'aprovada'

## ✅ Diagnóstico Inicial

A função `process_approval` está **CORRETA** e contém todas as correções necessárias:
- ✅ Usa `'aprovada'::compras.status_requisicao`
- ✅ Atualiza `workflow_state = 'em_cotacao'`
- ✅ Tem tratamento correto para rejeição/cancelamento

## 🔍 Possíveis Causas do Problema

Se a função está correta mas o status não muda, o problema pode estar em:

### 1. **Aprovações ainda pendentes**
   - A função só atualiza o status quando **TODAS** as aprovações foram aprovadas
   - Se ainda houver aprovações com status `'pendente'`, o status não muda

### 2. **Função não está sendo chamada**
   - Verifique se a função `process_approval` está sendo chamada corretamente
   - Verifique se está passando os parâmetros corretos

### 3. **Aprovação não encontrada**
   - A função retorna `FALSE` se não encontrar a aprovação com:
     - `id = p_aprovacao_id`
     - `aprovador_id = p_aprovador_id`
     - `status = 'pendente'`

### 4. **Triggers ou Constraints**
   - Pode haver triggers que estão impedindo a atualização
   - Pode haver constraints que estão rejeitando o valor

## 🛠️ Como Debugar

### Passo 1: Identifique uma requisição para testar

```sql
-- Liste requisições que estão em aprovação
SELECT 
    rc.id,
    rc.numero_requisicao,
    rc.status,
    rc.workflow_state,
    COUNT(au.id) as total_aprovacoes,
    COUNT(CASE WHEN au.status = 'pendente' THEN 1 END) as pendentes,
    COUNT(CASE WHEN au.status = 'aprovado' THEN 1 END) as aprovadas
FROM compras.requisicoes_compra rc
LEFT JOIN public.aprovacoes_unificada au 
    ON au.processo_tipo = 'requisicao_compra' 
    AND au.processo_id = rc.id
WHERE rc.status IN ('pendente_aprovacao', 'rascunho')
GROUP BY rc.id, rc.numero_requisicao, rc.status, rc.workflow_state
HAVING COUNT(au.id) > 0;
```

### Passo 2: Verifique as aprovações dessa requisição

Substitua `'ID_DA_REQUISICAO'` pelo ID real:

```sql
SELECT 
    id,
    processo_tipo,
    processo_id,
    nivel_aprovacao,
    aprovador_id,
    status,
    created_at
FROM public.aprovacoes_unificada
WHERE processo_tipo = 'requisicao_compra'
AND processo_id = 'ID_DA_REQUISICAO'::uuid
ORDER BY nivel_aprovacao;
```

### Passo 3: Teste aprovar manualmente

Substitua os valores:
- `APROVACAO_ID`: ID da aprovação que você quer aprovar
- `APROVADOR_ID`: ID do usuário aprovador
- `ID_DA_REQUISICAO`: ID da requisição

```sql
-- Antes de aprovar
SELECT status, workflow_state 
FROM compras.requisicoes_compra 
WHERE id = 'ID_DA_REQUISICAO'::uuid;

-- Aprovar
SELECT public.process_approval(
    'APROVACAO_ID'::uuid,
    'aprovado'::varchar,
    NULL::text,
    'APROVADOR_ID'::uuid
) as resultado;

-- Depois de aprovar
SELECT status, workflow_state 
FROM compras.requisicoes_compra 
WHERE id = 'ID_DA_REQUISICAO'::uuid;

-- Verificar aprovações
SELECT status, COUNT(*) 
FROM public.aprovacoes_unificada
WHERE processo_tipo = 'requisicao_compra'
AND processo_id = 'ID_DA_REQUISICAO'::uuid
GROUP BY status;
```

### Passo 4: Verificar se todas foram aprovadas

```sql
SELECT 
    COUNT(CASE WHEN status = 'pendente' THEN 1 END) as pendentes,
    COUNT(CASE WHEN status = 'aprovado' THEN 1 END) as aprovadas,
    COUNT(*) as total
FROM public.aprovacoes_unificada
WHERE processo_tipo = 'requisicao_compra'
AND processo_id = 'ID_DA_REQUISICAO'::uuid;
```

**Se `pendentes = 0` e `aprovadas > 0`**, o status da requisição DEVE mudar para `'aprovada'`.

## 📋 Checklist de Verificação

- [ ] Todas as aprovações foram aprovadas (sem pendentes)?
- [ ] A função `process_approval` retornou `TRUE`?
- [ ] O `aprovador_id` passado está correto?
- [ ] A aprovação tinha status `'pendente'` antes de aprovar?
- [ ] Não há triggers bloqueando a atualização?
- [ ] O ID da requisição está correto?

## 🎯 Próximos Passos

1. Execute o script `debug_aprovacao_requisicao.sql` substituindo os IDs
2. Compartilhe os resultados das queries
3. Verifique se há mensagens de erro
4. Teste aprovar uma requisição manualmente e veja o resultado











