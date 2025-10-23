-- =====================================================
-- TABELA MATERIALIZADA PARA EXAMES PERIÓDICOS
-- =====================================================

-- Criar tabela materializada para exames periódicos
CREATE MATERIALIZED VIEW public.periodic_exams_mv AS
SELECT 
    pe.id,
    pe.company_id,
    pe.employee_id,
    e.nome as employee_name,
    pe.tipo_exame,
    pe.data_agendamento,
    pe.data_realizacao,
    pe.data_vencimento,
    pe.status,
    pe.medico_responsavel,
    pe.clinica_local,
    pe.observacoes,
    pe.resultado,
    pe.restricoes,
    pe.anexos,
    pe.custo,
    pe.pago,
    pe.data_pagamento,
    pe.created_at,
    pe.updated_at
FROM rh.periodic_exams pe
LEFT JOIN rh.employees e ON pe.employee_id = e.id;

-- Criar índice único
CREATE UNIQUE INDEX periodic_exams_mv_id_idx ON public.periodic_exams_mv (id);

-- Habilitar RLS
ALTER MATERIALIZED VIEW public.periodic_exams_mv SET (security_invoker = true);

-- Conceder permissões
GRANT SELECT ON public.periodic_exams_mv TO authenticated;

-- Função para atualizar a view materializada
CREATE OR REPLACE FUNCTION refresh_periodic_exams_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.periodic_exams_mv;
END;
$$;

-- Trigger para atualizar automaticamente
CREATE OR REPLACE FUNCTION trigger_refresh_periodic_exams_mv()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM refresh_periodic_exams_mv();
    RETURN NULL;
END;
$$;

-- Aplicar trigger na tabela original
CREATE TRIGGER refresh_periodic_exams_mv_trigger
    AFTER INSERT OR UPDATE OR DELETE ON rh.periodic_exams
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_periodic_exams_mv();
