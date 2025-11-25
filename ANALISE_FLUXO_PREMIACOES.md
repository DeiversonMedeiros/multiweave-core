# Análise do Fluxo de Premiações e Produtividade

## Data da Análise
**2025-11-09**

## Fluxo Esperado
1. ✅ Usuário do RH cadastra "Premiações e Produtividade"
2. ❌ **FALTANDO**: Valor vai para contas a pagar automaticamente quando aprovado
3. ❌ **FALTANDO**: Passa pelo fluxo de aprovações (sistema de aprovações unificado)
4. ❌ **FALTANDO**: Valor é pago através da integração com Flash

## Análise Atual

### 1. Cadastro de Premiações ✅
- **Status**: Funcionando
- **Localização**: `src/pages/rh/AwardsProductivityPage.tsx`
- **Serviço**: `src/services/rh/awardsProductivityService.ts`
- **Tabela**: `rh.awards_productivity`

### 2. Aprovação de Premiações ⚠️
- **Status**: Parcialmente implementado
- **Função**: `approveAward()` em `awardsProductivityService.ts`
- **Ação atual**: Apenas atualiza status para 'aprovado'
- **Problema**: **NÃO cria conta a pagar automaticamente**

### 3. Integração com Contas a Pagar ❌
- **Status**: **NÃO IMPLEMENTADO**
- **Tabela de destino**: `financeiro.accounts_payable`
- **Document type**: Deveria ser 'award' ou 'other'
- **Problema**: Não há função RPC ou trigger que crie conta a pagar quando premiação é aprovada

### 4. Fluxo de Aprovações ❌
- **Status**: **NÃO INTEGRADO**
- **Sistema existente**: `financeiro.aprovacoes` e `financeiro.configuracoes_aprovacao`
- **Problema**: Premiações não passam pelo sistema de aprovações unificado
- **Observação**: O sistema de aprovações existe para `contas_pagar`, mas premiações não criam contas a pagar

### 5. Integração com Flash ❌
- **Status**: **NÃO IMPLEMENTADO**
- **Serviço Flash**: `src/services/integrations/flashApiService.ts` existe
- **Problema**: Não há função para enviar premiações para Flash
- **Referência**: Existe exemplo em `equipment_rental_monthly_payments` que integra com Flash

## Comparação com Equipment Rental Payments

### Equipment Rental Monthly Payments (Funcionando)
1. ✅ Cadastro de pagamentos mensais
2. ✅ Aprovação de pagamentos
3. ✅ Função `send_equipment_rental_to_accounts_payable()` cria conta a pagar
4. ✅ Função `send_equipment_rental_to_flash()` envia para Flash
5. ✅ Integração completa

### Awards Productivity (Faltando)
1. ✅ Cadastro de premiações
2. ⚠️ Aprovação (mas não cria conta a pagar)
3. ❌ **FALTA**: Função para criar conta a pagar
4. ❌ **FALTA**: Função para enviar para Flash
5. ❌ **FALTA**: Integração completa

## Estrutura de Dados Necessária

### Tabela `rh.awards_productivity`
- ✅ Já possui campos necessários:
  - `status`: pendente, aprovado, pago, cancelado
  - `data_aprovacao`
  - `aprovado_por`
  - `data_pagamento`
- ❌ **FALTA**: Campo para referenciar conta a pagar criada
- ❌ **FALTA**: Campos para integração Flash (flash_payment_id, flash_invoice_id, etc.)

### Tabela `financeiro.accounts_payable`
- ✅ Já possui estrutura adequada
- ✅ Suporta `document_type`: 'invoice', 'payroll', 'expense', 'other'
- ✅ Possui `employee_id` para relacionar com funcionário
- ⚠️ **SUGERIDO**: Adicionar campo `award_id` para referenciar premiação

## Implementação Necessária

### 1. Adicionar campos à tabela `rh.awards_productivity`
```sql
ALTER TABLE rh.awards_productivity ADD COLUMN IF NOT EXISTS accounts_payable_id UUID;
ALTER TABLE rh.awards_productivity ADD COLUMN IF NOT EXISTS flash_payment_id VARCHAR(255);
ALTER TABLE rh.awards_productivity ADD COLUMN IF NOT EXISTS flash_invoice_id VARCHAR(255);
ALTER TABLE rh.awards_productivity ADD COLUMN IF NOT EXISTS flash_account_number VARCHAR(255);
ALTER TABLE rh.awards_productivity ADD COLUMN IF NOT EXISTS enviado_contas_pagar_em TIMESTAMP WITH TIME ZONE;
ALTER TABLE rh.awards_productivity ADD COLUMN IF NOT EXISTS enviado_flash_em TIMESTAMP WITH TIME ZONE;
```

### 2. Criar função RPC para enviar premiação para contas a pagar
```sql
CREATE OR REPLACE FUNCTION send_award_to_accounts_payable(
  p_award_id UUID,
  p_sent_by UUID,
  p_due_date DATE DEFAULT NULL
) RETURNS JSON;
```

### 3. Criar função RPC para enviar premiação para Flash
```sql
CREATE OR REPLACE FUNCTION send_award_to_flash(
  p_award_id UUID,
  p_sent_by UUID
) RETURNS JSON;
```

### 4. Criar trigger ou função que cria conta a pagar automaticamente
- Opção A: Trigger após aprovação
- Opção B: Modificar função `approveAward` para criar conta a pagar

### 5. Integrar com sistema de aprovações
- Quando conta a pagar é criada, deve passar pelo fluxo de aprovações
- Sistema já existe em `financeiro.aprovacoes`

## Próximos Passos

1. ✅ Análise completa (este documento)
2. ⏳ Implementar campos adicionais na tabela
3. ⏳ Criar funções RPC para integração
4. ⏳ Modificar função de aprovação para criar conta a pagar
5. ⏳ Testar fluxo completo

## Status Geral
❌ **FLUXO NÃO ESTÁ FUNCIONANDO CONFORME ESPERADO**

O fluxo atual para premiações:
1. ✅ Cadastro
2. ⚠️ Aprovação (apenas muda status)
3. ❌ **NÃO cria conta a pagar**
4. ❌ **NÃO passa por aprovações**
5. ❌ **NÃO integra com Flash**

