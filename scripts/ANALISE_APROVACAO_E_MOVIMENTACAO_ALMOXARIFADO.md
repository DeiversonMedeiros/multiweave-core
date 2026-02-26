# Análise: Aprovação da transferência e movimentação de estoque

**Data:** 2026-02-22

## 1. Aprovação da transferência está ok (como na saída de materiais)?

### Saída de material
- **Sim**, após aplicar a migração `20260222000001_fix_saida_material_approval_schema.sql`:
  - `get_required_approvers` lê de `almoxarifado.solicitacoes_saida_materiais`
  - `create_approvals_for_process` e `process_approval` atualizam `almoxarifado.solicitacoes_saida_materiais`
  - O trigger que chama `create_approvals_for_process` no INSERT está em `almoxarifado.transferencias`; para saída, verificar se o trigger está em `almoxarifado.solicitacoes_saida_materiais` (e não em `public`).

### Transferência
- **Quase.** As funções já usam `almoxarifado.transferencias`:
  - `create_approvals_for_process` e `process_approval` atualizam `almoxarifado.transferencias` corretamente.
- **Problema:** Em `get_required_approvers`, para `solicitacao_transferencia_material` existe:
  ```sql
  SELECT valor_total, centro_custo_id
  INTO processo_valor, processo_centro_custo_id
  FROM almoxarifado.transferencias
  WHERE id = p_processo_id AND company_id = p_company_id;
  ```
  A tabela `almoxarifado.transferencias` **não possui** as colunas `valor_total` nem `centro_custo_id`. Isso gera erro em tempo de execução ao buscar aprovadores para uma transferência.

- **Correção:** Foi criada a migração `20260222000002_fix_transferencia_approval_valor_centro.sql`, que altera `get_required_approvers` para obter:
  - `processo_valor`: soma (quantidade_solicitada × valor_unitário) dos itens da transferência (via `transferencia_itens` + `materiais_equipamentos`).
  - `processo_centro_custo_id`: `centro_custo_id` do primeiro item em `almoxarifado.transferencia_itens` (para regras de aprovação por centro de custo).

Resumo: após aplicar a migração `20260222000002`, o fluxo de aprovação da transferência fica alinhado ao da saída (leitura/atualização no schema correto e uso de valor/centro de custo derivados dos itens).

---

## 2. Saída e transferência geram registro de movimentação de estoque?

**Não.** Hoje **nenhuma** das duas gera registro em `almoxarifado.movimentacoes_estoque` nem atualiza `almoxarifado.estoque_atual` quando:

- **Saída de material:** status passa a aprovado/entregue.
- **Transferência:** status passa a aprovada ou a “transferida” (execução).

O que existe hoje:
- **Entrada de materiais:** o front (ex.: `NovaEntradaModal.tsx`) insere em `movimentacoes_estoque` e atualiza estoque ao aprovar/confirmar entrada.
- **Saída e transferência:** não há trigger nem chamada no backend/front que:
  - insira em `movimentacoes_estoque` (tipo `saida` ou `transferencia`), e
  - atualize `estoque_atual` (redução na origem e, no caso de transferência, aumento no destino).

Para passar a gerar movimentação e refletir no estoque, é necessário implementar:

1. **Transferência (quando status = 'transferida'):**
   - Para cada item em `almoxarifado.transferencia_itens` da transferência:
     - Inserir em `almoxarifado.movimentacoes_estoque` com `tipo_movimentacao = 'transferencia'`, `almoxarifado_origem_id` e `almoxarifado_destino_id`, quantidade, valor_unitario (ex.: de `materiais_equipamentos`), `centro_custo_id`/`projeto_id` do item, `usuario_id` (ex.: quem executou).
     - Reduzir `almoxarifado.estoque_atual` no almoxarifado de origem (material_equipamento_id + almoxarifado_origem_id).
     - Aumentar ou inserir em `almoxarifado.estoque_atual` no almoxarifado de destino.
   - Pode ser um trigger AFTER UPDATE em `almoxarifado.transferencias` quando `status` passa a `'transferida'`, ou uma função chamada pelo front ao “executar transferência”.

2. **Saída de material (quando status = 'aprovado' ou 'entregue'):**
   - É preciso ter itens da saída persistidos (ex.: tabela `almoxarifado.solicitacao_saida_itens` ou equivalente com solicitacao_id, material_equipamento_id, quantidade_solicitada, valor_unitario).
   - Quando o status da solicitação passar a “entregue” (ou “aprovado”, conforme regra de negócio):
     - Inserir em `movimentacoes_estoque` com `tipo_movimentacao = 'saida'`, almoxarifado_origem_id = almoxarifado da solicitação, almoxarifado_destino_id = NULL.
     - Reduzir `estoque_atual` no almoxarifado da solicitação para cada item.

Recomendação: criar uma migração (ou duas: uma para transferência e outra para saída) que implemente as funções/triggers acima, garantindo que ao aprovar/executar transferência e ao marcar saída como entregue o sistema gere os registros de movimentação e atualize o estoque.
