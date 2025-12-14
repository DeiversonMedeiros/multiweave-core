# IMPLEMENTAÇÃO: CORREÇÕES DO FLUXO DE PAGAMENTO DE ALUGUÉIS DE EQUIPAMENTOS

## Data: 2025-12-12

## RESUMO

Foram implementadas todas as correções críticas identificadas na análise do fluxo de pagamento de aluguéis de equipamentos.

---

## CORREÇÕES IMPLEMENTADAS

### ✅ 1. Adicionados campos de Centro de Custo e Classe Financeira

**Migração:** `20251212000005_fix_equipment_rental_monthly_payments_complete.sql`

**Alterações:**
- ✅ Adicionado campo `cost_center_id` na tabela `rh.equipment_rental_monthly_payments`
- ✅ Adicionado campo `classe_financeira_id` na tabela `rh.equipment_rental_monthly_payments`
- ✅ Criados índices para performance
- ✅ Adicionados comentários nas colunas

**Código:**
```sql
ALTER TABLE rh.equipment_rental_monthly_payments
ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS classe_financeira_id UUID REFERENCES financeiro.classes_financeiras(id) ON DELETE SET NULL;
```

---

### ✅ 2. Modificada função `process_monthly_equipment_rentals`

**Alterações:**
- ✅ Função agora busca `cost_center_id` do funcionário (`employees.cost_center_id`)
- ✅ Função busca `classe_financeira_id` do benefício (`benefit_configurations.classe_financeira_id` onde `benefit_type = 'equipment_rental'`)
- ✅ Grava esses valores ao criar pagamentos mensais

**Código:**
```sql
-- Buscar classe financeira do benefício de aluguel de equipamentos
SELECT classe_financeira_id INTO v_classe_financeira_id
FROM rh.benefit_configurations
WHERE company_id = p_company_id
  AND benefit_type = 'equipment_rental'
  AND is_active = true
LIMIT 1;

-- JOIN com employees para buscar cost_center_id
SELECT 
  era.id, 
  era.employee_id, 
  era.company_id, 
  era.valor_mensal,
  e.cost_center_id
FROM rh.equipment_rental_approvals era
JOIN rh.employees e ON e.id = era.employee_id
```

---

### ✅ 3. Criado trigger para aprovações automáticas

**Alterações:**
- ✅ Criada função `create_approvals_for_equipment_rental_monthly_payment()`
- ✅ Função identifica gestor do funcionário (`employees.gestor_imediato_id`)
- ✅ Cria aprovação na tabela `aprovacoes_unificada` para o gestor
- ✅ Também chama `create_approvals_for_process()` para criar aprovações baseadas em configurações
- ✅ Criado trigger `trigger_create_approvals_equipment_rental_monthly_payment` que executa após INSERT

**Código:**
```sql
CREATE OR REPLACE FUNCTION create_approvals_for_equipment_rental_monthly_payment(
  p_payment_id UUID,
  p_company_id UUID
) RETURNS BOOLEAN AS $$
-- Busca gestor e cria aprovação
-- Também chama create_approvals_for_process para configurações
$$;

CREATE TRIGGER trigger_create_approvals_equipment_rental_monthly_payment
  AFTER INSERT ON rh.equipment_rental_monthly_payments
  FOR EACH ROW
  WHEN (NEW.status = 'pendente_aprovacao')
  EXECUTE FUNCTION trigger_create_approvals_equipment_rental_monthly_payment();
```

---

### ✅ 4. Modificada função `send_equipment_rental_to_flash`

**Alterações:**
- ✅ Função agora busca `cost_center_id` do funcionário
- ✅ Função busca `classe_financeira_id` do benefício e converte para código/nome
- ✅ Preenche `centro_custo_id` e `classe_financeira` na conta a pagar criada

**Código:**
```sql
-- JOIN com employees e classes_financeiras
SELECT 
  erpm.*,
  e.cost_center_id,
  cf.codigo as classe_financeira_codigo,
  cf.nome as classe_financeira_nome
FROM rh.equipment_rental_monthly_payments erpm
JOIN rh.employees e ON e.id = erpm.employee_id
LEFT JOIN financeiro.classes_financeiras cf ON cf.id = erpm.classe_financeira_id

-- Preencher na conta a pagar
INSERT INTO financeiro.contas_pagar (
  ...
  centro_custo_id,
  classe_financeira,
  ...
) VALUES (
  ...
  v_payment.cost_center_id,
  v_classe_financeira,
  ...
);
```

---

### ✅ 5. Criada função de agrupamento por centro de custo

**Nova função:** `send_multiple_equipment_rentals_to_flash_by_cost_center()`

**Funcionalidades:**
- ✅ Agrupa pagamentos aprovados por `cost_center_id`
- ✅ Soma valores de todos os pagamentos do mesmo centro de custo
- ✅ Cria **uma conta a pagar por centro de custo** (não uma por pagamento)
- ✅ Atualiza todos os pagamentos do centro de custo com o mesmo `accounts_payable_id`
- ✅ Retorna resultado detalhado por centro de custo

**Código:**
```sql
CREATE OR REPLACE FUNCTION send_multiple_equipment_rentals_to_flash_by_cost_center(
  p_payment_ids UUID[],
  p_sent_by UUID
) RETURNS JSON AS $$
-- Agrupa por cost_center_id
-- Cria uma conta a pagar por centro de custo
-- Atualiza todos os pagamentos
$$;
```

---

### ✅ 6. Atualizada função RPC `list_equipment_rental_monthly_payments`

**Alterações:**
- ✅ Adicionados campos `cost_center_id` e `classe_financeira_id` no RETURNS TABLE
- ✅ Campos incluídos no SELECT da função

---

### ✅ 7. Adicionado suporte no sistema de aprovações unificado

**Alterações:**
- ✅ Função `get_required_approvers()` agora suporta `'equipment_rental_monthly_payment'`
- ✅ Busca valor, centro de custo e classe financeira do pagamento
- ✅ Permite configurações de aprovação baseadas em valor, centro de custo e classe financeira

**Código:**
```sql
WHEN 'equipment_rental_monthly_payment' THEN
  SELECT 
    COALESCE(erpm.valor_aprovado, erpm.valor_calculado),
    erpm.cost_center_id,
    NULL::VARCHAR as departamento,
    cf.codigo as classe_financeira,
    erpm.employee_id
  INTO processo_valor, processo_centro_custo_id, processo_departamento, processo_classe_financeira, processo_usuario_id
  FROM rh.equipment_rental_monthly_payments erpm
  LEFT JOIN financeiro.classes_financeiras cf ON cf.id = erpm.classe_financeira_id
  WHERE erpm.id = p_processo_id AND erpm.company_id = p_company_id;
```

---

### ✅ 8. Atualizado tipo TypeScript

**Arquivo:** `src/services/rh/equipmentRentalMonthlyPaymentsService.ts`

**Alterações:**
- ✅ Adicionados campos `cost_center_id` e `classe_financeira_id` na interface `EquipmentRentalMonthlyPayment`

---

### ✅ 9. Adicionada nova função no serviço TypeScript

**Arquivo:** `src/services/rh/equipmentRentalMonthlyPaymentsService.ts`

**Nova função:**
- ✅ `sendMultipleToFlashByCostCenter()` - Envia múltiplos pagamentos agrupados por centro de custo

---

### ✅ 10. Adicionado hook React

**Arquivo:** `src/hooks/rh/useEquipmentRentalMonthlyPayments.ts`

**Novo hook:**
- ✅ `useSendMultipleToFlashByCostCenter()` - Hook para enviar múltiplos pagamentos agrupados

---

## ARQUIVOS CRIADOS/MODIFICADOS

### Migrações
- ✅ `supabase/migrations/20251212000005_fix_equipment_rental_monthly_payments_complete.sql` (NOVO)

### Serviços TypeScript
- ✅ `src/services/rh/equipmentRentalMonthlyPaymentsService.ts` (MODIFICADO)

### Hooks React
- ✅ `src/hooks/rh/useEquipmentRentalMonthlyPayments.ts` (MODIFICADO)

---

## FLUXO APÓS IMPLEMENTAÇÃO

### 1. RH gera solicitações de aluguéis
- ✅ RH seleciona mês/ano e clica "Gerar Pagamentos"
- ✅ Sistema busca aluguéis aprovados/ativos
- ✅ **NOVO**: Sistema busca e grava `cost_center_id` do funcionário
- ✅ **NOVO**: Sistema busca e grava `classe_financeira_id` do benefício
- ✅ Cria pagamentos com status `'pendente_aprovacao'`

### 2. Sistema cria aprovações automaticamente
- ✅ **NOVO**: Trigger detecta inserção de pagamento com status `'pendente_aprovacao'`
- ✅ **NOVO**: Função identifica gestor do funcionário (`gestor_imediato_id`)
- ✅ **NOVO**: Cria aprovação na tabela `aprovacoes_unificada` para o gestor
- ✅ **NOVO**: Também cria aprovações baseadas em configurações (se houver)
- ✅ Gestor vê aprovações pendentes em `portal-gestor/aprovacoes/equipamentos`

### 3. RH acompanha aprovações
- ✅ Página `EquipmentRentalMonthlyPaymentsPage.tsx` mostra pagamentos
- ⚠️ **MELHORIA FUTURA**: Mostrar status detalhado de aprovações (quantos gestores aprovaram)

### 4. RH gera pagamentos para Flash
- ✅ **NOVO**: Função `send_equipment_rental_to_flash()` preenche `centro_custo_id` e `classe_financeira`
- ✅ **NOVO**: Função `send_multiple_equipment_rentals_to_flash_by_cost_center()` agrupa por centro de custo
- ✅ **NOVO**: Cria uma conta a pagar por centro de custo (não uma por pagamento)
- ✅ **NOVO**: Soma valores de todos os pagamentos do mesmo centro de custo

### 5. Flash cria títulos a pagar
- ✅ **NOVO**: Conta a pagar criada com `centro_custo_id` preenchido
- ✅ **NOVO**: Conta a pagar criada com `classe_financeira` preenchido
- ✅ **NOVO**: Uma conta a pagar por centro de custo (agrupada)

### 6. Título passa por aprovação
- ✅ Sistema de aprovações funciona (já estava implementado)
- ✅ **NOVO**: Aprovações consideram centro de custo e classe financeira

---

## STATUS DAS ETAPAS APÓS IMPLEMENTAÇÃO

| Etapa | Status Antes | Status Depois |
|-------|--------------|---------------|
| 1. RH gera solicitações | ⚠️ Parcial | ✅ **IMPLEMENTADO** |
| 2. Sistema cria aprovações | ❌ Não implementado | ✅ **IMPLEMENTADO** |
| 3. RH acompanha aprovações | ⚠️ Parcial | ⚠️ Parcial (melhorias futuras) |
| 4. RH gera pagamentos para Flash | ❌ Não conforme | ✅ **IMPLEMENTADO** |
| 5. Flash cria títulos a pagar | ❌ Não conforme | ✅ **IMPLEMENTADO** |
| 6. Título passa por aprovação | ✅ Implementado | ✅ **IMPLEMENTADO** |

---

## PRÓXIMOS PASSOS (OPCIONAL)

### Melhorias de Interface

1. **Mostrar status de aprovações na página**
   - Adicionar coluna mostrando quantos gestores aprovaram
   - Indicador visual de progresso
   - Lista de aprovadores pendentes

2. **Botão para enviar agrupado por centro de custo**
   - Adicionar botão na interface para selecionar múltiplos pagamentos
   - Chamar função `sendMultipleToFlashByCostCenter()`
   - Mostrar resultado do agrupamento

3. **Filtros adicionais**
   - Filtrar por centro de custo
   - Filtrar por classe financeira
   - Agrupar visualmente por centro de custo

---

## TESTES RECOMENDADOS

1. **Testar criação de pagamentos**
   - Gerar pagamentos mensais
   - Verificar se `cost_center_id` e `classe_financeira_id` são gravados

2. **Testar criação de aprovações**
   - Verificar se aprovações são criadas automaticamente
   - Verificar se gestor vê aprovações pendentes

3. **Testar envio para Flash**
   - Aprovar pagamento
   - Verificar se conta a pagar é criada com `centro_custo_id` e `classe_financeira`
   - Testar função de agrupamento por centro de custo

4. **Testar aprovação de conta a pagar**
   - Verificar se aprovações são criadas considerando centro de custo e classe financeira

---

## CONCLUSÃO

Todas as correções críticas foram implementadas:

1. ✅ **Criação automática de aprovações** - Implementado
2. ✅ **Centro de custo e classe financeira** - Implementado
3. ✅ **Agrupamento por centro de custo** - Implementado
4. ✅ **Preenchimento na conta a pagar** - Implementado

O sistema agora está **completo** para atender ao fluxo especificado pelo usuário.

**Próximo passo:** Executar a migração no banco de dados e testar o fluxo completo.
