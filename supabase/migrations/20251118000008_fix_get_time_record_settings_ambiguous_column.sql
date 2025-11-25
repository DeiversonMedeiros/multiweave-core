-- =====================================================
-- CORREÇÃO: Ambiguidade na coluna company_id
-- =====================================================
-- Data: 2025-11-18
-- Descrição: Corrige a ambiguidade na função get_time_record_settings
-- =====================================================

-- Corrigir função no schema rh
CREATE OR REPLACE FUNCTION rh.get_time_record_settings(p_company_id UUID)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    janela_tempo_marcacoes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ts.id,
        ts.company_id,
        ts.janela_tempo_marcacoes,
        ts.created_at,
        ts.updated_at
    FROM rh.time_record_settings ts
    WHERE ts.company_id = p_company_id
    
    UNION ALL
    
    -- Se não encontrar, retornar configuração padrão
    SELECT 
        gen_random_uuid() as id,
        p_company_id as company_id,
        24 as janela_tempo_marcacoes, -- Padrão: 24 horas
        NOW() as created_at,
        NOW() as updated_at
    WHERE NOT EXISTS (
        SELECT 1 FROM rh.time_record_settings trs
        WHERE trs.company_id = p_company_id
    )
    LIMIT 1;
END;
$$;

-- Atualizar função wrapper no schema public
CREATE OR REPLACE FUNCTION public.get_time_record_settings(p_company_id UUID)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    janela_tempo_marcacoes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM rh.get_time_record_settings(p_company_id);
END;
$$;

