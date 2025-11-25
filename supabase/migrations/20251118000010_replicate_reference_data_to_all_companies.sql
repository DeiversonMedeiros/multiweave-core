-- =====================================================
-- REPLICAR DADOS DE REFERÊNCIA PARA TODAS AS EMPRESAS
-- =====================================================
-- Esta migração replica os dados das tabelas de referência
-- (delay_reasons, absence_types, cid_codes, deficiency_types)
-- da empresa original para todas as outras empresas cadastradas

-- Função auxiliar para replicar dados de uma tabela
CREATE OR REPLACE FUNCTION replicate_reference_data(
    source_company_id UUID,
    target_company_id UUID,
    table_name TEXT,
    table_schema TEXT DEFAULT 'rh'
)
RETURNS INTEGER AS $$
DECLARE
    insert_count INTEGER;
    sql_query TEXT;
BEGIN
    -- Construir query dinâmica baseada no nome da tabela
    CASE table_name
        WHEN 'delay_reasons' THEN
            INSERT INTO rh.delay_reasons (
                company_id, codigo, nome, descricao, tipo,
                desconta_salario, desconta_horas, requer_justificativa,
                requer_anexo, ativo, created_at, updated_at
            )
            SELECT 
                target_company_id,
                codigo, nome, descricao, tipo,
                desconta_salario, desconta_horas, requer_justificativa,
                requer_anexo, ativo, NOW(), NOW()
            FROM rh.delay_reasons
            WHERE company_id = source_company_id
            ON CONFLICT (codigo, company_id) DO NOTHING;
            
        WHEN 'absence_types' THEN
            INSERT INTO rh.absence_types (
                company_id, codigo, nome, descricao, tipo,
                maximo_dias, remunerado, desconta_salario,
                desconta_ferias, desconta_13_salario, requer_anexo,
                requer_aprovacao, ativo, created_at, updated_at
            )
            SELECT 
                target_company_id,
                codigo, nome, descricao, tipo,
                maximo_dias, remunerado, desconta_salario,
                desconta_ferias, desconta_13_salario, requer_anexo,
                requer_aprovacao, ativo, NOW(), NOW()
            FROM rh.absence_types
            WHERE company_id = source_company_id
            ON CONFLICT (codigo, company_id) DO NOTHING;
            
        WHEN 'cid_codes' THEN
            INSERT INTO rh.cid_codes (
                company_id, codigo, descricao, categoria,
                subcategoria, ativo, created_at, updated_at
            )
            SELECT 
                target_company_id,
                codigo, descricao, categoria,
                subcategoria, ativo, NOW(), NOW()
            FROM rh.cid_codes
            WHERE company_id = source_company_id
            ON CONFLICT (codigo, company_id) DO NOTHING;
            
        WHEN 'deficiency_types' THEN
            INSERT INTO rh.deficiency_types (
                company_id, codigo, nome, descricao, tipo, grau,
                beneficios_lei_8213, beneficios_lei_13146,
                isento_contribuicao_sindical, ativo, created_at, updated_at
            )
            SELECT 
                target_company_id,
                codigo, nome, descricao, tipo, grau,
                beneficios_lei_8213, beneficios_lei_13146,
                isento_contribuicao_sindical, ativo, NOW(), NOW()
            FROM rh.deficiency_types
            WHERE company_id = source_company_id
            ON CONFLICT (codigo, company_id) DO NOTHING;
            
        ELSE
            RAISE EXCEPTION 'Tabela desconhecida: %', table_name;
    END CASE;
    
    GET DIAGNOSTICS insert_count = ROW_COUNT;
    RETURN insert_count;
END;
$$ LANGUAGE plpgsql;

-- Identificar a empresa com os dados originais (primeira empresa que tem dados)
DO $$
DECLARE
    source_company_id UUID;
    target_company_id UUID;
    companies_cursor CURSOR FOR 
        SELECT id FROM companies WHERE id != source_company_id;
    inserted_count INTEGER;
BEGIN
    -- Encontrar a empresa com os dados originais (primeira que tem delay_reasons)
    SELECT company_id INTO source_company_id
    FROM rh.delay_reasons
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF source_company_id IS NULL THEN
        RAISE NOTICE 'Nenhuma empresa com dados de referência encontrada. Pulando replicação.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Empresa origem identificada: %', source_company_id;
    
    -- Replicar dados para cada empresa que não tem dados
    FOR target_company_id IN 
        SELECT c.id 
        FROM companies c
        WHERE c.id != source_company_id
        AND NOT EXISTS (
            SELECT 1 FROM rh.delay_reasons dr WHERE dr.company_id = c.id
        )
    LOOP
        RAISE NOTICE 'Replicando dados para empresa: %', target_company_id;
        
        -- Replicar delay_reasons
        SELECT replicate_reference_data(source_company_id, target_company_id, 'delay_reasons') INTO inserted_count;
        RAISE NOTICE '  - delay_reasons: % registros inseridos', inserted_count;
        
        -- Replicar absence_types
        SELECT replicate_reference_data(source_company_id, target_company_id, 'absence_types') INTO inserted_count;
        RAISE NOTICE '  - absence_types: % registros inseridos', inserted_count;
        
        -- Replicar cid_codes
        SELECT replicate_reference_data(source_company_id, target_company_id, 'cid_codes') INTO inserted_count;
        RAISE NOTICE '  - cid_codes: % registros inseridos', inserted_count;
        
        -- Replicar deficiency_types
        SELECT replicate_reference_data(source_company_id, target_company_id, 'deficiency_types') INTO inserted_count;
        RAISE NOTICE '  - deficiency_types: % registros inseridos', inserted_count;
    END LOOP;
    
    RAISE NOTICE 'Replicação concluída!';
END $$;

-- Limpar função auxiliar após uso
DROP FUNCTION IF EXISTS replicate_reference_data(UUID, UUID, TEXT, TEXT);

