# Análise: Horas Noturnas, Negativas, Extras 50% e 100% - Novembro/2025

## Problema Identificado

As horas noturnas não estão sendo calculadas corretamente para o funcionário VITOR ALVES DA COSTA NETO (Matrícula: 03027) no mês de novembro/2025.

## Análise do Código

### 1. Função `calculate_night_hours`

A função `rh.calculate_night_hours` está implementada corretamente e calcula horas trabalhadas no período noturno (22h às 5h do dia seguinte).

**Localização**: `supabase/migrations/20251230000001_fix_horas_calculation_complete_vitor.sql` (linhas 19-72)

**Lógica**:
- Calcula interseção entre período trabalhado e período noturno
- Retorna 0 se não há entrada/saída ou se não há interseção

### 2. Função `recalculate_time_record_hours`

Esta função é chamada automaticamente quando há eventos de ponto e deve calcular as horas noturnas.

**Localização**: `supabase/migrations/20251230000001_fix_horas_calculation_complete_vitor.sql` (linha 491)

**Problema Potencial**: 
- A função calcula `horas_noturnas` na linha 491
- Atualiza o campo na linha 570
- Mas depois chama `calculate_overtime_by_scale` que também atualiza `horas_noturnas` (linha 315)

### 3. Função `calculate_overtime_by_scale`

Esta função também calcula e atualiza `horas_noturnas`.

**Localização**: `supabase/migrations/20251230000001_fix_horas_calculation_complete_vitor.sql` (linhas 224 e 315)

**Observação**: A função calcula `horas_noturnas` na linha 224 e atualiza na linha 315, mas **só se houver entrada e saída válidas**.

## Possíveis Causas

1. **Registros não foram recalculados após correções**: Se você fez correções nas tabelas de registro e correção de ponto em novembro/2025, os registros podem não ter sido recalculados automaticamente.

2. **Função `calculate_overtime_by_scale` não está sendo chamada**: Se `recalculate_time_record_hours` não está chamando `calculate_overtime_by_scale` corretamente, as horas noturnas podem não ser atualizadas.

3. **Entrada/Saída NULL ou inválida**: A função `calculate_night_hours` retorna 0 se entrada ou saída forem NULL.

4. **Horários não estão no período noturno**: Se os horários de entrada/saída não cruzam o período noturno (22h-5h), as horas noturnas serão 0.

## Verificações Necessárias

### 1. Verificar se registros foram recalculados

```sql
-- Verificar quando os registros foram atualizados pela última vez
SELECT 
  tr.id,
  tr.data_registro,
  tr.entrada,
  tr.saida,
  tr.horas_noturnas,
  tr.updated_at,
  rh.calculate_night_hours(tr.entrada, tr.saida, tr.data_registro) as horas_noturnas_esperadas
FROM rh.time_records tr
INNER JOIN rh.employees e ON e.id = tr.employee_id
WHERE e.matricula = '03027'
  AND tr.data_registro >= '2025-11-01'
  AND tr.data_registro <= '2025-11-30'
ORDER BY tr.data_registro DESC;
```

### 2. Verificar se há horários noturnos

```sql
-- Verificar registros que deveriam ter horas noturnas
SELECT 
  tr.id,
  tr.data_registro,
  tr.entrada,
  tr.saida,
  tr.horas_noturnas,
  CASE 
    WHEN tr.entrada < '05:00:00' THEN 'Entrada antes das 5h'
    WHEN tr.saida > '22:00:00' THEN 'Saída depois das 22h'
    WHEN tr.entrada >= '22:00:00' AND tr.saida <= '05:00:00' THEN 'Trabalho totalmente noturno'
    ELSE 'Sem período noturno'
  END as motivo
FROM rh.time_records tr
INNER JOIN rh.employees e ON e.id = tr.employee_id
WHERE e.matricula = '03027'
  AND tr.data_registro >= '2025-11-01'
  AND tr.data_registro <= '2025-11-30'
  AND tr.entrada IS NOT NULL
  AND tr.saida IS NOT NULL
  AND (
    tr.entrada < '05:00:00' OR 
    tr.saida > '22:00:00' OR
    (tr.entrada >= '22:00:00' AND tr.saida <= '05:00:00')
  )
ORDER BY tr.data_registro DESC;
```

### 3. Verificar correções de ponto

```sql
-- Verificar se há correções que podem ter afetado os cálculos
SELECT 
  trc.id,
  trc.time_record_id,
  trc.motivo,
  trc.created_at,
  tr.data_registro,
  tr.horas_noturnas,
  tr.horas_negativas,
  tr.horas_extras_50,
  tr.horas_extras_100
FROM rh.time_record_corrections trc
INNER JOIN rh.time_records tr ON tr.id = trc.time_record_id
INNER JOIN rh.employees e ON e.id = tr.employee_id
WHERE e.matricula = '03027'
  AND tr.data_registro >= '2025-11-01'
  AND tr.data_registro <= '2025-11-30'
ORDER BY trc.created_at DESC;
```

## Solução Proposta

### Passo 1: Recalcular todos os registros de novembro/2025

Execute o script SQL abaixo para recalcular todos os registros:

```sql
DO $$
DECLARE
  v_record_id uuid;
  v_count integer := 0;
BEGIN
  FOR v_record_id IN 
    SELECT tr.id
    FROM rh.time_records tr
    INNER JOIN rh.employees e ON e.id = tr.employee_id
    WHERE e.matricula = '03027'
      AND tr.data_registro >= '2025-11-01'
      AND tr.data_registro <= '2025-11-30'
    ORDER BY tr.data_registro DESC
  LOOP
    PERFORM rh.recalculate_time_record_hours(v_record_id);
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Recalculados % registros', v_count;
END;
$$;
```

### Passo 2: Verificar resultados

Após o recálculo, verifique se as horas noturnas foram calculadas corretamente usando as queries de verificação acima.

## Observações sobre Horas Negativas, Extras 50% e 100%

### Horas Negativas

- Calculadas quando `horas_trabalhadas < horas_diarias` E há todas as marcações (entrada e saída)
- Se não há marcações, é considerado falta, não horas negativas
- Função: `calculate_overtime_by_scale` (linhas 278-289)

### Extras 50%

- Horas extras que vão para banco de horas
- Calculadas quando `horas_trabalhadas > horas_diarias` em dias normais
- Função: `calculate_overtime_by_scale` (linhas 233-274)

### Extras 100%

- Horas extras pagas diretamente
- Calculadas em:
  - Feriados trabalhados
  - Domingos (escala 5x2)
  - Dias de folga (escala 6x1)
- Função: `calculate_overtime_by_scale` (linhas 233-274)

## Próximos Passos

1. Executar o script de recálculo
2. Verificar se as horas noturnas foram calculadas
3. Se ainda estiverem zeradas, verificar:
   - Se os horários realmente cruzam o período noturno
   - Se a função `calculate_night_hours` está funcionando corretamente
   - Se há algum problema com os eventos de ponto

