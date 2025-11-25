# IMPLEMENTAÇÃO: SISTEMA DE ALUGUEL DE EQUIPAMENTOS E VEÍCULOS

## Data: 2025-11-04

## RESUMO DA IMPLEMENTAÇÃO

Foi implementado o sistema completo de pagamentos mensais de aluguel de equipamentos e veículos, integrando com o sistema de aprovações existente.

---

## ✅ FUNCIONALIDADES IMPLEMENTADAS

### 1. Correção do Hook de Aprovação
- ✅ Corrigido `useEquipmentRentals` para usar RPC functions corretamente
- ✅ Aprovação/rejeição de aluguéis funcionando via RPC

### 2. Banco de Dados
- ✅ Criada tabela `rh.equipment_rental_monthly_payments`
  - Campos para período, valores, descontos
  - Status de pagamento (pendente_aprovacao, aprovado, rejeitado, enviado_flash, etc.)
  - Integração com Flash e Contas a Pagar (campos preparados)
  
- ✅ Funções RPC criadas:
  - `calculate_equipment_rental_monthly_value()` - Calcula valor mensal com descontos
  - `process_monthly_equipment_rentals()` - Processa pagamentos mensais
  - `approve_monthly_equipment_rental_payment()` - Aprova pagamento mensal
  - `reject_monthly_equipment_rental_payment()` - Rejeita pagamento mensal

### 3. Serviços e Hooks
- ✅ Criado `equipmentRentalMonthlyPaymentsService.ts`
  - Lista pagamentos mensais
  - Processa pagamentos mensais
  - Aprova/rejeita pagamentos
  - Calcula valores mensais

- ✅ Criado `useEquipmentRentalMonthlyPayments.ts`
  - Hooks React Query para todas as operações
  - Cache automático e invalidação

### 4. Interface para RH
- ✅ Criada página `EquipmentRentalMonthlyPaymentsPage.tsx`
  - Gerar pagamentos mensais para um período
  - Filtrar por mês/ano/status
  - Visualizar pagamentos com descontos calculados
  - Mostrar dias trabalhados e ausências
  - Preparado para integração Flash

### 5. Interface de Aprovação Mensal (Portal do Gestor)
- ✅ Integrada na página `AprovacaoEquipamentos.tsx`
  - Sistema de Tabs: Solicitações de Aluguel | Pagamentos Mensais
  - Filtros por mês/ano
  - Lista de pagamentos pendentes de aprovação
  - Aprovação com valor customizado (opcional)
  - Rejeição com motivo obrigatório
  - Mostra detalhes: funcionário, equipamento, dias trabalhados, descontos

### 6. Cálculo Automático de Descontos
- ✅ Integrado com função `calculate_working_days_for_benefits()`
  - Desconta férias automaticamente
  - Desconta licença médica (>15 dias)
  - **NÃO** desconta atestado médico simples (≤15 dias)
  - Considera escala de trabalho do funcionário
  - Exclui feriados

---

## 📁 ARQUIVOS CRIADOS/MODIFICADOS

### Migrações
- `supabase/migrations/20251104000000_create_equipment_rental_monthly_payments.sql`

### Serviços
- `src/services/rh/equipmentRentalMonthlyPaymentsService.ts`

### Hooks
- `src/hooks/rh/useEquipmentRentalMonthlyPayments.ts`

### Páginas
- `src/pages/rh/EquipmentRentalMonthlyPaymentsPage.tsx`
- `src/pages/portal-gestor/AprovacaoEquipamentos.tsx` (modificada)

### Rotas
- `src/pages/rh/routesNew.tsx` (adicionada rota)

---

## 🔄 FLUXO IMPLEMENTADO

### 1. Geração de Pagamentos Mensais (RH)
```
RH → Seleciona mês/ano → Clica "Gerar Pagamentos"
→ Sistema processa todos os aluguéis ativos
→ Calcula descontos automaticamente (férias, licença médica)
→ Cria registros com status "pendente_aprovacao"
```

### 2. Aprovação Mensal (Gestor)
```
Gestor → Aba "Pagamentos Mensais" → Seleciona período
→ Visualiza pagamentos pendentes
→ Pode aprovar valor calculado ou informar valor customizado
→ Aprova → Status muda para "aprovado"
```

### 3. Rejeição (Gestor)
```
Gestor → Rejeita pagamento → Informa motivo obrigatório
→ Status muda para "rejeitado"
```

---

## ⚠️ PRÓXIMOS PASSOS (NÃO IMPLEMENTADOS)

### Integração Flash API
- [ ] Criar serviço `flashApiService.ts`
- [ ] Implementar depósito na conta Flash do funcionário
- [ ] Geração de boleto via API Flash
- [ ] Atualizar status para "enviado_flash" e "boleto_gerado"

### Integração Contas a Pagar
- [ ] Criar função para gerar conta a pagar a partir de pagamento aprovado
- [ ] Vincular boleto Flash com conta a pagar
- [ ] Atualizar status para "enviado_contas_pagar"

### Interface de Conferência (RH)
- [ ] Página para RH conferir aprovações
- [ ] Enviar pagamentos aprovados para Flash
- [ ] Visualizar status de envio

### Fluxo de Pagamento Final
- [ ] Integração com sistema de pagamento
- [ ] Atualizar status para "pago"

---

## 📊 STATUS ATUAL DOS REQUISITOS

| Requisito | Status | Observação |
|-----------|--------|------------|
| 1. Empresa pode alugar equipamento/veículo | ✅ **OK** | Já existia |
| 2. Valor depositado em conta Flash | ⚠️ **PARCIAL** | Estrutura pronta, falta integração |
| 3. Valor pago mensalmente | ✅ **OK** | Sistema implementado |
| 4. Gestor aprova mensalmente | ✅ **OK** | Interface implementada |
| 5. Desconto férias/licença médica | ✅ **OK** | Cálculo automático |
| 6. Opção considerar na folha | ✅ **OK** | Já existia |
| 7. Fluxo completo de pagamento | ⚠️ **PARCIAL** | Faltam integrações Flash e Contas a Pagar |

---

## 🎯 COMO USAR

### Para RH - Gerar Pagamentos Mensais
1. Acesse: `RH → Pagamentos Mensais de Aluguéis`
2. Selecione o mês e ano
3. Clique em "Gerar Pagamentos"
4. Sistema processa automaticamente todos os aluguéis ativos

### Para Gestor - Aprovar Pagamentos Mensais
1. Acesse: `Portal do Gestor → Aprovação de Equipamentos`
2. Aba "Pagamentos Mensais"
3. Selecione o período (mês/ano)
4. Visualize pagamentos pendentes
5. Clique em "Aprovar" ou "Rejeitar"
6. Se aprovar, pode ajustar o valor (opcional)

---

## 📝 NOTAS TÉCNICAS

- A função `calculate_equipment_rental_monthly_value()` usa `calculate_working_days_for_benefits()` existente
- Descontos são calculados proporcionalmente: `(valor_base / total_dias) * dias_ausencia`
- Valores são arredondados para 2 casas decimais
- Sistema previne duplicação de pagamentos (UNIQUE constraint)

---

## ✅ CONCLUSÃO

O sistema de pagamentos mensais está **funcional** para:
- ✅ Geração de pagamentos mensais
- ✅ Cálculo automático de descontos
- ✅ Aprovação/rejeição mensal pelo gestor

**Faltam integrações externas:**
- ⚠️ Flash API (quando disponível)
- ⚠️ Contas a Pagar (estrutura pronta, precisa integração)

**Estimativa para completar:** 1-2 semanas (depende de documentação da API Flash)

