# Análise: Horário corrigido aparecendo 3 horas antes

## Sintoma

Após aprovar uma **correção de ponto**, o sistema exibe os horários **3 horas antes** do que foi registrado na correção (ex.: correção para 08:01 aparece como 05:01). Afeta outros dias e outros usuários.

Exemplo reportado: funcionário **ALEXSANDRO BASTOS BARBOSA**, dia **28/01/2026** — horários exibidos (Entrada 05:01, Início Almoço 09:13, etc.) estavam 3h a menos do que o corrigido.

## Causa raiz

1. **Onde o bug ocorre**  
   Na função **`approve_attendance_correction`** (Supabase), ao gravar os eventos em `rh.time_record_events`:

   - O código usava:  
     `(v_entrada_date + v_correction.entrada_corrigida)::timestamptz`
   - Em PostgreSQL, `(date + time)::timestamptz` usa o **timezone da sessão** (no Supabase, em geral **UTC**).
   - Assim, o horário **local** informado (ex.: 08:01 em Brasil) era armazenado como **08:01 UTC**.

2. **Por que aparecia 3h a menos**  
   - Brasil (Bahia) = **America/Sao_Paulo** = UTC−3.
   - 08:01 UTC em São Paulo = **05:01**.
   - As funções que **leem** os eventos (ex.: `get_time_records_paginated`, `recalculate_time_record_hours`) fazem:  
     `(event_at AT TIME ZONE 'America/Sao_Paulo')::time`  
     e usam esse valor para exibir e para recalcular.
   - Como `event_at` estava errado (08:01 UTC), o resultado da conversão para America/Sao_Paulo era 05:01, e esse valor era o que aparecia na tela e em `time_records` após o recalculate.

3. **Papel do recalculate**  
   Logo após atualizar os eventos, a aprovação chama `recalculate_time_record_hours`, que **lê os horários dos eventos** (já em UTC errado) e **sobrescreve** as colunas de `time_records` (entrada, saida, etc.). Por isso o horário errado (05:01) ficava persistido também na tabela de registros.

## Solução aplicada

**Migração:** `20260204000003_fix_approve_correction_timezone_event_at.sql`

- Ao gravar `event_at`, passar a interpretar **(date + time) como horário local** em **America/Sao_Paulo** antes de converter para `timestamptz`:
  - **Antes:**  
    `(v_entrada_date + v_correction.entrada_corrigida)::timestamptz`
  - **Depois:**  
    `((v_entrada_date + v_correction.entrada_corrigida)::timestamp AT TIME ZONE 'America/Sao_Paulo')`

- Assim, 08:01 no dia 28/01 em America/Sao_Paulo vira o instante correto em UTC (ex.: 11:01 UTC) e, ao exibir ou recalcular com `AT TIME ZONE 'America/Sao_Paulo'`, volta a 08:01.

A mesma lógica foi aplicada para todos os eventos (entrada, saida, entrada_almoco, saida_almoco, entrada_extra1, saida_extra1).

## Verificação no banco (Supabase CLI)

Conectar com a URL do projeto e rodar:

```bash
supabase db execute --db-url "postgresql://postgres:SENHA@db.PROJECT.supabase.co:5432/postgres" -f scripts/verificar_event_at_timezone.sql
```

Ou executar direto no SQL Editor do Supabase o conteúdo de `scripts/verificar_event_at_timezone.sql` (ver abaixo).

## Regenerar registros já afetados (opcional)

Para registros **já corrigidos antes** da migração, os `event_at` continuam em UTC incorreto. Duas opções:

1. **Corrigir manualmente**  
   Reaprovar a correção (se ainda houver uma nova correção para o mesmo dia) após aplicar a migração; ou ajustar `event_at` manualmente com um script que use `(event_at AT TIME ZONE 'America/Sao_Paulo')::date + (event_at AT TIME ZONE 'America/Sao_Paulo')::time` e depois converta de volta com `AT TIME ZONE 'America/Sao_Paulo'` para obter o `timestamptz` correto (equivalente a “somar 3h” ao UTC quando o horário foi armazenado como “local em UTC”).

2. **Script de correção em lote**  
   Pode ser criado um script que:
   - identifica eventos com `source = 'manual'` cujo `(event_at AT TIME ZONE 'America/Sao_Paulo')::time` não bate com `time_records` (entrada/saida/etc.);
   - ou que, para um conjunto de `time_record_id`, recalcula `event_at` a partir de `time_records.entrada` (e demais campos) usando `(data_registro + entrada)::timestamp AT TIME ZONE 'America/Sao_Paulo'`.

---

## Backfill: corrigir registros já afetados (aplicado)

Foi criada a migração **`20260204000004_backfill_manual_events_add_3h_timezone.sql`**, que:

1. **Soma 3 horas** em `event_at` de todos os eventos com `source = 'manual'` em `rh.time_record_events`.
2. Para cada `time_record_id` que tinha evento manual, chama **`recalculate_time_record_hours`** e **`calculate_overtime_by_scale`** para atualizar `time_records` e horas extras.
3. **Só roda uma vez**: usa a tabela de controle `public._backfill_timezone_manual_events`; se já existir registro, o bloco não faz nada.

**Ordem de aplicação:**  
1) `20260204000003_fix_approve_correction_timezone_event_at.sql` (corrige aprovações novas)  
2) `20260204000004_backfill_manual_events_add_3h_timezone.sql` (corrige eventos manuais já gravados)

Assim, todos os funcionários que tiveram correção aprovada no passado passam a exibir o horário correto (com 3h a mais nos eventos e no recalculate).
