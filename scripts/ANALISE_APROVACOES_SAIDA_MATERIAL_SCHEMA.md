# Análise: Aprovações Saída de Material e Schema da Tabela

**Data:** 2026-02-22  
**Conexão:** Supabase (db.wmtftyaqucwfsnnjepiy.supabase.co)

## 1. Onde está a tabela hoje

- **`public.solicitacoes_saida_materiais`:** não existe (`public_exists = f`).
- **`almoxarifado.solicitacoes_saida_materiais`:** existe e é a tabela real (`almoxarifado_exists = t`).

O app já usa o schema `almoxarifado` no `ApprovalService` (EntityService). Os triggers de aprovação estão em **almoxarifado.solicitacoes_saida_materiais**:
- `trigger_create_approvals_saidas_materiais` (AFTER INSERT)
- `trigger_reset_approvals_saidas_materiais` (AFTER UPDATE)

Ou seja: INSERT em `almoxarifado.solicitacoes_saida_materiais` dispara o trigger e chama `create_approvals_for_process`. Não há tabela em `public` para esse processo.

## 2. Idempotência de `create_approvals_for_process`

A função começa com:

```sql
DELETE FROM public.aprovacoes_unificada
WHERE processo_tipo = p_processo_tipo AND processo_id = p_processo_id AND company_id = p_company_id;
```

Depois insere as novas linhas. Logo:

- Chamar a RPC duas vezes (trigger + frontend) não gera aprovações duplicadas.
- A segunda chamada apaga as linhas da primeira e recria. Resultado final: um único conjunto de aprovações.

Conclusão: não é necessário remover a chamada do frontend; ela é redundante mas segura.

## 3. Bug: funções ainda usam `public.solicitacoes_saida_materiais`

Várias funções do sistema de aprovação continuam referenciando **public.solicitacoes_saida_materiais**:

| Função | Uso | Efeito no banco atual |
|--------|-----|------------------------|
| `create_approvals_for_process` | Auto-aprovação: `UPDATE public.solicitacoes_saida_materiais SET status = 'aprovado'...` | Nenhuma linha atualizada (tabela não existe em public). |
| `process_approval` (aprovado) | `UPDATE public.solicitacoes_saida_materiais SET status = 'aprovado'...` | Nenhuma linha atualizada. |
| `process_approval` (rejeitado/cancelado) | `UPDATE public.solicitacoes_saida_materiais SET status = p_status...` | Nenhuma linha atualizada. |
| `get_required_approvers` | `SELECT ... FROM public.solicitacoes_saida_materiais WHERE ...` | Nenhuma linha retornada; aprovadores não são encontrados. |

Com isso:

- Quando não há configuração de aprovação, a auto-aprovação não atualiza o status da solicitação (porque a tabela em `public` não existe).
- Ao aprovar/rejeitar na central, o status da solicitação em `almoxarifado.solicitacoes_saida_materiais` não é atualizado.
- O fluxo de “quem deve aprovar” pode falhar porque `get_required_approvers` não encontra a linha em `public`.

## 4. Correção recomendada

Foi criada a migração **`20260222000001_fix_saida_material_approval_schema.sql`**, que:

1. **get_required_approvers:** troca  
   `FROM public.solicitacoes_saida_materiais`  
   por  
   `FROM almoxarifado.solicitacoes_saida_materiais`  
   no branch `solicitacao_saida_material`.

2. **create_approvals_for_process:** no branch de auto-aprovação `solicitacao_saida_material`, troca  
   `UPDATE public.solicitacoes_saida_materiais`  
   por  
   `UPDATE almoxarifado.solicitacoes_saida_materiais`.

3. **process_approval:** nos dois branches `solicitacao_saida_material` (aprovado e rejeitado/cancelado), troca  
   `UPDATE public.solicitacoes_saida_materiais`  
   por  
   `UPDATE almoxarifado.solicitacoes_saida_materiais`.

A migração **`supabase/migrations/20260222000001_fix_saida_material_approval_schema.sql`** foi criada. Após aplicá-la no projeto (quando for conveniente rodar migrações), o fluxo de aprovação de saída de material passará a ler e atualizar a tabela correta (`almoxarifado.solicitacoes_saida_materiais`).

## 5. Frontend

- **MaterialExitDetails:** passou a exibir nomes (solicitante, receptor, almoxarifado, centro de custo, projeto) usando `useUsers`, `useAlmoxarifados`, `useCostCenters` e `useProjects`.
- **Chamada a `createApprovalsForProcess`** após criar a solicitação foi mantida; a função é idempotente e não gera duplicidade com o trigger.
