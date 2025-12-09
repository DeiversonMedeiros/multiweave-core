-- =====================================================
-- SCRIPT PARA COPIAR ESCALAS DE TRABALHO (work_shifts)
-- Empresa de referência: dc060329-50cd-4114-922f-624a6ab036d6 (AXISENG LTDA)
-- Empresas destino:
--   - ce92d32f-0503-43ca-b3cc-fb09a462b839 (TECHSTEEL METAL LTDA)
--   - f83704f6-3278-4d59-81ca-45925a1ab855 (SMARTVIEW RENT LTDA)
-- =====================================================

DO $$
DECLARE
    v_reference_company_id UUID := 'dc060329-50cd-4114-922f-624a6ab036d6';
    v_target_company_1 UUID := 'ce92d32f-0503-43ca-b3cc-fb09a462b839';
    v_target_company_2 UUID := 'f83704f6-3278-4d59-81ca-45925a1ab855';
    v_count_ref INTEGER;
    v_count_before_1 INTEGER;
    v_count_before_2 INTEGER;
    v_count_after_1 INTEGER;
    v_count_after_2 INTEGER;
    v_copied_1 INTEGER;
    v_copied_2 INTEGER;
BEGIN
    -- 1. Verificar dados na empresa de referência
    RAISE NOTICE '=== VERIFICANDO DADOS NA EMPRESA DE REFERÊNCIA ===';
    SELECT COUNT(*) INTO v_count_ref 
    FROM rh.work_shifts 
    WHERE company_id = v_reference_company_id;
    
    RAISE NOTICE 'Total de escalas na empresa de referência (AXISENG LTDA): %', v_count_ref;
    
    IF v_count_ref = 0 THEN
        RAISE EXCEPTION 'Nenhuma escala encontrada na empresa de referência!';
    END IF;
    
    -- 2. Verificar dados ANTES da cópia
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICANDO DADOS ANTES DA CÓPIA ===';
    
    SELECT COUNT(*) INTO v_count_before_1 
    FROM rh.work_shifts 
    WHERE company_id = v_target_company_1;
    
    SELECT COUNT(*) INTO v_count_before_2 
    FROM rh.work_shifts 
    WHERE company_id = v_target_company_2;
    
    RAISE NOTICE 'TECHSTEEL METAL LTDA: % escalas existentes', v_count_before_1;
    RAISE NOTICE 'SMARTVIEW RENT LTDA: % escalas existentes', v_count_before_2;
    
    -- 3. COPIAR DADOS PARA TECHSTEEL METAL LTDA
    RAISE NOTICE '';
    RAISE NOTICE '=== COPIANDO DADOS PARA TECHSTEEL METAL LTDA ===';
    
    INSERT INTO rh.work_shifts (
        company_id,
        nome,
        codigo,
        descricao,
        hora_inicio,
        hora_fim,
        intervalo_inicio,
        intervalo_fim,
        horas_diarias,
        dias_semana,
        tipo_turno,
        tolerancia_entrada,
        tolerancia_saida,
        status,
        tipo_escala,
        dias_trabalho,
        dias_folga,
        ciclo_dias,
        regras_clt,
        template_escala,
        horarios_por_dia,
        created_at,
        updated_at
    )
    SELECT 
        v_target_company_1,
        ws_ref.nome,
        -- Definir código como NULL ao copiar para evitar violação de constraint UNIQUE global
        -- O código é opcional e pode ser preenchido manualmente depois se necessário
        NULL,
        ws_ref.descricao,
        ws_ref.hora_inicio,
        ws_ref.hora_fim,
        ws_ref.intervalo_inicio,
        ws_ref.intervalo_fim,
        ws_ref.horas_diarias,
        ws_ref.dias_semana,
        ws_ref.tipo_turno,
        ws_ref.tolerancia_entrada,
        ws_ref.tolerancia_saida,
        COALESCE(ws_ref.status, 'ativo'),
        COALESCE(ws_ref.tipo_escala, 'fixa'),
        COALESCE(ws_ref.dias_trabalho, 5),
        COALESCE(ws_ref.dias_folga, 2),
        COALESCE(ws_ref.ciclo_dias, 7),
        COALESCE(ws_ref.regras_clt, '{}'::jsonb),
        COALESCE(ws_ref.template_escala, false),
        ws_ref.horarios_por_dia,
        NOW(),
        NOW()
    FROM rh.work_shifts ws_ref
    WHERE ws_ref.company_id = v_reference_company_id
    AND NOT EXISTS (
        SELECT 1 FROM rh.work_shifts ws_target
        WHERE ws_target.company_id = v_target_company_1 
        AND (
            (ws_ref.codigo IS NOT NULL AND ws_target.codigo = ws_ref.codigo) 
            OR (ws_ref.codigo IS NULL AND ws_target.nome = ws_ref.nome)
        )
    );
    
    GET DIAGNOSTICS v_copied_1 = ROW_COUNT;
    RAISE NOTICE 'Escalas copiadas para TECHSTEEL METAL LTDA: %', v_copied_1;
    
    -- 4. COPIAR DADOS PARA SMARTVIEW RENT LTDA
    RAISE NOTICE '';
    RAISE NOTICE '=== COPIANDO DADOS PARA SMARTVIEW RENT LTDA ===';
    
    INSERT INTO rh.work_shifts (
        company_id,
        nome,
        codigo,
        descricao,
        hora_inicio,
        hora_fim,
        intervalo_inicio,
        intervalo_fim,
        horas_diarias,
        dias_semana,
        tipo_turno,
        tolerancia_entrada,
        tolerancia_saida,
        status,
        tipo_escala,
        dias_trabalho,
        dias_folga,
        ciclo_dias,
        regras_clt,
        template_escala,
        horarios_por_dia,
        created_at,
        updated_at
    )
    SELECT 
        v_target_company_2,
        ws_ref.nome,
        -- Definir código como NULL ao copiar para evitar violação de constraint UNIQUE global
        -- O código é opcional e pode ser preenchido manualmente depois se necessário
        NULL,
        ws_ref.descricao,
        ws_ref.hora_inicio,
        ws_ref.hora_fim,
        ws_ref.intervalo_inicio,
        ws_ref.intervalo_fim,
        ws_ref.horas_diarias,
        ws_ref.dias_semana,
        ws_ref.tipo_turno,
        ws_ref.tolerancia_entrada,
        ws_ref.tolerancia_saida,
        COALESCE(ws_ref.status, 'ativo'),
        COALESCE(ws_ref.tipo_escala, 'fixa'),
        COALESCE(ws_ref.dias_trabalho, 5),
        COALESCE(ws_ref.dias_folga, 2),
        COALESCE(ws_ref.ciclo_dias, 7),
        COALESCE(ws_ref.regras_clt, '{}'::jsonb),
        COALESCE(ws_ref.template_escala, false),
        ws_ref.horarios_por_dia,
        NOW(),
        NOW()
    FROM rh.work_shifts ws_ref
    WHERE ws_ref.company_id = v_reference_company_id
    AND NOT EXISTS (
        SELECT 1 FROM rh.work_shifts ws_target
        WHERE ws_target.company_id = v_target_company_2 
        AND (
            (ws_ref.codigo IS NOT NULL AND ws_target.codigo = ws_ref.codigo) 
            OR (ws_ref.codigo IS NULL AND ws_target.nome = ws_ref.nome)
        )
    );
    
    GET DIAGNOSTICS v_copied_2 = ROW_COUNT;
    RAISE NOTICE 'Escalas copiadas para SMARTVIEW RENT LTDA: %', v_copied_2;
    
    -- 5. Verificar dados DEPOIS da cópia
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICANDO DADOS DEPOIS DA CÓPIA ===';
    
    SELECT COUNT(*) INTO v_count_after_1 
    FROM rh.work_shifts 
    WHERE company_id = v_target_company_1;
    
    SELECT COUNT(*) INTO v_count_after_2 
    FROM rh.work_shifts 
    WHERE company_id = v_target_company_2;
    
    RAISE NOTICE 'AXISENG LTDA (Referência): % escalas', v_count_ref;
    RAISE NOTICE 'TECHSTEEL METAL LTDA: % escalas (antes: %, adicionadas: %)', 
        v_count_after_1, v_count_before_1, v_copied_1;
    RAISE NOTICE 'SMARTVIEW RENT LTDA: % escalas (antes: %, adicionadas: %)', 
        v_count_after_2, v_count_before_2, v_copied_2;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== CÓPIA CONCLUÍDA COM SUCESSO! ===';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erro ao copiar escalas de trabalho: %', SQLERRM;
END $$;

-- Consulta para verificar os resultados detalhados
SELECT 
    'AXISENG LTDA (Referência)' as empresa,
    COUNT(*) as total_escalas
FROM rh.work_shifts 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'TECHSTEEL METAL LTDA',
    COUNT(*)
FROM rh.work_shifts 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'SMARTVIEW RENT LTDA',
    COUNT(*)
FROM rh.work_shifts 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855'
ORDER BY empresa;

-- Listar algumas escalas copiadas para verificação
SELECT 
    'TECHSTEEL METAL LTDA' as empresa,
    nome,
    codigo,
    hora_inicio,
    hora_fim,
    status
FROM rh.work_shifts 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
ORDER BY nome
LIMIT 10;

SELECT 
    'SMARTVIEW RENT LTDA' as empresa,
    nome,
    codigo,
    hora_inicio,
    hora_fim,
    status
FROM rh.work_shifts 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855'
ORDER BY nome
LIMIT 10;

