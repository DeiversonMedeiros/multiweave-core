# Correção: Extras 50% acima da janela de tempo e registro incompleto

## Problema

1. **Registro incompleto gerando +99h59 de Extras 50%**  
   Ex.: ALEXSANDRO SANTOS em 29/01/2026 com apenas **Entrada** (04:57) e **Início almoço** (17:43), sem Saída nem Fim almoço, aparecia com **Extras 50%: +99h59**.  
   A função `recalculate_time_record_hours` podia usar `saida`/`saida_almoco`/`entrada_extra1`/`saida_extra1` **gravados na tabela** (valores antigos ou incorretos) quando **não existia evento** correspondente, gerando cálculo de horas trabalhadas errado e, em seguida, excedente absurdo (limitado a 99,99 pela função de overflow).

2. **Extras sem limite da janela de tempo**  
   A empresa tem janela de tempo (ex.: 15h) para marcações. As horas extras **não eram limitadas** por essa janela; o excedente era todo convertido em 50%/100%, podendo exibir até 99h59 mesmo com janela de 15h.

3. **Alcance**  
   Havia **157 registros** com `horas_extras_50 > 15` no banco; o problema afetava várias empresas.

## Causa raiz

- Em `recalculate_time_record_hours`: quando faltava evento de saida, o código fazia `SELECT entrada, saida, ... INTO ... FROM time_records` e usava esse `saida` no bloco `ELSE` para calcular `v_horas_trabalhadas` com `calculate_work_hours(v_entrada, v_saida, ...)`. Se a tabela tivesse um `saida` incorreto (de outro dia ou de bug anterior), o resultado podia ser dezenas de horas e, depois do limite 99,99, virar “99h59” em Extras 50%.
- Em `calculate_overtime_by_scale`: o excedente (`horas_trabalhadas - horas_diarias`) era todo convertido em 50%/100% **sem** considerar o teto da `janela_tempo_marcacoes` da empresa.

## Solução implementada

### 1. Migration `20260210000002_fix_overtime_cap_janela_and_incomplete_marks.sql`

**Em `recalculate_time_record_hours`:**

- Inicializar `v_horas_trabalhadas := 0` no `DECLARE`, para registro incompleto não herdar valor indefinido.
- Depois de carregar `entrada, saida, ...` da tabela, **anular** os campos que não têm evento:
  - se não existe evento de **saída** → `v_saida := NULL`
  - se não existe evento de **saída_almoco** → `v_saida_almoco := NULL`
  - se não existe evento de **extra_inicio** → `v_entrada_extra1 := NULL`
  - se não existe evento de **extra_fim** → `v_saida_extra1 := NULL`
- Com isso, o cálculo de horas trabalhadas **nunca** usa saida/almoco/extra só da tabela quando falta o evento; registro só com entrada (e eventualmente início almoço) fica com 0 horas trabalhadas e sem extras indevidas.

**Em `calculate_overtime_by_scale`:**

- Ler `janela_tempo_marcacoes` da empresa em `rh.time_record_settings` (padrão 24 se não houver).
- Calcular `v_excedente_limitado := LEAST(v_excedente, v_janela_horas)`.
- Usar **sempre** `v_excedente_limitado` (e não `v_excedente`) para definir `horas_extras_50` e `horas_extras_100`, de modo que as extras não ultrapassem a janela (ex.: 15h).

### 2. Script de recálculo

O script `scripts/recalculate_overtime_after_janela_cap.sql` recalcula todos os registros que:

- têm `horas_extras_50 > 15`, ou  
- têm `horas_trabalhadas > 24`, ou  
- têm entrada preenchida, saida nula e `horas_extras_50 > 0`.

Assim, os registros já existentes passam a respeitar a nova lógica (eventos reais + teto da janela).

## Como aplicar

1. Aplicar a migration no banco (Supabase ou `supabase db push` / seu fluxo de migrações).
2. (Recomendado) Executar o script de recálculo no mesmo banco:
   ```bash
   psql "<connection_string>" -f scripts/recalculate_overtime_after_janela_cap.sql
   ```
   Ou executar o corpo do script (o `DO $$ ... $$`) no SQL Editor do Supabase.

## Verificação

- Para o caso do anexo (ALEXSANDRO SANTOS, 29/01/2026): após a migration e o recálculo, o registro deve ficar com **horas_trabalhadas = 0**, **horas_extras_50 = 0** e **horas_negativas** conforme a regra de faltas (ex.: 8h se for dia de ponto obrigatório e não houver saída).
- Para qualquer empresa com janela de 15h, **Extras 50%** (e 100%) não devem ultrapassar 15h por dia.

## Referências

- Ajuste de janela de tempo: `supabase/migrations/20260106000003_add_12h_15h_to_time_record_settings.sql`
- Análise de entrada extra na janela: `ANALISE_PROBLEMA_ENTRADA_EXTRA_JANELA_TEMPO.md`
