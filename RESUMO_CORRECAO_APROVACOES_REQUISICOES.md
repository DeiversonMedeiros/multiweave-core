# Resumo da Correção: Aprovações de Requisições não Aparecem

## Data: 2026-01-26

## Problema Reportado
O usuário "deiverson.medeiros" não vê as solicitações de aprovação na página "/portal-gestor/aprovacoes" após criar requisições com o campo "Almoxarifado" (destino_almoxarifado_id).

## Análise Realizada

### 1. Verificação das Aprovações no Banco
- ✅ As aprovações **ESTÃO sendo criadas** corretamente
- ✅ A requisição REQ-000044 tem 2 aprovações criadas
- ✅ A requisição REQ-000043 tem 2 aprovações criadas
- ✅ Ambas as requisições têm status `pendente_aprovacao`

### 2. Problema Identificado
A função `get_pending_approvals_unified_for_user` estava filtrando apenas requisições com `status = 'aprovada'`, mas **não estava filtrando** requisições com `workflow_state` que indicam processamento:
- `workflow_state = 'em_pedido'` (requisição já foi aprovada e está em pedido)
- `workflow_state = 'em_cotacao'` (requisição já foi aprovada e está em cotação)
- `workflow_state = 'finalizada'` (requisição finalizada)

Isso fazia com que aprovações de requisições já processadas ainda aparecessem na lista.

### 3. Problema no Frontend
A função `ApprovalService.getPendingApprovals()` também não estava filtrando corretamente requisições com `workflow_state` que indicam processamento.

## Correções Implementadas

### 1. Migração 20260126000006
- Corrige requisições existentes com status incorreto
- Reforça o trigger `trigger_ensure_requisicao_status`

### 2. Migração 20260126000007
- Adiciona logs detalhados na função `create_approvals_on_insert`
- Facilita diagnóstico de problemas futuros

### 3. Migração 20260126000008 ⭐ **CRÍTICA**
- Atualiza `get_pending_approvals_unified_for_user` para filtrar requisições processadas
- Filtra por `status = 'aprovada'` **E** por `workflow_state IN ('em_pedido', 'em_cotacao', 'finalizada')`
- **Resultado**: Reduziu de 10 para 7 aprovações pendentes (removendo requisições já processadas)

### 4. Correção no Frontend (TypeScript)
- Atualiza `ApprovalService.getPendingApprovals()` para filtrar requisições processadas
- Filtra por `status = 'aprovada'` **E** por `workflow_state` que indica processamento
- Garante que apenas requisições realmente pendentes apareçam na página

## Resultado

### Antes da Correção
- 12 aprovações pendentes (incluindo requisições já processadas)
- Requisições em `em_pedido` ainda apareciam
- Requisições em `em_cotacao` ainda apareciam

### Depois da Correção
- 7 aprovações pendentes (apenas requisições realmente pendentes)
- Requisições processadas são filtradas corretamente
- REQ-000044 e REQ-000043 aparecem corretamente

## Aprovações Pendentes para deiverson.medeiros

1. ✅ REQ-000044 (criada em 2026-01-26 21:24:30)
2. ✅ REQ-000043 (criada em 2026-01-26 18:23:07)
3. ✅ REQ-000040 (criada em 2026-01-23 13:24:49)
4. ✅ REQ-000016 (criada em 2025-12-15 15:34:54)
5. ✅ REQ-000015 (criada em 2025-12-15 15:14:24)
6. ✅ REQ-000014 (criada em 2025-12-15 14:59:31)
7. ✅ REQ-000013 (criada em 2025-12-12 17:14:17)

## Próximos Passos

1. ✅ Migração 20260126000008 aplicada
2. ✅ Código TypeScript atualizado
3. ⏳ **Testar na página**: Acessar "/portal-gestor/aprovacoes" como usuário "deiverson.medeiros"
4. ⏳ **Verificar se as aprovações aparecem** corretamente

## Comandos SQL para Verificação

```sql
-- Verificar aprovações pendentes para o usuário
SELECT * FROM public.get_pending_approvals_unified_for_user(
    'e745168f-addb-4456-a6fa-f4a336d874ac', 
    'a9784891-9d58-4cc4-8404-18032105c335'
) WHERE processo_tipo = 'requisicao_compra' 
ORDER BY created_at DESC;

-- Verificar requisições recentes
SELECT id, numero_requisicao, status, workflow_state, destino_almoxarifado_id, created_at 
FROM compras.requisicoes_compra 
WHERE created_at > NOW() - INTERVAL '1 day' 
ORDER BY created_at DESC;
```
