-- =====================================================
-- Adicionar logs detalhados à função get_time_records_paginated
-- Para diagnosticar problema de gestor não ver registros
-- =====================================================

-- Remover a função existente primeiro para evitar conflito de tipos
DROP FUNCTION IF EXISTS public.get_time_records_paginated(
  uuid,
  integer,
  integer,
  uuid,
  date,
  date,
  varchar,
  uuid
);
