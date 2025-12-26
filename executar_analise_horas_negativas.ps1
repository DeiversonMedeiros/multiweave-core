$env:PGPASSWORD = "81hbcoNDXaGiPIpp!"

$query = @"
-- 1. Buscar dados do registro de ponto
SELECT 
  tr.id,
  tr.employee_id,
  e.nome as nome_funcionario,
  e.codigo as codigo_funcionario,
  tr.data_registro,
  tr.entrada,
  tr.saida,
  tr.entrada_almoco,
  tr.saida_almoco,
  tr.horas_trabalhadas,
  tr.horas_negativas,
  tr.horas_extras,
  tr.status
FROM rh.time_records tr
INNER JOIN rh.funcionarios e ON e.id = tr.employee_id
WHERE e.codigo = '03022'
  AND tr.data_registro = '2025-12-24'
ORDER BY tr.created_at DESC;
"@

Write-Host "=== DADOS DO REGISTRO DE PONTO ===" -ForegroundColor Cyan
psql -h db.wmtftyaqucwfsnnjepiy.supabase.co -p 5432 -U postgres -d postgres -c $query

$query2 = @"
-- 2. Verificar turno/escala
SELECT 
  es.id as employee_shift_id,
  ws.nome as nome_turno,
  ws.horas_diarias as horas_diarias_turno,
  ws.horarios_por_dia,
  CASE 
    WHEN EXTRACT(DOW FROM '2025-12-24'::DATE) = 0 THEN 7
    ELSE EXTRACT(DOW FROM '2025-12-24'::DATE)::INTEGER
  END as dia_semana,
  rh.get_work_shift_hours_for_day(ws.id, CASE 
    WHEN EXTRACT(DOW FROM '2025-12-24'::DATE) = 0 THEN 7
    ELSE EXTRACT(DOW FROM '2025-12-24'::DATE)::INTEGER
  END) as horas_do_dia_especifico
FROM rh.employee_shifts es
INNER JOIN rh.work_shifts ws ON ws.id = es.turno_id
INNER JOIN rh.funcionarios e ON e.id = es.funcionario_id
WHERE e.codigo = '03022'
  AND es.ativo = true
  AND es.data_inicio <= '2025-12-24'::DATE
  AND (es.data_fim IS NULL OR es.data_fim >= '2025-12-24'::DATE)
ORDER BY es.data_inicio DESC;
"@

Write-Host "`n=== TURNO/ESCALA ===" -ForegroundColor Cyan
psql -h db.wmtftyaqucwfsnnjepiy.supabase.co -p 5432 -U postgres -d postgres -c $query2

