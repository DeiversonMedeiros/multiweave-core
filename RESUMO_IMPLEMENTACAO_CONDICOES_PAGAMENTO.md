# Resumo da Implementação: Condições de Pagamento na Cotação

## ✅ Implementação Concluída

### Fase 1: Estrutura do Banco de Dados ✅

#### Migração 1: `20260121000001_add_condicoes_pagamento_cotacao_fornecedores.sql`
- ✅ Adicionados campos em `compras.cotacao_fornecedores`:
  - `forma_pagamento` (VARCHAR)
  - `is_parcelada` (BOOLEAN)
  - `numero_parcelas` (INTEGER)
  - `intervalo_parcelas` (VARCHAR)
- ✅ Criada função de validação `validate_cotacao_fornecedor_pagamento()`
- ✅ Criado trigger de validação

#### Migração 2: `20260121000002_add_condicoes_pagamento_pedidos_compra.sql`
- ✅ Adicionados campos em `compras.pedidos_compra`:
  - `forma_pagamento` (VARCHAR)
  - `is_parcelada` (BOOLEAN)
  - `numero_parcelas` (INTEGER)
  - `intervalo_parcelas` (VARCHAR)
- ✅ Criada função de validação `validate_pedido_compra_pagamento()`
- ✅ Criado trigger de validação

#### Migração 3: `20260121000003_add_pedido_id_contas_pagar.sql`
- ✅ Adicionado campo `pedido_id` em `financeiro.contas_pagar`
- ✅ Criada foreign key para `compras.pedidos_compra`
- ✅ Criado índice para performance

### Fase 2: Interface do Modal ✅

#### Arquivo: `src/components/Compras/ModalGerarCotacao.tsx`
- ✅ Atualizada interface `FornecedorCotacao` com novos campos
- ✅ Adicionada seção "Condições de Pagamento" por fornecedor:
  - Select "Forma de Pagamento" (PIX, Cartão de Crédito, Cartão de Débito, À Vista, Transferência Bancária)
  - Checkbox "Parcelar"
  - Input "Número de Parcelas" (quando parcelado)
  - Select "Intervalo entre Parcelas" (30, 60, 90, 120, 150, 180 dias)
- ✅ Campos salvos ao criar/atualizar cotação
- ✅ Campos carregados ao editar cotação

### Fase 3: Propagação para Pedido ✅

#### Migração 4: `20260121000004_update_criar_pedido_with_condicoes_pagamento.sql`
- ✅ Atualizada função `compras.criar_pedido_apos_aprovacao_cotacao_ciclos()`
- ✅ Condições de pagamento propagadas do fornecedor para o pedido
- ✅ Campos incluídos ao criar pedido:
  - `forma_pagamento`
  - `is_parcelada`
  - `numero_parcelas`
  - `intervalo_parcelas`

### Fase 4: Propagação para Conta a Pagar ✅

#### Migração 5: `20260121000005_update_criar_conta_pagar_with_condicoes_pagamento.sql`
- ✅ Atualizada função `compras.criar_conta_pagar()`
- ✅ Condições de pagamento propagadas do pedido para a conta
- ✅ Campo `pedido_id` vinculado na conta criada
- ✅ **Criação automática de parcelas** quando `is_parcelada = true`:
  - Valor dividido igualmente entre parcelas
  - Última parcela ajustada para diferença de centavos
  - Datas de vencimento calculadas automaticamente
  - Números de título gerados automaticamente

#### Arquivo: `src/services/compras/purchaseService.ts`
- ✅ Atualizado `startQuoteCycle()` para salvar condições de pagamento
- ✅ Campos incluídos ao criar fornecedores
- ✅ Campos incluídos ao atualizar fornecedores existentes

## 📋 Fluxo Completo Implementado

### 1. Criação da Cotação
- Usuário preenche condições de pagamento no modal "Gerar Cotação"
- Campos salvos em `compras.cotacao_fornecedores`

### 2. Aprovação da Cotação
- Quando cotação é aprovada, trigger cria pedido automaticamente
- Condições de pagamento são propagadas para `compras.pedidos_compra`

### 3. Criação da Conta a Pagar
- Função `criar_conta_pagar()` é chamada automaticamente
- Condições de pagamento são propagadas para `financeiro.contas_pagar`
- Campo `pedido_id` vincula conta ao pedido
- **Se parcelado:** Parcelas são criadas automaticamente em `financeiro.contas_pagar_parcelas`

## 🎯 Funcionalidades Implementadas

### ✅ Formas de Pagamento Suportadas
- PIX
- Cartão de Crédito
- Cartão de Débito
- À Vista
- Transferência Bancária

### ✅ Parcelamento Automático
- Suporte para 2 a 12 parcelas
- Intervalos: 30, 60, 90, 120, 150, 180 dias
- Cálculo automático de valores e datas
- Ajuste de centavos na última parcela

### ✅ Vinculação Completa
- Cotação → Pedido → Conta a Pagar
- Rastreabilidade através de `pedido_id`

## 🔍 Validações Implementadas

1. **Se `is_parcelada = false`:** `numero_parcelas` deve ser 1
2. **Se `is_parcelada = true`:** `numero_parcelas` deve ser >= 2
3. **`intervalo_parcelas`:** Deve ser um dos valores: 30, 60, 90, 120, 150, 180

## 📝 Próximos Passos (Opcional)

### Fase 5: Visualização e Relatórios
- [ ] Exibir condições de pagamento na visualização da cotação
- [ ] Exibir condições de pagamento no pedido de compra
- [ ] Exibir vinculação pedido-conta na conta a pagar
- [ ] Adicionar filtros por forma de pagamento

### Fase 6: Testes
- [ ] Testar fluxo completo: Cotação → Pedido → Conta a Pagar
- [ ] Testar parcelamento automático
- [ ] Testar diferentes formas de pagamento
- [ ] Validar cálculos de parcelas

## 🚀 Como Testar

1. **Criar uma nova cotação:**
   - Abrir modal "Gerar Cotação"
   - Adicionar fornecedor
   - Preencher condições de pagamento:
     - Selecionar forma de pagamento
     - Marcar "Parcelar" (se necessário)
     - Definir número de parcelas e intervalo
   - Salvar cotação

2. **Aprovar a cotação:**
   - Ir para "portal-gestor/aprovacoes"
   - Aprovar a cotação
   - Verificar se pedido foi criado com condições de pagamento

3. **Verificar conta a pagar:**
   - Ir para "financeiro/contas-pagar"
   - Verificar se conta foi criada com condições de pagamento
   - Se parcelado, verificar se parcelas foram criadas automaticamente

## ⚠️ Observações Importantes

1. **Compatibilidade com Dados Existentes:**
   - Campos novos têm valores padrão
   - Cotações antigas não terão condições estruturadas (usarão valores padrão)
   - Campo legado `condicao_pagamento` (texto) foi mantido para compatibilidade

2. **Migração de Dados:**
   - Não há migração automática de dados existentes
   - Cotações antigas precisarão ser editadas para incluir condições estruturadas

---

**Data de Implementação:** 2026-01-21  
**Status:** ✅ Implementação Completa  
**Pronto para Testes**
