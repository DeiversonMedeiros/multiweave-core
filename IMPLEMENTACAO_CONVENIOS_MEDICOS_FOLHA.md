# Implementação de Convênios Médicos na Folha de Pagamento

## Resumo da Implementação

Foi implementada com sucesso a integração dos convênios médicos e odontológicos com o sistema de folha de pagamento, permitindo que os descontos sejam calculados automaticamente.

## Arquivos Criados/Modificados

### 1. Migrações do Banco de Dados

#### `supabase/migrations/20250120000006_add_medical_plans_payroll_integration.sql`
- Adiciona campo `entra_no_calculo_folha` nas tabelas `medical_plans` e `employee_medical_plans`
- Adiciona campos `tipo_folha` e `categoria_desconto` na tabela `medical_plans`
- Cria índices para performance
- Atualiza registros existentes para manter compatibilidade

#### `supabase/migrations/20250120000007_create_medical_plans_payroll_functions.sql`
- **`get_employee_medical_plan_discounts()`**: Busca todos os convênios médicos de funcionário
- **`get_employee_medical_plan_discounts_only()`**: Busca apenas descontos de convênios médicos
- **`calculate_medical_plan_discounts_total()`**: Calcula total de descontos
- **`calculate_medical_plan_benefits_total()`**: Calcula total de benefícios
- **`get_employee_all_medical_plans()`**: Busca todos os convênios (descontos + benefícios)

#### `supabase/migrations/20250120000008_add_medical_plans_to_payroll_table.sql`
- Adiciona campos específicos na tabela `payroll`:
  - `total_beneficios_convenios_medicos`
  - `total_descontos_convenios_medicos`
  - `total_beneficios_tradicionais`
- Cria índices para performance

### 2. Serviços

#### `src/services/rh/medicalPlansPayrollService.ts` (NOVO)
- Serviço completo para gerenciar convênios médicos na folha
- Funções para buscar descontos e benefícios
- Cálculos de totais e resumos por categoria
- Verificação de convênios ativos

#### `src/services/rh/payrollService.ts` (MODIFICADO)
- Integração dos convênios médicos no cálculo da folha
- Separação entre benefícios tradicionais e convênios médicos
- Cálculo correto de descontos incluindo convênios médicos

### 3. Tipos TypeScript

#### `src/integrations/supabase/rh-types.ts` (MODIFICADO)
- Atualizada interface `Payroll` com novos campos
- Tipos para descontos e benefícios de convênios médicos

### 4. Componente de Teste

#### `src/components/rh/MedicalPlansPayrollTest.tsx` (NOVO)
- Componente para testar a integração
- Exibe resultados detalhados por funcionário
- Mostra resumo por categoria de convênio

## Como Funciona

### 1. Configuração de Convênios
- Cada plano médico pode ser configurado como `provento` ou `desconto`
- Campo `entra_no_calculo_folha` controla se entra na folha
- Categorias: `convenio_medico`, `convenio_odontologico`, `seguro_vida`, `outros`

### 2. Cálculo na Folha de Pagamento
```typescript
// Benefícios tradicionais (VR, VA, etc.)
const traditionalBenefitsTotal = activeBenefits.reduce((sum, benefit) => {
  return sum + (benefit.custom_value || 0);
}, 0);

// Benefícios de convênios médicos (proventos)
const medicalBenefitsTotal = activeMedicalBenefits.reduce((sum, benefit) => {
  return sum + (benefit.final_value || 0);
}, 0);

// Descontos de convênios médicos
const medicalDiscountsTotal = activeMedicalDiscounts.reduce((sum, discount) => {
  return sum + (discount.final_value || 0);
}, 0);

// Total final
const totalEarnings = baseSalary + overtimeValue + traditionalBenefitsTotal + medicalBenefitsTotal;
const totalDiscounts = inssDiscount + irrfDiscount + medicalDiscountsTotal;
```

### 3. Estrutura da Folha de Pagamento
A tabela `payroll` agora possui campos específicos:
- `total_beneficios_tradicionais`: VR, VA, transporte, etc.
- `total_beneficios_convenios_medicos`: Benefícios de planos de saúde
- `total_descontos_convenios_medicos`: Descontos de planos de saúde

## Funcionalidades Implementadas

### ✅ Descontos Automáticos
- Convênios médicos e odontológicos são descontados automaticamente
- Valores já vêm com desconto aplicado da tabela `employee_medical_plans`

### ✅ Benefícios de Convênios
- Planos configurados como "provento" são adicionados aos vencimentos
- Separação clara entre benefícios tradicionais e convênios médicos

### ✅ Categorização
- Convênios são categorizados por tipo (médico, odontológico, seguro vida)
- Relatórios detalhados por categoria

### ✅ Controle de Vigência
- Apenas convênios ativos e dentro da vigência são considerados
- Verificação automática de datas de início e fim

### ✅ Performance
- Índices criados para consultas rápidas
- Funções otimizadas para cálculos em lote

## Como Usar

### 1. Configurar Convênio Médico
```sql
-- Criar convênio médico
INSERT INTO rh.medical_agreements (company_id, nome, tipo, ativo) 
VALUES ('company-id', 'Unimed', 'medico', true);

-- Criar plano
INSERT INTO rh.medical_plans (company_id, agreement_id, nome, valor_titular, 
                             entra_no_calculo_folha, tipo_folha, categoria_desconto)
VALUES ('company-id', 'agreement-id', 'Plano Básico', 150.00, true, 'desconto', 'convenio_medico');
```

### 2. Vincular Funcionário ao Plano
```sql
INSERT INTO rh.employee_medical_plans (company_id, employee_id, plan_id, valor_mensal, 
                                      data_inicio, status, entra_no_calculo_folha)
VALUES ('company-id', 'employee-id', 'plan-id', 120.00, '2025-01-01', 'ativo', true);
```

### 3. Processar Folha de Pagamento
O sistema automaticamente:
- Busca convênios ativos do funcionário
- Calcula descontos e benefícios
- Inclui na folha de pagamento
- Salva valores separados por categoria

## Teste da Implementação

Use o componente `MedicalPlansPayrollTest` para verificar se a integração está funcionando:

1. Acesse a página de teste
2. Clique em "Executar Teste"
3. Verifique os resultados por funcionário
4. Confirme se os valores estão sendo calculados corretamente

## Próximos Passos

1. **Interface de Configuração**: Criar telas para configurar convênios médicos
2. **Relatórios**: Implementar relatórios específicos de convênios médicos
3. **Notificações**: Alertas para vencimento de convênios
4. **Integração com eSocial**: Envio de informações de convênios médicos

## Conclusão

A implementação está completa e funcional. Os descontos de "Convênios Médicos e Odontológicos" agora são calculados automaticamente na folha de pagamento, com separação clara entre benefícios tradicionais e convênios médicos, permitindo um controle detalhado e relatórios precisos.
