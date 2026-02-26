-- =====================================================
-- Diagnóstico: Feriado 01/01/2026 na aba "Resumo por Funcionário"
-- Natureza do dia deve aparecer como "Feriado" para 01/01/2026.
-- Empresa exemplo: Estrategic
--
-- Como executar (no seu terminal, com rede/DNS ok):
--   $env:PGPASSWORD = '81hbcoNDXaGiPIpp!'
--   psql "postgresql://postgres@db.wmtftyaqucwfsnnjepiy.supabase.co:5432/postgres" -f scripts/diagnostico_feriado_01_01_2026.sql
--
-- Correção: migração 20260220000005_ensure_feriado_01_01_2026.sql
-- insere "Confraternização Universal" em 2026-01-01 para todas as empresas
-- que ainda não tiverem esse feriado. Após aplicá-la, 01/01/2026 passa a
-- constar como feriado e a coluna "Natureza do dia" mostra "Feriado".
-- =====================================================

-- 1) Empresa Estrategic
SELECT id, nome_fantasia, razao_social 
FROM public.companies 
WHERE nome_fantasia ILIKE '%Estrategic%' OR razao_social ILIKE '%Estrategic%';

-- 2) Feriados em 01/01/2026 para Estrategic (company_id da Estrategic no dump: ce390408-1c18-47fc-bd7d-76379ec488b7)
SELECT h.id, h.company_id, h.nome, h.data, h.tipo, h.ativo 
FROM rh.holidays h
WHERE h.company_id = (SELECT id FROM public.companies WHERE nome_fantasia ILIKE '%Estrategic%' LIMIT 1)
  AND h.data = '2026-01-01';

-- 3) Teste da função rh.is_holiday para 01/01/2026 e Estrategic
SELECT rh.is_holiday(
  '2026-01-01'::date,
  (SELECT id FROM public.companies WHERE nome_fantasia ILIKE '%Estrategic%' LIMIT 1)
) AS is_01_01_2026_feriado;

-- 4) Todos os feriados de janeiro/2026 para Estrategic
SELECT h.nome, h.data, h.tipo, h.ativo 
FROM rh.holidays h
WHERE h.company_id = (SELECT id FROM public.companies WHERE nome_fantasia ILIKE '%Estrategic%' LIMIT 1)
  AND h.data >= '2026-01-01' AND h.data <= '2026-01-31'
ORDER BY h.data;
