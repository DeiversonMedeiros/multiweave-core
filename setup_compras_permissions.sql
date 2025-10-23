-- =====================================================
-- CONFIGURAÇÃO DE PERMISSÕES - MÓDULO COMPRAS
-- =====================================================
-- Data: 2025-01-15
-- Descrição: Configuração de permissões para o módulo de compras
-- =====================================================

-- =====================================================
-- PERMISSÕES DE ENTIDADES PARA COMPRAS
-- =====================================================

-- Inserir permissões para Super Admin (perfil 2242ce27-800c-494e-b7b9-c75cb832aa4d)
INSERT INTO public.entity_permissions (id, profile_id, entity_name, can_read, can_create, can_edit, can_delete, created_at, updated_at) VALUES
-- Requisições
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'requisicoes_compra', true, true, true, true, NOW(), NOW()),
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'requisicao_itens', true, true, true, true, NOW(), NOW()),
-- Cotações
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'cotacoes', true, true, true, true, NOW(), NOW()),
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'cotacao_itens', true, true, true, true, NOW(), NOW()),
-- Pedidos
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'pedidos_compra', true, true, true, true, NOW(), NOW()),
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'pedido_itens', true, true, true, true, NOW(), NOW()),
-- Fornecedores
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'fornecedores_dados', true, true, true, true, NOW(), NOW()),
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'avaliacoes_fornecedor', true, true, true, true, NOW(), NOW()),
-- Contratos
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'contratos', true, true, true, true, NOW(), NOW()),
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'compras_recorrentes', true, true, true, true, NOW(), NOW()),
-- Histórico
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'historico_precos', true, true, true, true, NOW(), NOW()),
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'historico_compras', true, true, true, true, NOW(), NOW()),
-- Aprovações
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'aprovacoes_requisicao', true, true, true, true, NOW(), NOW()),
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'aprovacoes_cotacao', true, true, true, true, NOW(), NOW()),
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'configuracoes_aprovacao', true, true, true, true, NOW(), NOW());

-- Inserir permissões para Administrador (perfil 20bef50d-2e82-4e1c-926d-c47b659e3cfd)
INSERT INTO public.entity_permissions (id, profile_id, entity_name, can_read, can_create, can_edit, can_delete, created_at, updated_at) VALUES
-- Requisições
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'requisicoes_compra', true, true, true, true, NOW(), NOW()),
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'requisicao_itens', true, true, true, true, NOW(), NOW()),
-- Cotações
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'cotacoes', true, true, true, true, NOW(), NOW()),
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'cotacao_itens', true, true, true, true, NOW(), NOW()),
-- Pedidos
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'pedidos_compra', true, true, true, true, NOW(), NOW()),
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'pedido_itens', true, true, true, true, NOW(), NOW()),
-- Fornecedores
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'fornecedores_dados', true, true, true, true, NOW(), NOW()),
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'avaliacoes_fornecedor', true, true, true, true, NOW(), NOW()),
-- Contratos
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'contratos', true, true, true, true, NOW(), NOW()),
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'compras_recorrentes', true, true, true, true, NOW(), NOW()),
-- Histórico
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'historico_precos', true, true, true, true, NOW(), NOW()),
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'historico_compras', true, true, true, true, NOW(), NOW()),
-- Aprovações
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'aprovacoes_requisicao', true, true, true, true, NOW(), NOW()),
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'aprovacoes_cotacao', true, true, true, true, NOW(), NOW()),
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'configuracoes_aprovacao', true, true, true, true, NOW(), NOW());

-- Inserir permissões para Gerente (perfil 34632fe2-980b-4382-b104-ea244ed586f8)
INSERT INTO public.entity_permissions (id, profile_id, entity_name, can_read, can_create, can_edit, can_delete, created_at, updated_at) VALUES
-- Requisições
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'requisicoes_compra', true, true, true, false, NOW(), NOW()),
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'requisicao_itens', true, true, true, false, NOW(), NOW()),
-- Cotações
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'cotacoes', true, true, true, false, NOW(), NOW()),
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'cotacao_itens', true, true, true, false, NOW(), NOW()),
-- Pedidos
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'pedidos_compra', true, true, true, false, NOW(), NOW()),
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'pedido_itens', true, true, true, false, NOW(), NOW()),
-- Fornecedores
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'fornecedores_dados', true, true, true, false, NOW(), NOW()),
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'avaliacoes_fornecedor', true, true, true, false, NOW(), NOW()),
-- Contratos
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'contratos', true, true, true, false, NOW(), NOW()),
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'compras_recorrentes', true, true, true, false, NOW(), NOW()),
-- Histórico
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'historico_precos', true, false, false, false, NOW(), NOW()),
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'historico_compras', true, false, false, false, NOW(), NOW()),
-- Aprovações
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'aprovacoes_requisicao', true, true, true, false, NOW(), NOW()),
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'aprovacoes_cotacao', true, true, true, false, NOW(), NOW()),
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'configuracoes_aprovacao', true, false, false, false, NOW(), NOW());

-- Inserir permissões para Usuário (perfil 3ce71d8d-c9eb-4b18-9fd4-a72720421441)
INSERT INTO public.entity_permissions (id, profile_id, entity_name, can_read, can_create, can_edit, can_delete, created_at, updated_at) VALUES
-- Requisições
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'requisicoes_compra', true, true, false, false, NOW(), NOW()),
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'requisicao_itens', true, true, false, false, NOW(), NOW()),
-- Cotações
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'cotacoes', true, false, false, false, NOW(), NOW()),
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'cotacao_itens', true, false, false, false, NOW(), NOW()),
-- Pedidos
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'pedidos_compra', true, false, false, false, NOW(), NOW()),
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'pedido_itens', true, false, false, false, NOW(), NOW()),
-- Fornecedores
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'fornecedores_dados', true, false, false, false, NOW(), NOW()),
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'avaliacoes_fornecedor', true, false, false, false, NOW(), NOW()),
-- Contratos
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'contratos', true, false, false, false, NOW(), NOW()),
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'compras_recorrentes', true, false, false, false, NOW(), NOW()),
-- Histórico
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'historico_precos', true, false, false, false, NOW(), NOW()),
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'historico_compras', true, false, false, false, NOW(), NOW()),
-- Aprovações
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'aprovacoes_requisicao', true, false, false, false, NOW(), NOW()),
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'aprovacoes_cotacao', true, false, false, false, NOW(), NOW()),
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'configuracoes_aprovacao', true, false, false, false, NOW(), NOW());

-- =====================================================
-- PERMISSÕES DE MÓDULO PARA COMPRAS
-- =====================================================

-- Inserir permissões de módulo para Super Admin
INSERT INTO public.module_permissions (id, profile_id, module_name, can_read, can_create, can_edit, can_delete, created_at, updated_at) VALUES
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'compras', true, true, true, true, NOW(), NOW());

-- Inserir permissões de módulo para Administrador
INSERT INTO public.module_permissions (id, profile_id, module_name, can_read, can_create, can_edit, can_delete, created_at, updated_at) VALUES
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'compras', true, true, true, true, NOW(), NOW());

-- Inserir permissões de módulo para Gerente
INSERT INTO public.module_permissions (id, profile_id, module_name, can_read, can_create, can_edit, can_delete, created_at, updated_at) VALUES
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'compras', true, true, true, false, NOW(), NOW());

-- Inserir permissões de módulo para Usuário
INSERT INTO public.module_permissions (id, profile_id, module_name, can_read, can_create, can_edit, can_delete, created_at, updated_at) VALUES
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'compras', true, false, false, false, NOW(), NOW());

-- =====================================================
-- CONFIGURAÇÕES INICIAIS DE APROVAÇÃO
-- =====================================================

-- Configurações de aprovação para requisições
INSERT INTO compras.configuracoes_aprovacao (id, company_id, tipo_documento, valor_limite, nivel_aprovacao, ativo, created_at, updated_at, created_by) VALUES
-- Aprovação nível 1 - até R$ 1.000
(gen_random_uuid(), (SELECT id FROM public.companies LIMIT 1), 'requisicao', 1000.00, 1, true, NOW(), NOW(), (SELECT id FROM public.users LIMIT 1)),
-- Aprovação nível 2 - até R$ 5.000
(gen_random_uuid(), (SELECT id FROM public.companies LIMIT 1), 'requisicao', 5000.00, 2, true, NOW(), NOW(), (SELECT id FROM public.users LIMIT 1)),
-- Aprovação nível 3 - até R$ 10.000
(gen_random_uuid(), (SELECT id FROM public.companies LIMIT 1), 'requisicao', 10000.00, 3, true, NOW(), NOW(), (SELECT id FROM public.users LIMIT 1)),
-- Aprovação nível 4 - acima de R$ 10.000
(gen_random_uuid(), (SELECT id FROM public.companies LIMIT 1), 'requisicao', 50000.00, 4, true, NOW(), NOW(), (SELECT id FROM public.users LIMIT 1));

-- Configurações de aprovação para cotações
INSERT INTO compras.configuracoes_aprovacao (id, company_id, tipo_documento, valor_limite, nivel_aprovacao, ativo, created_at, updated_at, created_by) VALUES
-- Aprovação nível 1 - até R$ 2.000
(gen_random_uuid(), (SELECT id FROM public.companies LIMIT 1), 'cotacao', 2000.00, 1, true, NOW(), NOW(), (SELECT id FROM public.users LIMIT 1)),
-- Aprovação nível 2 - até R$ 10.000
(gen_random_uuid(), (SELECT id FROM public.companies LIMIT 1), 'cotacao', 10000.00, 2, true, NOW(), NOW(), (SELECT id FROM public.users LIMIT 1)),
-- Aprovação nível 3 - até R$ 25.000
(gen_random_uuid(), (SELECT id FROM public.companies LIMIT 1), 'cotacao', 25000.00, 3, true, NOW(), NOW(), (SELECT id FROM public.users LIMIT 1)),
-- Aprovação nível 4 - acima de R$ 25.000
(gen_random_uuid(), (SELECT id FROM public.companies LIMIT 1), 'cotacao', 100000.00, 4, true, NOW(), NOW(), (SELECT id FROM public.users LIMIT 1));

-- Configurações de aprovação para pedidos
INSERT INTO compras.configuracoes_aprovacao (id, company_id, tipo_documento, valor_limite, nivel_aprovacao, ativo, created_at, updated_at, created_by) VALUES
-- Aprovação nível 1 - até R$ 2.000
(gen_random_uuid(), (SELECT id FROM public.companies LIMIT 1), 'pedido', 2000.00, 1, true, NOW(), NOW(), (SELECT id FROM public.users LIMIT 1)),
-- Aprovação nível 2 - até R$ 10.000
(gen_random_uuid(), (SELECT id FROM public.companies LIMIT 1), 'pedido', 10000.00, 2, true, NOW(), NOW(), (SELECT id FROM public.users LIMIT 1)),
-- Aprovação nível 3 - até R$ 25.000
(gen_random_uuid(), (SELECT id FROM public.companies LIMIT 1), 'pedido', 25000.00, 3, true, NOW(), NOW(), (SELECT id FROM public.users LIMIT 1)),
-- Aprovação nível 4 - acima de R$ 25.000
(gen_random_uuid(), (SELECT id FROM public.companies LIMIT 1), 'pedido', 100000.00, 4, true, NOW(), NOW(), (SELECT id FROM public.users LIMIT 1));

-- =====================================================
-- DADOS INICIAIS DE TESTE
-- =====================================================

-- Inserir alguns fornecedores de exemplo (baseados em partners existentes)
-- Primeiro, vamos verificar se existem partners do tipo 'fornecedor'
INSERT INTO compras.fornecedores_dados (
    id, partner_id, company_id, contato_principal, email_cotacao, telefone, 
    uf, cidade, status, created_by
) 
SELECT 
    gen_random_uuid(),
    p.id,
    (SELECT id FROM public.companies LIMIT 1),
    'Contato Principal',
    'cotacao@' || LOWER(REPLACE(p.nome, ' ', '')) || '.com.br',
    '(11) 99999-9999',
    'SP',
    'São Paulo',
    'ativo',
    (SELECT id FROM public.users LIMIT 1)
FROM public.partners p 
WHERE p.tipo = 'fornecedor'
LIMIT 3;

-- Se não houver partners do tipo fornecedor, criar um exemplo
INSERT INTO compras.fornecedores_dados (
    id, partner_id, company_id, contato_principal, email_cotacao, telefone, 
    uf, cidade, status, created_by
) 
SELECT 
    gen_random_uuid(),
    (SELECT id FROM public.partners LIMIT 1),
    (SELECT id FROM public.companies LIMIT 1),
    'Fornecedor Exemplo',
    'cotacao@fornecedor.com.br',
    '(11) 99999-9999',
    'SP',
    'São Paulo',
    'ativo',
    (SELECT id FROM public.users LIMIT 1)
WHERE NOT EXISTS (
    SELECT 1 FROM compras.fornecedores_dados LIMIT 1
);

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================

-- Log de configuração
INSERT INTO rh.audit_logs (
    table_name,
    operation_type,
    new_data,
    user_id,
    company_id,
    created_at
) VALUES (
    'compras.permissions',
    'CREATE',
    '{"module": "compras", "permissions": "configured", "approval_levels": 4}'::jsonb,
    (SELECT id FROM public.users LIMIT 1),
    (SELECT id FROM public.companies LIMIT 1),
    NOW()
);


