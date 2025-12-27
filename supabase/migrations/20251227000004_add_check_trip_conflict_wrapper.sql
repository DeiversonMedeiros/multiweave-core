-- =====================================================
-- WRAPPER PARA check_trip_conflict NO SCHEMA PUBLIC
-- Sistema ERP MultiWeave Core
-- =====================================================
-- Data: 2025-12-27
-- Descrição: Cria wrapper no schema public para permitir
--            acesso via REST API à função check_trip_conflict
--            do schema logistica

-- Wrapper no schema public para check_trip_conflict
CREATE OR REPLACE FUNCTION public.check_trip_conflict(
    p_company_id UUID,
    p_vehicle_id UUID,
    p_data_saida DATE,
    p_hora_saida TIME DEFAULT NULL,
    p_trip_id UUID DEFAULT NULL
)
RETURNS TABLE (
    has_conflict BOOLEAN,
    conflicting_trip_id UUID,
    conflicting_trip_numero TEXT,
    conflicting_data_saida DATE,
    conflicting_hora_saida TIME
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM logistica.check_trip_conflict(
        p_company_id,
        p_vehicle_id,
        p_data_saida,
        p_hora_saida,
        p_trip_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.check_trip_conflict(UUID, UUID, DATE, TIME, UUID) IS 
'Wrapper para logistica.check_trip_conflict - Verifica conflitos de viagem para o mesmo veículo no mesmo dia e horário';

-- Conceder permissões para acesso via REST API
GRANT EXECUTE ON FUNCTION public.check_trip_conflict(UUID, UUID, DATE, TIME, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_trip_conflict(UUID, UUID, DATE, TIME, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.check_trip_conflict(UUID, UUID, DATE, TIME, UUID) TO service_role;

