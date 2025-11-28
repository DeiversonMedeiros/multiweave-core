# Solução: Banco de Horas - Considerar Dias Sem Registro de Ponto

## Resumo da Solução

Foi implementada uma correção no sistema de banco de horas para considerar **dias sem registro de ponto** como débito no banco de horas, baseado no turno de trabalho configurado do funcionário.

## O Que Foi Implementado

### 1. Nova Função: `rh.calculate_missing_time_records_debit`

Esta função identifica dias que deveriam ter registro de ponto mas não têm:

- **Entrada**: `employee_id`, `company_id`, `period_start`, `period_end`
- **Processamento**:
  1. Busca o turno ativo do funcionário no período
  2. Identifica os dias da semana que deveriam ter registro (`dias_semana` do turno)
  3. Itera por cada dia do período
  4. Para cada dia que deveria ter registro:
     - Verifica se é feriado (exclui do cálculo)
     - Verifica se há registro de ponto
     - Se não há registro e não é feriado → adiciona débito de `horas_diarias` do turno
- **Saída**: Total de horas de débito (DECIMAL)

### 2. Função Auxiliar: `rh.is_holiday`

Verifica se uma data é feriado na empresa, para excluir do cálculo de dias faltantes.

### 3. Atualização: `rh.calculate_and_accumulate_bank_hours`

A função principal foi atualizada para:

1. **Chamar `calculate_missing_time_records_debit`** antes do cálculo normal
2. **Somar o débito de dias sem registro** ao débito total
3. **Criar transação separada** para débito de dias sem registro (para rastreabilidade)
4. **Considerar feriados** automaticamente (não são contados como faltantes)

## Como Funciona

### Exemplo Prático

**Cenário:**
- Funcionário tem turno Segunda-Sexta (5 dias), 8 horas/dia
- No mês de Janeiro (22 dias úteis):
  - Trabalhou 18 dias (registrou ponto)
  - Não registrou ponto em 4 dias úteis
  - Não há feriados

**Cálculo:**
1. Sistema identifica 4 dias sem registro
2. Calcula débito: 4 dias × 8 horas = **32 horas de débito**
3. Adiciona ao banco de horas como transação de ajuste
4. Se o funcionário tinha saldo positivo, desconta primeiro
5. Se ainda sobrar débito, fica como saldo negativo

### Transações Criadas

O sistema cria transações separadas para rastreabilidade:

1. **Transação de ajuste - Horas negativas dos registros existentes**
   - Quando o funcionário trabalhou menos horas que o turno em dias com registro

2. **Transação de ajuste - Dias sem registro de ponto**
   - Quando o funcionário não registrou ponto em dias que deveria trabalhar
   - Descrição inclui quantidade de dias faltantes

3. **Transação de acumulação**
   - Horas extras trabalhadas

4. **Transação de compensação**
   - Quando há compensação automática configurada

## Considerações Importantes

### ✅ O Que É Considerado

- **Dias da semana do turno**: Apenas dias configurados em `dias_semana` do turno
- **Período ativo do turno**: Considera `data_inicio` e `data_fim` do `employee_shifts`
- **Horas diárias do turno**: Usa `horas_diarias` do turno para calcular débito

### ❌ O Que NÃO É Considerado (Excluído)

- **Feriados**: Não são contados como dias faltantes
- **Fins de semana**: Apenas se não estiverem em `dias_semana` do turno
- **Dias fora do período do turno**: Antes de `data_inicio` ou depois de `data_fim`

### ⏳ Futuras Melhorias (Não Implementadas)

- **Férias**: Não são consideradas ainda (precisa verificar tabela de férias)
- **Licenças médicas**: Não são consideradas ainda (precisa verificar tabela de licenças)
- **Ausências justificadas**: Não são consideradas ainda (precisa criar tabela)

## Como Testar

### 1. Verificar Turno do Funcionário

```sql
SELECT 
  e.nome,
  ws.nome as turno,
  ws.dias_semana,
  ws.horas_diarias,
  es.data_inicio,
  es.data_fim
FROM rh.employees e
INNER JOIN rh.employee_shifts es ON es.funcionario_id = e.id
INNER JOIN rh.work_shifts ws ON ws.id = es.turno_id
WHERE e.id = 'SEU_EMPLOYEE_ID'
  AND es.ativo = true;
```

### 2. Verificar Registros de Ponto no Período

```sql
SELECT 
  data_registro,
  horas_trabalhadas,
  horas_extras,
  status
FROM rh.time_records
WHERE employee_id = 'SEU_EMPLOYEE_ID'
  AND data_registro BETWEEN '2025-01-01' AND '2025-01-31'
ORDER BY data_registro;
```

### 3. Calcular Débito de Dias Sem Registro

```sql
SELECT rh.calculate_missing_time_records_debit(
  'SEU_EMPLOYEE_ID',
  'SEU_COMPANY_ID',
  '2025-01-01',
  '2025-01-31'
) as total_debit_hours;
```

### 4. Executar Cálculo Completo do Banco de Horas

```sql
SELECT * FROM rh.calculate_and_accumulate_bank_hours(
  'SEU_EMPLOYEE_ID',
  'SEU_COMPANY_ID',
  '2025-01-01',
  '2025-01-31'
);
```

### 5. Verificar Transações Criadas

```sql
SELECT 
  transaction_type,
  transaction_date,
  hours_amount,
  description,
  is_automatic
FROM rh.bank_hours_transactions
WHERE employee_id = 'SEU_EMPLOYEE_ID'
  AND reference_period_start >= '2025-01-01'
  AND reference_period_end <= '2025-01-31'
ORDER BY transaction_date DESC;
```

## Arquivos Modificados

1. **`supabase/migrations/20250120000026_fix_bank_hours_missing_time_records.sql`**
   - Nova migração com todas as funções

2. **`ANALISE_BANCO_HORAS_DIAS_SEM_REGISTRO.md`**
   - Análise detalhada do problema

3. **`SOLUCAO_BANCO_HORAS_DIAS_SEM_REGISTRO.md`** (este arquivo)
   - Documentação da solução

## Próximos Passos Recomendados

1. **Testar em ambiente de desenvolvimento** com dados reais
2. **Considerar férias e licenças** em futuras versões
3. **Criar interface** para visualizar dias sem registro
4. **Adicionar notificações** quando há muitos dias sem registro
5. **Criar relatório** de dias faltantes por funcionário

## Observações

- A função considera apenas registros com `status = 'aprovado'` no cálculo de horas extras/devedoras
- O débito de dias sem registro é calculado independentemente do status dos registros existentes
- Feriados são automaticamente excluídos do cálculo
- Se o funcionário não tem turno configurado, não há débito (retorna 0)

