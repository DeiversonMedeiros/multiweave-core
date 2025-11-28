# Análise: Sistema de Banco de Horas CLT Completo

## Estrutura Atual do Banco de Dados

### Tabelas Existentes

1. **`rh.work_shifts`** - Turnos de trabalho
   - Campos: `tipo_escala`, `dias_semana`, `horas_diarias`, `dias_trabalho`, `dias_folga`, `ciclo_dias`
   - Tipos de escala suportados: `fixa`, `flexivel_6x1`, `flexivel_5x2`, `escala_12x36`

2. **`rh.time_records`** - Registros de ponto
   - Campos: `horas_trabalhadas`, `horas_extras`, `horas_faltas`
   - **FALTA**: Campo para percentual de hora extra (50% ou 100%)
   - **FALTA**: Campo para indicar se horas extras vão para banco ou pagamento direto

3. **`rh.bank_hours_config`** - Configuração do banco de horas
   - Campo `expires_after_months` existe (padrão 12)
   - **PRECISA**: Alterar padrão para 6 meses

4. **`rh.bank_hours_balance`** - Saldo do banco de horas
   - Campos existentes são suficientes

5. **`rh.bank_hours_transactions`** - Transações do banco
   - **FALTA**: Campo para indicar se é hora extra 50% ou 100%
   - **FALTA**: Campo para data de expiração da transação

6. **`rh.holidays`** - Feriados
   - Estrutura completa com campos de localização

## Modificações Necessárias

### 1. Adicionar Campos em `time_records`

```sql
ALTER TABLE rh.time_records ADD COLUMN IF NOT EXISTS horas_extras_50 DECIMAL(4,2) DEFAULT 0;
ALTER TABLE rh.time_records ADD COLUMN IF NOT EXISTS horas_extras_100 DECIMAL(4,2) DEFAULT 0;
ALTER TABLE rh.time_records ADD COLUMN IF NOT EXISTS horas_para_banco DECIMAL(4,2) DEFAULT 0;
ALTER TABLE rh.time_records ADD COLUMN IF NOT EXISTS horas_para_pagamento DECIMAL(4,2) DEFAULT 0;
ALTER TABLE rh.time_records ADD COLUMN IF NOT EXISTS is_feriado BOOLEAN DEFAULT false;
ALTER TABLE rh.time_records ADD COLUMN IF NOT EXISTS is_domingo BOOLEAN DEFAULT false;
ALTER TABLE rh.time_records ADD COLUMN IF NOT EXISTS is_dia_folga BOOLEAN DEFAULT false;
```

### 2. Adicionar Campos em `bank_hours_transactions`

```sql
ALTER TABLE rh.bank_hours_transactions ADD COLUMN IF NOT EXISTS overtime_percentage INTEGER DEFAULT 50;
ALTER TABLE rh.bank_hours_transactions ADD COLUMN IF NOT EXISTS expires_at DATE;
ALTER TABLE rh.bank_hours_transactions ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;
```

### 3. Atualizar `bank_hours_config`

```sql
ALTER TABLE rh.bank_hours_config ALTER COLUMN expires_after_months SET DEFAULT 6;
```

## Regras de Negócio por Escala

### Escala 5x2 (Administrativo)

**Características:**
- Trabalha Segunda a Sexta
- Folga Sábado e Domingo
- Jornada: 8h48/dia (44h semanais) OU 8h/dia (40h)

**Regras:**
1. Sábado trabalhado → Horas vão para banco (50%)
2. Domingo trabalhado → Horas são pagas (100%), NÃO vão para banco
3. Feriado trabalhado → Horas são pagas (100%), NÃO vão para banco
4. Feriado sem registro → Não gera débito

### Escala 6x1 (Técnicos de Telecom)

**Características:**
- Trabalha 6 dias, folga 1 dia
- Folga pode ser em qualquer dia da semana

**Regras:**
1. Trabalho no dia de folga semanal → Horas são pagas (100%), NÃO vão para banco
2. Trabalho em feriado → Horas são pagas (100%), NÃO vão para banco
3. Horas extras normais → Vão para banco (50%)
4. Feriado sem registro → Não gera débito

### Escala 12x36 (Vigilantes, Plantonistas)

**Características:**
- Trabalha 12h, folga 36h
- Não acumula horas + ou - por dia
- Só existe excedente se romper 12h

**Regras:**
1. Até 12h trabalhadas = normal (sem banco)
2. Após 12h → Hora extra 50% (vai para banco)
3. Feriado trabalhado → Pagar 100% (CLT), NÃO vai para banco
4. Feriado não trabalhado → Não gera hora negativa

## Fluxo de Processamento

### Processamento Diário

1. Para cada registro de ponto aprovado:
   - Identificar tipo de escala do funcionário
   - Verificar se é feriado ou domingo
   - Calcular horas extras conforme regras da escala
   - Separar horas 50% (banco) de horas 100% (pagamento)
   - Atualizar campos em `time_records`

### Processamento Semanal

1. Consolidar horas do banco da semana
2. Verificar limites de acumulação
3. Criar transações de acumulação

### Processamento Mensal

1. Calcular saldo do mês
2. Verificar dias sem registro (conforme migração anterior)
3. Aplicar débitos de dias faltantes
4. Gerar relatório mensal

### Processamento Semestral (Fechamento)

1. Identificar transações com mais de 6 meses
2. Separar saldo positivo (pagar) de saldo negativo (zerar)
3. Criar eventos financeiros:
   - Horas extras 50% a pagar
   - Horas extras 100% a pagar
4. Zerar banco e iniciar novo ciclo
5. Criar registro de fechamento

## Funções Necessárias

1. `calculate_overtime_by_scale()` - Calcula horas extras por tipo de escala
2. `separate_overtime_for_bank_and_payment()` - Separa horas 50% e 100%
3. `process_daily_bank_hours()` - Processamento diário
4. `process_weekly_bank_hours()` - Processamento semanal
5. `process_monthly_bank_hours()` - Processamento mensal
6. `process_semester_bank_hours_closure()` - Fechamento semestral
7. `check_holiday_and_sunday()` - Verifica feriado e domingo
8. `calculate_12x36_overtime()` - Cálculo especial para escala 12x36

## Tabelas Adicionais Necessárias

1. **`rh.bank_hours_closure`** - Registro de fechamentos semestrais
   - Campos: `employee_id`, `company_id`, `closure_date`, `period_start`, `period_end`, `positive_balance_paid`, `negative_balance_zeroed`, `status`

2. **`rh.payroll_overtime_events`** - Eventos financeiros de horas extras
   - Campos: `employee_id`, `company_id`, `payroll_period`, `hours_50_amount`, `hours_100_amount`, `total_value`, `status`

## Considerações Importantes

1. **Validade de 6 meses**: Todas as transações devem ter `expires_at` = data da transação + 6 meses
2. **Saldo negativo no fechamento**: Deve ser zerado, não descontado
3. **Horas 100% nunca vão para banco**: Sempre são pagas diretamente
4. **Feriado sem registro**: Não gera débito no banco
5. **Domingo em escala 5x2**: Sempre 100%, não vai para banco
6. **Dia de folga em escala 6x1**: Sempre 100%, não vai para banco

