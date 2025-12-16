-- =====================================================
-- SCRIPT DE CÓPIA DE DADOS ENTRE EMPRESAS
-- =====================================================
-- Empresa de referência: dc060329-50cd-4114-922f-624a6ab036d6
-- Empresas destino:
--   - ce390408-1c18-47fc-bd7d-76379ec488b7
--   - ce92d32f-0503-43ca-b3cc-fb09a462b839
--   - f83704f6-3278-4d59-81ca-45925a1ab855
-- =====================================================

-- Variáveis
DO $$
DECLARE
    v_reference_company_id UUID := 'dc060329-50cd-4114-922f-624a6ab036d6';
    v_target_companies UUID[] := ARRAY[
        'ce390408-1c18-47fc-bd7d-76379ec488b7',
        'ce92d32f-0503-43ca-b3cc-fb09a462b839',
        'f83704f6-3278-4d59-81ca-45925a1ab855'
    ];
    v_target_company_id UUID;
    v_count INTEGER;
BEGIN
    -- Verificar se a empresa de referência existe
    SELECT COUNT(*) INTO v_count
    FROM public.companies
    WHERE id = v_reference_company_id;
    
    IF v_count = 0 THEN
        RAISE EXCEPTION 'Empresa de referência não encontrada: %', v_reference_company_id;
    END IF;
    
    RAISE NOTICE 'Iniciando cópia de dados da empresa %', v_reference_company_id;
    
    -- Loop através das empresas destino
    FOREACH v_target_company_id IN ARRAY v_target_companies
    LOOP
        -- Verificar se a empresa destino existe
        SELECT COUNT(*) INTO v_count
        FROM public.companies
        WHERE id = v_target_company_id;
        
        IF v_count = 0 THEN
            RAISE WARNING 'Empresa destino não encontrada: %, pulando...', v_target_company_id;
            CONTINUE;
        END IF;
        
        RAISE NOTICE 'Copiando dados para empresa: %', v_target_company_id;
        
        -- =====================================================
        -- 1. CENTROS DE CUSTO (cost_centers)
        -- =====================================================
        INSERT INTO public.cost_centers (
            company_id,
            nome,
            codigo,
            ativo,
            created_at,
            updated_at
        )
        SELECT 
            v_target_company_id,
            nome,
            codigo,
            ativo,
            NOW(),
            NOW()
        FROM public.cost_centers
        WHERE company_id = v_reference_company_id
        ON CONFLICT DO NOTHING;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '  - Centros de custo: % registros copiados', v_count;
        
        -- =====================================================
        -- 2. CARGOS (positions)
        -- =====================================================
        INSERT INTO rh.positions (
            company_id,
            nome,
            descricao,
            nivel_hierarquico,
            salario_minimo,
            salario_maximo,
            carga_horaria,
            is_active,
            created_at,
            updated_at
        )
        SELECT 
            v_target_company_id,
            nome,
            descricao,
            nivel_hierarquico,
            salario_minimo,
            salario_maximo,
            carga_horaria,
            is_active,
            NOW(),
            NOW()
        FROM rh.positions
        WHERE company_id = v_reference_company_id
        ON CONFLICT DO NOTHING;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '  - Cargos: % registros copiados', v_count;
        
        -- =====================================================
        -- 3. ESCALAS DE TRABALHO (work_shifts)
        -- =====================================================
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
            created_at,
            updated_at
        )
        SELECT 
            v_target_company_id,
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
            NOW(),
            NOW()
        FROM rh.work_shifts
        WHERE company_id = v_reference_company_id
        ON CONFLICT DO NOTHING;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '  - Escalas de trabalho (work_shifts): % registros copiados', v_count;
        
        -- =====================================================
        -- 3.1. ESCALAS DE TRABALHO (work_schedules) - se existir
        -- =====================================================
        IF EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'rh' AND table_name = 'work_schedules') THEN
            INSERT INTO rh.work_schedules (
                company_id,
                nome,
                descricao,
                carga_horaria_semanal,
                dias_trabalho,
                horario_inicio,
                horario_fim,
                intervalo_almoco,
                tolerancia_entrada,
                tolerancia_saida,
                is_active,
                created_at,
                updated_at
            )
            SELECT 
                v_target_company_id,
                nome,
                descricao,
                carga_horaria_semanal,
                dias_trabalho,
                horario_inicio,
                horario_fim,
                intervalo_almoco,
                tolerancia_entrada,
                tolerancia_saida,
                is_active,
                NOW(),
                NOW()
            FROM rh.work_schedules
            WHERE company_id = v_reference_company_id
            ON CONFLICT DO NOTHING;
            
            GET DIAGNOSTICS v_count = ROW_COUNT;
            RAISE NOTICE '  - Escalas de trabalho (work_schedules): % registros copiados', v_count;
        END IF;
        
        -- =====================================================
        -- 4. CONFIGURAÇÕES DO BANCO DE HORAS (bank_hours_config)
        -- Nota: Esta tabela é por employee, então não copiamos aqui
        -- Mas podemos copiar configurações gerais se houver
        -- =====================================================
        
        -- =====================================================
        -- 5. ZONAS DE LOCALIZAÇÃO (location_zones)
        -- =====================================================
        INSERT INTO rh.location_zones (
            company_id,
            nome,
            descricao,
            latitude,
            longitude,
            raio_metros,
            ativo,
            created_at,
            updated_at
        )
        SELECT 
            v_target_company_id,
            nome,
            descricao,
            latitude,
            longitude,
            raio_metros,
            ativo,
            NOW(),
            NOW()
        FROM rh.location_zones
        WHERE company_id = v_reference_company_id
        ON CONFLICT DO NOTHING;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '  - Zonas de localização: % registros copiados', v_count;
        
        -- =====================================================
        -- 6. RUBRICAS (rubricas)
        -- =====================================================
        INSERT INTO rh.rubricas (
            company_id,
            codigo,
            nome,
            descricao,
            tipo,
            categoria,
            natureza,
            calculo_automatico,
            formula_calculo,
            valor_fixo,
            percentual,
            base_calculo,
            incidencia_ir,
            incidencia_inss,
            incidencia_fgts,
            incidencia_contribuicao_sindical,
            ordem_exibicao,
            obrigatorio,
            ativo,
            created_at,
            updated_at
        )
        SELECT 
            v_target_company_id,
            codigo,
            nome,
            descricao,
            tipo,
            categoria,
            natureza,
            calculo_automatico,
            formula_calculo,
            valor_fixo,
            percentual,
            base_calculo,
            incidencia_ir,
            incidencia_inss,
            incidencia_fgts,
            incidencia_contribuicao_sindical,
            ordem_exibicao,
            obrigatorio,
            ativo,
            NOW(),
            NOW()
        FROM rh.rubricas
        WHERE company_id = v_reference_company_id
        ON CONFLICT (codigo, company_id) DO NOTHING;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '  - Rubricas: % registros copiados', v_count;
        
        -- =====================================================
        -- 7. FAIXAS INSS (inss_brackets)
        -- =====================================================
        INSERT INTO rh.inss_brackets (
            company_id,
            codigo,
            descricao,
            ano_vigencia,
            mes_vigencia,
            valor_minimo,
            valor_maximo,
            aliquota,
            valor_deducao,
            ativo,
            created_at,
            updated_at
        )
        SELECT 
            v_target_company_id,
            codigo,
            descricao,
            ano_vigencia,
            mes_vigencia,
            valor_minimo,
            valor_maximo,
            aliquota,
            valor_deducao,
            ativo,
            NOW(),
            NOW()
        FROM rh.inss_brackets
        WHERE company_id = v_reference_company_id
        ON CONFLICT (codigo, company_id, ano_vigencia, mes_vigencia) DO NOTHING;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '  - Faixas INSS: % registros copiados', v_count;
        
        -- =====================================================
        -- 8. FAIXAS IRRF (irrf_brackets)
        -- =====================================================
        INSERT INTO rh.irrf_brackets (
            company_id,
            codigo,
            descricao,
            ano_vigencia,
            mes_vigencia,
            valor_minimo,
            valor_maximo,
            aliquota,
            valor_deducao,
            numero_dependentes,
            valor_por_dependente,
            ativo,
            created_at,
            updated_at
        )
        SELECT 
            v_target_company_id,
            codigo,
            descricao,
            ano_vigencia,
            mes_vigencia,
            valor_minimo,
            valor_maximo,
            aliquota,
            valor_deducao,
            numero_dependentes,
            valor_por_dependente,
            ativo,
            NOW(),
            NOW()
        FROM rh.irrf_brackets
        WHERE company_id = v_reference_company_id
        ON CONFLICT (codigo, company_id, ano_vigencia, mes_vigencia) DO NOTHING;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '  - Faixas IRRF: % registros copiados', v_count;
        
        -- =====================================================
        -- 9. CONFIGURAÇÕES FGTS (fgts_config)
        -- =====================================================
        INSERT INTO rh.fgts_config (
            company_id,
            codigo,
            descricao,
            ano_vigencia,
            mes_vigencia,
            aliquota_fgts,
            aliquota_multa,
            aliquota_juros,
            teto_salario,
            valor_minimo_contribuicao,
            multa_rescisao,
            ativo,
            created_at,
            updated_at
        )
        SELECT 
            v_target_company_id,
            codigo,
            descricao,
            ano_vigencia,
            mes_vigencia,
            aliquota_fgts,
            aliquota_multa,
            aliquota_juros,
            teto_salario,
            valor_minimo_contribuicao,
            multa_rescisao,
            ativo,
            NOW(),
            NOW()
        FROM rh.fgts_config
        WHERE company_id = v_reference_company_id
        ON CONFLICT (codigo, company_id, ano_vigencia, mes_vigencia) DO NOTHING;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '  - Configurações FGTS: % registros copiados', v_count;
        
        -- =====================================================
        -- 10. CONFIGURAÇÕES DE FOLHA (payroll_config)
        -- =====================================================
        IF EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'rh' AND table_name = 'payroll_config') THEN
            INSERT INTO rh.payroll_config (
                company_id,
                codigo,
                descricao,
                ativo,
                ano_vigencia,
                mes_vigencia,
                dias_uteis_mes,
                horas_dia_trabalho,
                percentual_hora_extra,
                percentual_hora_noturna,
                percentual_dsr,
                aplicar_inss,
                aplicar_irrf,
                aplicar_fgts,
                aplicar_vale_transporte,
                percentual_vale_transporte,
                aplicar_adicional_noturno,
                percentual_adicional_noturno,
                aplicar_periculosidade,
                percentual_periculosidade,
                aplicar_insalubridade,
                grau_insalubridade,
                aplicar_ferias_proporcionais,
                aplicar_terco_ferias,
                aplicar_13_salario,
                desconto_faltas,
                desconto_atrasos,
                tolerancia_atraso_minutos,
                arredondar_centavos,
                tipo_arredondamento,
                observacoes,
                created_at,
                updated_at
            )
            SELECT 
                v_target_company_id,
                codigo,
                descricao,
                ativo,
                ano_vigencia,
                mes_vigencia,
                dias_uteis_mes,
                horas_dia_trabalho,
                percentual_hora_extra,
                percentual_hora_noturna,
                percentual_dsr,
                aplicar_inss,
                aplicar_irrf,
                aplicar_fgts,
                aplicar_vale_transporte,
                percentual_vale_transporte,
                aplicar_adicional_noturno,
                percentual_adicional_noturno,
                aplicar_periculosidade,
                percentual_periculosidade,
                aplicar_insalubridade,
                grau_insalubridade,
                aplicar_ferias_proporcionais,
                aplicar_terco_ferias,
                aplicar_13_salario,
                desconto_faltas,
                desconto_atrasos,
                tolerancia_atraso_minutos,
                arredondar_centavos,
                tipo_arredondamento,
                observacoes,
                NOW(),
                NOW()
            FROM rh.payroll_config
            WHERE company_id = v_reference_company_id
            ON CONFLICT (company_id, ano_vigencia, mes_vigencia) DO NOTHING;
            
            GET DIAGNOSTICS v_count = ROW_COUNT;
            RAISE NOTICE '  - Configurações de folha: % registros copiados', v_count;
        END IF;
        
        -- =====================================================
        -- 11. CONFIGURAÇÃO DE INTEGRAÇÃO FINANCEIRA
        -- =====================================================
        
        -- 11.1. financial_integration_config (rh)
        IF EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'rh' AND table_name = 'financial_integration_config') THEN
            INSERT INTO rh.financial_integration_config (
                company_id,
                config,
                created_at,
                updated_at
            )
            SELECT 
                v_target_company_id,
                config,
                NOW(),
                NOW()
            FROM rh.financial_integration_config
            WHERE company_id = v_reference_company_id
            ON CONFLICT (company_id) DO UPDATE
            SET config = EXCLUDED.config,
                updated_at = NOW();
            
            GET DIAGNOSTICS v_count = ROW_COUNT;
            RAISE NOTICE '  - Configuração integração financeira (rh): % registros copiados', v_count;
        END IF;
        
        -- 11.2. configuracao_fiscal (financeiro)
        IF EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'financeiro' AND table_name = 'configuracao_fiscal') THEN
            INSERT INTO financeiro.configuracao_fiscal (
                company_id,
                nome_configuracao,
                uf,
                tipo_documento,
                ambiente,
                certificado_digital,
                senha_certificado,
                data_validade_certificado,
                webservice_url,
                versao_layout,
                serie_numeracao,
                numero_inicial,
                numero_final,
                configuracao_uf,
                certificado_valido,
                conectividade_ok,
                ultima_validacao,
                erro_validacao,
                observacoes,
                created_by,
                is_active,
                created_at,
                updated_at
            )
            SELECT 
                v_target_company_id,
                nome_configuracao,
                uf,
                tipo_documento,
                ambiente,
                certificado_digital,
                senha_certificado,
                data_validade_certificado,
                webservice_url,
                versao_layout,
                serie_numeracao,
                numero_inicial,
                numero_final,
                configuracao_uf,
                certificado_valido,
                conectividade_ok,
                ultima_validacao,
                erro_validacao,
                observacoes,
                created_by,
                is_active,
                NOW(),
                NOW()
            FROM financeiro.configuracao_fiscal
            WHERE company_id = v_reference_company_id
            ON CONFLICT (company_id, uf, tipo_documento, ambiente) DO NOTHING;
            
            GET DIAGNOSTICS v_count = ROW_COUNT;
            RAISE NOTICE '  - Configuração fiscal: % registros copiados', v_count;
        END IF;
        
        -- 11.3. configuracao_bancaria (financeiro)
        IF EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'financeiro' AND table_name = 'configuracao_bancaria') THEN
            INSERT INTO financeiro.configuracao_bancaria (
                company_id,
                nome_configuracao,
                banco_codigo,
                banco_nome,
                ambiente,
                client_id,
                client_secret,
                api_key,
                access_token,
                refresh_token,
                base_url,
                auth_url,
                api_version,
                grant_type,
                scope,
                token_expires_at,
                configuracao_banco,
                credenciais_validas,
                conectividade_ok,
                ultima_validacao,
                erro_validacao,
                observacoes,
                created_by,
                is_active,
                created_at,
                updated_at
            )
            SELECT 
                v_target_company_id,
                nome_configuracao,
                banco_codigo,
                banco_nome,
                ambiente,
                client_id,
                client_secret,
                api_key,
                access_token,
                refresh_token,
                base_url,
                auth_url,
                api_version,
                grant_type,
                scope,
                token_expires_at,
                configuracao_banco,
                credenciais_validas,
                conectividade_ok,
                ultima_validacao,
                erro_validacao,
                observacoes,
                created_by,
                is_active,
                NOW(),
                NOW()
            FROM financeiro.configuracao_bancaria
            WHERE company_id = v_reference_company_id
            ON CONFLICT (company_id, banco_codigo, ambiente) DO NOTHING;
            
            GET DIAGNOSTICS v_count = ROW_COUNT;
            RAISE NOTICE '  - Configuração bancária: % registros copiados', v_count;
        END IF;
        
        RAISE NOTICE 'Cópia concluída para empresa: %', v_target_company_id;
        
    END LOOP;
    
    RAISE NOTICE 'Processo de cópia finalizado!';
    
END $$;
















