-- =====================================================
-- MIGRAÇÃO: Adicionar entidades faltantes para perfil Gerente
-- Data: 2025-01-20
-- Descrição: Adiciona entidades básicas que estão faltando para o perfil Gerente
-- =====================================================

-- Adicionar entidades básicas para o perfil Gerente (34632fe2-980b-4382-b104-ea244ed586f8)
INSERT INTO entity_permissions (id, profile_id, entity_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    '34632fe2-980b-4382-b104-ea244ed586f8',
    entity_name,
    true, true, true, false, -- Gerente pode ler, criar e editar, mas não deletar
    NOW(),
    NOW()
FROM (
    VALUES 
        ('users'),
        ('companies'),
        ('profiles'),
        ('projects'),
        ('materials_equipment'),
        ('partners'),
        ('cost_centers'),
        ('units'),
        ('employees'),
        ('positions'),
        ('time_records'),
        ('vacations'),
        ('reimbursements'),
        ('periodic_exams'),
        ('disciplinary_actions'),
        ('trainings'),
        ('contas_pagar'),
        ('contas_receber'),
        ('borderos'),
        ('remessas_bancarias'),
        ('retornos_bancarios'),
        ('contas_bancarias'),
        ('conciliacoes_bancarias'),
        ('fluxo_caixa'),
        ('nfe'),
        ('nfse'),
        ('plano_contas'),
        ('lancamentos_contabeis'),
        ('configuracoes_aprovacao'),
        ('aprovacoes'),
        ('estoque_atual'),
        ('movimentacoes_estoque'),
        ('entradas_materiais'),
        ('entrada_itens'),
        ('checklist_recebimento'),
        ('transferencias'),
        ('transferencia_itens'),
        ('inventarios'),
        ('inventario_itens'),
        ('almoxarifados'),
        ('materiais_equipamentos'),
        ('solicitacoes_compra')
) AS missing_entities(entity_name)
WHERE NOT EXISTS (
    SELECT 1 FROM entity_permissions 
    WHERE profile_id = '34632fe2-980b-4382-b104-ea244ed586f8' 
    AND entity_name = missing_entities.entity_name
);

-- Adicionar módulos básicos para o perfil Gerente
INSERT INTO module_permissions (id, profile_id, module_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    '34632fe2-980b-4382-b104-ea244ed586f8',
    module_name,
    true, true, true, false, -- Gerente pode ler, criar e editar, mas não deletar
    NOW(),
    NOW()
FROM (
    VALUES 
        ('dashboard'),
        ('users'),
        ('companies'),
        ('projects'),
        ('materials_equipment'),
        ('partners'),
        ('cost_centers'),
        ('cadastros'),
        ('configuracoes'),
        ('portal_colaborador'),
        ('portal_gestor'),
        ('financeiro'),
        ('compras'),
        ('almoxarifado'),
        ('frota'),
        ('logistica'),
        ('rh'),
        ('recruitment'),
        ('treinamento'),
        ('combustivel'),
        ('metalurgica'),
        ('comercial'),
        ('implantacao')
) AS missing_modules(module_name)
WHERE NOT EXISTS (
    SELECT 1 FROM module_permissions 
    WHERE profile_id = '34632fe2-980b-4382-b104-ea244ed586f8' 
    AND module_name = missing_modules.module_name
);

-- Verificar resultados
SELECT 'Entidades do Gerente após sincronização:' as info;
SELECT COUNT(*) as total_entities FROM entity_permissions WHERE profile_id = '34632fe2-980b-4382-b104-ea244ed586f8';

SELECT 'Módulos do Gerente após sincronização:' as info;
SELECT COUNT(*) as total_modules FROM module_permissions WHERE profile_id = '34632fe2-980b-4382-b104-ea244ed586f8';
