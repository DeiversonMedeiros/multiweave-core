-- =====================================================
-- MIGRAÇÃO: Adicionar entidades do processo de compras
-- Data: 2025-01-20
-- Descrição: Adiciona entidades específicas do processo de compras e almoxarifado
-- =====================================================

-- Adicionar entidades do processo de compras para todos os perfis ativos
INSERT INTO entity_permissions (id, profile_id, entity_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    p.id,
    entity_name,
    CASE 
        WHEN p.nome = 'Super Admin' THEN true
        WHEN p.nome = 'Administrador' THEN true
        WHEN p.nome = 'Gerente' THEN true
        WHEN p.nome = 'Usuário' THEN true
        ELSE false
    END,
    CASE 
        WHEN p.nome = 'Super Admin' THEN true
        WHEN p.nome = 'Administrador' THEN true
        WHEN p.nome = 'Gerente' THEN true
        WHEN p.nome = 'Usuário' THEN false
        ELSE false
    END,
    CASE 
        WHEN p.nome = 'Super Admin' THEN true
        WHEN p.nome = 'Administrador' THEN true
        WHEN p.nome = 'Gerente' THEN true
        WHEN p.nome = 'Usuário' THEN false
        ELSE false
    END,
    CASE 
        WHEN p.nome = 'Super Admin' THEN true
        WHEN p.nome = 'Administrador' THEN true
        WHEN p.nome = 'Gerente' THEN false
        WHEN p.nome = 'Usuário' THEN false
        ELSE false
    END,
    NOW(),
    NOW()
FROM profiles p
CROSS JOIN (
    VALUES 
        ('solicitacoes_compra'),
        ('cotacoes'),
        ('pedidos_compra'),
        ('aprovacoes_compra'),
        ('fornecedores'),
        ('contratos_compra'),
        ('historico_compras'),
        ('avaliacao_fornecedores')
) AS new_entities(entity_name)
WHERE p.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM entity_permissions ep 
    WHERE ep.profile_id = p.id AND ep.entity_name = new_entities.entity_name
);

-- Verificar resultados
SELECT 'Entidades de compras adicionadas:' as info;
SELECT COUNT(*) as total_entities FROM entity_permissions 
WHERE entity_name IN ('solicitacoes_compra', 'cotacoes', 'pedidos_compra', 'aprovacoes_compra', 'fornecedores', 'contratos_compra', 'historico_compras', 'avaliacao_fornecedores');
