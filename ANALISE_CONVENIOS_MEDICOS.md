# Análise da Funcionalidade de Convênios Médicos

## Data: 03/11/2025

## Requisitos Verificados

### ✅ 1. Adesão aos Convênios Médicos e Odontológicos
**Status: FUNCIONANDO CORRETAMENTE**

- ✅ Sistema permite adesão de funcionários (titulares) aos convênios médicos e odontológicos
- ✅ Sistema permite adicionar dependentes aos planos de convênios
- ✅ Estrutura de dados completa:
  - Tabela `rh.medical_agreements`: Convênios disponíveis (médico, odontológico, ambos)
  - Tabela `rh.medical_plans`: Planos oferecidos por cada convênio
  - Tabela `rh.employee_medical_plans`: Adesões dos funcionários (titulares)
  - Tabela `rh.employee_plan_dependents`: Dependentes dos funcionários nos planos

### ✅ 2. Valores Diferentes para Titular e Dependentes
**Status: FUNCIONANDO CORRETAMENTE**

- ✅ Tabela `rh.medical_plans` possui campos separados:
  - `valor_titular`: Valor do plano para o funcionário titular
  - `valor_dependente`: Valor do plano para cada dependente
  - `valor_familia`: Valor para família (se aplicável)
- ✅ Tabela `rh.employee_plan_dependents` armazena `valor_mensal` individual de cada dependente
- ✅ Sistema permite configurar valores diferentes para titular e cada dependente

### ❌ 3. Valores no Cálculo da Folha de Pagamento
**Status: PROBLEMA IDENTIFICADO E CORRIGIDO**

**Problema Encontrado:**
- As funções `calculate_medical_plan_discounts_total()` e `calculate_medical_plan_benefits_total()` estavam somando **apenas** os valores do titular (`employee_medical_plans.valor_mensal`)
- Os valores dos dependentes (`employee_plan_dependents.valor_mensal`) **não estavam sendo incluídos** no cálculo da folha

**Correção Aplicada:**
- ✅ Criada migração `202511030020_fix_medical_plans_dependents_payroll_calculation.sql`
- ✅ Funções atualizadas para incluir:
  - Valores do titular (funcionário)
  - Valores dos dependentes ativos
  - Verificação de status e vigência para ambos

**Arquivos Modificados:**
- `supabase/migrations/202511030020_fix_medical_plans_dependents_payroll_calculation.sql` (NOVO)

## Estrutura de Dados

### Tabelas Principais

1. **rh.medical_agreements**
   - Convênios médicos e odontológicos disponíveis
   - Tipos: 'medico', 'odontologico', 'ambos'

2. **rh.medical_plans**
   - Planos oferecidos por cada convênio
   - Campos de valores: `valor_titular`, `valor_dependente`, `valor_familia`
   - Campo `entra_no_calculo_folha`: Controla se entra na folha
   - Campo `tipo_folha`: 'provento' ou 'desconto'
   - Campo `categoria_desconto`: 'convenio_medico', 'convenio_odontologico', 'seguro_vida', 'outros'

3. **rh.employee_medical_plans**
   - Adesões dos funcionários aos planos
   - Campo `valor_mensal`: Valor do titular (já com desconto aplicado)
   - Campo `entra_no_calculo_folha`: Controla se entra na folha
   - Status: 'ativo', 'suspenso', 'cancelado', 'transferido'

4. **rh.employee_plan_dependents**
   - Dependentes dos funcionários nos planos
   - Campo `valor_mensal`: Valor individual de cada dependente
   - Status: 'ativo', 'suspenso', 'cancelado'
   - Parentesco: 'conjuge', 'filho', 'filha', 'pai', 'mae', 'outros'

## Funções de Cálculo da Folha

### Funções Corrigidas

1. **calculate_medical_plan_discounts_total()**
   - Agora soma: `titular.valor_mensal + SUM(dependentes.valor_mensal)`
   - Considera apenas dependentes ativos e dentro da vigência

2. **calculate_medical_plan_benefits_total()**
   - Agora soma: `titular.valor_mensal + SUM(dependentes.valor_mensal)`
   - Considera apenas dependentes ativos e dentro da vigência

### Funções Auxiliares

- `get_employee_medical_plan_discounts()`: Lista todos os convênios
- `get_employee_medical_plan_discounts_only()`: Lista apenas descontos
- `get_employee_all_medical_plans()`: Lista todos (descontos + benefícios)

## Como Funciona Agora

### Fluxo de Cálculo da Folha

1. **Busca Adesões do Funcionário**
   - Busca em `rh.employee_medical_plans` onde `employee_id = X` e `status = 'ativo'`
   - Filtra por `entra_no_calculo_folha = true` e `tipo_folha = 'desconto'` ou `'provento'`

2. **Soma Valores do Titular**
   - Soma `valor_mensal` de todas as adesões ativas do funcionário

3. **Busca Dependentes do Funcionário**
   - Busca em `rh.employee_plan_dependents` através de `employee_plan_id`
   - Filtra por `status = 'ativo'` e dentro da vigência

4. **Soma Valores dos Dependentes**
   - Soma `valor_mensal` de todos os dependentes ativos

5. **Total Final**
   - Total = Valores do Titular + Valores dos Dependentes

## Próximos Passos

1. ✅ Executar migração `202511030020_fix_medical_plans_dependents_payroll_calculation.sql`
2. ⚠️ Testar cálculo da folha com funcionários que têm dependentes
3. ⚠️ Verificar se os valores dos dependentes aparecem corretamente na folha
4. ⚠️ Validar que os totais estão corretos

## Exemplo de Cálculo

### Cenário
- Funcionário tem 1 plano médico ativo:
  - Valor do titular: R$ 150,00
  - 2 dependentes ativos:
    - Dependente 1: R$ 80,00
    - Dependente 2: R$ 80,00

### Cálculo Antes da Correção
- Total descontos: R$ 150,00 (apenas titular) ❌

### Cálculo Depois da Correção
- Total descontos: R$ 150,00 + R$ 80,00 + R$ 80,00 = R$ 310,00 ✅

## Observações

- Os valores dos dependentes são armazenados individualmente em `employee_plan_dependents`
- Cada dependente pode ter um valor diferente
- O sistema verifica status e vigência antes de incluir no cálculo
- Apenas dependentes com `status = 'ativo'` e dentro da vigência são considerados

