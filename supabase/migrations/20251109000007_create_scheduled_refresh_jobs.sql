-- =====================================================
-- CONFIGURAÇÃO DE JOBS AGENDADOS (pg_cron)
-- Sistema ERP MultiWeave Core
-- Data: 2025-11-09
-- Descrição: Configura jobs agendados para refresh
--           automático das views materializadas
-- =====================================================

-- IMPORTANTE: Este arquivo requer que a extensão pg_cron
-- esteja habilitada no Supabase. Execute:
-- SELECT cron.schedule(...) apenas se pg_cron estiver disponível

-- =====================================================
-- VERIFICAÇÃO DE EXTENSÃO
-- =====================================================

-- Verificar se pg_cron está disponível
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    RAISE NOTICE 'Extensão pg_cron não encontrada. Jobs agendados não serão criados.';
    RAISE NOTICE 'Para habilitar, execute: CREATE EXTENSION IF NOT EXISTS pg_cron;';
  END IF;
END $$;

-- =====================================================
-- JOB 1: REFRESH DIÁRIO (Todas as views às 2h da manhã)
-- =====================================================

-- Remover job existente se houver
SELECT cron.unschedule('refresh-all-statistics-views-daily')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'refresh-all-statistics-views-daily'
);

-- Criar job diário para atualizar todas as views às 2h da manhã
-- Cron: '0 2 * * *' = Todos os dias às 2:00 AM
SELECT cron.schedule(
  'refresh-all-statistics-views-daily',
  '0 2 * * *', -- Todos os dias às 2h da manhã
  $$
  SELECT public.refresh_all_statistics_views();
  $$
);

-- =====================================================
-- JOB 2: REFRESH HORÁRIO (Apenas dashboard_stats às horas cheias)
-- =====================================================

-- Remover job existente se houver
SELECT cron.unschedule('refresh-dashboard-stats-hourly')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'refresh-dashboard-stats-hourly'
);

-- Criar job horário para atualizar dashboard_stats a cada hora
-- Cron: '0 * * * *' = A cada hora (minuto 0)
SELECT cron.schedule(
  'refresh-dashboard-stats-hourly',
  '0 * * * *', -- A cada hora
  $$
  SELECT public.refresh_statistics_view('dashboard_stats');
  $$
);

-- =====================================================
-- JOB 3: REFRESH A CADA 6 HORAS (Views de RH, Frota, Almoxarifado)
-- =====================================================

-- Remover job existente se houver
SELECT cron.unschedule('refresh-module-stats-6hours')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'refresh-module-stats-6hours'
);

-- Criar job para atualizar views de módulos a cada 6 horas
-- Cron: '0 */6 * * *' = A cada 6 horas (às 0h, 6h, 12h, 18h)
SELECT cron.schedule(
  'refresh-module-stats-6hours',
  '0 */6 * * *', -- A cada 6 horas
  $$
  SELECT public.refresh_statistics_view('rh_dashboard_stats');
  SELECT public.refresh_statistics_view('frota_dashboard_stats');
  SELECT public.refresh_statistics_view('almoxarifado_dashboard_stats');
  $$
);

-- =====================================================
-- JOB 4: REFRESH DIÁRIO (View financeira às 3h da manhã)
-- =====================================================

-- Remover job existente se houver
SELECT cron.unschedule('refresh-financial-stats-daily')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'refresh-financial-stats-daily'
);

-- Criar job diário para atualizar view financeira às 3h da manhã
-- Cron: '0 3 * * *' = Todos os dias às 3:00 AM
SELECT cron.schedule(
  'refresh-financial-stats-daily',
  '0 3 * * *', -- Todos os dias às 3h da manhã
  $$
  SELECT public.refresh_statistics_view('financial_dashboard_stats');
  $$
);

-- =====================================================
-- FUNÇÕES AUXILIARES PARA GERENCIAR JOBS
-- =====================================================

-- Função para listar todos os jobs de refresh
CREATE OR REPLACE FUNCTION public.list_refresh_jobs()
RETURNS TABLE (
  job_id BIGINT,
  job_name TEXT,
  schedule TEXT,
  command TEXT,
  active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.jobid,
    j.jobname::TEXT,
    j.schedule::TEXT,
    j.command::TEXT,
    j.active
  FROM cron.job j
  WHERE j.jobname LIKE 'refresh-%'
  ORDER BY j.jobname;
END;
$$;

COMMENT ON FUNCTION public.list_refresh_jobs() IS 
'Lista todos os jobs agendados de refresh de views materializadas';

-- Função para pausar todos os jobs de refresh
CREATE OR REPLACE FUNCTION public.pause_all_refresh_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  job_record RECORD;
BEGIN
  FOR job_record IN 
    SELECT jobid, jobname 
    FROM cron.job 
    WHERE jobname LIKE 'refresh-%' AND active = true
  LOOP
    PERFORM cron.alter_job(job_record.jobid, active => false);
    RAISE NOTICE 'Job pausado: %', job_record.jobname;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.pause_all_refresh_jobs() IS 
'Pausa todos os jobs agendados de refresh de views materializadas';

-- Função para reativar todos os jobs de refresh
CREATE OR REPLACE FUNCTION public.resume_all_refresh_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  job_record RECORD;
BEGIN
  FOR job_record IN 
    SELECT jobid, jobname 
    FROM cron.job 
    WHERE jobname LIKE 'refresh-%' AND active = false
  LOOP
    PERFORM cron.alter_job(job_record.jobid, active => true);
    RAISE NOTICE 'Job reativado: %', job_record.jobname;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.resume_all_refresh_jobs() IS 
'Reativa todos os jobs agendados de refresh de views materializadas';

-- =====================================================
-- PERMISSÕES
-- =====================================================

-- Permitir que usuários autenticados listem jobs
GRANT EXECUTE ON FUNCTION public.list_refresh_jobs() TO authenticated;

-- Permitir que usuários autenticados pausem/reativem jobs
GRANT EXECUTE ON FUNCTION public.pause_all_refresh_jobs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.resume_all_refresh_jobs() TO authenticated;

-- =====================================================
-- INSTRUÇÕES DE USO
-- =====================================================

-- Para listar todos os jobs:
-- SELECT * FROM public.list_refresh_jobs();

-- Para pausar todos os jobs:
-- SELECT public.pause_all_refresh_jobs();

-- Para reativar todos os jobs:
-- SELECT public.resume_all_refresh_jobs();

-- Para remover um job específico:
-- SELECT cron.unschedule('nome-do-job');

-- Para alterar o schedule de um job:
-- SELECT cron.alter_job(
--   (SELECT jobid FROM cron.job WHERE jobname = 'nome-do-job'),
--   schedule => '0 4 * * *'  -- Novo schedule
-- );

-- Para ver o histórico de execuções:
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE 'refresh-%')
-- ORDER BY start_time DESC 
-- LIMIT 10;

-- =====================================================
-- NOTAS SOBRE CRON SCHEDULE
-- =====================================================

-- Formato: 'minuto hora dia mês dia-da-semana'
-- 
-- Exemplos:
-- '0 2 * * *'     = Todos os dias às 2:00 AM
-- '0 */6 * * *'   = A cada 6 horas (0h, 6h, 12h, 18h)
-- '0 * * * *'     = A cada hora (minuto 0)
-- '*/15 * * * *'  = A cada 15 minutos
-- '0 0 * * 0'     = Todo domingo à meia-noite
-- '0 9-17 * * 1-5' = De segunda a sexta, das 9h às 17h (a cada hora)

