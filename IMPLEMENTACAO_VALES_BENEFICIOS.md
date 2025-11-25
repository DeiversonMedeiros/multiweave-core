# Implementação de Vale Refeição/Alimentação e Transporte

## Data: 03/11/2025

## Resumo da Implementação

Foi implementada a funcionalidade completa de cálculo de vales (refeição/alimentação/transporte) considerando dias reais de trabalho, excluindo feriados, férias e licença médica.

## Arquivos Criados/Modificados

### 1. Migrações do Banco de Dados

#### `supabase/migrations/202511030030_create_working_days_calculation_for_benefits.sql`
- ✅ Função `calculate_working_days_for_benefits()`: Calcula dias trabalhados reais
  - Considera escala de trabalho do funcionário (`work_shift`)
  - Exclui feriados ativos
  - Exclui períodos de férias (status: 'aprovado', 'em_andamento', 'concluido')
  - Exclui licença médica (afastamento > 15 dias, não atestado simples)
- ✅ Função `calculate_daily_benefit_value()`: Calcula valor do benefício baseado em dias reais

#### `supabase/migrations/202511030040_update_payroll_benefits_calculation.sql`
- ✅ Atualiza função `get_employee_payroll_benefits()` para calcular benefícios diários com dias reais
- ✅ Atualiza função `calculate_payroll_benefits_total()` para usar cálculo de dias reais
- ✅ Adiciona parâmetros `month_param` e `year_param` para cálculo mensal

### 2. Serviços

#### `src/services/rh/benefitCalculationService.ts` (NOVO)
- Serviço completo para cálculos de benefícios com dias reais
- Funções:
  - `calculateWorkingDays()`: Calcula dias trabalhados reais
  - `calculateDailyBenefitValue()`: Calcula valor de benefício diário
  - `calculateWorkingDaysForMonth()`: Calcula dias trabalhados para um mês

#### `src/services/rh/employeeBenefitAssignmentsService.ts` (MODIFICADO)
- ✅ Função `calculateBenefitValue()` atualizada para:
  - Aceitar parâmetros `startDate` e `endDate`
  - Usar função RPC `calculate_daily_benefit_value()` quando disponível
  - Usar função RPC `calculate_working_days_for_benefits()` como fallback
  - Manter compatibilidade com cálculo antigo (30 dias) quando não houver datas

#### `src/services/rh/payrollService.ts` (MODIFICADO)
- ✅ Atualizado `processEmployeePayroll()` para:
  - Passar `month_param` e `year_param` para função RPC
  - Usar `calculated_value` retornado pela função RPC
  - Calcular datas do período de referência

## Funcionalidades Implementadas

### ✅ Cálculo de Dias Trabalhados Reais
- Considera escala de trabalho do funcionário (`work_shift`)
- Exclui feriados ativos da tabela `holidays`
- Exclui períodos de férias aprovadas (`vacations`)
- Exclui licença médica (afastamento > 15 dias)
- **NÃO** desconta atestado médico simples (≤15 dias)

### ✅ Cálculo de Benefícios Diários
- Valor diário × dias trabalhados reais
- Integrado na folha de pagamento
- Considera período do mês de referência

### ✅ Integração com Work-Shifts
- Usa escala de trabalho do funcionário
- Calcula apenas dias de trabalho da escala
- Suporta escalas fixas e rotativas

### ✅ Integração com Feriados
- Exclui automaticamente feriados ativos
- Considera apenas feriados da empresa

### ✅ Descontos Automáticos
- Férias: desconta automaticamente
- Licença médica (>15 dias): desconta automaticamente
- Feriados: desconta automaticamente
- Atestado médico (≤15 dias): **NÃO** desconta

### ✅ Opção para Considerar ou Não na Folha
- Campo `entra_no_calculo_folha` em `benefit_configurations`
- Modal já permite configurar

## Como Funciona

### Fluxo de Cálculo

1. **Processamento da Folha**
   - Sistema busca benefícios do funcionário via `get_employee_payroll_benefits()`
   - Passa mês e ano de referência
   - Função RPC calcula valores baseados em dias reais

2. **Cálculo de Dias Trabalhados**
   - Busca escala do funcionário (`work_shift_id`)
   - Itera sobre cada dia do período
   - Verifica se é dia de trabalho (baseado na escala)
   - Exclui feriados, férias e licença médica
   - Retorna total de dias trabalhados

3. **Cálculo de Valor do Benefício**
   - Para `daily_value`: `valor_diario × dias_trabalhados_reais`
   - Para `work_days`: `valor_base × dias_trabalhados_reais`
   - Para `fixed_value`: usa valor fixo
   - Para `percentage`: calcula percentual do salário

## Exemplo de Cálculo

### Cenário
- Funcionário tem escala Segunda-Sexta (5 dias por semana)
- Valor diário de Vale Refeição: R$ 25,00
- Mês: Novembro/2025 (30 dias)
- Feriados: 1 dia (15/11 - Proclamação da República)
- Férias: 5 dias (10/11 a 14/11)

### Cálculo
1. **Dias do mês**: 30 dias
2. **Dias de trabalho da escala**: Aproximadamente 22 dias (30 dias - 8 fins de semana)
3. **Excluir feriado**: -1 dia = 21 dias
4. **Excluir férias**: -5 dias = 16 dias
5. **Total dias trabalhados**: 16 dias
6. **Valor do benefício**: R$ 25,00 × 16 = R$ 400,00

### Antes da Implementação
- Valor do benefício: R$ 25,00 × 30 = R$ 750,00 ❌

### Depois da Implementação
- Valor do benefício: R$ 25,00 × 16 = R$ 400,00 ✅

## Funções RPC Criadas

### `calculate_working_days_for_benefits(company_id, employee_id, start_date, end_date)`
- Retorna: `INTEGER` (número de dias trabalhados)
- Considera: escala, feriados, férias, licença médica

### `calculate_daily_benefit_value(company_id, employee_id, benefit_config_id, start_date, end_date)`
- Retorna: `DECIMAL(10,2)` (valor total do benefício)
- Calcula: valor diário × dias trabalhados reais

### `get_employee_payroll_benefits(company_id, employee_id, month, year)` (ATUALIZADA)
- Retorna: Tabela com benefícios e `calculated_value`
- Calcula automaticamente valores baseados em dias reais

## Próximos Passos (Pendentes)

1. ⚠️ **Criar Integração com Flash API**
   - Criar serviço `flashApiService.ts`
   - Implementar depósito de benefícios na conta Flash
   - Endpoint para enviar valores calculados

2. ⚠️ **Integrar com Página Work-Shifts**
   - Mostrar cálculo de dias trabalhados na aba "Cálculo de Dias"
   - Exibir valor de benefícios calculado para cada escala

3. ⚠️ **Integrar com Página de Feriados**
   - Mostrar impacto dos feriados no cálculo de benefícios
   - Permitir visualizar dias trabalhados considerando feriados

## Testes Recomendados

1. ✅ Testar cálculo com funcionário sem escala (deve usar padrão Segunda-Sexta)
2. ✅ Testar cálculo com funcionário em férias
3. ✅ Testar cálculo com feriado no período
4. ✅ Testar cálculo com licença médica (>15 dias)
5. ✅ Testar cálculo com atestado médico (≤15 dias) - NÃO deve descontar
6. ✅ Testar cálculo com escala rotativa
7. ✅ Testar processamento de folha com benefícios diários

## Observações Importantes

### Diferença entre Atestado e Licença Médica
- **Atestado Médico** (≤15 dias): NÃO desconta benefícios
- **Licença Médica** (>15 dias): DESCONTA benefícios
- A diferenciação é feita pela duração do afastamento em `medical_certificates`

### Compatibilidade
- Código mantém compatibilidade com cálculo antigo (30 dias) quando não há datas
- Se a função RPC falhar, usa fallback para 30 dias
- Funcionários sem escala usam padrão Segunda-Sexta

