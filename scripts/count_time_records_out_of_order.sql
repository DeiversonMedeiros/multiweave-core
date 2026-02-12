-- =====================================================
-- Registros de ponto fora da ordem cronológica
-- =====================================================
-- Ordem esperada: entrada → entrada_almoco → saida_almoco → saída → entrada_extra1 → saida_extra1
-- Retorna, por funcionário, a quantidade de registros em que alguma
-- marcação está anterior a outra que deveria vir antes.
-- =====================================================

WITH base AS (
  SELECT
    tr.id,
    tr.employee_id,
    tr.data_registro,
    tr.entrada,
    tr.entrada_almoco,
    tr.saida_almoco,
    tr.saida,
    tr.entrada_extra1,
    tr.saida_extra1,
    (tr.data_registro + COALESCE(tr.entrada, '00:00'::time))::timestamp AS ts_entrada,
    (tr.data_registro + COALESCE(tr.entrada_almoco, '00:00'::time))::timestamp AS ts_entrada_almoco,
    (tr.data_registro + COALESCE(tr.saida_almoco, '00:00'::time))::timestamp AS ts_saida_almoco,
    (tr.data_registro + COALESCE(tr.saida, '00:00'::time))::timestamp AS ts_saida,
    (tr.data_registro + COALESCE(tr.entrada_extra1, '00:00'::time))::timestamp AS ts_entrada_extra1,
    (tr.data_registro + COALESCE(tr.saida_extra1, '00:00'::time))::timestamp AS ts_saida_extra1
  FROM rh.time_records tr
  WHERE tr.entrada IS NOT NULL OR tr.saida IS NOT NULL
),
com_ordem AS (
  SELECT
    base.*,
    (
      (base.entrada IS NOT NULL AND base.entrada_almoco IS NOT NULL AND base.ts_entrada_almoco < base.ts_entrada)
      OR (base.entrada_almoco IS NOT NULL AND base.saida_almoco IS NOT NULL AND base.ts_saida_almoco < base.ts_entrada_almoco)
      OR (base.saida_almoco IS NOT NULL AND base.saida IS NOT NULL AND base.ts_saida < base.ts_saida_almoco)
      OR (base.entrada IS NOT NULL AND base.saida IS NOT NULL AND base.ts_saida < base.ts_entrada)
      OR (base.saida IS NOT NULL AND base.entrada_extra1 IS NOT NULL AND base.ts_entrada_extra1 < base.ts_saida)
      OR (base.entrada_extra1 IS NOT NULL AND base.saida_extra1 IS NOT NULL AND base.ts_saida_extra1 < base.ts_entrada_extra1)
    ) AS fora_de_ordem
  FROM base
)
SELECT
  e.nome AS funcionario_nome,
  e.matricula AS funcionario_matricula,
  com_ordem.employee_id,
  COUNT(*) FILTER (WHERE com_ordem.fora_de_ordem) AS registros_fora_de_ordem,
  COUNT(*) AS total_registros
FROM com_ordem
JOIN rh.employees e ON e.id = com_ordem.employee_id
GROUP BY com_ordem.employee_id, e.nome, e.matricula
HAVING COUNT(*) FILTER (WHERE com_ordem.fora_de_ordem) > 0
ORDER BY registros_fora_de_ordem DESC;


-- =====================================================
-- (Opcional) Detalhe dos registros fora de ordem
-- =====================================================
-- Descomente o bloco abaixo para listar cada registro com data e horários.
/*
WITH base AS (
  SELECT
    tr.id,
    tr.employee_id,
    tr.data_registro,
    tr.entrada,
    tr.entrada_almoco,
    tr.saida_almoco,
    tr.saida,
    tr.entrada_extra1,
    tr.saida_extra1,
    (tr.data_registro + COALESCE(tr.entrada, '00:00'::time))::timestamp AS ts_entrada,
    (tr.data_registro + COALESCE(tr.entrada_almoco, '00:00'::time))::timestamp AS ts_entrada_almoco,
    (tr.data_registro + COALESCE(tr.saida_almoco, '00:00'::time))::timestamp AS ts_saida_almoco,
    (tr.data_registro + COALESCE(tr.saida, '00:00'::time))::timestamp AS ts_saida,
    (tr.data_registro + COALESCE(tr.entrada_extra1, '00:00'::time))::timestamp AS ts_entrada_extra1,
    (tr.data_registro + COALESCE(tr.saida_extra1, '00:00'::time))::timestamp AS ts_saida_extra1
  FROM rh.time_records tr
  WHERE tr.entrada IS NOT NULL OR tr.saida IS NOT NULL
),
com_ordem AS (
  SELECT
    base.*,
    (
      (base.entrada IS NOT NULL AND base.entrada_almoco IS NOT NULL AND base.ts_entrada_almoco < base.ts_entrada)
      OR (base.entrada_almoco IS NOT NULL AND base.saida_almoco IS NOT NULL AND base.ts_saida_almoco < base.ts_entrada_almoco)
      OR (base.saida_almoco IS NOT NULL AND base.saida IS NOT NULL AND base.ts_saida < base.ts_saida_almoco)
      OR (base.entrada IS NOT NULL AND base.saida IS NOT NULL AND base.ts_saida < base.ts_entrada)
      OR (base.saida IS NOT NULL AND base.entrada_extra1 IS NOT NULL AND base.ts_entrada_extra1 < base.ts_saida)
      OR (base.entrada_extra1 IS NOT NULL AND base.saida_extra1 IS NOT NULL AND base.ts_saida_extra1 < base.ts_entrada_extra1)
    ) AS fora_de_ordem
  FROM base
)
SELECT
  e.nome AS funcionario_nome,
  com_ordem.data_registro,
  com_ordem.entrada,
  com_ordem.entrada_almoco,
  com_ordem.saida_almoco,
  com_ordem.saida,
  com_ordem.entrada_extra1,
  com_ordem.saida_extra1,
  com_ordem.id AS time_record_id
FROM com_ordem
JOIN rh.employees e ON e.id = com_ordem.employee_id
WHERE com_ordem.fora_de_ordem
ORDER BY e.nome, com_ordem.data_registro;
*/
