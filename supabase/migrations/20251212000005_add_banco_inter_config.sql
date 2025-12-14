-- =====================================================
-- MIGRAÇÃO: ADICIONAR CONFIGURAÇÃO PADRÃO BANCO INTER
-- =====================================================
-- Data: 2025-12-12
-- Descrição: Adiciona configuração padrão para integração com Banco Inter
-- Autor: Sistema MultiWeave Core

-- =====================================================
-- CONFIGURAÇÃO PADRÃO BANCO INTER
-- =====================================================

-- Inserir configuração padrão para Banco Inter (Sandbox)
INSERT INTO financeiro.configuracao_bancaria (
    company_id,
    nome_configuracao,
    banco_codigo,
    banco_nome,
    ambiente,
    base_url,
    auth_url,
    api_version,
    grant_type,
    observacoes,
    created_by
) VALUES 
(
    (SELECT id FROM public.companies LIMIT 1),
    'Configuração Padrão Banco Inter - Sandbox',
    '077',
    'Banco Inter S.A.',
    'sandbox',
    'https://cdpj-sandbox.partners.uatinter.co',
    'https://cdpj-sandbox.partners.uatinter.co/oauth/v2/token',
    'v3',
    'client_credentials',
    'Configuração inicial para testes - Banco Inter Sandbox',
    (SELECT id FROM public.users LIMIT 1)
) ON CONFLICT (company_id, banco_codigo, ambiente) DO NOTHING;

-- Inserir configuração padrão para Banco Inter (Produção)
INSERT INTO financeiro.configuracao_bancaria (
    company_id,
    nome_configuracao,
    banco_codigo,
    banco_nome,
    ambiente,
    base_url,
    auth_url,
    api_version,
    grant_type,
    observacoes,
    created_by
) VALUES 
(
    (SELECT id FROM public.companies LIMIT 1),
    'Configuração Padrão Banco Inter - Produção',
    '077',
    'Banco Inter S.A.',
    'producao',
    'https://cdpj.partners.bancointer.com.br',
    'https://cdpj.partners.bancointer.com.br/oauth/v2/token',
    'v3',
    'client_credentials',
    'Configuração inicial para produção - Banco Inter',
    (SELECT id FROM public.users LIMIT 1)
) ON CONFLICT (company_id, banco_codigo, ambiente) DO NOTHING;
