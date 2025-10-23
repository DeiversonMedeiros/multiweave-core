-- =====================================================
-- MIGRAÇÃO: Sincronizar inconsistências de permissões
-- Data: 2025-01-20
-- Descrição: Corrige inconsistências entre código e banco de dados
-- =====================================================

-- 1. Atualizar módulo 'materials' para 'materials_equipment'
UPDATE module_permissions 
SET module_name = 'materials_equipment' 
WHERE module_name = 'materials';

-- 2. Atualizar entidade 'materials' para 'materials_equipment'
UPDATE entity_permissions 
SET entity_name = 'materials_equipment' 
WHERE entity_name = 'materials';

-- 3. Adicionar entidade 'units' que está no banco mas não no código
-- (Vamos manter no banco pois é usada pelo sistema)

-- 4. Adicionar módulo 'cadastros' que está no banco mas não no código
-- (Vamos manter no banco pois é usado pelo sistema)

-- 5. Adicionar entidades que estão no código mas não no banco
-- Para o perfil Super Admin (2242ce27-800c-494e-b7b9-c75cb832aa4d)
INSERT INTO entity_permissions (id, profile_id, entity_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    '2242ce27-800c-494e-b7b9-c75cb832aa4d',
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
    WHERE profile_id = '2242ce27-800c-494e-b7b9-c75cb832aa4d' 
    AND entity_name = missing_entities.entity_name
);

-- 6. Adicionar módulos que estão no código mas não no banco
-- Para o perfil Super Admin (2242ce27-800c-494e-b7b9-c75cb832aa4d)
INSERT INTO module_permissions (id, profile_id, module_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    '2242ce27-800c-494e-b7b9-c75cb832aa4d',
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
    WHERE profile_id = '2242ce27-800c-494e-b7b9-c75cb832aa4d' 
    AND module_name = missing_modules.module_name
);

-- 7. Verificar resultados
SELECT 'Módulos no banco após sincronização:' as info;
SELECT DISTINCT module_name FROM module_permissions ORDER BY module_name;

SELECT 'Entidades no banco após sincronização:' as info;
SELECT DISTINCT entity_name FROM entity_permissions ORDER BY entity_name;
