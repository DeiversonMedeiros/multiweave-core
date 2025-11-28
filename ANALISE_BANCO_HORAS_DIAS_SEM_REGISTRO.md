# Análise: Banco de Horas - Dias Sem Registro de Ponto

## Problema Identificado

O sistema atual de banco de horas **não considera dias sem registro de ponto** no cálculo. Isso significa que:

1. ✅ Se o funcionário trabalhou mais horas que o turno → horas extras são contabilizadas (crédito)
2. ✅ Se o funcionário trabalhou menos horas que o turno (em um dia com registro) → horas negativas são contabilizadas (débito)
3. ❌ **Se o funcionário não registrou ponto em um dia que deveria trabalhar → NADA é contabilizado**

### Como o Sistema Funciona Atualmente

1. **Função `recalculate_time_record_hours`**: 
   - Só funciona quando há um registro de ponto (`time_record`) existente
   - Calcula horas extras/devedoras comparando horas trabalhadas vs `horas_diarias` do turno
   - Se não há registro, não há cálculo

2. **Função `calculate_and_accumulate_bank_hours`**:
   - Soma apenas horas de registros existentes na tabela `time_records` com status 'aprovado'
   - Linha 89-94: `SELECT COALESCE(SUM(horas_extras), 0) FROM rh.time_records WHERE ...`
   - Se não há registro para um dia, esse dia não é considerado

### Estrutura de Dados

**Tabela `rh.work_shifts`**:
- `dias_semana`: Array com dias da semana (1=Segunda, 2=Terça, etc.)
- `horas_diarias`: Quantidade de horas que devem ser trabalhadas por dia

**Tabela `rh.employee_shifts`**:
- `funcionario_id`: ID do funcionário
- `turno_id`: ID do turno de trabalho
- `data_inicio`: Data de início do turno
- `data_fim`: Data de fim do turno (NULL se ainda ativo)
- `ativo`: Se o turno está ativo

**Tabela `rh.time_records`**:
- `employee_id`: ID do funcionário
- `data_registro`: Data do registro
- `horas_trabalhadas`: Horas trabalhadas no dia
- `horas_extras`: Horas extras (positivo) ou devedoras (negativo)

## Solução Proposta

Criar uma função que:

1. **Identifica dias esperados de trabalho**:
   - Baseado no turno do funcionário (`employee_shifts` → `work_shifts`)
   - Considera `dias_semana` do turno
   - Considera período ativo do turno (`data_inicio` até `data_fim` ou NULL)

2. **Compara com dias registrados**:
   - Busca todos os registros de ponto no período
   - Identifica dias que deveriam ter registro mas não têm

3. **Calcula horas negativas para dias faltantes**:
   - Para cada dia sem registro que deveria ter sido trabalhado:
     - Calcula horas negativas = `horas_diarias` do turno
     - Cria débito no banco de horas

4. **Integra com função existente**:
   - Atualiza `calculate_and_accumulate_bank_hours` para chamar a nova função
   - Considera feriados e ausências justificadas (futuro)

## Implementação

### Nova Função: `calculate_missing_time_records_debit`

Esta função será chamada antes do cálculo normal do banco de horas e identificará dias faltantes.

### Atualização: `calculate_and_accumulate_bank_hours`

A função será atualizada para:
1. Chamar `calculate_missing_time_records_debit` primeiro
2. Depois calcular horas extras/devedoras dos registros existentes
3. Somar tudo no saldo final

## Considerações

- **Feriados**: Não devem ser considerados como dias faltantes
- **Férias**: Não devem ser considerados como dias faltantes  
- **Licenças médicas**: Não devem ser considerados como dias faltantes
- **Ausências justificadas**: Podem ser configuradas no futuro

## Próximos Passos

1. ✅ Criar função `calculate_missing_time_records_debit`
2. ✅ Atualizar `calculate_and_accumulate_bank_hours`
3. ✅ Testar com dados reais
4. ⏳ Considerar feriados e ausências justificadas (futuro)

