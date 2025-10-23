-- =====================================================
-- MIGRAÇÃO: Atualizar nomes das entidades para português
-- Data: 2025-01-20
-- Descrição: Atualiza os nomes das entidades no banco para português
-- =====================================================

-- Atualizar nomes das entidades básicas
UPDATE entity_permissions SET entity_name = 'usuarios' WHERE entity_name = 'users';
UPDATE entity_permissions SET entity_name = 'empresas' WHERE entity_name = 'companies';
UPDATE entity_permissions SET entity_name = 'perfis' WHERE entity_name = 'profiles';
UPDATE entity_permissions SET entity_name = 'projetos' WHERE entity_name = 'projects';
UPDATE entity_permissions SET entity_name = 'materiais_equipamentos' WHERE entity_name = 'materials_equipment';
UPDATE entity_permissions SET entity_name = 'parceiros' WHERE entity_name = 'partners';
UPDATE entity_permissions SET entity_name = 'centros_custo' WHERE entity_name = 'cost_centers';
UPDATE entity_permissions SET entity_name = 'unidades' WHERE entity_name = 'units';

-- Atualizar nomes das entidades RH
UPDATE entity_permissions SET entity_name = 'funcionarios' WHERE entity_name = 'employees';
UPDATE entity_permissions SET entity_name = 'cargos' WHERE entity_name = 'positions';
UPDATE entity_permissions SET entity_name = 'registros_ponto' WHERE entity_name = 'time_records';
UPDATE entity_permissions SET entity_name = 'ferias' WHERE entity_name = 'vacations';
UPDATE entity_permissions SET entity_name = 'reembolsos' WHERE entity_name = 'reimbursements';
UPDATE entity_permissions SET entity_name = 'exames_periodicos' WHERE entity_name = 'periodic_exams';
UPDATE entity_permissions SET entity_name = 'acoes_disciplinares' WHERE entity_name = 'disciplinary_actions';
UPDATE entity_permissions SET entity_name = 'treinamentos' WHERE entity_name = 'trainings';

-- Atualizar nomes dos módulos
UPDATE module_permissions SET module_name = 'usuarios' WHERE module_name = 'users';
UPDATE module_permissions SET module_name = 'empresas' WHERE module_name = 'companies';
UPDATE module_permissions SET module_name = 'projetos' WHERE module_name = 'projects';
UPDATE module_permissions SET module_name = 'materiais_equipamentos' WHERE module_name = 'materials_equipment';
UPDATE module_permissions SET module_name = 'parceiros' WHERE module_name = 'partners';
UPDATE module_permissions SET module_name = 'centros_custo' WHERE module_name = 'cost_centers';
UPDATE module_permissions SET module_name = 'recrutamento' WHERE module_name = 'recruitment';

-- Verificar resultados
SELECT 'Entidades atualizadas para português:' as info;
SELECT DISTINCT entity_name FROM entity_permissions ORDER BY entity_name;

SELECT 'Módulos atualizados para português:' as info;
SELECT DISTINCT module_name FROM module_permissions ORDER BY module_name;
