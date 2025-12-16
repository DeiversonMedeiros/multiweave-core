# Análise Completa e Solução para o Fluxo de Compras

## 📋 Resumo Executivo

Este documento apresenta uma análise completa do fluxo atual de compras e propõe uma solução para alinhar o sistema com o fluxo desejado pelo usuário.

## 🔍 Análise do Fluxo Atual

### 1. Criação da Requisição de Compra
**Status Atual:**
- ✅ Requisição criada na página `compras/requisicoes`
- ✅ Status inicial: `rascunho`, `workflow_state`: `pendente_aprovacao`
- ✅ Trigger `trigger_create_approvals_requisicoes_compra` cria aprovações automaticamente no INSERT
- ✅ Requisição aparece no fluxo de aprovação configurado em `configuracoes/aprovacoes`

**Conformidade com o Desejado:** ✅ **CONFORME**

### 2. Processo de Aprovação da Requisição
**Status Atual:**
- ✅ Aprovações criadas automaticamente via trigger
- ✅ Processo de aprovação nas páginas `/configuracoes/aprovacoes` e `/portal-gestor/aprovacoes`
- ✅ Função `process_approval` atualiza status para `aprovada` quando todas aprovações são concluídas
- ✅ `workflow_state` muda para `em_cotacao` após aprovação completa

**Conformidade com o Desejado:** ✅ **CONFORME**

### 3. Requisições Disponíveis para Cotação
**Status Atual:**
- ✅ Requisições aprovadas aparecem na página `compras/cotacoes` aba "Requisições Disponíveis"
- ✅ Filtro: `workflow_state = 'aprovada'` ou `status = 'aprovada'`
- ✅ Comprador pode selecionar múltiplas requisições

**Conformidade com o Desejado:** ✅ **CONFORME**

### 4. Geração de Cotação
**Status Atual:**
- ✅ Comprador seleciona requisições e clica em "Gerar Cotação"
- ✅ Modal `ModalGerarCotacao` permite configurar:
  - Tipo de cotação
  - Fornecedores
  - Itens a cotar
  - Prazo de resposta
- ✅ Função `purchaseService.startQuoteCycle` cria `cotacao_ciclos`
- ✅ Status inicial da cotação: `status = 'em_aprovacao'`, `workflow_state = 'em_aprovacao'` (CORRIGIDO)
- ✅ Trigger `trigger_create_approvals_cotacao_ciclos` cria aprovações automaticamente quando cotação é criada com `em_aprovacao`

**Conformidade com o Desejado:** ✅ **CONFORME**

### 5. Aprovação da Cotação
**Status Atual:**
- ✅ Trigger `trigger_create_approvals_cotacao_ciclos` cria aprovações quando `cotacao_ciclos` é criado com `em_aprovacao`
- ✅ Cotação criada com `workflow_state = 'em_aprovacao` e `status = 'em_aprovacao'`
- ✅ Função `process_approval` atualiza `cotacao_ciclos` quando todas aprovações são concluídas
- ✅ Após aprovação, status muda para `aprovada` e `workflow_state = 'aprovada'`
- ✅ Componente `CotacoesRealizadas` mostra badge "Aguardando Aprovação" para cotações com `em_aprovacao`

**Conformidade com o Desejado:** ✅ **CONFORME**

### 6. Geração de Pedido de Compra
**Status Atual:**
- ⚠️ **PROBLEMA**: Trigger `trigger_criar_pedido_apos_aprovacao_cotacao` está na tabela `compras.cotacoes`, mas o sistema usa `compras.cotacao_ciclos`
- ⚠️ **PROBLEMA**: Função `criar_pedido_apos_aprovacao_cotacao` usa `compras.cotacoes` ao invés de `compras.cotacao_ciclos`
- ✅ Função `compras.criar_conta_pagar` existe e pode ser chamada após criação do pedido

**Conformidade com o Desejado:** ❌ **NÃO CONFORME**

**Gaps Identificados:**
1. Trigger precisa ser movido de `compras.cotacoes` para `compras.cotacao_ciclos`
2. Função precisa usar `cotacao_ciclos` e `cotacao_fornecedores` ao invés de `cotacoes`
3. Pedidos devem ser criados para cada fornecedor aprovado na cotação (via `cotacao_fornecedores`)

## 🎯 Fluxo Desejado vs. Fluxo Atual

### Fluxo Desejado (Conforme Especificação)
1. ✅ Usuário cria requisição → vai para aprovação
2. ✅ Após aprovação → mostra na página "compras/cotacoes" aba "Requisições Disponíveis"
3. ✅ Comprador seleciona requisições e gera cotação
4. ✅ Após cotação ser gerada, deve passar pelo fluxo de aprovações
5. ✅ Cotação deve aparecer na aba "Cotações Realizadas" com status "Aguardando Aprovação"
6. ❌ **GAP**: Após aprovação da cotação → gera pedido de compra

### Fluxo Atual
1. ✅ Usuário cria requisição → vai para aprovação
2. ✅ Após aprovação → mostra na página "compras/cotacoes" aba "Requisições Disponíveis"
3. ✅ Comprador seleciona requisições e gera cotação
4. ✅ Cotação criada com `workflow_state = 'em_aprovacao'` e entra em aprovação automaticamente
5. ✅ Cotação aparece com status "Aguardando Aprovação" na aba "Cotações Realizadas"
6. ❌ Após aprovação da cotação → **NÃO gera pedido automaticamente** (trigger está na tabela errada)

## 🔧 Solução Proposta

### Alterações Necessárias

#### 1. Criar Trigger para Aprovações de `cotacao_ciclos`
**Problema:** O trigger `trigger_create_approvals_cotacoes` está na tabela `compras.cotacoes`, mas o sistema usa `compras.cotacao_ciclos`.

**Solução:** Criar trigger que:
- Detecta quando um `cotacao_ciclos` é criado
- Chama `create_approvals_for_process` com `processo_tipo = 'cotacao_compra'`
- Usa o `id` do `cotacao_ciclos` como `processo_id`

#### 2. Atualizar `startQuoteCycle` para Mudar Status
**Problema:** Após criar a cotação, ela fica com `workflow_state = 'aberta'` e não entra em aprovação.

**Solução:** Modificar `purchaseService.startQuoteCycle` para:
- Criar `cotacao_ciclos` com `workflow_state = 'em_aprovacao'` e `status = 'em_aprovacao'`
- Isso fará com que a cotação apareça como "Aguardando Aprovação"

#### 3. Atualizar Função `process_approval` para `cotacao_ciclos`
**Problema:** A função `process_approval` atualiza `compras.cotacoes`, mas precisa atualizar `compras.cotacao_ciclos`.

**Solução:** Modificar `process_approval` para:
- Quando `processo_tipo = 'cotacao_compra'`, atualizar `compras.cotacao_ciclos` ao invés de `compras.cotacoes`
- Atualizar `workflow_state` e `status` corretamente

#### 4. Atualizar Trigger e Função de Criação de Pedido
**Problema:** O trigger `trigger_criar_pedido_apos_aprovacao_cotacao` está na tabela `compras.cotacoes`, mas o sistema usa `compras.cotacao_ciclos`.

**Solução:** 
- Mover trigger de `compras.cotacoes` para `compras.cotacao_ciclos`
- Atualizar função `criar_pedido_apos_aprovacao_cotacao` para:
  - Usar `cotacao_ciclos` ao invés de `cotacoes`
  - Buscar fornecedores de `cotacao_fornecedores` ao invés de `cotacoes.fornecedor_id`
  - Criar um pedido para cada fornecedor aprovado na cotação
  - Buscar itens da requisição através de `requisicao_id` em `requisicao_itens`

## 📝 Plano de Implementação

### Fase 1: Migração do Banco de Dados
1. Criar trigger para criar aprovações quando `cotacao_ciclos` é criado
2. Atualizar função `process_approval` para lidar com `cotacao_ciclos`
3. Adicionar constraint/check para garantir status válidos

### Fase 2: Atualização do Código
1. Modificar `purchaseService.startQuoteCycle` para criar cotação com `workflow_state = 'em_aprovacao'`
2. Atualizar `CotacoesRealizadas.tsx` para mostrar status "Aguardando Aprovação"
3. Atualizar tipos TypeScript se necessário

### Fase 3: Testes
1. Testar criação de cotação e verificar se aprovações são criadas
2. Testar aprovação de cotação e verificar se pedido é gerado
3. Testar visualização na aba "Cotações Realizadas"

## 🚨 Pontos de Atenção

1. **Compatibilidade com Dados Existentes:**
   - Cotações existentes com `workflow_state = 'aberta'` precisam ser tratadas
   - Considerar migração de dados se necessário

2. **Status vs Workflow State:**
   - O sistema usa tanto `status` quanto `workflow_state`
   - Garantir consistência entre os dois campos

3. **Tabela `cotacoes` vs `cotacao_ciclos`:**
   - O sistema usa `cotacao_ciclos` como tabela principal
   - Verificar se `cotacoes` ainda é usada ou se pode ser descontinuada

4. **Aprovações Múltiplas:**
   - Garantir que o sistema de aprovações unificado funcione corretamente com `cotacao_ciclos`

## 📊 Estrutura de Dados

### Tabela `compras.cotacao_ciclos`
```sql
- id: UUID
- company_id: UUID
- requisicao_id: UUID
- numero_cotacao: VARCHAR(50)
- status: TEXT (aberta, completa, em_aprovacao, aprovada, reprovada)
- workflow_state: TEXT (aberta, completa, em_aprovacao, aprovada, reprovada)
- prazo_resposta: DATE
- observacoes: TEXT
```

### Relação com Aprovações
```sql
- processo_tipo: 'cotacao_compra'
- processo_id: cotacao_ciclos.id
- company_id: cotacao_ciclos.company_id
```

## ✅ Checklist de Implementação

- [x] Criar migração para trigger de aprovações em `cotacao_ciclos` (20251212000006)
- [x] Atualizar função `process_approval` para `cotacao_ciclos` (20251212000007)
- [x] Modificar `startQuoteCycle` para criar com `em_aprovacao` (já implementado)
- [x] Atualizar `CotacoesRealizadas.tsx` para mostrar "Aguardando Aprovação" (já implementado)
- [x] Criar migração para atualizar trigger de criação de pedido para usar `cotacao_ciclos` (20251212000008)
- [x] Atualizar função `criar_pedido_apos_aprovacao_cotacao_ciclos` para usar `cotacao_ciclos` e `cotacao_fornecedores`
- [ ] Testar fluxo completo end-to-end
- [x] Documentar mudanças

## 📋 Resumo da Solução Implementada

### Migrações Criadas

1. **20251212000006_fix_fluxo_aprovacao_cotacoes.sql**
   - Cria trigger `trigger_create_approvals_cotacao_ciclos` que cria aprovações automaticamente quando `cotacao_ciclos` é criado com `em_aprovacao`

2. **20251212000007_update_process_approval_cotacao_ciclos.sql**
   - Atualiza função `process_approval` para usar `cotacao_ciclos` ao invés de `cotacoes` quando `processo_tipo = 'cotacao_compra'`

3. **20251212000008_fix_criar_pedido_cotacao_ciclos.sql**
   - Remove trigger antigo de `compras.cotacoes`
   - Cria nova função `criar_pedido_apos_aprovacao_cotacao_ciclos` que:
     - Detecta quando `cotacao_ciclos` é aprovada
     - Busca fornecedores aprovados em `cotacao_fornecedores`
     - Cria um pedido para cada fornecedor aprovado
     - Copia itens da requisição para o pedido
     - Cria conta a pagar automaticamente

### Código TypeScript Atualizado

1. **purchaseService.ts** - `startQuoteCycle()`
   - Já cria `cotacao_ciclos` com `status = 'em_aprovacao'` e `workflow_state = 'em_aprovacao'`

2. **CotacoesRealizadas.tsx**
   - Já mostra badge "Aguardando Aprovação" para cotações com `workflow_state = 'em_aprovacao'`

## 🔄 Fluxo Completo Implementado

1. ✅ **Criação da Requisição**: Usuário cria requisição → vai para aprovação automaticamente
2. ✅ **Aprovação da Requisição**: Após todas aprovações → `status = 'aprovada'`, `workflow_state = 'em_cotacao'`
3. ✅ **Requisições Disponíveis**: Requisições aprovadas aparecem na aba "Requisições Disponíveis"
4. ✅ **Geração de Cotação**: Comprador seleciona requisições e gera cotação → cotação criada com `em_aprovacao`
5. ✅ **Aprovação da Cotação**: Cotação aparece na aba "Cotações Realizadas" com status "Aguardando Aprovação"
6. ✅ **Geração de Pedido**: Após aprovação da cotação → sistema cria pedido automaticamente para cada fornecedor aprovado

## ⚠️ Observações Importantes

1. **Tabela `cotacoes` vs `cotacao_ciclos`**:
   - O sistema agora usa `cotacao_ciclos` como tabela principal
   - A tabela `cotacoes` ainda existe mas não é mais usada no fluxo principal
   - O campo `pedidos_compra.cotacao_id` pode ficar NULL para pedidos criados a partir de `cotacao_ciclos`

2. **Fornecedores Aprovados**:
   - O sistema cria um pedido para cada fornecedor com `status = 'aprovada'` em `cotacao_fornecedores`
   - Se não houver fornecedores aprovados, nenhum pedido será criado

3. **Itens do Pedido**:
   - Os itens são copiados diretamente de `requisicao_itens`
   - Os valores usados são os `valor_unitario_estimado` da requisição
   - Se o fornecedor tiver `preco_total` em `cotacao_fornecedores`, esse valor é usado como valor total do pedido
