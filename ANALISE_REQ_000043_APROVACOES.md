# Análise Completa: Requisição REQ-000043 não aparece em Aprovações

## Data da Análise
2026-01-26

## Problema Reportado
A requisição "REQ-000043" foi criada, mas não aparece na página "portal-gestor/aprovacoes". Isso aconteceu após criar o campo "Almoxarifado" na requisição.

## Dados da Requisição

### Informações Básicas
- **ID**: `55d19bd3-d881-474b-8cc7-9331d5a59cad`
- **Número**: `REQ-000043`
- **Status**: `rascunho`
- **Workflow State**: `pendente_aprovacao`
- **Company ID**: `a9784891-9d58-4cc4-8404-18032105c335`
- **Centro de Custo**: `617b5e5d-4e49-4377-ac40-f1221cf853bc`
- **Destino Almoxarifado**: `9b965dcf-1238-4b6b-b6cd-6581acf8f155`
- **Data de Criação**: `2026-01-26 18:23:07.647083+00`

### Aprovações Criadas
Foram criadas **2 aprovações** corretamente na tabela `aprovacoes_unificada`:

1. **Aprovação 1**:
   - ID: `39348b54-ed68-443e-a281-ddb2f62e57ab`
   - Aprovador: `e745168f-addb-4456-a6fa-f4a336d874ac` (DEIVERSON JORGE HONORATO MEDEIROS)
   - Ordem: 1
   - Status: `pendente`

2. **Aprovação 2**:
   - ID: `0010a412-0376-4aed-8242-68a638b82fe3`
   - Aprovador: `830ebc7b-1799-448a-84b4-2414b861abb8` (Gestor 1)
   - Ordem: 2
   - Status: `pendente`

## Análise do Problema

### 1. Verificação da Função RPC
A função `get_pending_approvals_unified_for_user` está funcionando corretamente:
- ✅ Retorna a aprovação quando testada com os aprovadores
- ✅ Filtra corretamente por `status = 'pendente'`
- ✅ Exclui requisições com `status = 'aprovada'` (mas não filtra por 'rascunho')

### 2. Verificação do Frontend
O frontend usa `ApprovalService.getPendingApprovals()` que:
- Busca diretamente da tabela `aprovacoes_unificada`
- Não faz JOIN com `requisicoes_compra` para verificar status
- Deveria retornar todas as aprovações pendentes

### 3. Problema Identificado

**O problema é que a requisição tem `status = 'rascunho'` em vez de `status = 'pendente_aprovacao'`.**

Embora o `workflow_state` esteja como `pendente_aprovacao`, o campo `status` está como `rascunho`. Isso pode estar causando problemas em algumas verificações.

## Solução

### Opção 1: Atualizar o Status da Requisição (Recomendado)
Atualizar o status da requisição de 'rascunho' para 'pendente_aprovacao':

```sql
UPDATE compras.requisicoes_compra
SET status = 'pendente_aprovacao'
WHERE numero_requisicao = 'REQ-000043'
AND status = 'rascunho'
AND workflow_state = 'pendente_aprovacao';
```

### Opção 2: Corrigir o Trigger
O trigger `trigger_ensure_requisicao_status` deveria garantir que requisições com `workflow_state = 'pendente_aprovacao'` tenham `status = 'pendente_aprovacao'`, mas parece que não está funcionando corretamente para requisições criadas com o campo `destino_almoxarifado_id`.

### Opção 3: Verificar se há Filtro Adicional
Verificar se há algum filtro no frontend ou na função RPC que está excluindo requisições com status 'rascunho'.

## Recomendações

1. **Imediato**: Atualizar o status da requisição REQ-000043 para 'pendente_aprovacao'
2. **Curto Prazo**: Verificar e corrigir o trigger `trigger_ensure_requisicao_status` para garantir que sempre atualize o status corretamente
3. **Longo Prazo**: Revisar a lógica de criação de requisições para garantir que o status seja sempre definido corretamente desde o início

## Comandos SQL para Diagnóstico

```sql
-- Verificar a requisição
SELECT id, numero_requisicao, status, workflow_state, destino_almoxarifado_id, created_at 
FROM compras.requisicoes_compra 
WHERE numero_requisicao = 'REQ-000043';

-- Verificar as aprovações
SELECT au.*, rc.status as requisicao_status, rc.workflow_state 
FROM public.aprovacoes_unificada au 
LEFT JOIN compras.requisicoes_compra rc ON (au.processo_tipo = 'requisicao_compra' AND au.processo_id = rc.id) 
WHERE au.processo_tipo = 'requisicao_compra' 
AND au.processo_id = '55d19bd3-d881-474b-8cc7-9331d5a59cad';

-- Testar a função RPC
SELECT * FROM public.get_pending_approvals_unified_for_user(
    'e745168f-addb-4456-a6fa-f4a336d874ac', 
    'a9784891-9d58-4cc4-8404-18032105c335'
) WHERE processo_tipo = 'requisicao_compra' AND processo_id = '55d19bd3-d881-474b-8cc7-9331d5a59cad';
```
