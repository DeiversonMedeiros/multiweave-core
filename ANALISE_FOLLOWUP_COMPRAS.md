# 📊 Análise Completa - Follow-up de Compras

## Data da Análise: 2026-01-24

---

## 1. VISÃO GERAL DO FLUXO DE COMPRAS

O sistema de compras segue o seguinte fluxo:

```
Requisição → Cotação → Pedido → Conta a Pagar → Entrada em Estoque
```

### Etapas do Processo:

1. **Requisição de Compra** (`compras.requisicoes_compra`)
2. **Cotação de Preços** (`compras.cotacao_ciclos`)
3. **Pedido de Compra** (`compras.pedidos_compra`)
4. **Conta a Pagar** (`financeiro.contas_pagar`)
5. **Entrada em Estoque** (`almoxarifado.entradas_materiais`)

---

## 2. ESTRUTURA DAS TABELAS E RELACIONAMENTOS

### 2.1 Requisição de Compra (`compras.requisicoes_compra`)

**Campos Principais:**
- `id` (UUID) - Identificador único
- `company_id` (UUID) - Empresa
- `numero_requisicao` (VARCHAR) - Número da requisição
- `solicitante_id` (UUID) - Usuário que solicitou
- `status` (ENUM) - Status da requisição
- `workflow_state` (VARCHAR) - Estado no workflow
- `data_solicitacao` (DATE) - Data da solicitação
- `data_necessidade` (DATE) - Data de necessidade
- `valor_total_estimado` (DECIMAL) - Valor total estimado
- `created_at`, `updated_at` - Auditoria

**Estados Possíveis:**
- `criada` → `pendente_aprovacao` → `aprovada` → `em_cotacao` → `finalizada`
- `cancelada` (em qualquer etapa)

**Relacionamentos:**
- `solicitante_id` → `public.users(id)`
- `centro_custo_id` → `public.cost_centers(id)`
- `projeto_id` → `public.projects(id)`

---

### 2.2 Cotação de Preços (`compras.cotacao_ciclos`)

**Campos Principais:**
- `id` (UUID) - Identificador único
- `company_id` (UUID) - Empresa
- `requisicao_id` (UUID) - Requisição vinculada
- `numero_cotacao` (VARCHAR) - Número da cotação
- `status` (VARCHAR) - Status da cotação
- `workflow_state` (VARCHAR) - Estado no workflow
- `data_cotacao` (DATE) - Data da cotação
- `prazo_resposta` (INTEGER) - Prazo para resposta
- `created_at`, `updated_at` - Auditoria

**Estados Possíveis:**
- `aberta` → `completa` → `em_aprovacao` → `aprovada` → `em_pedido`
- `reprovada` (em qualquer etapa)

**Relacionamentos:**
- `requisicao_id` → `compras.requisicoes_compra(id)`

**Tabelas Relacionadas:**
- `compras.cotacao_fornecedores` - Fornecedores da cotação
- `compras.cotacao_itens` - Itens cotados

**Trigger Automático:**
- Quando `workflow_state` muda para `aprovada`, o trigger `criar_pedido_apos_aprovacao_cotacao_ciclos` cria automaticamente:
  - Pedidos de compra para cada fornecedor vencedor
  - Contas a pagar para cada pedido

---

### 2.3 Pedido de Compra (`compras.pedidos_compra`)

**Campos Principais:**
- `id` (UUID) - Identificador único
- `company_id` (UUID) - Empresa
- `cotacao_id` (UUID) - Cotação vinculada (pode ser NULL)
- `fornecedor_id` (UUID) - Fornecedor
- `numero_pedido` (VARCHAR) - Número do pedido
- `data_pedido` (DATE) - Data do pedido
- `data_entrega_prevista` (DATE) - Data prevista de entrega
- `data_entrega_real` (DATE) - Data real de entrega
- `status` (ENUM) - Status do pedido
- `workflow_state` (VARCHAR) - Estado no workflow
- `valor_total` (DECIMAL) - Valor total
- `valor_final` (DECIMAL) - Valor final (com desconto)
- `created_at`, `updated_at` - Auditoria

**Estados Possíveis:**
- `aberto` → `aprovado` → `entregue` → `finalizado`
- `reprovado` (em qualquer etapa)

**Relacionamentos:**
- `cotacao_id` → `compras.cotacao_ciclos(id)` (pode ser NULL)
- `fornecedor_id` → `compras.fornecedores_dados(id)`

**Tabelas Relacionadas:**
- `compras.pedido_itens` - Itens do pedido
- `financeiro.contas_pagar` - Conta a pagar vinculada (via `pedido_id`)

**Função Automática:**
- `compras.criar_conta_pagar(pedido_id, company_id, created_by)` - Cria conta a pagar automaticamente

---

### 2.4 Conta a Pagar (`financeiro.contas_pagar`)

**Campos Principais:**
- `id` (UUID) - Identificador único
- `company_id` (UUID) - Empresa
- `pedido_id` (UUID) - Pedido vinculado (pode ser NULL)
- `fornecedor_id` (UUID) - Fornecedor
- `descricao` (TEXT) - Descrição
- `valor_original` (DECIMAL) - Valor original
- `valor_atual` (DECIMAL) - Valor atual
- `data_vencimento` (DATE) - Data de vencimento
- `status` (VARCHAR) - Status da conta
- `numero_nota_fiscal` (VARCHAR) - Número da NF
- `created_at`, `updated_at` - Auditoria

**Estados Possíveis:**
- `pendente` → `aprovada` → `paga` → `cancelada`

**Relacionamentos:**
- `pedido_id` → `compras.pedidos_compra(id)` (ON DELETE SET NULL)
- `fornecedor_id` → `public.partners(id)`

**Tabelas Relacionadas:**
- `financeiro.contas_pagar_parcelas` - Parcelas da conta (se parcelada)

**Observação:**
- A conta a pagar é criada automaticamente quando o pedido é criado
- O campo `pedido_id` permite rastreabilidade completa

---

### 2.5 Entrada em Estoque (`almoxarifado.entradas_materiais`)

**Campos Principais:**
- `id` (UUID) - Identificador único
- `company_id` (UUID) - Empresa
- `fornecedor_id` (UUID) - Fornecedor
- `numero_documento` (VARCHAR) - Número do documento (pode conter número do pedido)
- `data_entrada` (DATE) - Data de entrada
- `tipo_entrada` (VARCHAR) - Tipo de entrada ('compra', 'devolucao', etc.)
- `status` (VARCHAR) - Status da entrada
- `observacoes` (TEXT) - Observações
- `created_at`, `updated_at` - Auditoria

**Relacionamentos:**
- `fornecedor_id` → `compras.fornecedores_dados(id)`

**Tabelas Relacionadas:**
- `almoxarifado.entrada_itens` - Itens da entrada

**Função Automática:**
- `compras.criar_entrada_almoxarifado(pedido_id, company_id, created_by)` - Cria entrada automaticamente
- O `numero_documento` é preenchido com o `numero_pedido` do pedido

**Observação:**
- A entrada pode ser criada manualmente ou automaticamente
- A vinculação com o pedido é feita através do `numero_documento` (não há FK direta)

---

## 3. WORKFLOW LOGS

**Tabela:** `compras.workflow_logs`

Registra todas as transições de estado no workflow:
- `entity_type` - Tipo da entidade ('requisicao_compra', 'cotacao', 'pedido')
- `entity_id` - ID da entidade
- `from_state` - Estado anterior
- `to_state` - Estado novo
- `actor_id` - Usuário que fez a transição
- `payload` - Dados adicionais (JSONB)
- `created_at` - Data/hora da transição

---

## 4. QUERY PARA FOLLOW-UP COMPLETO

### 4.1 Query Principal

```sql
WITH requisicoes AS (
    SELECT 
        rc.id,
        rc.company_id,
        rc.numero_requisicao,
        rc.data_solicitacao,
        rc.data_necessidade,
        rc.status as requisicao_status,
        rc.workflow_state as requisicao_workflow_state,
        rc.valor_total_estimado,
        u.nome as solicitante_nome,
        u.email as solicitante_email,
        rc.created_at as requisicao_created_at,
        rc.updated_at as requisicao_updated_at
    FROM compras.requisicoes_compra rc
    LEFT JOIN public.users u ON u.id = rc.solicitante_id
    WHERE rc.company_id = :company_id
),
cotacoes AS (
    SELECT 
        cc.id as cotacao_id,
        cc.requisicao_id,
        cc.numero_cotacao,
        cc.data_cotacao,
        cc.status as cotacao_status,
        cc.workflow_state as cotacao_workflow_state,
        cc.prazo_resposta,
        cc.created_at as cotacao_created_at,
        cc.updated_at as cotacao_updated_at
    FROM compras.cotacao_ciclos cc
),
pedidos AS (
    SELECT 
        pc.id as pedido_id,
        pc.cotacao_id,
        pc.numero_pedido,
        pc.data_pedido,
        pc.data_entrega_prevista,
        pc.data_entrega_real,
        pc.status as pedido_status,
        pc.workflow_state as pedido_workflow_state,
        pc.valor_total as pedido_valor_total,
        pc.valor_final as pedido_valor_final,
        fd.razao_social as fornecedor_nome,
        pc.created_at as pedido_created_at,
        pc.updated_at as pedido_updated_at
    FROM compras.pedidos_compra pc
    LEFT JOIN compras.fornecedores_dados fd ON fd.id = pc.fornecedor_id
    LEFT JOIN public.partners p ON p.id = fd.partner_id
),
contas_pagar AS (
    SELECT 
        cp.id as conta_id,
        cp.pedido_id,
        cp.descricao as conta_descricao,
        cp.valor_original as conta_valor_original,
        cp.valor_atual as conta_valor_atual,
        cp.data_vencimento,
        cp.status as conta_status,
        cp.numero_nota_fiscal,
        cp.created_at as conta_created_at,
        cp.updated_at as conta_updated_at
    FROM financeiro.contas_pagar cp
),
entradas_estoque AS (
    SELECT 
        em.id as entrada_id,
        em.numero_documento,
        em.data_entrada,
        em.tipo_entrada,
        em.status as entrada_status,
        em.created_at as entrada_created_at,
        em.updated_at as entrada_updated_at
    FROM almoxarifado.entradas_materiais em
    WHERE em.tipo_entrada = 'compra'
)
SELECT 
    r.id as requisicao_id,
    r.numero_requisicao,
    r.data_solicitacao,
    r.data_necessidade,
    r.requisicao_status,
    r.requisicao_workflow_state,
    r.valor_total_estimado,
    r.solicitante_nome,
    r.solicitante_email,
    
    -- Cotação
    c.cotacao_id,
    c.numero_cotacao,
    c.data_cotacao,
    c.cotacao_status,
    c.cotacao_workflow_state,
    c.prazo_resposta,
    
    -- Pedido
    p.pedido_id,
    p.numero_pedido,
    p.data_pedido,
    p.data_entrega_prevista,
    p.data_entrega_real,
    p.pedido_status,
    p.pedido_workflow_state,
    p.pedido_valor_total,
    p.pedido_valor_final,
    p.fornecedor_nome,
    
    -- Conta a Pagar
    cp.conta_id,
    cp.conta_descricao,
    cp.conta_valor_original,
    cp.conta_valor_atual,
    cp.data_vencimento,
    cp.conta_status,
    cp.numero_nota_fiscal,
    
    -- Entrada em Estoque
    e.entrada_id,
    e.numero_documento as entrada_numero_documento,
    e.data_entrada,
    e.entrada_status,
    
    -- Timestamps
    r.requisicao_created_at,
    c.cotacao_created_at,
    p.pedido_created_at,
    cp.conta_created_at,
    e.entrada_created_at
    
FROM requisicoes r
LEFT JOIN cotacoes c ON c.requisicao_id = r.id
LEFT JOIN pedidos p ON p.cotacao_id = c.cotacao_id
LEFT JOIN contas_pagar cp ON cp.pedido_id = p.pedido_id
LEFT JOIN entradas_estoque e ON e.numero_documento = p.numero_pedido
WHERE r.company_id = :company_id
ORDER BY r.data_solicitacao DESC, c.data_cotacao DESC, p.data_pedido DESC;
```

---

## 5. ESTRUTURA DA PÁGINA DE FOLLOW-UP

### 5.1 Componentes Necessários

1. **Filtros:**
   - Período (data inicial/final)
   - Status da requisição
   - Status da cotação
   - Status do pedido
   - Status da conta a pagar
   - Fornecedor
   - Solicitante

2. **Visualização:**
   - Timeline visual mostrando todas as etapas
   - Cards/linhas com informações de cada etapa
   - Indicadores de status (ícones, cores)
   - Datas importantes
   - Valores financeiros

3. **Detalhes:**
   - Modal ou expandir linha para ver detalhes completos
   - Itens da requisição
   - Itens da cotação
   - Itens do pedido
   - Parcelas da conta a pagar
   - Itens da entrada em estoque

4. **Ações:**
   - Exportar relatório
   - Filtrar por etapa específica
   - Ver histórico de mudanças (workflow_logs)

---

## 6. CONSIDERAÇÕES TÉCNICAS

### 6.1 Relacionamentos Não Diretos

- **Entrada em Estoque ↔ Pedido:** A vinculação é feita através do `numero_documento` da entrada que contém o `numero_pedido`. Não há FK direta.

### 6.2 Estados Múltiplos

- Cada entidade tem `status` (ENUM) e `workflow_state` (VARCHAR). O `workflow_state` é mais detalhado e usado para o workflow.

### 6.3 Criação Automática

- Pedidos são criados automaticamente quando cotação é aprovada
- Contas a pagar são criadas automaticamente quando pedido é criado
- Entradas podem ser criadas automaticamente ou manualmente

### 6.4 Múltiplos Pedidos por Cotação

- Uma cotação pode gerar múltiplos pedidos (um para cada fornecedor vencedor)
- Cada pedido gera uma conta a pagar

---

## 7. RECOMENDAÇÕES PARA IMPLEMENTAÇÃO

1. **Performance:**
   - Criar índices nas colunas de relacionamento
   - Usar paginação para grandes volumes
   - Cachear dados frequentes

2. **UX:**
   - Timeline visual clara
   - Cores diferentes para cada status
   - Indicadores de progresso
   - Filtros intuitivos

3. **Funcionalidades:**
   - Exportar para Excel/PDF
   - Notificações de mudanças de status
   - Histórico completo de transições

4. **Segurança:**
   - Verificar permissões por empresa
   - RLS (Row Level Security) já implementado

---

## 8. PRÓXIMOS PASSOS

1. Criar função SQL para buscar dados do follow-up
2. Criar hook React para buscar dados
3. Criar componente de Timeline
4. Criar página de Follow-up
5. Adicionar filtros e exportação
6. Testar com dados reais

---

**Fim da Análise**
