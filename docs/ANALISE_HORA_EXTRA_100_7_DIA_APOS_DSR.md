# Análise: Hora extra 100% no 7º dia após DSR (escalas flexíveis)

## Problema

Na aba "Resumo por Funcionário" (rh/time-records), para funcionário em escala flexível 6x1 da ESTRATEGIC, o dia **11/01/2026** (7º dia após o DSR de 04/01) não recebia hora extra 100%; aparecia apenas "+0h20" como extra 50%.

## Causa raiz

1. **Tipo de escala não era flexivel_6x1 no fallback (bug)**  
   Quando o funcionário **não** tem registro em `rh.employee_shifts` e só tem `employees.work_shift_id`, a função `rh.get_employee_work_shift_type` consultava apenas `employee_shifts` e, sem resultado, retornava sempre **'fixa'**. Com isso, `calculate_overtime_by_scale` nunca entrava no bloco `flexivel_6x1` e caía no ramo “fixa”: em dia que não é domingo, o excedente ia só para extras 50% (+0h20).  
   **Correção:** migração `20260228000003`: `get_employee_work_shift_type` passou a usar `employees.work_shift_id` → `work_shifts.tipo_escala` quando não houver `employee_shift`.

2. **DSR virtual**  
   A regra de "quebrar o ciclo" quando o dia é DSR pela **natureza do dia** (alterada na interface) já estava coberta pela função `rh.is_virtual_dsr` e pelo uso dela em `calculate_overtime_by_scale`.

3. **Dia com 0h quebrava a sequência (bug)**  
   Na contagem de "dias consecutivos de trabalho" antes da data do registro, o código quebrava a sequência quando o dia tinha **horas_trabalhadas = 0**:
   - Ex.: 05/01 com 0h00 → a sequência era interrompida.
   - Só eram contados 10, 09, 08, 07, 06 (5 dias).
   - Para 11/01 ser 7º dia, precisamos de 6 dias consecutivos antes (05 a 10).
   - Com a quebra em 05, 11/01 não atingia 6 dias e não recebia 100%.

## Regras de negócio (escala flexível)

1. **Dia com registro de ponto = dia normal**  
   Se existir registro em `time_records` para a data, o dia conta como trabalhado; a folga da escala não quebra o ciclo nesse dia.

2. **Extra 100%** apenas em feriado ou no **7º dia consecutivo de trabalho** (apenas o 7º dia; o 8º já é dia normal do novo ciclo).

3. **DSR (banco ou virtual) quebra o ciclo** e inicia novo ciclo.

4. **Override virtual** (natureza do dia alterada na tela) sobrepõe qualquer outra regra, **exceto** dia normal que tem registro de ponto.

Na contagem de dias consecutivos para o 7º dia:
- **Primeiro** verifica DSR virtual (override ou `natureza_dia = 'dsr'`) → se sim, quebra.
- **Se há** registro em `time_records` para o dia → conta como dia trabalhado (não consulta `is_rest_day`).
- **Se não há** registro → aí usa folga da escala (`is_rest_day`) para quebrar, ou "sem registro" para quebrar.

## Correções aplicadas

### 1. Migração `20260228000001` (já existia)

- Função `rh.is_virtual_dsr(employee_id, company_id, data)`:
  - Retorna `true` se o dia for DSR por:
    - `time_records.natureza_dia = 'dsr'`, ou
    - `time_record_day_nature_override.natureza_dia = 'dsr'`.
- Em `calculate_overtime_by_scale` (flexivel_6x1), o ciclo passa a ser quebrado também quando `is_virtual_dsr(...)` é verdadeiro.

### 2. Migração `20260228000002` (nova)

- Em `calculate_overtime_by_scale`, no bloco `flexivel_6x1`:
  - **Antes:** `IF NOT FOUND OR COALESCE(v_trabalhadas_antes, 0) = 0 THEN EXIT;`
  - **Depois:** `IF NOT FOUND THEN EXIT;`
- Assim, dia com registro e 0h passa a ser contado como dia do ciclo; a quebra ocorre só em rest day, DSR virtual ou ausência de registro.

### 3. Migração `20260228000003` (tipo de escala no fallback)

- **Função `rh.get_employee_work_shift_type`:**
  - Se não houver linha em `employee_shifts` para a data, passa a buscar `tipo_escala` em `employees.work_shift_id` → `work_shifts`.
  - Assim, funcionários apenas com turno em `employees` (sem `employee_shifts`) passam a ter `flexivel_6x1` corretamente e o 7º dia recebe 100%.

### 4. Migração `20260228000005` (SECURITY DEFINER + regra "dia com registro = normal")

- No mesmo arquivo da primeira migração, ordem no loop: (1) DSR virtual quebra; (2) se há registro no dia, conta como trabalhado; (3) se não há registro, folga da escala ou sem registro quebra. SECURITY DEFINER enxerga todos os time_records (contagem por “dias do ciclo”, sem exigir horas > 0).

## Natureza do dia e frontend

- **Com registro:** ao alterar "Natureza do dia" para DSR, o frontend grava em `time_records.natureza_dia`.
- **Sem registro (dia virtual):** grava em `time_record_day_nature_override`.
- `is_virtual_dsr` considera as duas fontes; não foi necessário alterar o frontend.

## Diagnóstico e logs

- **Função:** `SELECT * FROM rh.diagnose_overtime_7th_day(employee_id, company_id, '2026-01-11'::date);`  
  Retorna etapa a etapa: tipo_escala, excedente, contagem dia a dia e motivo de parada (is_rest_day, is_virtual_dsr, sem registro).

- **Logs no recálculo:** ao chamar `rh.calculate_overtime_by_scale(time_record_id)`, o backend emite NOTICEs com prefixo `[OVERTIME_7TH]`:  
  `employee_id`, `data`, `tipo_escala`, `excedente`, `consecutive_work_days`, `exit_reason`, e se aplicou 100% ou não.

- **Script:** `scripts/diagnostico_overtime_7th_day.sql` (listar registros 11/01, rodar diagnóstico e recálculo de um registro).

**Causa comum de "não aplicou 100%":** `exit_reason=sem_registro em YYYY-MM-DD` — não existe linha em `rh.time_records` para aquele dia. O cálculo exige 6 dias consecutivos **com** registro; se um dia não tem registro (ex.: só existe na UI como “virtual”), a contagem para e o 7º dia não recebe 100%. É necessário que 05 a 10 tenham registro em `time_records` (batidas ou registro criado).

## O que garantir para 11/01 ter 100%

1. **04/01 como DSR persistido**
   - Se 04/01 tem registro: definir Natureza do dia = DSR e salvar (atualiza `time_records.natureza_dia`).
   - Se 04/01 não tem registro: definir DSR no dropdown; o frontend grava em `time_record_day_nature_override`.

2. **Registros de 05 a 10 em `rh.time_records`**
   - Cada um dos 6 dias antes de 11/01 precisa ter uma linha em `time_records` (mesmo com 0h). Se algum dia só aparece na UI como “virtual” e não foi salvo, a contagem quebra e 11/01 não recebe 100%.

3. **Recálculo**
   - Após alterar natureza do dia ou após aplicar as migrações, rodar o recálculo do mês (ex.: `scripts/recalcular_overtime_apos_dsr_virtual.sql` para jan/2026 ESTRATEGIC).

## Script de recálculo

- `scripts/recalcular_overtime_apos_dsr_virtual.sql`: recalcula `horas_extras_50` e `horas_extras_100` para um período (ajustar `v_company_id`, `v_data_inicio`, `v_data_fim` no script).

## Resumo

- **Problema:** 7º dia (11/01) não recebia 100% porque 05/01 com 0h quebrava a contagem.
- **Solução:** contar “dias do ciclo” (presença de registro), não “dias com horas > 0”; quebrar apenas em rest day, DSR virtual ou ausência de registro.
- **Arquivos:**  
  - `supabase/migrations/20260228000001_flexible_scale_overtime_100_consider_virtual_dsr.sql`  
  - `supabase/migrations/20260228000002_flexible_scale_7th_day_count_zero_hours.sql`  
  - `supabase/migrations/20260228000003_get_employee_work_shift_type_fallback_employees.sql`  
  - `supabase/migrations/20260228000004_overtime_7th_day_diagnostic_and_logs.sql` (diagnóstico + NOTICEs [OVERTIME_7TH])
