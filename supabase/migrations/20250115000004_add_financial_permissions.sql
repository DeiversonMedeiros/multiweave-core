-- =====================================================
-- MIGRAÇÃO: ADICIONAR PERMISSÕES DO MÓDULO FINANCEIRO
-- =====================================================
-- Data: 2025-01-15
-- Descrição: Adiciona permissões do módulo financeiro aos perfis existentes
-- Autor: Sistema MultiWeave Core

-- =====================================================
-- 1. ADICIONAR PERMISSÕES DE MÓDULO
-- =====================================================

-- Super Admin - Acesso total ao módulo financeiro
INSERT INTO public.module_permissions (
    id,
    profile_id,
    module_name,
    can_read,
    can_create,
    can_edit,
    can_delete,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    '2242ce27-800c-494e-b7b9-c75cb832aa4d', -- Super Admin
    'financeiro',
    true,
    true,
    true,
    true,
    NOW(),
    NOW()
) ON CONFLICT (profile_id, module_name) DO UPDATE SET
    can_read = true,
    can_create = true,
    can_edit = true,
    can_delete = true,
    updated_at = NOW();

-- Administrador - Acesso total ao módulo financeiro
INSERT INTO public.module_permissions (
    id,
    profile_id,
    module_name,
    can_read,
    can_create,
    can_edit,
    can_delete,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    '20bef50d-2e82-4e1c-926d-c47b659e3cfd', -- Administrador
    'financeiro',
    true,
    true,
    true,
    true,
    NOW(),
    NOW()
) ON CONFLICT (profile_id, module_name) DO UPDATE SET
    can_read = true,
    can_create = true,
    can_edit = true,
    can_delete = true,
    updated_at = NOW();

-- Gerente - Acesso limitado ao módulo financeiro
INSERT INTO public.module_permissions (
    id,
    profile_id,
    module_name,
    can_read,
    can_create,
    can_edit,
    can_delete,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    '34632fe2-980b-4382-b104-ea244ed586f8', -- Gerente
    'financeiro',
    true,
    true,
    true,
    false,
    NOW(),
    NOW()
) ON CONFLICT (profile_id, module_name) DO UPDATE SET
    can_read = true,
    can_create = true,
    can_edit = true,
    can_delete = false,
    updated_at = NOW();

-- Usuário - Acesso somente leitura ao módulo financeiro
INSERT INTO public.module_permissions (
    id,
    profile_id,
    module_name,
    can_read,
    can_create,
    can_edit,
    can_delete,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    '3ce71d8d-c9eb-4b18-9fd4-a72720421441', -- Usuário
    'financeiro',
    true,
    false,
    false,
    false,
    NOW(),
    NOW()
) ON CONFLICT (profile_id, module_name) DO UPDATE SET
    can_read = true,
    can_create = false,
    can_edit = false,
    can_delete = false,
    updated_at = NOW();

-- =====================================================
-- 2. ADICIONAR PERMISSÕES DE ENTIDADES
-- =====================================================

-- Super Admin - Acesso total a todas as entidades financeiras
INSERT INTO public.entity_permissions (
    id,
    profile_id,
    entity_name,
    can_read,
    can_create,
    can_edit,
    can_delete,
    created_at,
    updated_at
) VALUES 
-- Contas a pagar
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'contas_pagar', true, true, true, true, NOW(), NOW()),
-- Contas a receber
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'contas_receber', true, true, true, true, NOW(), NOW()),
-- Borderôs
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'borderos', true, true, true, true, NOW(), NOW()),
-- Remessas bancárias
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'remessas_bancarias', true, true, true, true, NOW(), NOW()),
-- Retornos bancários
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'retornos_bancarios', true, true, true, true, NOW(), NOW()),
-- Contas bancárias
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'contas_bancarias', true, true, true, true, NOW(), NOW()),
-- Conciliações bancárias
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'conciliacoes_bancarias', true, true, true, true, NOW(), NOW()),
-- Fluxo de caixa
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'fluxo_caixa', true, true, true, true, NOW(), NOW()),
-- NF-e
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'nfe', true, true, true, true, NOW(), NOW()),
-- NFS-e
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'nfse', true, true, true, true, NOW(), NOW()),
-- Plano de contas
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'plano_contas', true, true, true, true, NOW(), NOW()),
-- Lançamentos contábeis
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'lancamentos_contabeis', true, true, true, true, NOW(), NOW()),
-- Configurações de aprovação
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'configuracoes_aprovacao', true, true, true, true, NOW(), NOW()),
-- Aprovações
(gen_random_uuid(), '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'aprovacoes', true, true, true, true, NOW(), NOW())
ON CONFLICT (profile_id, entity_name) DO UPDATE SET
    can_read = true,
    can_create = true,
    can_edit = true,
    can_delete = true,
    updated_at = NOW();

-- Administrador - Acesso total a todas as entidades financeiras
INSERT INTO public.entity_permissions (
    id,
    profile_id,
    entity_name,
    can_read,
    can_create,
    can_edit,
    can_delete,
    created_at,
    updated_at
) VALUES 
-- Contas a pagar
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'contas_pagar', true, true, true, true, NOW(), NOW()),
-- Contas a receber
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'contas_receber', true, true, true, true, NOW(), NOW()),
-- Borderôs
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'borderos', true, true, true, true, NOW(), NOW()),
-- Remessas bancárias
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'remessas_bancarias', true, true, true, true, NOW(), NOW()),
-- Retornos bancários
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'retornos_bancarios', true, true, true, true, NOW(), NOW()),
-- Contas bancárias
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'contas_bancarias', true, true, true, true, NOW(), NOW()),
-- Conciliações bancárias
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'conciliacoes_bancarias', true, true, true, true, NOW(), NOW()),
-- Fluxo de caixa
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'fluxo_caixa', true, true, true, true, NOW(), NOW()),
-- NF-e
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'nfe', true, true, true, true, NOW(), NOW()),
-- NFS-e
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'nfse', true, true, true, true, NOW(), NOW()),
-- Plano de contas
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'plano_contas', true, true, true, true, NOW(), NOW()),
-- Lançamentos contábeis
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'lancamentos_contabeis', true, true, true, true, NOW(), NOW()),
-- Configurações de aprovação
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'configuracoes_aprovacao', true, true, true, true, NOW(), NOW()),
-- Aprovações
(gen_random_uuid(), '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'aprovacoes', true, true, true, true, NOW(), NOW())
ON CONFLICT (profile_id, entity_name) DO UPDATE SET
    can_read = true,
    can_create = true,
    can_edit = true,
    can_delete = true,
    updated_at = NOW();

-- Gerente - Acesso limitado às entidades financeiras
INSERT INTO public.entity_permissions (
    id,
    profile_id,
    entity_name,
    can_read,
    can_create,
    can_edit,
    can_delete,
    created_at,
    updated_at
) VALUES 
-- Contas a pagar
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'contas_pagar', true, true, true, false, NOW(), NOW()),
-- Contas a receber
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'contas_receber', true, true, true, false, NOW(), NOW()),
-- Borderôs
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'borderos', true, true, true, false, NOW(), NOW()),
-- Remessas bancárias
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'remessas_bancarias', true, true, true, false, NOW(), NOW()),
-- Retornos bancários
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'retornos_bancarios', true, true, true, false, NOW(), NOW()),
-- Contas bancárias
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'contas_bancarias', true, true, true, false, NOW(), NOW()),
-- Conciliações bancárias
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'conciliacoes_bancarias', true, true, true, false, NOW(), NOW()),
-- Fluxo de caixa
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'fluxo_caixa', true, true, true, false, NOW(), NOW()),
-- NF-e
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'nfe', true, true, true, false, NOW(), NOW()),
-- NFS-e
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'nfse', true, true, true, false, NOW(), NOW()),
-- Plano de contas
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'plano_contas', true, true, true, false, NOW(), NOW()),
-- Lançamentos contábeis
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'lancamentos_contabeis', true, true, true, false, NOW(), NOW()),
-- Configurações de aprovação
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'configuracoes_aprovacao', true, false, false, false, NOW(), NOW()),
-- Aprovações
(gen_random_uuid(), '34632fe2-980b-4382-b104-ea244ed586f8', 'aprovacoes', true, true, true, false, NOW(), NOW())
ON CONFLICT (profile_id, entity_name) DO UPDATE SET
    can_read = true,
    can_create = EXCLUDED.can_create,
    can_edit = EXCLUDED.can_edit,
    can_delete = false,
    updated_at = NOW();

-- Usuário - Acesso somente leitura às entidades financeiras
INSERT INTO public.entity_permissions (
    id,
    profile_id,
    entity_name,
    can_read,
    can_create,
    can_edit,
    can_delete,
    created_at,
    updated_at
) VALUES 
-- Contas a pagar
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'contas_pagar', true, false, false, false, NOW(), NOW()),
-- Contas a receber
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'contas_receber', true, false, false, false, NOW(), NOW()),
-- Borderôs
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'borderos', true, false, false, false, NOW(), NOW()),
-- Remessas bancárias
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'remessas_bancarias', true, false, false, false, NOW(), NOW()),
-- Retornos bancários
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'retornos_bancarios', true, false, false, false, NOW(), NOW()),
-- Contas bancárias
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'contas_bancarias', true, false, false, false, NOW(), NOW()),
-- Conciliações bancárias
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'conciliacoes_bancarias', true, false, false, false, NOW(), NOW()),
-- Fluxo de caixa
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'fluxo_caixa', true, false, false, false, NOW(), NOW()),
-- NF-e
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'nfe', true, false, false, false, NOW(), NOW()),
-- NFS-e
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'nfse', true, false, false, false, NOW(), NOW()),
-- Plano de contas
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'plano_contas', true, false, false, false, NOW(), NOW()),
-- Lançamentos contábeis
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'lancamentos_contabeis', true, false, false, false, NOW(), NOW()),
-- Configurações de aprovação
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'configuracoes_aprovacao', true, false, false, false, NOW(), NOW()),
-- Aprovações
(gen_random_uuid(), '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'aprovacoes', true, false, false, false, NOW(), NOW())
ON CONFLICT (profile_id, entity_name) DO UPDATE SET
    can_read = true,
    can_create = false,
    can_edit = false,
    can_delete = false,
    updated_at = NOW();

-- =====================================================
-- 3. DADOS INICIAIS - CONFIGURAÇÕES DE APROVAÇÃO
-- =====================================================

-- Inserir configurações padrão de aprovação para a empresa de teste
INSERT INTO financeiro.configuracoes_aprovacao (
    id,
    company_id,
    tipo_aprovacao,
    valor_limite,
    nivel_aprovacao,
    is_active,
    created_by,
    created_at,
    updated_at
) VALUES 
-- Aprovação por valor - até R$ 1.000,00 (nível 1)
(gen_random_uuid(), 'a9784891-9d58-4cc4-8404-18032105c335', 'conta_pagar', 1000.00, 1, true, 'e745168f-addb-4456-a6fa-f4a336d874ac', NOW(), NOW()),
-- Aprovação por valor - até R$ 5.000,00 (nível 2)
(gen_random_uuid(), 'a9784891-9d58-4cc4-8404-18032105c335', 'conta_pagar', 5000.00, 2, true, 'e745168f-addb-4456-a6fa-f4a336d874ac', NOW(), NOW()),
-- Aprovação por valor - até R$ 10.000,00 (nível 3)
(gen_random_uuid(), 'a9784891-9d58-4cc4-8404-18032105c335', 'conta_pagar', 10000.00, 3, true, 'e745168f-addb-4456-a6fa-f4a336d874ac', NOW(), NOW()),
-- Aprovação por valor - acima de R$ 10.000,00 (nível 4)
(gen_random_uuid(), 'a9784891-9d58-4cc4-8404-18032105c335', 'conta_pagar', 999999.99, 4, true, 'e745168f-addb-4456-a6fa-f4a336d874ac', NOW(), NOW()),
-- Aprovação para contas a receber
(gen_random_uuid(), 'a9784891-9d58-4cc4-8404-18032105c335', 'conta_receber', 999999.99, 1, true, 'e745168f-addb-4456-a6fa-f4a336d874ac', NOW(), NOW());

-- =====================================================
-- 4. DADOS INICIAIS - PLANO DE CONTAS
-- =====================================================

-- Inserir plano de contas básico para a empresa de teste
INSERT INTO financeiro.plano_contas (
    id,
    company_id,
    codigo,
    descricao,
    tipo_conta,
    nivel,
    is_active,
    created_by,
    created_at,
    updated_at
) VALUES 
-- Ativo
(gen_random_uuid(), 'a9784891-9d58-4cc4-8404-18032105c335', '1', 'ATIVO', 'ativo', 1, true, 'e745168f-addb-4456-a6fa-f4a336d874ac', NOW(), NOW()),
(gen_random_uuid(), 'a9784891-9d58-4cc4-8404-18032105c335', '1.1', 'ATIVO CIRCULANTE', 'ativo', 2, true, 'e745168f-addb-4456-a6fa-f4a336d874ac', NOW(), NOW()),
(gen_random_uuid(), 'a9784891-9d58-4cc4-8404-18032105c335', '1.1.1', 'CAIXA E EQUIVALENTES', 'ativo', 3, true, 'e745168f-addb-4456-a6fa-f4a336d874ac', NOW(), NOW()),
(gen_random_uuid(), 'a9784891-9d58-4cc4-8404-18032105c335', '1.1.2', 'BANCOS', 'ativo', 3, true, 'e745168f-addb-4456-a6fa-f4a336d874ac', NOW(), NOW()),
(gen_random_uuid(), 'a9784891-9d58-4cc4-8404-18032105c335', '1.1.3', 'CONTAS A RECEBER', 'ativo', 3, true, 'e745168f-addb-4456-a6fa-f4a336d874ac', NOW(), NOW()),
-- Passivo
(gen_random_uuid(), 'a9784891-9d58-4cc4-8404-18032105c335', '2', 'PASSIVO', 'passivo', 1, true, 'e745168f-addb-4456-a6fa-f4a336d874ac', NOW(), NOW()),
(gen_random_uuid(), 'a9784891-9d58-4cc4-8404-18032105c335', '2.1', 'PASSIVO CIRCULANTE', 'passivo', 2, true, 'e745168f-addb-4456-a6fa-f4a336d874ac', NOW(), NOW()),
(gen_random_uuid(), 'a9784891-9d58-4cc4-8404-18032105c335', '2.1.1', 'FORNECEDORES', 'passivo', 3, true, 'e745168f-addb-4456-a6fa-f4a336d874ac', NOW(), NOW()),
(gen_random_uuid(), 'a9784891-9d58-4cc4-8404-18032105c335', '2.1.2', 'CONTAS A PAGAR', 'passivo', 3, true, 'e745168f-addb-4456-a6fa-f4a336d874ac', NOW(), NOW()),
-- Patrimônio Líquido
(gen_random_uuid(), 'a9784891-9d58-4cc4-8404-18032105c335', '3', 'PATRIMÔNIO LÍQUIDO', 'patrimonio', 1, true, 'e745168f-addb-4456-a6fa-f4a336d874ac', NOW(), NOW()),
(gen_random_uuid(), 'a9784891-9d58-4cc4-8404-18032105c335', '3.1', 'CAPITAL SOCIAL', 'patrimonio', 2, true, 'e745168f-addb-4456-a6fa-f4a336d874ac', NOW(), NOW()),
-- Receitas
(gen_random_uuid(), 'a9784891-9d58-4cc4-8404-18032105c335', '4', 'RECEITAS', 'receita', 1, true, 'e745168f-addb-4456-a6fa-f4a336d874ac', NOW(), NOW()),
(gen_random_uuid(), 'a9784891-9d58-4cc4-8404-18032105c335', '4.1', 'RECEITAS OPERACIONAIS', 'receita', 2, true, 'e745168f-addb-4456-a6fa-f4a336d874ac', NOW(), NOW()),
-- Despesas
(gen_random_uuid(), 'a9784891-9d58-4cc4-8404-18032105c335', '5', 'DESPESAS', 'despesa', 1, true, 'e745168f-addb-4456-a6fa-f4a336d874ac', NOW(), NOW()),
(gen_random_uuid(), 'a9784891-9d58-4cc4-8404-18032105c335', '5.1', 'DESPESAS OPERACIONAIS', 'despesa', 2, true, 'e745168f-addb-4456-a6fa-f4a336d874ac', NOW(), NOW());

-- =====================================================
-- 5. DADOS INICIAIS - CONTAS BANCÁRIAS
-- =====================================================

-- Inserir conta bancária de exemplo para a empresa de teste
INSERT INTO financeiro.contas_bancarias (
    id,
    company_id,
    banco_codigo,
    banco_nome,
    agencia,
    conta,
    tipo_conta,
    moeda,
    saldo_atual,
    saldo_disponivel,
    data_saldo,
    is_active,
    observacoes,
    created_by,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'a9784891-9d58-4cc4-8404-18032105c335',
    '237',
    'BANCO BRADESCO S.A.',
    '1234',
    '12345-6',
    'corrente',
    'BRL',
    50000.00,
    50000.00,
    CURRENT_DATE,
    true,
    'Conta principal da empresa',
    'e745168f-addb-4456-a6fa-f4a336d874ac',
    NOW(),
    NOW()
);

-- =====================================================
-- 6. COMENTÁRIOS FINAIS
-- =====================================================

COMMENT ON SCHEMA financeiro IS 'Módulo Financeiro implementado com sucesso - Contas a Pagar/Receber, Tesouraria, Fiscal e Contabilidade com sistema de aprovação por valor, centro de custo, departamento, classe financeira e usuário';

