-- Script de diagnóstico detalhado - Verifica dados faltantes empresa por empresa
DO $$
DECLARE
    v_reference_company_id UUID := 'dc060329-50cd-4114-922f-624a6ab036d6';
    v_target_companies UUID[] := ARRAY[
        'ce390408-1c18-47fc-bd7d-76379ec488b7',
        'ce92d32f-0503-43ca-b3cc-fb09a462b839',
        'f83704f6-3278-4d59-81ca-45925a1ab855'
    ];
    v_target_company_id UUID;
    v_ref_count INTEGER;
    v_target_count INTEGER;
    v_missing_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DIAGNÓSTICO DETALHADO DE DADOS FALTANTES';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    -- Verificar empresa de referência
    RAISE NOTICE 'EMPRESA DE REFERÊNCIA: %', v_reference_company_id;
    RAISE NOTICE '';
    
    -- Loop através das empresas destino
    FOREACH v_target_company_id IN ARRAY v_target_companies
    LOOP
        RAISE NOTICE '========================================';
        RAISE NOTICE 'EMPRESA DESTINO: %', v_target_company_id;
        RAISE NOTICE '========================================';
        RAISE NOTICE '';
        
        -- 1. CENTROS DE CUSTO
        SELECT COUNT(*) INTO v_ref_count FROM public.cost_centers WHERE company_id = v_reference_company_id;
        SELECT COUNT(*) INTO v_target_count FROM public.cost_centers WHERE company_id = v_target_company_id;
        v_missing_count := v_ref_count - v_target_count;
        IF v_missing_count > 0 THEN
            RAISE NOTICE '❌ Centros de Custo: Referência: %, Destino: %, FALTANDO: %', v_ref_count, v_target_count, v_missing_count;
        ELSE
            RAISE NOTICE '✅ Centros de Custo: Referência: %, Destino: %', v_ref_count, v_target_count;
        END IF;
        
        -- 2. CARGOS
        SELECT COUNT(*) INTO v_ref_count FROM rh.positions WHERE company_id = v_reference_company_id;
        SELECT COUNT(*) INTO v_target_count FROM rh.positions WHERE company_id = v_target_company_id;
        v_missing_count := v_ref_count - v_target_count;
        IF v_missing_count > 0 THEN
            RAISE NOTICE '❌ Cargos: Referência: %, Destino: %, FALTANDO: %', v_ref_count, v_target_count, v_missing_count;
        ELSE
            RAISE NOTICE '✅ Cargos: Referência: %, Destino: %', v_ref_count, v_target_count;
        END IF;
        
        -- 3. ESCALAS DE TRABALHO (work_shifts)
        SELECT COUNT(*) INTO v_ref_count FROM rh.work_shifts WHERE company_id = v_reference_company_id;
        SELECT COUNT(*) INTO v_target_count FROM rh.work_shifts WHERE company_id = v_target_company_id;
        v_missing_count := v_ref_count - v_target_count;
        IF v_missing_count > 0 THEN
            RAISE NOTICE '❌ Escalas de Trabalho (work_shifts): Referência: %, Destino: %, FALTANDO: %', v_ref_count, v_target_count, v_missing_count;
        ELSE
            RAISE NOTICE '✅ Escalas de Trabalho (work_shifts): Referência: %, Destino: %', v_ref_count, v_target_count;
        END IF;
        
        -- 3.1. ESCALAS DE TRABALHO (work_schedules) - se existir
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'rh' AND table_name = 'work_schedules') THEN
            SELECT COUNT(*) INTO v_ref_count FROM rh.work_schedules WHERE company_id = v_reference_company_id;
            SELECT COUNT(*) INTO v_target_count FROM rh.work_schedules WHERE company_id = v_target_company_id;
            v_missing_count := v_ref_count - v_target_count;
            IF v_missing_count > 0 THEN
                RAISE NOTICE '❌ Escalas de Trabalho (work_schedules): Referência: %, Destino: %, FALTANDO: %', v_ref_count, v_target_count, v_missing_count;
            ELSE
                RAISE NOTICE '✅ Escalas de Trabalho (work_schedules): Referência: %, Destino: %', v_ref_count, v_target_count;
            END IF;
        END IF;
        
        -- 4. ZONAS DE LOCALIZAÇÃO
        SELECT COUNT(*) INTO v_ref_count FROM rh.location_zones WHERE company_id = v_reference_company_id;
        SELECT COUNT(*) INTO v_target_count FROM rh.location_zones WHERE company_id = v_target_company_id;
        v_missing_count := v_ref_count - v_target_count;
        IF v_missing_count > 0 THEN
            RAISE NOTICE '❌ Zonas de Localização: Referência: %, Destino: %, FALTANDO: %', v_ref_count, v_target_count, v_missing_count;
        ELSE
            RAISE NOTICE '✅ Zonas de Localização: Referência: %, Destino: %', v_ref_count, v_target_count;
        END IF;
        
        -- 5. RUBRICAS
        SELECT COUNT(*) INTO v_ref_count FROM rh.rubricas WHERE company_id = v_reference_company_id;
        SELECT COUNT(*) INTO v_target_count FROM rh.rubricas WHERE company_id = v_target_company_id;
        v_missing_count := v_ref_count - v_target_count;
        IF v_missing_count > 0 THEN
            RAISE NOTICE '❌ Rubricas: Referência: %, Destino: %, FALTANDO: %', v_ref_count, v_target_count, v_missing_count;
        ELSE
            RAISE NOTICE '✅ Rubricas: Referência: %, Destino: %', v_ref_count, v_target_count;
        END IF;
        
        -- 6. FAIXAS INSS
        SELECT COUNT(*) INTO v_ref_count FROM rh.inss_brackets WHERE company_id = v_reference_company_id;
        SELECT COUNT(*) INTO v_target_count FROM rh.inss_brackets WHERE company_id = v_target_company_id;
        v_missing_count := v_ref_count - v_target_count;
        IF v_missing_count > 0 THEN
            RAISE NOTICE '❌ Faixas INSS: Referência: %, Destino: %, FALTANDO: %', v_ref_count, v_target_count, v_missing_count;
        ELSE
            RAISE NOTICE '✅ Faixas INSS: Referência: %, Destino: %', v_ref_count, v_target_count;
        END IF;
        
        -- 7. FAIXAS IRRF
        SELECT COUNT(*) INTO v_ref_count FROM rh.irrf_brackets WHERE company_id = v_reference_company_id;
        SELECT COUNT(*) INTO v_target_count FROM rh.irrf_brackets WHERE company_id = v_target_company_id;
        v_missing_count := v_ref_count - v_target_count;
        IF v_missing_count > 0 THEN
            RAISE NOTICE '❌ Faixas IRRF: Referência: %, Destino: %, FALTANDO: %', v_ref_count, v_target_count, v_missing_count;
        ELSE
            RAISE NOTICE '✅ Faixas IRRF: Referência: %, Destino: %', v_ref_count, v_target_count;
        END IF;
        
        -- 8. CONFIGURAÇÕES FGTS
        SELECT COUNT(*) INTO v_ref_count FROM rh.fgts_config WHERE company_id = v_reference_company_id;
        SELECT COUNT(*) INTO v_target_count FROM rh.fgts_config WHERE company_id = v_target_company_id;
        v_missing_count := v_ref_count - v_target_count;
        IF v_missing_count > 0 THEN
            RAISE NOTICE '❌ Configurações FGTS: Referência: %, Destino: %, FALTANDO: %', v_ref_count, v_target_count, v_missing_count;
        ELSE
            RAISE NOTICE '✅ Configurações FGTS: Referência: %, Destino: %', v_ref_count, v_target_count;
        END IF;
        
        -- 9. CONFIGURAÇÕES DE FOLHA (payroll_config)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'rh' AND table_name = 'payroll_config') THEN
            SELECT COUNT(*) INTO v_ref_count FROM rh.payroll_config WHERE company_id = v_reference_company_id;
            SELECT COUNT(*) INTO v_target_count FROM rh.payroll_config WHERE company_id = v_target_company_id;
            v_missing_count := v_ref_count - v_target_count;
            IF v_missing_count > 0 THEN
                RAISE NOTICE '❌ Configurações de Folha: Referência: %, Destino: %, FALTANDO: %', v_ref_count, v_target_count, v_missing_count;
            ELSE
                RAISE NOTICE '✅ Configurações de Folha: Referência: %, Destino: %', v_ref_count, v_target_count;
            END IF;
        END IF;
        
        -- 10. CONFIGURAÇÃO DE INTEGRAÇÃO FINANCEIRA (rh)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'rh' AND table_name = 'financial_integration_config') THEN
            SELECT COUNT(*) INTO v_ref_count FROM rh.financial_integration_config WHERE company_id = v_reference_company_id;
            SELECT COUNT(*) INTO v_target_count FROM rh.financial_integration_config WHERE company_id = v_target_company_id;
            v_missing_count := v_ref_count - v_target_count;
            IF v_missing_count > 0 THEN
                RAISE NOTICE '❌ Configuração Integração Financeira (rh): Referência: %, Destino: %, FALTANDO: %', v_ref_count, v_target_count, v_missing_count;
            ELSE
                RAISE NOTICE '✅ Configuração Integração Financeira (rh): Referência: %, Destino: %', v_ref_count, v_target_count;
            END IF;
        END IF;
        
        -- 11. CONFIGURAÇÃO FISCAL (financeiro)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'financeiro' AND table_name = 'configuracao_fiscal') THEN
            SELECT COUNT(*) INTO v_ref_count FROM financeiro.configuracao_fiscal WHERE company_id = v_reference_company_id;
            SELECT COUNT(*) INTO v_target_count FROM financeiro.configuracao_fiscal WHERE company_id = v_target_company_id;
            v_missing_count := v_ref_count - v_target_count;
            IF v_missing_count > 0 THEN
                RAISE NOTICE '❌ Configuração Fiscal: Referência: %, Destino: %, FALTANDO: %', v_ref_count, v_target_count, v_missing_count;
            ELSE
                RAISE NOTICE '✅ Configuração Fiscal: Referência: %, Destino: %', v_ref_count, v_target_count;
            END IF;
        END IF;
        
        -- 12. CONFIGURAÇÃO BANCÁRIA (financeiro)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'financeiro' AND table_name = 'configuracao_bancaria') THEN
            SELECT COUNT(*) INTO v_ref_count FROM financeiro.configuracao_bancaria WHERE company_id = v_reference_company_id;
            SELECT COUNT(*) INTO v_target_count FROM financeiro.configuracao_bancaria WHERE company_id = v_target_company_id;
            v_missing_count := v_ref_count - v_target_count;
            IF v_missing_count > 0 THEN
                RAISE NOTICE '❌ Configuração Bancária: Referência: %, Destino: %, FALTANDO: %', v_ref_count, v_target_count, v_missing_count;
            ELSE
                RAISE NOTICE '✅ Configuração Bancária: Referência: %, Destino: %', v_ref_count, v_target_count;
            END IF;
        END IF;
        
        -- 13. CONFIGURAÇÕES DO BANCO DE HORAS (bank_hours_config)
        -- Nota: Esta tabela é por employee, mas vamos verificar se há configurações gerais
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'rh' AND table_name = 'bank_hours_config') THEN
            SELECT COUNT(DISTINCT company_id) INTO v_ref_count FROM rh.bank_hours_config WHERE company_id = v_reference_company_id;
            SELECT COUNT(DISTINCT company_id) INTO v_target_count FROM rh.bank_hours_config WHERE company_id = v_target_company_id;
            -- Para bank_hours_config, verificamos se existe pelo menos uma configuração
            IF v_ref_count > 0 AND v_target_count = 0 THEN
                RAISE NOTICE '⚠️  Configurações Banco de Horas: Referência tem %, Destino tem % (tabela por employee)', v_ref_count, v_target_count;
            END IF;
        END IF;
        
        RAISE NOTICE '';
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DIAGNÓSTICO CONCLUÍDO';
    RAISE NOTICE '========================================';
    
END $$;










