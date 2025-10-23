-- =====================================================
-- ADICIONAR PERMISSÕES PARA EXAMES PERIÓDICOS
-- =====================================================

-- Adicionar permissões de entidade para periodic_exams
INSERT INTO entity_permissions (id, profile_id, entity_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
VALUES 
    -- Super Admin - Acesso total
    (gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'periodic_exams', true, true, true, true, NOW(), NOW()),
    -- Administrador - Acesso total
    (gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'periodic_exams', true, true, true, true, NOW(), NOW()),
    -- Gerente - Acesso de leitura e criação
    (gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'periodic_exams', true, true, true, false, NOW(), NOW()),
    -- Usuário - Apenas leitura
    (gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'periodic_exams', true, false, false, false, NOW(), NOW());

-- Adicionar permissões de módulo para RH
INSERT INTO module_permissions (id, profile_id, module_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
VALUES 
    -- Super Admin - Acesso total ao módulo RH
    (gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'rh', true, true, true, true, NOW(), NOW()),
    -- Administrador - Acesso total ao módulo RH
    (gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'rh', true, true, true, true, NOW(), NOW()),
    -- Gerente - Acesso de leitura e criação ao módulo RH
    (gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'rh', true, true, true, false, NOW(), NOW()),
    -- Usuário - Apenas leitura ao módulo RH
    (gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'rh', true, false, false, false, NOW(), NOW());

-- Comentários
COMMENT ON TABLE entity_permissions IS 'Permissões por entidade - incluindo periodic_exams';
COMMENT ON TABLE module_permissions IS 'Permissões por módulo - incluindo RH';
