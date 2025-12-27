-- =====================================================
-- FUNÇÃO PARA VALIDAR CONFLITOS DE VIAGENS
-- Sistema ERP MultiWeave Core
-- =====================================================

-- Função para verificar se há conflito de viagem para o mesmo veículo no mesmo dia e horário
CREATE OR REPLACE FUNCTION logistica.check_trip_conflict(
    p_company_id UUID,
    p_vehicle_id UUID,
    p_data_saida DATE,
    p_hora_saida TIME DEFAULT NULL,
    p_trip_id UUID DEFAULT NULL -- Para excluir a própria viagem na atualização
)
RETURNS TABLE (
    has_conflict BOOLEAN,
    conflicting_trip_id UUID,
    conflicting_trip_numero TEXT,
    conflicting_data_saida DATE,
    conflicting_hora_saida TIME
) AS $$
BEGIN
    -- Se não há horário especificado, verificar conflitos no dia inteiro
    IF p_hora_saida IS NULL THEN
        RETURN QUERY
        SELECT 
            TRUE as has_conflict,
            t.id as conflicting_trip_id,
            lr.numero_solicitacao as conflicting_trip_numero,
            t.data_saida as conflicting_data_saida,
            t.hora_saida as conflicting_hora_saida
        FROM logistica.trips t
        LEFT JOIN logistica.logistics_requests lr ON t.request_id = lr.id
        WHERE t.company_id = p_company_id
        AND t.vehicle_id = p_vehicle_id
        AND t.data_saida = p_data_saida
        AND t.status IN ('agendada', 'em_viagem') -- Apenas viagens ativas
        AND (p_trip_id IS NULL OR t.id != p_trip_id) -- Excluir a própria viagem se for atualização
        LIMIT 1;
        
        -- Se não encontrou conflito, retornar false
        IF NOT FOUND THEN
            RETURN QUERY SELECT 
                FALSE as has_conflict,
                NULL::UUID as conflicting_trip_id,
                NULL::TEXT as conflicting_trip_numero,
                NULL::DATE as conflicting_data_saida,
                NULL::TIME as conflicting_hora_saida;
        END IF;
    ELSE
        -- Se há horário especificado, verificar conflitos no mesmo dia e horário
        -- Considera conflito se:
        -- 1. Mesmo dia e mesmo horário exato
        -- 2. Mesmo dia e horário não especificado na viagem existente (ocupa o dia inteiro)
        RETURN QUERY
        SELECT 
            TRUE as has_conflict,
            t.id as conflicting_trip_id,
            lr.numero_solicitacao as conflicting_trip_numero,
            t.data_saida as conflicting_data_saida,
            t.hora_saida as conflicting_hora_saida
        FROM logistica.trips t
        LEFT JOIN logistica.logistics_requests lr ON t.request_id = lr.id
        WHERE t.company_id = p_company_id
        AND t.vehicle_id = p_vehicle_id
        AND t.data_saida = p_data_saida
        AND t.status IN ('agendada', 'em_viagem')
        AND (p_trip_id IS NULL OR t.id != p_trip_id)
        AND (
            -- Conflito: mesmo horário exato
            t.hora_saida = p_hora_saida
            OR
            -- Conflito: viagem existente sem horário (ocupa o dia inteiro)
            t.hora_saida IS NULL
        )
        LIMIT 1;
        
        -- Se não encontrou conflito, retornar false
        IF NOT FOUND THEN
            RETURN QUERY SELECT 
                FALSE as has_conflict,
                NULL::UUID as conflicting_trip_id,
                NULL::TEXT as conflicting_trip_numero,
                NULL::DATE as conflicting_data_saida,
                NULL::TIME as conflicting_hora_saida;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

