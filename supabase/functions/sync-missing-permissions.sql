-- Script para sincronizar módulos e entidades que estão faltando no banco

-- Módulos que estão no código mas não no banco
INSERT INTO module_permissions (profile_id, module_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 
  '2242ce27-800c-494e-b7b9-c75cb832aa4d' as profile_id, -- Super Admin profile
  module_name,
  true as can_read,
  true as can_create,
  true as can_edit,
  true as can_delete,
  NOW() as created_at,
  NOW() as updated_at
FROM (VALUES 
  ('portal_colaborador'),
  ('portal_gestor'),
  ('compras'),
  ('frota'),
  ('logistica'),
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

-- Entidades que estão no código mas não no banco
INSERT INTO entity_permissions (profile_id, entity_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 
  '2242ce27-800c-494e-b7b9-c75cb832aa4d' as profile_id, -- Super Admin profile
  entity_name,
  true as can_read,
  true as can_create,
  true as can_edit,
  true as can_delete,
  NOW() as created_at,
  NOW() as updated_at
FROM (VALUES 
  ('employees'),
  ('time_records'),
  ('vacations'),
  ('reimbursements'),
  ('periodic_exams'),
  ('disciplinary_actions'),
  ('trainings')
) AS missing_entities(entity_name)
WHERE NOT EXISTS (
  SELECT 1 FROM entity_permissions 
  WHERE profile_id = '2242ce27-800c-494e-b7b9-c75cb832aa4d' 
  AND entity_name = missing_entities.entity_name
);
