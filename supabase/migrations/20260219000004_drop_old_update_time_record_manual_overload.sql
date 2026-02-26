-- =====================================================
-- Remove a versão antiga de update_time_record_manual (9 parâmetros)
-- =====================================================
-- A migração 20260219000003 criou uma nova assinatura com 15 parâmetros.
-- CREATE OR REPLACE com assinatura diferente não substitui, cria overload.
-- PostgREST (PGRST203) não consegue escolher entre as duas. Removemos a antiga.
-- =====================================================

DROP FUNCTION IF EXISTS public.update_time_record_manual(
  uuid,
  date,
  time,
  time,
  time,
  time,
  time,
  time,
  text
);
