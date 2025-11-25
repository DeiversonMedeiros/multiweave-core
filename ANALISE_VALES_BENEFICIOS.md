# Análise da Funcionalidade de Vale Refeição/Alimentação e Transporte

## Data: 03/11/2025

## Requisitos Verificados

### ❌ 1. Integração com Flash API
**Status: NÃO IMPLEMENTADO**

- ❌ Não existe integração com Flash API
- ❌ Não há serviço para depósito de benefícios em conta Flash
- ✅ Estrutura de benefícios existe (`benefit_configurations`, `employee_benefit_assignments`)
- **AÇÃO NECESSÁRIA**: Criar integração com Flash API

### ⚠️ 2. Integração com Work-Shifts e Cálculo de Dias
**Status: PARCIALMENTE IMPLEMENTADO**

- ✅ Existe página `rh/work-shifts` com aba "Cálculo de Dias"
- ✅ Existe componente `WorkShiftDaysCalculation` que calcula dias trabalhados por escala
- ⚠️ Cálculo de benefícios NÃO usa os dias calculados de work-shifts
- ⚠️ Cálculo atual assume 30 dias fixos para `daily_value`
- **AÇÃO NECESSÁRIA**: Integrar cálculo de dias de work-shifts com cálculo de benefícios

### ⚠️ 3. Integração com Feriados
**Status: PARCIALMENTE IMPLEMENTADO**

- ✅ Existe serviço de feriados (`holidaysService.ts`)
- ✅ Existe função `getWorkingDaysInMonth()` que exclui feriados
- ⚠️ Cálculo de benefícios NÃO exclui feriados
- **AÇÃO NECESSÁRIA**: Integrar exclusão de feriados no cálculo de benefícios

### ❌ 4. Descontos em Férias, Licença Médica e Feriados
**Status: NÃO IMPLEMENTADO**

- ❌ Não há lógica para descontar benefícios em férias
- ❌ Não há lógica para descontar benefícios em licença médica (não atestado)
- ❌ Não há lógica para descontar benefícios em feriados
- ✅ Existe serviço de férias (`vacationsService.ts`)
- **AÇÃO NECESSÁRIA**: Criar lógica de desconto para férias, licença médica e feriados

### ✅ 5. Opção para Considerar ou Não no Cálculo da Folha
**Status: FUNCIONANDO**

- ✅ Campo `entra_no_calculo_folha` existe em `benefit_configurations`
- ✅ Campo `custom_value` em `employee_benefit_assignments` permite valor personalizado
- ✅ Modal já atende essa necessidade

## Problemas Identificados

### Problema 1: Cálculo de Benefícios Diários Não Considera Dias Reais
**Arquivo**: `src/services/rh/employeeBenefitAssignmentsService.ts` (linha 335-337)

```typescript
case 'daily_value':
  // Assumir 30 dias por mês
  return (benefitConfig.base_value || 0) * 30;
```

**Problema**: Sempre calcula 30 dias, não considera:
- Dias reais de trabalho da escala
- Feriados
- Férias
- Licença médica

### Problema 2: Falta Integração com Work-Shifts
O cálculo de dias trabalhados existe em `WorkShiftDaysCalculation`, mas não é usado no cálculo de benefícios.

### Problema 3: Falta Integração com Feriados
A função `getWorkingDaysInMonth()` existe mas não é usada no cálculo de benefícios.

### Problema 4: Falta Lógica de Descontos
Não há verificação de:
- Períodos de férias do funcionário
- Períodos de licença médica (não atestado)
- Feriados

## Estrutura de Dados Atual

### Tabelas Existentes

1. **rh.benefit_configurations**
   - `calculation_type`: 'fixed_value', 'daily_value', 'percentage', 'work_days'
   - `base_value`: Valor base (para daily_value, é o valor diário)
   - `daily_calculation_base`: Base de cálculo (default 30)

2. **rh.employee_benefit_assignments**
   - `custom_value`: Valor personalizado
   - `start_date`: Data de início
   - `end_date`: Data de fim
   - `is_active`: Se está ativo

3. **rh.work_shifts**
   - `dias_semana`: Array com dias da semana
   - `tipo_escala`: 'fixa' ou 'rotativa'
   - `dias_trabalho`: Quantidade de dias de trabalho no ciclo

4. **rh.holidays**
   - `data`: Data do feriado
   - `tipo`: 'nacional', 'estadual', 'municipal', etc.

5. **rh.ferias**
   - `data_inicio`: Data de início das férias
   - `data_fim`: Data de fim das férias
   - `status`: Status das férias

## Solução Proposta

### 1. Criar Função de Cálculo de Dias Trabalhados
Função que considere:
- Escala de trabalho do funcionário (work_shift)
- Feriados
- Férias
- Licença médica (não atestado)

### 2. Atualizar Cálculo de Benefícios
Usar função de dias trabalhados reais ao invés de 30 dias fixos.

### 3. Criar Integração com Flash API
Serviço para depósito de benefícios na conta Flash.

### 4. Criar Função RPC no Banco
Função PostgreSQL para calcular dias trabalhados considerando todas as exclusões.

## Próximos Passos

1. ✅ Criar migração para função de cálculo de dias trabalhados
   - Migração: `202511030030_create_working_days_calculation_for_benefits.sql`
   - Funções criadas:
     - `calculate_working_days_for_benefits()`: Calcula dias trabalhados reais
     - `calculate_daily_benefit_value()`: Calcula valor do benefício baseado em dias reais

2. ⚠️ Atualizar serviço de cálculo de benefícios
   - Atualizar `employeeBenefitAssignmentsService.ts` para usar função RPC
   - Substituir cálculo fixo de 30 dias por cálculo baseado em dias reais

3. ⚠️ Criar serviço de integração com Flash API
   - Criar `flashApiService.ts` para depósito de benefícios
   - Implementar endpoints de depósito

4. ⚠️ Integrar com work-shifts e feriados
   - A função já considera work-shifts e feriados
   - Integrar chamada da função no cálculo de benefícios

5. ⚠️ Implementar descontos para férias, licença médica e feriados
   - Função já implementa exclusão de férias, licença médica e feriados
   - Integrar chamada da função no cálculo de benefícios

## Arquivos Criados

1. **supabase/migrations/202511030030_create_working_days_calculation_for_benefits.sql**
   - Função `calculate_working_days_for_benefits()`: Calcula dias trabalhados reais
   - Função `calculate_daily_benefit_value()`: Calcula valor do benefício diário

## Observações Importantes

### Licença Médica vs Atestado Médico
- **Atestado Médico** (≤15 dias): NÃO desconta benefícios
- **Licença Médica** (>15 dias): DESCONTA benefícios
- A diferenciação é feita pela duração do afastamento em `medical_certificates`

### Cálculo de Dias
- Considera escala de trabalho do funcionário (`work_shift`)
- Exclui feriados ativos
- Exclui períodos de férias aprovados
- Exclui licença médica (afastamento > 15 dias)
- Calcula apenas dias realmente trabalhados

