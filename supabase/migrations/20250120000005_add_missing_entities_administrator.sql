-- =====================================================
-- MIGRAÇÃO: Adicionar entidades faltantes para perfil Administrador
-- Data: 2025-01-20
-- Descrição: Adiciona entidades básicas que estão faltando para o perfil Administrador
-- =====================================================

-- Adicionar entidades básicas para o perfil Administrador (20bef50d-2e82-4e1c-926d-c47b659e3cfd)
INSERT INTO entity_permissions (id, profile_id, entity_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    '20bef50d-2e82-4e1c-926d-c47b659e3cfd',
    entity_name,
    true, true, true, true,
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
    WHERE profile_id = '20bef50d-2e82-4e1c-926d-c47b659e3cfd' 
    AND entity_name = missing_entities.entity_name
);

-- Adicionar módulos básicos para o perfil Administrador
INSERT INTO module_permissions (id, profile_id, module_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    '20bef50d-2e82-4e1c-926d-c47b659e3cfd',
    module_name,
    true, true, true, true,
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
    WHERE profile_id = '20bef50d-2e82-4e1c-926d-c47b659e3cfd' 
    AND module_name = missing_modules.module_name
);

-- Verificar resultados
SELECT 'Entidades do Administrador após sincronização:' as info;
SELECT COUNT(*) as total_entities FROM entity_permissions WHERE profile_id = '20bef50d-2e82-4e1c-926d-c47b659e3cfd';

SELECT 'Módulos do Administrador após sincronização:' as info;
SELECT COUNT(*) as total_modules FROM module_permissions WHERE profile_id = '20bef50d-2e82-4e1c-926d-c47b659e3cfd';
