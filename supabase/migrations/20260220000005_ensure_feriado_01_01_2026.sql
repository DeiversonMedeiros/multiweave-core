-- =====================================================
-- Garantir feriado 01/01/2026 (Confraternização Universal)
-- Para que na aba "Resumo por Funcionário" (rh/time-records)
-- o dia 01/01/2026 apareça com Natureza do dia = "Feriado"
-- =====================================================

INSERT INTO rh.holidays (id, company_id, nome, data, tipo, descricao, ativo)
SELECT gen_random_uuid(), c.id, 'Confraternização Universal', '2026-01-01'::date, 'nacional', 'Feriado nacional brasileiro', true
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM rh.holidays h
  WHERE h.company_id = c.id AND h.data = '2026-01-01'
);
