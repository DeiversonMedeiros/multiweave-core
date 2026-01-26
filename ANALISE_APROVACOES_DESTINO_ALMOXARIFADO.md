# Análise: Aprovações não aparecem após adicionar campo Almoxarifado

## Data da Análise
2026-01-26

## Problema Reportado
Após adicionar o campo "Almoxarifado" (destino_almoxarifado_id) na requisição, as aprovações não estão sendo geradas ou não aparecem na página de aprovações.

## Análise Realizada

### 1. Verificação da Requisição REQ-000044 (Criada Recentemente)

**Dados da Requisição:**
- ID: `0373bd3b-2c0d-43dc-b4ac-ebf696d0a28a`
- Número: `REQ-000044`
- Status: `pendente_aprovacao` ✅
- Workflow State: `pendente_aprovacao` ✅
- Destino Almoxarifado: `9b965dcf-1238-4b6b-b6cd-6581acf8f155` ✅
- Centro de Custo: `617b5e5d-4e49-4377-ac40-f1221cf853bc`
- Valor Total Estimado: `0.00`

**Aprovações Criadas:**
- ✅ 2 aprovações foram criadas corretamente na tabela `aprovacoes_unificada`
- ✅ Aprovador 1: `e745168f-addb-4456-a6fa-f4a336d874ac` (ordem 1)
- ✅ Aprovador 2: `830ebc7b-1799-448a-84b4-2414b861abb8` (ordem 2)
- ✅ Ambas com status `pendente`

**Função get_pending_approvals_unified_for_user:**
- ✅ Retorna corretamente a aprovação quando testada com os aprovadores

### 2. Verificação dos Triggers

**Ordem dos Triggers:**
1. `trigger_ensure_requisicao_status` (BEFORE INSERT) - Atualiza status de 'rascunho' para 'pendente_aprovacao'
2. `trigger_create_approvals_requisicoes_compra` (AFTER INSERT) - Cria aprovações
3. `trigger_detectar_compra_urgente` (AFTER INSERT) - Detecta compras urgentes

**Função create_approvals_on_insert:**
- ✅ Está funcionando corretamente
- ✅ Identifica requisições de compra
- ✅ Chama `create_approvals_for_process` com os parâmetros corretos

**Função create_approvals_for_process:**
- ✅ Está funcionando corretamente
- ✅ Busca aprovadores via `get_required_approvers`
- ✅ Cria aprovações na tabela `aprovacoes_unificada`

### 3. Verificação das Constraints

**Constraint `requisicoes_compra_tipo_chk`:**
```sql
status = 'rascunho'
OR (
    (tipo_requisicao <> 'reposicao' OR destino_almoxarifado_id IS NOT NULL)
    AND (tipo_requisicao <> 'compra_direta' OR local_entrega IS NOT NULL)
    AND (tipo_requisicao <> 'emergencial' OR is_emergencial = true)
)
```

Esta constraint permite que requisições com `status = 'rascunho'` não precisem ter `destino_almoxarifado_id` preenchido. O trigger `trigger_ensure_requisicao_status` atualiza o status para 'pendente_aprovacao' antes do INSERT ser completado, então a constraint não deveria ser um problema.

### 4. Conclusão

**As aprovações ESTÃO sendo criadas corretamente!**

O problema não é que as aprovações não estão sendo geradas, mas sim que:
1. O usuário pode não estar vendo as aprovações na página (problema de frontend ou filtro)
2. Pode haver um problema de timing/cache
3. Pode haver um problema com a função que formata os dados para o frontend

## Soluções Implementadas

### 1. Migração 20260126000006
- Corrige requisições existentes com status incorreto
- Reforça o trigger `trigger_ensure_requisicao_status`

### 2. Migração 20260126000007
- Adiciona logs detalhados na função `create_approvals_on_insert`
- Facilita diagnóstico de problemas futuros
- Inclui logs específicos para requisições com `destino_almoxarifado_id`

## Próximos Passos

1. **Aplicar a migração 20260126000007** para adicionar logs
2. **Criar uma nova requisição** e verificar os logs do banco de dados
3. **Verificar se as aprovações aparecem** na página após criar a requisição
4. **Se não aparecerem**, verificar:
   - Se há algum filtro no frontend que está excluindo as aprovações
   - Se há algum problema com a função `get_pending_approvals_unified_for_user`
   - Se há algum problema de cache no frontend

## Comandos SQL para Diagnóstico

```sql
-- Verificar requisição recente
SELECT id, numero_requisicao, status, workflow_state, destino_almoxarifado_id, created_at 
FROM compras.requisicoes_compra 
WHERE created_at > NOW() - INTERVAL '1 hour' 
ORDER BY created_at DESC;

-- Verificar aprovações criadas
SELECT * FROM public.aprovacoes_unificada 
WHERE processo_tipo = 'requisicao_compra' 
AND processo_id = '<ID_DA_REQUISICAO>';

-- Testar função get_required_approvers
SELECT * FROM public.get_required_approvers(
    'requisicao_compra', 
    '<ID_DA_REQUISICAO>', 
    '<COMPANY_ID>'
);

-- Testar função get_pending_approvals_unified_for_user
SELECT * FROM public.get_pending_approvals_unified_for_user(
    '<USER_ID>', 
    '<COMPANY_ID>'
) WHERE processo_tipo = 'requisicao_compra';
```
