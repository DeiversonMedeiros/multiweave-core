-- =====================================================
-- FUNÇÃO: Obter valor médio das últimas compras de um material
-- =====================================================
-- Data: 2025-12-03
-- Descrição: Retorna o valor médio unitário baseado nas últimas compras do material
--            Considera as últimas 10 compras aprovadas

-- Função no schema almoxarifado
CREATE OR REPLACE FUNCTION almoxarifado.get_material_average_price(
    p_material_id UUID,
    p_company_id UUID,
    p_limit_compras INTEGER DEFAULT 10
)
RETURNS DECIMAL(15,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_valor_medio DECIMAL(15,2);
BEGIN
    -- Buscar valor médio das últimas compras aprovadas do material
    SELECT COALESCE(
        AVG(ei.valor_unitario),
        0
    )
    INTO v_valor_medio
    FROM almoxarifado.entrada_itens ei
    INNER JOIN almoxarifado.entradas_materiais em 
        ON em.id = ei.entrada_id
    WHERE ei.material_equipamento_id = p_material_id
    AND em.company_id = p_company_id
    AND em.status = 'aprovado'
    AND ei.valor_unitario IS NOT NULL
    AND ei.valor_unitario > 0
    ORDER BY em.data_entrada DESC, em.created_at DESC
    LIMIT p_limit_compras;
    
    RETURN COALESCE(v_valor_medio, 0);
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, retornar 0
        RETURN 0;
END;
$$;

-- Função wrapper no schema public para acesso via RPC
CREATE OR REPLACE FUNCTION public.get_material_average_price(
    p_material_id UUID,
    p_company_id UUID,
    p_limit_compras INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_valor_medio DECIMAL(15,2);
BEGIN
    -- Chamar função do schema almoxarifado
    v_valor_medio := almoxarifado.get_material_average_price(
        p_material_id, 
        p_company_id, 
        p_limit_compras
    );
    
    -- Retornar como JSONB
    RETURN jsonb_build_object(
        'valorMedio', v_valor_medio,
        'valorMedioFormatado', TO_CHAR(v_valor_medio, 'FM999999990.00')
    );
END;
$$;

-- Grant permissões
GRANT EXECUTE ON FUNCTION almoxarifado.get_material_average_price(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION almoxarifado.get_material_average_price(UUID, UUID, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_material_average_price(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_material_average_price(UUID, UUID, INTEGER) TO anon;

-- Comentários
COMMENT ON FUNCTION almoxarifado.get_material_average_price IS 'Retorna o valor médio unitário baseado nas últimas compras aprovadas do material';
COMMENT ON FUNCTION public.get_material_average_price IS 'Wrapper RPC para obter valor médio de compras do material - Retorna JSONB com {valorMedio: 15.50, valorMedioFormatado: "15.50"}';

