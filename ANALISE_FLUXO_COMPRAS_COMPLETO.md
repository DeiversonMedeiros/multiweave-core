# Análise Completa do Fluxo de Compras

## 📋 Fluxo Esperado pelo Usuário

1. **Requisição de Compra** (`compras/requisicoes`)
   - Usuário abre uma requisição de compra
   - Status inicial: `rascunho` ou `pendente_aprovacao`

2. **Aprovação de Requisição** (`portal-gestor/aprovacoes`)
   - Requisição segue para aprovação do gestor
   - Após aprovação: status muda para `aprovada` e `workflow_state = 'em_cotacao'`

3. **Requisições Disponíveis** (`compras/cotacoes` - aba "Requisições Disponíveis")
   - Requisições aprovadas aparecem com status **"a cotar"**
   - Filtro: `workflow_state = 'em_cotacao'` ou `status = 'aprovada'`

4. **Geração de Cotação** (`compras/cotacoes` - aba "Cotações Realizadas")
   - Comprador faz a cotação
   - Cotação criada com status **"aguardando Aprovação"** (`workflow_state = 'em_aprovacao'`)

5. **Aprovação de Cotação** (`portal-gestor/aprovacoes`)
   - Cotação segue para aprovação do gestor
   - Após aprovação: status muda para `aprovada` e `workflow_state = 'aprovada'`

6. **Geração Automática de Pedidos e Contas a Pagar**
   - Após aprovação da cotação:
     - Status da cotação muda para **"Em Pedido"** na aba "Cotações Realizadas"
     - Sistema gera automaticamente um **pedido de compra** para cada fornecedor vencedor (`compras/pedidos`)
     - Sistema gera automaticamente uma **conta a pagar** para cada pedido (`financeiro/contas-pagar`)
     - Conta a pagar criada com status **"Sem nota"** (baseado em `numero_nota_fiscal IS NULL`)

7. **Aprovação de Conta a Pagar** (`portal-gestor/aprovacoes`)
   - Conta a pagar segue para aprovação do gestor

## 🔍 Análise do Sistema Atual

### ✅ Conforme com o Fluxo Esperado

1. **Criação de Requisição**: ✅ Implementado
   - Página `compras/requisicoes` existe e funciona
   - Status inicial: `rascunho` ou `pendente_aprovacao`

2. **Aprovação de Requisição**: ✅ Implementado
   - Trigger `trigger_create_approvals_requisicoes_compra` cria aprovações automaticamente
   - Função `process_approval` atualiza status para `aprovada` e `workflow_state = 'em_cotacao'`

3. **Requisições Disponíveis**: ✅ Implementado
   - Componente `RequisicoesDisponiveis.tsx` exibe requisições com status "A COTAR"
   - Filtro: `workflow_state = 'em_cotacao'` ou `status = 'aprovada'`

4. **Geração de Cotação**: ✅ Implementado
   - `ModalGerarCotacao` permite criar cotações
   - `startQuoteCycle` cria `cotacao_ciclos` com `workflow_state = 'em_aprovacao'`
   - Trigger `trigger_create_approvals_cotacao_ciclos` cria aprovações automaticamente

5. **Aprovação de Cotação**: ✅ Implementado
   - Função `process_approval` atualiza `cotacao_ciclos` quando todas aprovações são concluídas
   - Status muda para `aprovada` e `workflow_state = 'aprovada'`

6. **Geração Automática de Pedidos**: ✅ Implementado
   - Trigger `trigger_criar_pedido_apos_aprovacao_cotacao_ciclos` cria pedidos automaticamente
   - Cria um pedido para cada fornecedor aprovado na cotação (`cotacao_fornecedores` com `status = 'aprovada'`)

7. **Geração Automática de Contas a Pagar**: ✅ Implementado
   - Função `compras.criar_conta_pagar` é chamada após criação do pedido
   - Conta a pagar é criada com `status = 'pendente'` e `numero_nota_fiscal = NULL` (implicitamente "Sem nota")

### ❌ Gaps Identificados

1. **Status "Em Pedido" não é exibido**
   - **Problema**: Após aprovação da cotação, o status deveria mudar para "Em Pedido" na aba "Cotações Realizadas"
   - **Localização**: `src/components/Compras/CotacoesRealizadas.tsx` - função `getStatusBadge`
   - **Solução**: Adicionar caso para `em_pedido` no switch do `getStatusBadge`

2. **Status "Sem nota" não é exibido explicitamente**
   - **Problema**: Contas a pagar geradas automaticamente não têm `numero_nota_fiscal`, mas isso não é exibido como "Sem nota"
   - **Localização**: `src/components/financial/ContasPagarPage.tsx` - função `getStatusBadge`
   - **Solução**: Adicionar lógica para exibir "Sem nota" quando `numero_nota_fiscal IS NULL`

3. **Status da cotação não muda para "Em Pedido" após geração de pedidos**
   - **Problema**: O trigger cria os pedidos, mas não atualiza o status da cotação para `em_pedido`
   - **Localização**: `supabase/migrations/20251212000008_fix_criar_pedido_cotacao_ciclos.sql`
   - **Solução**: Atualizar o trigger para mudar o status da cotação para `em_pedido` após criar os pedidos

## 🔧 Correções Necessárias

### 1. Adicionar Status "Em Pedido" na Exibição de Cotações

**Arquivo**: `src/components/Compras/CotacoesRealizadas.tsx`

Adicionar caso no `getStatusBadge`:
```typescript
case 'em_pedido':
  return <Badge variant="outline" className="text-purple-600"><Package className="h-3 w-3 mr-1" />Em Pedido</Badge>;
```

### 2. Atualizar Status da Cotação para "Em Pedido" após Geração de Pedidos

**Arquivo**: `supabase/migrations/20251212000008_fix_criar_pedido_cotacao_ciclos.sql`

Após criar os pedidos, atualizar o status da cotação:
```sql
-- Atualizar status da cotação para 'em_pedido' após criar pedidos
UPDATE compras.cotacao_ciclos
SET 
    status = 'em_pedido',
    workflow_state = 'em_pedido',
    updated_at = NOW()
WHERE id = NEW.id;
```

### 3. Exibir Status "Sem nota" em Contas a Pagar

**Arquivo**: `src/components/financial/ContasPagarPage.tsx`

Adicionar lógica para exibir badge "Sem nota" quando `numero_nota_fiscal IS NULL`:
```typescript
// Adicionar badge de "Sem nota" se não houver número de nota fiscal
{!conta.numero_nota_fiscal && (
  <Badge variant="outline" className="text-orange-600">
    <FileText className="h-3 w-3 mr-1" />
    Sem nota
  </Badge>
)}
```

## 📝 Resumo das Alterações

1. ✅ Adicionar badge "Em Pedido" em `CotacoesRealizadas.tsx`
2. ✅ Atualizar trigger para mudar status da cotação para `em_pedido` após criar pedidos
3. ✅ Adicionar badge "Sem nota" em `ContasPagarPage.tsx` quando `numero_nota_fiscal IS NULL`

