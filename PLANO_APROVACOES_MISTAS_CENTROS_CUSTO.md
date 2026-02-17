# Plano: Aprovações mistas por centros de custo

**Data:** 15/02/2026  
**Contexto:** Ajustes na página `configuracoes/aprovacoes` e fluxo de aprovações em `portal-gestor/aprovacoes` para suportar:
1. Cotações com itens de múltiplos centros de custo
2. Contas a pagar rateadas entre múltiplos centros de custo
3. Classes financeiras com aprovador único independente do centro de custo

---

## 1. Cenários desejados (exemplos do usuário)

### 1.1 Cotação com itens de múltiplos centros de custo

**Exemplo:** Cotação COT-00057 com 3 itens de centros de custo diferentes:
- Item 1 da REQ-000055 (aprovador: João)
- Item 2 da REQ-000045 (aprovador: Pedro)
- Item 3 da REQ-000058 (aprovador: Maria)

**Esperado:** João, Pedro e Maria devem receber a solicitação de aprovação para esta cotação.

### 1.2 Conta a pagar rateada entre centros de custo

**Exemplo:** Conta a pagar com classe "Capacitação Profissional" e rateio:
- Centro de custo Manutenção: aprovadores Jean, Caio, Naiara
- Centro de custo Implantação: aprovadores Paulo, Cris

**Esperado:** Jean, Caio, Naiara, Paulo e Cris devem ver a solicitação de aprovação.

### 1.3 Classe financeira com aprovador único

**Exemplo:** Classe "Folha de Pagamento" – diversos centros de custo envolvidos, mas apenas o gestor de RH aprova.

**Esperado:** Apenas o gestor de RH recebe a solicitação, independente dos centros de custo do rateio.

---

## 2. Análise do estado atual

### 2.1 Estrutura de dados

| Entidade | Tabela | Campo centro de custo | Múltiplos CCs? |
|----------|--------|------------------------|----------------|
| Conta a pagar | `financeiro.contas_pagar` | `centro_custo_id` (único) | ❌ |
| Rateio | `financeiro.contas_pagar_rateio` | `centro_custo_id` por linha | ✅ |
| Cotação (ciclo) | `compras.cotacao_ciclos` | Via `requisicao_id` → `requisicoes_compra.centro_custo_id` | 1 req = 1 CC por ciclo |
| Config aprovação | `configuracoes_aprovacao_unificada` | `centro_custo_id`, `classe_financeiras` (UUID[]) | - |

### 2.2 Função `get_required_approvers`

**Localização:** `public.get_required_approvers(p_processo_tipo, p_processo_id, p_company_id)`

**Comportamento atual:**

| Tipo processo | Onde busca CC | Suporta múltiplos CCs? |
|---------------|---------------|------------------------|
| `conta_pagar` | `contas_pagar.centro_custo_id` | ❌ Não considera `contas_pagar_rateio` |
| `cotacao_compra` | `cotacao_ciclos` → `requisicoes_compra.centro_custo_id` | ❌ Apenas 1 centro de custo por ciclo |

**Implicações:**
- Conta rateada: só usa o `centro_custo_id` principal da conta (se houver); ignora o rateio.
- Cotação: cada `cotacao_ciclos` tem 1 `requisicao_id` → 1 centro de custo. Cotações com itens de vários CCs geram vários ciclos (um por requisição); hoje cada ciclo cria aprovações separadas, sem agregar aprovadores.

### 2.3 Classe financeira independente do CC

**Hoje:** A configuração pode ter `centro_custo_id = NULL` e `classe_financeiras = [Folha_id]`. A condição é:

```sql
(centro_custo_id IS NULL OR centro_custo_id = processo_centro_custo_id)
```

- Para conta com 1 CC: funciona.
- Para conta rateada: `processo_centro_custo_id` vem de `contas_pagar.centro_custo_id` (único). Configs com `centro_custo_id IS NULL` já casariam, mas o fluxo não considera o rateio.

**Conclusão:** O suporte parcial existe, mas depende de `processo_centro_custo_id` correto e da inclusão do rateio na lógica.

### 2.4 Criação de aprovações

- **Conta a pagar:** `financeiro.create_approvals_trigger()` em INSERT em `contas_pagar` (sistema antigo) e fluxo unificado.
- **Cotação:** `create_approvals_cotacao_ciclos()` em INSERT/UPDATE de `cotacao_ciclos` quando `workflow_state = 'em_aprovacao'`.
- Ambos chamam `create_approvals_for_process` → `get_required_approvers`.

### 2.5 Interface (`useContaPagarApprovalInfo`)

Já carrega `rateio` de `contas_pagar_rateio` e exibe linhas de rateio no card de aprovação. A lógica de quem aprova está no backend (`get_required_approvers`), não no frontend.

---

## 3. Lacunas identificadas

| # | Lacuna | Impacto |
|---|--------|---------|
| 1 | `get_required_approvers` para `conta_pagar` não usa `contas_pagar_rateio` | Contas rateadas usam só um CC para definir aprovadores |
| 2 | `get_required_approvers` para `conta_pagar` não prioriza configs por classe (ex.: Folha) sobre configs por CC | Pode escolher aprovadores por CC em vez do aprovador específico da classe |
| 3 | `get_required_approvers` para `cotacao_compra` usa só 1 centro de custo por ciclo | Cotações com vários CCs não agregam aprovadores de todos os CCs |
| 4 | Falta agregar ciclos pelo `numero_cotacao` na criação de aprovações | Vários ciclos da mesma cotação geram aprovações isoladas, sem unificar aprovadores |

---

## 4. Plano de atualização

### 4.1 Conta a pagar rateada (prioridade alta)

**Objetivo:** Usar todos os centros de custo do rateio e, quando existir, config específica por classe (ex.: Folha) com `centro_custo_id = NULL`.

**Alterações em `get_required_approvers` (caso `conta_pagar`):**

1. Obter centros de custo:
   - Se houver linhas em `contas_pagar_rateio` para a conta → `processo_centro_custos = ARRAY[DISTINCT centro_custo_id]`
   - Senão → `processo_centro_custos = ARRAY[contas_pagar.centro_custo_id]` (quando não for NULL)

2. Tratar configs por classe sem CC:
   - Configs com `centro_custo_id IS NULL` e `classe_financeiras` compatível → aplicar independente do rateio.
   - Ordem: configs por classe (sem CC) têm prioridade sobre configs por CC.

3. Tratar configs por CC:
   - Para cada `centro_custo_id` em `processo_centro_custos`, considerar configs onde:
     - `centro_custo_id = processo_centro_custos[i]` E
     - `classe_financeiras` compatível (quando houver)

4. Deduplicar aprovadores:
   - Evitar inserir o mesmo `aprovador_id` mais de uma vez no resultado.

**Arquivos afetados:**
- Nova migration: `supabase/migrations/YYYYMMDD_approvals_conta_pagar_rateio_multi_cc.sql`

---

### 4.2 Cotação com múltiplos centros de custo (prioridade alta)

**Objetivo:** Incluir aprovadores de todos os centros de custo dos itens da cotação.

**Modelo atual:** Um `cotacao_ciclos` = uma `requisicao_id` = um centro de custo. Cotações com itens de várias requisições geram vários ciclos (mesmo `numero_cotacao`).

**Duas abordagens possíveis:**

#### Opção A – Agregar por `numero_cotacao` no trigger

Quando um ciclo entra em `em_aprovacao`:
1. Buscar todos os ciclos com o mesmo `numero_cotacao` e `workflow_state = 'em_aprovacao'`.
2. Coletar `centro_custo_id` de cada `requisicao_id` desses ciclos.
3. Chamar uma função auxiliar que retorna aprovadores para um conjunto de centros de custo (e valor).
4. Criar aprovações para o ciclo “principal” (ex.: o que disparou o trigger) com todos os aprovadores agregados.

**Cuidados:**
- Garantir que `process_approval` continue usando o `processo_id` (id do ciclo) correto ao concluir.
- Definir regra para “ciclo principal” (ex.: primeiro ciclo por `numero_cotacao`).

#### Opção B – Nova função para cotação com múltiplos CCs

Criar `get_required_approvers_cotacao_aggregate(p_cotacao_ciclo_id, p_company_id)` que:
1. Identifica o `numero_cotacao` do ciclo.
2. Busca todos os ciclos com mesmo `numero_cotacao` em `em_aprovacao`.
3. Obtém o valor total agregado e todos os `centro_custo_id` distintos.
4. Retorna a união (deduplicada) dos aprovadores de todos os centros de custo.

O trigger de criação de aprovações passaria a usar essa função em vez de `get_required_approvers` para `cotacao_compra`.

**Recomendação:** Opção B (função dedicada) para manter `get_required_approvers` mais simples e isolar a lógica de cotação.

**Arquivos afetados:**
- Nova migration: `supabase/migrations/YYYYMMDD_approvals_cotacao_multi_cc.sql`
- Alteração em `create_approvals_cotacao_ciclos` para usar a nova função

---

### 4.3 Prioridade de configurações (classe vs centro de custo)

**Regra:** Se existir config com `centro_custo_id IS NULL` e `classe_financeiras` compatível (ex.: Folha), ela tem prioridade e seus aprovadores são os únicos considerados, ignorando configs por centro de custo para essa classe.

**Implementação:**
- Em `get_required_approvers` (e na função de cotação agregada), ao buscar configs:
  1. Primeiro, buscar configs com `centro_custo_id IS NULL` e classe compatível.
  2. Se encontrar, retornar apenas esses aprovadores e parar.
  3. Caso contrário, usar configs por centro de custo como hoje.

---

### 4.4 Verificações adicionais

1. **Trigger de contas a pagar:** Confirmar se o fluxo unificado já substituiu `financeiro.create_approvals_trigger()` e se a migração antiga foi removida.
2. **`create_approvals_for_process`:** Garantir que continue deduplicando aprovadores antes de inserir em `aprovacoes_unificada`.
3. **`process_approval`:** Validar que a conclusão de todas as aprovações de um processo (conta ou cotação) segue correta com múltiplos aprovadores do mesmo nível.

---

## 5. Ordem sugerida de implementação

| Etapa | Descrição | Complexidade |
|-------|-----------|--------------|
| 1 | Migration: `get_required_approvers` para conta a pagar com rateio e prioridade de classe | Média |
| 2 | Migration: função `get_required_approvers_cotacao_aggregate` e ajuste do trigger de cotação | Média |
| 3 | Testes em ambiente de desenvolvimento | - |
| 4 | Validar cenários: conta rateada, cotação multi-CC, Folha com 1 aprovador | - |

---

## 6. Consultas úteis para validação no banco

```sql
-- Centros de custo de uma conta com rateio
SELECT r.centro_custo_id, cc.nome
FROM financeiro.contas_pagar_rateio r
JOIN public.cost_centers cc ON cc.id = r.centro_custo_id
WHERE r.conta_pagar_id = '<conta_id>' AND r.company_id = '<company_id>';

-- Ciclos de uma cotação (por numero_cotacao)
SELECT cc.id, cc.numero_cotacao, cc.requisicao_id, r.centro_custo_id
FROM compras.cotacao_ciclos cc
JOIN compras.requisicoes_compra r ON r.id = cc.requisicao_id
WHERE cc.numero_cotacao = 'COT-00057' AND cc.company_id = '<company_id>';
```

---

## 7. Resumo executivo

| Cenário | Suportado hoje? | Status implementação |
|---------|-----------------|----------------------|
| Cotação com itens de 3 CCs → João, Pedro, Maria aprovam | ❌ | ✅ Implementado (20260215000002) |
| Conta rateada 2 CCs → Jean, Caio, Naiara, Paulo, Cris aprovam | ❌ | ✅ Implementado (20260215000001) |
| Folha de Pagamento → só gestor RH, vários CCs | ⚠️ Parcial | ✅ Implementado (20260215000001) |

## 8. Migrations criadas (15/02/2026)

- **20260215000001_approvals_conta_pagar_rateio_multi_cc.sql**: Atualiza `get_required_approvers` para conta a pagar com rateio, prioridade de classe (ex: Folha) e deduplicação de aprovadores.
- **20260215000002_approvals_cotacao_multi_cc.sql**: Nova função `get_required_approvers_cotacao_aggregate`, ajustes em `create_approvals_for_process`, `create_approvals_cotacao_ciclos` e `process_approval` para cotação com múltiplos CCs.
