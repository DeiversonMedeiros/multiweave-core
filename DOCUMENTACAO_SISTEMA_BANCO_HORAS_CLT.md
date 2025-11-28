# Documentação: Sistema de Banco de Horas CLT Completo

## Visão Geral

Sistema completo de banco de horas conforme regras CLT, implementando:
- 3 tipos de escala (5x2, 6x1, 12x36)
- Horas extras com percentuais (50% e 100%)
- Validade de 6 meses
- Fechamento semestral automático
- Tratamento correto de feriados e domingos

## Estrutura de Dados

### Campos Adicionados em `rh.time_records`

- `horas_extras_50`: Horas extras com adicional de 50%
- `horas_extras_100`: Horas extras com adicional de 100%
- `horas_para_banco`: Horas que vão para o banco (apenas 50%)
- `horas_para_pagamento`: Horas que devem ser pagas diretamente (100%)
- `is_feriado`: Indica se o dia é feriado
- `is_domingo`: Indica se o dia é domingo
- `is_dia_folga`: Indica se é dia de folga do funcionário

### Campos Adicionados em `rh.bank_hours_transactions`

- `overtime_percentage`: Percentual da hora extra (50 ou 100)
- `expires_at`: Data de expiração (6 meses após criação)
- `is_paid`: Indica se as horas foram pagas no fechamento
- `closure_id`: ID do fechamento semestral

### Novas Tabelas

1. **`rh.bank_hours_closure`**: Registro de fechamentos semestrais
2. **`rh.payroll_overtime_events`**: Eventos financeiros de horas extras para folha

## Regras por Tipo de Escala

### Escala 5x2 (Administrativo)

**Características:**
- Trabalha Segunda a Sexta
- Folga Sábado e Domingo
- Jornada: 8h48/dia (44h semanais) OU 8h/dia (40h)

**Regras de Horas Extras:**
- ✅ **Sábado trabalhado** → Horas vão para banco (50%)
- ✅ **Domingo trabalhado** → Horas são pagas (100%), **NÃO** vão para banco
- ✅ **Feriado trabalhado** → Horas são pagas (100%), **NÃO** vão para banco
- ✅ **Feriado sem registro** → Não gera débito

**Exemplo:**
```
Funcionário trabalha 8h no sábado:
- horas_extras_50 = 8h
- horas_para_banco = 8h
- horas_para_pagamento = 0h

Funcionário trabalha 8h no domingo:
- horas_extras_100 = 8h
- horas_para_banco = 0h
- horas_para_pagamento = 8h
```

### Escala 6x1 (Técnicos de Telecom)

**Características:**
- Trabalha 6 dias, folga 1 dia
- Folga pode ser em qualquer dia da semana

**Regras de Horas Extras:**
- ✅ **Trabalho no dia de folga semanal** → Horas são pagas (100%), **NÃO** vão para banco
- ✅ **Trabalho em feriado** → Horas são pagas (100%), **NÃO** vão para banco
- ✅ **Horas extras normais** → Vão para banco (50%)
- ✅ **Feriado sem registro** → Não gera débito

**Exemplo:**
```
Funcionário tem folga na quarta-feira, mas trabalha 8h:
- horas_extras_100 = 8h
- horas_para_banco = 0h
- horas_para_pagamento = 8h

Funcionário trabalha 10h em um dia normal (8h esperadas):
- horas_extras_50 = 2h
- horas_para_banco = 2h
- horas_para_pagamento = 0h
```

### Escala 12x36 (Vigilantes, Plantonistas)

**Características:**
- Trabalha 12h, folga 36h
- Não acumula horas + ou - por dia
- Só existe excedente se romper 12h

**Regras de Horas Extras:**
- ✅ **Até 12h trabalhadas** = normal (sem banco)
- ✅ **Após 12h** → Hora extra 50% (vai para banco)
- ✅ **Feriado trabalhado** → Pagar 100% (CLT), **NÃO** vai para banco
- ✅ **Feriado não trabalhado** → Não gera hora negativa

**Exemplo:**
```
Funcionário trabalha 14h em um dia normal:
- horas_trabalhadas = 14h
- horas_extras_50 = 2h (14h - 12h)
- horas_para_banco = 2h
- horas_para_pagamento = 0h

Funcionário trabalha 12h em um feriado:
- horas_trabalhadas = 12h
- horas_extras_100 = 12h (todo o trabalho em feriado)
- horas_para_banco = 0h
- horas_para_pagamento = 12h
```

## Funções Principais

### 1. `rh.calculate_overtime_by_scale(p_time_record_id)`

Calcula horas extras conforme tipo de escala e regras CLT.

**Uso:**
```sql
SELECT rh.calculate_overtime_by_scale('time_record_id');
```

**O que faz:**
- Identifica tipo de escala do funcionário
- Verifica se é feriado, domingo ou dia de folga
- Calcula horas extras conforme regras
- Separa horas 50% (banco) de horas 100% (pagamento)
- Atualiza campos em `time_records`

### 2. `rh.process_daily_bank_hours(employee_id, company_id, date)`

Processa banco de horas diário para um funcionário.

**Uso:**
```sql
SELECT rh.process_daily_bank_hours('employee_id', 'company_id', '2025-01-15');
```

**O que faz:**
- Busca registro de ponto aprovado do dia
- Verifica se há horas para banco (50%)
- Cria transação de acumulação
- Atualiza saldo do banco
- Define data de expiração (6 meses)

### 3. `rh.process_weekly_bank_hours(company_id, week_start_date)`

Processa banco de horas semanal para toda a empresa.

**Uso:**
```sql
SELECT * FROM rh.process_weekly_bank_hours('company_id', '2025-01-13');
```

**Retorna:**
- `employees_processed`: Número de funcionários processados
- `total_hours_accumulated`: Total de horas acumuladas na semana

### 4. `rh.process_monthly_bank_hours(company_id, month_year)`

Processa banco de horas mensal incluindo débitos de dias sem registro.

**Uso:**
```sql
SELECT * FROM rh.process_monthly_bank_hours('company_id', '2025-01');
```

**Retorna:**
- `employees_processed`: Número de funcionários processados
- `total_hours_accumulated`: Total de horas acumuladas
- `total_hours_debit`: Total de horas de débito

### 5. `rh.process_semester_bank_hours_closure(employee_id, company_id, closure_date)`

Processa fechamento semestral do banco de horas para um funcionário.

**Uso:**
```sql
SELECT rh.process_semester_bank_hours_closure('employee_id', 'company_id', '2025-06-30');
```

**O que faz:**
- Identifica transações expiradas (6 meses)
- Separa saldo positivo (pagar) de saldo negativo (zerar)
- Cria evento financeiro para horas extras
- Marca transações como pagas
- Zera banco e inicia novo ciclo

**Retorna:** ID do fechamento criado

### 6. `rh.process_company_semester_closure(company_id, closure_date)`

Processa fechamento semestral para toda a empresa.

**Uso:**
```sql
SELECT * FROM rh.process_company_semester_closure('company_id', '2025-06-30');
```

**Retorna:**
- `employees_processed`: Número de funcionários processados
- `closures_created`: Número de fechamentos criados
- `total_hours_50_paid`: Total de horas 50% a pagar
- `total_hours_100_paid`: Total de horas 100% a pagar

## Fluxo de Processamento

### Processamento Automático

**Trigger:** Quando um registro de ponto é aprovado:
1. Calcula horas extras por escala (`calculate_overtime_by_scale`)
2. Processa banco de horas diário (`process_daily_bank_hours`)

### Processamento Manual

**Semanal:**
```sql
SELECT * FROM rh.process_weekly_bank_hours('company_id', '2025-01-13');
```

**Mensal:**
```sql
SELECT * FROM rh.process_monthly_bank_hours('company_id', '2025-01');
```

**Semestral (Fechamento):**
```sql
SELECT * FROM rh.process_company_semester_closure('company_id', '2025-06-30');
```

## Regras Importantes

### ✅ Validade de 6 Meses

- Todas as transações têm `expires_at` = data da transação + 6 meses
- No fechamento semestral, transações expiradas são pagas

### ✅ Saldo Negativo no Fechamento

- **Saldo positivo**: Pago em folha como horas extras
- **Saldo negativo**: Zerado (não descontado), conforme prática comum de RH

### ✅ Horas 100% Nunca Vão para Banco

- Sempre são pagas diretamente
- Não são acumuladas no banco de horas
- Geram evento financeiro imediato

### ✅ Feriado Sem Registro

- Não gera débito no banco de horas
- Não conta como dia faltante

### ✅ Domingo em Escala 5x2

- Sempre 100%, não vai para banco
- Deve ser pago diretamente

### ✅ Dia de Folga em Escala 6x1

- Sempre 100%, não vai para banco
- Deve ser pago diretamente

## Consultas Úteis

### Verificar Horas Extras de um Funcionário

```sql
SELECT 
  data_registro,
  horas_trabalhadas,
  horas_extras_50,
  horas_extras_100,
  horas_para_banco,
  horas_para_pagamento,
  is_feriado,
  is_domingo,
  is_dia_folga
FROM rh.time_records
WHERE employee_id = 'employee_id'
  AND status = 'aprovado'
ORDER BY data_registro DESC;
```

### Verificar Saldo do Banco de Horas

```sql
SELECT 
  current_balance,
  accumulated_hours,
  compensated_hours,
  last_calculation_date
FROM rh.bank_hours_balance
WHERE employee_id = 'employee_id'
  AND company_id = 'company_id';
```

### Verificar Transações do Banco

```sql
SELECT 
  transaction_date,
  transaction_type,
  hours_amount,
  overtime_percentage,
  expires_at,
  is_paid,
  description
FROM rh.bank_hours_transactions
WHERE employee_id = 'employee_id'
  AND company_id = 'company_id'
ORDER BY transaction_date DESC;
```

### Verificar Fechamentos Semestrais

```sql
SELECT 
  closure_date,
  period_start,
  period_end,
  positive_balance_paid,
  negative_balance_zeroed,
  total_hours_50_paid,
  total_hours_100_paid,
  status
FROM rh.bank_hours_closure
WHERE employee_id = 'employee_id'
  AND company_id = 'company_id'
ORDER BY closure_date DESC;
```

### Verificar Eventos Financeiros para Folha

```sql
SELECT 
  payroll_period,
  event_date,
  hours_50_amount,
  hours_100_amount,
  total_value,
  status
FROM rh.payroll_overtime_events
WHERE employee_id = 'employee_id'
  AND company_id = 'company_id'
ORDER BY event_date DESC;
```

## Testes Recomendados

1. **Feriado sem ponto**: Verificar que não gera débito
2. **Feriado trabalhado**: Verificar que horas são 100% e não vão para banco
3. **Domingo trabalhado (5x2)**: Verificar que horas são 100% e não vão para banco
4. **Dia de folga trabalhado (6x1)**: Verificar que horas são 100% e não vão para banco
5. **Troca de escala**: Verificar que cálculo muda conforme nova escala
6. **Fechamento de 6 meses**: Verificar que saldo positivo é pago e negativo é zerado

## Próximos Passos

1. ✅ Criar interface para visualizar fechamentos semestrais
2. ✅ Criar relatório de horas extras por funcionário
3. ✅ Integrar eventos financeiros com folha de pagamento
4. ✅ Criar notificações para fechamento semestral
5. ✅ Adicionar validações de limites de acumulação

