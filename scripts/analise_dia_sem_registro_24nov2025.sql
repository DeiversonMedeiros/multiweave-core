-- =====================================================
-- ANÁLISE: dia 24/11/2025 sem registro de ponto
-- Verificar se existe time_record, atestado médico ou se é DSR
-- Executar no Supabase SQL Editor ou via: psql $DB_URL -f scripts/analise_dia_sem_registro_24nov2025.sql
-- =====================================================

-- 1) Registros de ponto em 24/11/2025 (qualquer empresa)
SELECT 
  tr.id,
  tr.employee_id,
  e.nome AS funcionario,
  tr.company_id,
  tr.data_registro,
  tr.entrada,
  tr.saida,
  tr.horas_trabalhadas,
  tr.horas_negativas,
  tr.horas_extras_50,
  tr.horas_extras_100,
  tr.horas_noturnas,
  tr.status
FROM rh.time_records tr
JOIN rh.employees e ON e.id = tr.employee_id
WHERE tr.data_registro = '2025-11-24'
ORDER BY e.nome;

-- 2) Atestados médicos que cobrem 24/11/2025
SELECT 
  mc.id,
  mc.employee_id,
  e.nome AS funcionario,
  mc.company_id,
  mc.data_inicio,
  mc.data_fim,
  mc.status,
  mc.tipo_atestado
FROM rh.medical_certificates mc
JOIN rh.employees e ON e.id = mc.employee_id
WHERE mc.data_inicio <= '2025-11-24'
  AND (mc.data_fim IS NULL OR mc.data_fim >= '2025-11-24')
  AND mc.status IN ('aprovado', 'em_andamento', 'concluido')
ORDER BY e.nome;

-- 3) Para um funcionário específico: 24/11 é dia de folga (DSR)?
-- Substituir :employee_id e :company_id pelos UUIDs reais
-- Exemplo (descomente e ajuste):
/*
SELECT rh.is_rest_day(
  'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid,  -- employee_id
  'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy'::uuid,  -- company_id
  '2025-11-24'
) AS eh_dia_folga_24nov;
*/

-- 4) Funcionários com registro em nov/2025 mas SEM registro em 24/11
WITH com_registro_nov AS (
  SELECT DISTINCT tr.employee_id
  FROM rh.time_records tr
  WHERE tr.data_registro >= '2025-11-01' AND tr.data_registro <= '2025-11-30'
),
sem_24 AS (
  SELECT tr.employee_id
  FROM rh.time_records tr
  WHERE tr.data_registro = '2025-11-24'
)
SELECT 
  e.id,
  e.nome,
  e.company_id,
  c.nome_fantasia
FROM rh.employees e
JOIN companies c ON c.id = e.company_id
JOIN com_registro_nov r ON r.employee_id = e.id
LEFT JOIN sem_24 s ON s.employee_id = e.id
WHERE s.employee_id IS NULL
ORDER BY c.nome_fantasia, e.nome;
