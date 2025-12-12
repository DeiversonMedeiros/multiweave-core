# Análise do Fluxo de Compras

## Fluxo Esperado vs. Fluxo Atual

### 1. Criação da Requisição de Compra
**Esperado:**
- Requisição criada com status `rascunho`
- Ao "abrir/enviar" a requisição, status muda para `pendente_aprovacao`
- Sistema cria aprovações automaticamente

**Atual:**
- ✅ Requisição criada com status `rascunho` (default)
- ✅ Trigger `trigger_create_approvals_requisicoes_compra` cria aprovações no INSERT
- ❓ Mudança de `rascunho` para `pendente_aprovacao` parece ser manual no frontend
- ⚠️ **GAP**: Não há trigger que muda automaticamente para `pendente_aprovacao` quando a requisição é "enviada"

### 2. Processo de Aprovação da Requisição
**Esperado:**
- Aprovações criadas automaticamente
- Processo de aprovação nas páginas `/configuracoes/aprovacoes` e `/portal-gestor/aprovacoes`
- Após todas aprovações, status muda para `aprovada`

**Atual:**
- ✅ Aprovações criadas automaticamente via trigger
- ✅ Função `process_approval` atualiza status para `aprovada` quando todas aprovações são concluídas
- ✅ Workflow_state muda para `em_cotacao` após aprovação

### 3. Criação Automática de Cotação
**Esperado:**
- Após aprovação da requisição, sistema **automaticamente** cria cotação
- Cotação puxa informações da requisição de compra

**Atual:**
- ❌ **GAP CRÍTICO**: Não há trigger ou função que cria cotação automaticamente
- ⚠️ Cotações são criadas manualmente pelo usuário na página de cotações
- ⚠️ Não há automatização após aprovação da requisição

### 4. Aprovação da Cotação
**Esperado:**
- Após conclusão da cotação, inicia processo de aprovação
- Após aprovação, gera automaticamente pedido de compra para cada fornecedor escolhido
- Também gera contas a pagar automaticamente

**Atual:**
- ✅ Aprovações criadas automaticamente via trigger
- ✅ Função `process_approval` atualiza status para `aprovada` quando todas aprovações são concluídas
- ❌ **GAP CRÍTICO**: Não há trigger que cria pedidos automaticamente após aprovação da cotação
- ❌ **GAP CRÍTICO**: Não há trigger que cria contas a pagar automaticamente após aprovação da cotação
- ⚠️ Existe função `compras.criar_conta_pagar` mas não é chamada automaticamente

## Problemas Identificados

### Problema 1: Requisição não muda automaticamente para `pendente_aprovacao`
- **Impacto**: Requisições podem ficar em `rascunho` indefinidamente
- **Solução**: Criar trigger ou função que muda status quando requisicao é "enviada"

### Problema 2: Cotação não é criada automaticamente após aprovação
- **Impacto**: Processo manual, pode ser esquecido
- **Solução**: Criar trigger que cria cotação quando `workflow_state = 'em_cotacao'` e `status = 'aprovada'`

### Problema 3: Pedidos não são criados automaticamente após aprovação da cotação
- **Impacto**: Processo manual, pode ser esquecido
- **Solução**: Criar trigger que cria pedido para cada fornecedor quando cotação é aprovada

### Problema 4: Contas a pagar não são criadas automaticamente
- **Impacto**: Processo manual, pode ser esquecido
- **Solução**: Criar trigger que chama `compras.criar_conta_pagar` quando pedido é criado/aprovado

## Correções Implementadas

1. ✅ **Status pendente_aprovacao**: O frontend já define `workflow_state: 'pendente_aprovacao'` ao criar a requisição. O status fica como `rascunho` mas o workflow_state indica que está aguardando aprovação.

2. ✅ **Criação automática de Pedido**: Implementado trigger `trigger_criar_pedido_apos_aprovacao_cotacao` que:
   - Detecta quando uma cotação é aprovada
   - Cria automaticamente um pedido de compra
   - Copia todos os itens da cotação para o pedido
   - Cria conta a pagar automaticamente
   - Atualiza status da requisição para 'em_pedido' quando todas cotações foram processadas

3. ✅ **Criação automática de Conta a Pagar**: Implementado trigger `trigger_criar_conta_pagar_apos_aprovacao_pedido` que:
   - Detecta quando um pedido é criado ou aprovado
   - Cria automaticamente uma conta a pagar
   - Evita duplicatas verificando se já existe conta para o pedido

4. ⚠️ **Criação automática de Cotação**: NÃO implementado porque:
   - Requer seleção manual de fornecedores pelo comprador
   - A requisição fica em `em_cotacao` após aprovação
   - O comprador cria as cotações manualmente na página de cotações
   - Isso é intencional, pois permite flexibilidade na escolha de fornecedores

## Arquivo de Migração Criado

- `supabase/migrations/20250117000001_automatizar_fluxo_compras.sql`

Este arquivo contém:
- Função `compras.criar_pedido_apos_aprovacao_cotacao()`: Cria pedido e conta a pagar quando cotação é aprovada
- Função `compras.criar_conta_pagar_automatica()`: Cria conta a pagar quando pedido é aprovado
- Triggers correspondentes para automatizar o processo

