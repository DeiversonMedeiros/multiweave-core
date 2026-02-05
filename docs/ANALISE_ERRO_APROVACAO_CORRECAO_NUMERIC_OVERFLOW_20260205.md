# Análise: Erro 400 ao aprovar correção de ponto (numeric field overflow)

**Data:** 2026-02-05  
**Página:** portal-gestor/aprovacoes/correcoes-ponto  
**Usuário:** clevison.nascimento  
**Funcionário da correção:** MARCIO ANJOS SILVA  
**Data do registro:** 26/01/2026  
**Correção ID:** `79c1f6d7-6b54-474a-9506-d971347b8cb4`

## Erro

- **HTTP:** 400 Bad Request  
- **RPC:** `approve_attendance_correction`  
- **Código PostgreSQL:** 22003  
- **Mensagem:** `numeric field overflow`  
- **Detalhe:** `A field with precision 4, scale 2 must round to an absolute value less than 10^2.`

## Causa raiz

1. Ao aprovar a correção, a função `approve_attendance_correction`:
   - Atualiza eventos em `rh.time_record_events`
   - Chama `rh.recalculate_time_record_hours(v_time_record_id)`
   - Chama `rh.calculate_overtime_by_scale(v_time_record_id)`

2. Em `recalculate_time_record_hours` (migração 20260203000001), as horas são limitadas ao intervalo NUMERIC(4,2) **antes do UPDATE** (ex.: `horas_trabalhadas` em [-99.99, 99.99]). Ou seja, o valor gravado em `time_records.horas_trabalhadas` pode ser -99.99 quando o cálculo “real” seria bem mais negativo (ex.: -150).

3. Em `calculate_overtime_by_scale`, a variável **`v_excedente`** era **DECIMAL(4,2)**. O código faz:
   ```sql
   v_excedente := v_horas_trabalhadas - v_horas_diarias;
   ```
   Quando `horas_trabalhadas` foi limitada a -99.99 e `horas_diarias` = 8:
   - `v_excedente = -99.99 - 8 = -107.99`
   - -107.99 não cabe em DECIMAL(4,2) (máximo em módulo 99.99) → **overflow na atribuição**.

4. Além disso, no ramo `ELSIF v_excedente < 0`:
   - `v_horas_negativas := ROUND(ABS(v_excedente), 2)` poderia atribuir 107.99 a uma variável DECIMAL(4,2), gerando overflow também. Por isso a correção também limita esse valor ao atribuir.

## Solução aplicada

**Migração:** `20260205000003_fix_calculate_overtime_excedente_overflow.sql`

- **`v_excedente`** passou de DECIMAL(4,2) para **NUMERIC(10,2)**, para suportar o resultado intermediário da subtração (ex.: -107.99) sem estourar.
- No ramo `v_excedente < 0`, **v_horas_negativas** passa a ser atribuída já limitada:  
  `v_horas_negativas := LEAST(99.99, ROUND(ABS(v_excedente), 2))`, evitando overflow em DECIMAL(4,2).
- Nos ramos com `v_excedente > 0`, as atribuições a variáveis DECIMAL(4,2) usam **LEAST(99.99, v_excedente)** (ou equivalente) quando o excedente pode ser &gt; 99.99, mantendo consistência e segurança.

## Como aplicar no banco

Rodar a migração no projeto (Supabase CLI linkado ao mesmo DB):

```bash
supabase db push
```

Ou executar manualmente o conteúdo de:

`supabase/migrations/20260205000003_fix_calculate_overtime_excedente_overflow.sql`

no SQL Editor do Supabase (Dashboard) ou via `psql`.

## Validação

Após aplicar a migração:

1. Usuário **clevison.nascimento** deve conseguir aprovar a correção do funcionário **MARCIO ANJOS SILVA** da data **26/01/2026** (correção `79c1f6d7-6b54-474a-9506-d971347b8cb4`) sem erro 400.
2. Outras aprovações de correção que dependam de `recalculate` + `calculate_overtime_by_scale` com horas muito negativas ou excedente &gt; 99.99 devem seguir funcionando sem “numeric field overflow”.
