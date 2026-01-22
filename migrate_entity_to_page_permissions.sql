-- =====================================================
-- SCRIPT DE MIGRAÇÃO: ENTIDADE → PÁGINA
-- =====================================================
-- Este script migra permissões de entidade para permissões de página
-- Mapeia cada entidade para sua(s) página(s) correspondente(s)
-- =====================================================

DO $$
DECLARE
    v_profile_record RECORD;
    v_entity_record RECORD;
    v_page_path TEXT;
    v_inserted_count INTEGER := 0;
    v_updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔄 Iniciando migração de permissões de entidade para página...';
    
    -- Para cada perfil que tem permissões de entidade
    FOR v_profile_record IN 
        SELECT DISTINCT profile_id 
        FROM entity_permissions
    LOOP
        RAISE NOTICE '📋 Processando perfil: %', v_profile_record.profile_id;
        
        -- Para cada permissão de entidade deste perfil
        FOR v_entity_record IN
            SELECT *
            FROM entity_permissions
            WHERE profile_id = v_profile_record.profile_id
        LOOP
            -- Mapear entidade para página(s)
            -- Este mapeamento pode ser expandido conforme necessário
            v_page_path := CASE v_entity_record.entity_name
                -- RH
                WHEN 'employees' THEN '/rh/employees*'
                WHEN 'funcionarios' THEN '/rh/employees*'
                WHEN 'positions' THEN '/rh/positions*'
                WHEN 'cargos' THEN '/rh/positions*'
                WHEN 'units' THEN '/rh/units*'
                WHEN 'departamentos' THEN '/rh/units*'
                WHEN 'time_records' THEN '/rh/time-records*'
                WHEN 'registros_ponto' THEN '/rh/time-records*'
                WHEN 'work_shifts' THEN '/rh/work-shifts*'
                WHEN 'turnos_trabalho' THEN '/rh/work-shifts*'
                WHEN 'vacations' THEN '/rh/vacations*'
                WHEN 'ferias' THEN '/rh/vacations*'
                WHEN 'payroll' THEN '/rh/payroll*'
                WHEN 'folha' THEN '/rh/payroll*'
                WHEN 'treinamentos' THEN '/rh/treinamentos*'
                WHEN 'trainings' THEN '/rh/treinamentos*'
                WHEN 'periodic_exams' THEN '/rh/periodic-exams*'
                WHEN 'exames_periodicos' THEN '/rh/periodic-exams*'
                WHEN 'holidays' THEN '/rh/holidays*'
                WHEN 'feriados' THEN '/rh/holidays*'
                WHEN 'benefits' THEN '/rh/benefits*'
                WHEN 'beneficios' THEN '/rh/benefits*'
                WHEN 'medical_agreements' THEN '/rh/medical-agreements*'
                WHEN 'convenios_medicos' THEN '/rh/medical-agreements*'
                WHEN 'disciplinary_actions' THEN '/rh/disciplinary-actions*'
                WHEN 'acoes_disciplinares' THEN '/rh/disciplinary-actions*'
                
                -- Portal Colaborador
                WHEN 'portal_colaborador' THEN '/portal-colaborador*'
                WHEN 'time_records' THEN '/portal-colaborador/historico-marcacoes*'
                WHEN 'periodic_exams' THEN '/portal-colaborador/exames*'
                WHEN 'income_statements' THEN '/portal-colaborador/comprovantes*'
                WHEN 'vacations' THEN '/portal-colaborador/ferias*'
                WHEN 'reimbursement_requests' THEN '/portal-colaborador/reembolsos*'
                WHEN 'medical_certificates' THEN '/portal-colaborador/atestados*'
                
                -- Portal Gestor
                WHEN 'approval_center' THEN '/portal-gestor/aprovacoes*'
                WHEN 'approvals' THEN '/portal-gestor/aprovacoes*'
                WHEN 'approval_configs' THEN '/portal-gestor/aprovacoes*'
                WHEN 'vacation_approvals' THEN '/portal-gestor/aprovacoes/ferias*'
                WHEN 'exam_management' THEN '/portal-gestor/acompanhamento/exames*'
                WHEN 'time_tracking_management' THEN '/portal-gestor/acompanhamento/ponto*'
                WHEN 'manager_dashboard' THEN '/portal-gestor*'
                
                -- Cadastros
                WHEN 'users' THEN '/cadastros/usuarios*'
                WHEN 'usuarios' THEN '/cadastros/usuarios*'
                WHEN 'companies' THEN '/cadastros/empresas*'
                WHEN 'empresas' THEN '/cadastros/empresas*'
                WHEN 'profiles' THEN '/cadastros/perfis*'
                WHEN 'perfis' THEN '/cadastros/perfis*'
                WHEN 'projects' THEN '/cadastros/projetos*'
                WHEN 'projetos' THEN '/cadastros/projetos*'
                WHEN 'partners' THEN '/cadastros/parceiros*'
                WHEN 'parceiros' THEN '/cadastros/parceiros*'
                WHEN 'services' THEN '/cadastros/servicos*'
                WHEN 'servicos' THEN '/cadastros/servicos*'
                WHEN 'cost_centers' THEN '/cadastros/centros-custo*'
                WHEN 'centros_custo' THEN '/cadastros/centros-custo*'
                
                -- Financeiro
                WHEN 'contas_pagar' THEN '/financeiro/contas-pagar*'
                WHEN 'contas_receber' THEN '/financeiro/contas-receber*'
                WHEN 'borderos' THEN '/financeiro/lotes-pagamento*'
                WHEN 'fluxo_caixa' THEN '/financeiro/tesouraria*'
                WHEN 'conciliacoes_bancarias' THEN '/financeiro/conciliacao-bancaria*'
                WHEN 'plano_contas' THEN '/financeiro/contabilidade*'
                WHEN 'nfe' THEN '/financeiro/fiscal*'
                WHEN 'configuracao_bancaria' THEN '/financeiro/bancaria*'
                
                -- Compras
                WHEN 'solicitacoes_compra' THEN '/compras/requisicoes*'
                WHEN 'cotacoes' THEN '/compras/cotacoes*'
                WHEN 'pedidos_compra' THEN '/compras/pedidos*'
                WHEN 'contratos_compra' THEN '/compras/contratos*'
                WHEN 'historico_compras' THEN '/compras/historico*'
                WHEN 'avaliacao_fornecedores' THEN '/compras/fornecedores*'
                
                -- Almoxarifado
                WHEN 'materials_equipment' THEN '/almoxarifado/materiais*'
                WHEN 'estoque_atual' THEN '/almoxarifado/estoque*'
                WHEN 'entradas_materiais' THEN '/almoxarifado/entradas*'
                WHEN 'transferencias' THEN '/almoxarifado/saidas*'
                WHEN 'inventarios' THEN '/almoxarifado/inventario*'
                WHEN 'almoxarifados' THEN '/almoxarifado/almoxarifados*'
                WHEN 'localizacoes_fisicas' THEN '/almoxarifado/localizacoes*'
                
                -- Outros
                WHEN 'time_record_settings' THEN '/rh/ponto-eletronico-config*'
                WHEN 'registros_ponto' THEN '/rh/location-zones*'
                WHEN 'inss_brackets' THEN '/rh/inss-brackets*'
                WHEN 'irrf_brackets' THEN '/rh/irrf-brackets*'
                WHEN 'rubricas' THEN '/rh/rubricas*'
                WHEN 'awards_productivity' THEN '/rh/awards-productivity*'
                WHEN 'medical_plans' THEN '/rh/medical-plans*'
                WHEN 'employee_medical_plans' THEN '/rh/employee-medical-plans*'
                WHEN 'employee_union_memberships' THEN '/rh/employee-union-memberships*'
                
                ELSE NULL
            END;
            
            -- Se encontrou mapeamento, inserir/atualizar permissão de página
            IF v_page_path IS NOT NULL THEN
                INSERT INTO page_permissions (
                    profile_id,
                    page_path,
                    can_read,
                    can_create,
                    can_edit,
                    can_delete
                )
                VALUES (
                    v_profile_record.profile_id,
                    v_page_path,
                    v_entity_record.can_read,
                    v_entity_record.can_create,
                    v_entity_record.can_edit,
                    v_entity_record.can_delete
                )
                ON CONFLICT (profile_id, page_path)
                DO UPDATE SET
                    can_read = GREATEST(page_permissions.can_read, v_entity_record.can_read),
                    can_create = GREATEST(page_permissions.can_create, v_entity_record.can_create),
                    can_edit = GREATEST(page_permissions.can_edit, v_entity_record.can_edit),
                    can_delete = GREATEST(page_permissions.can_delete, v_entity_record.can_delete),
                    updated_at = NOW();
                
                GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
                IF v_inserted_count > 0 THEN
                    v_updated_count := v_updated_count + 1;
                END IF;
                
                RAISE NOTICE '  ✅ Migrado: % → %', v_entity_record.entity_name, v_page_path;
            ELSE
                RAISE NOTICE '  ⚠️  Sem mapeamento: %', v_entity_record.entity_name;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '✅ Migração concluída!';
    RAISE NOTICE '📊 Total de permissões migradas: %', v_updated_count;
END $$;

-- Verificar resultado
SELECT 
    pp.profile_id,
    p.nome as perfil_nome,
    pp.page_path,
    pp.can_read,
    pp.can_create,
    pp.can_edit,
    pp.can_delete
FROM page_permissions pp
JOIN profiles p ON p.id = pp.profile_id
ORDER BY p.nome, pp.page_path
LIMIT 50;
