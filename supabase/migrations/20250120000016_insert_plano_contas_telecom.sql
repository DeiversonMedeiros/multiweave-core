-- =====================================================
-- MIGRAÇÃO: INSERIR PLANO DE CONTAS CONTÁBIL - TELECOM FIBRA ÓPTICA
-- =====================================================
-- Data: 2025-01-20
-- Descrição: Insere estrutura completa do Plano de Contas Contábil
--            para empresas de Telecom/Fibra Óptica (4 níveis hierárquicos)
-- Autor: Sistema MultiWeave Core

-- =====================================================
-- NOTA: Esta migração cria uma função RPC para inserir o plano de contas
--       para uma empresa específica. Os dados serão inseridos via RPC.
-- =====================================================

CREATE OR REPLACE FUNCTION financeiro.insert_plano_contas_telecom(p_company_id UUID, p_created_by UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB := '{"inserted": 0, "errors": []}'::JSONB;
    v_conta_id UUID;
    v_pai_id UUID;
    v_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- =====================================================
    -- 1. ATIVO
    -- =====================================================
    
    -- 1 - Ativo (nível 1)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1', 'Ativo', 'ativo', 1, NULL, false, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    RETURNING id INTO v_conta_id;
    
    -- 1.1 - Ativo Circulante (nível 2)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.1', 'Ativo Circulante', 'ativo', 2, v_conta_id, false, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    RETURNING id INTO v_pai_id;
    
    -- 1.1.01 - Caixa e Equivalentes (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.1.01', 'Caixa e Equivalentes', 'ativo', 3, v_pai_id, false, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    RETURNING id INTO v_pai_id;
    
    -- 1.1.01.01 - Caixa (nível 4)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.1.01.01', 'Caixa', 'ativo', 4, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 1.1.01.02 - Bancos Conta Movimento (nível 4)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.1.01.02', 'Bancos Conta Movimento', 'ativo', 4, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 1.1.01.03 - Aplicações Financeiras Curto Prazo (nível 4)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.1.01.03', 'Aplicações Financeiras Curto Prazo', 'ativo', 4, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 1.1.02 - Contas a Receber (nível 3)
    SELECT id INTO v_pai_id FROM financeiro.plano_contas WHERE company_id = p_company_id AND codigo = '1.1';
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.1.02', 'Contas a Receber', 'ativo', 3, v_pai_id, false, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    RETURNING id INTO v_pai_id;
    
    -- 1.1.02.01 - Clientes – Serviços de Implantação (nível 4)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.1.02.01', 'Clientes – Serviços de Implantação', 'ativo', 4, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 1.1.02.02 - Clientes – Serviços de Manutenção (nível 4)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.1.02.02', 'Clientes – Serviços de Manutenção', 'ativo', 4, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 1.1.02.03 - Adiantamentos a Fornecedores (nível 4)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.1.02.03', 'Adiantamentos a Fornecedores', 'ativo', 4, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 1.1.03 - Estoques (nível 3)
    SELECT id INTO v_pai_id FROM financeiro.plano_contas WHERE company_id = p_company_id AND codigo = '1.1';
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.1.03', 'Estoques', 'ativo', 3, v_pai_id, false, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    RETURNING id INTO v_pai_id;
    
    -- 1.1.03.01 - Materiais de Fibra Óptica (nível 4)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.1.03.01', 'Materiais de Fibra Óptica', 'ativo', 4, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 1.1.03.02 - Caixas de Emenda / CTO (nível 4)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.1.03.02', 'Caixas de Emenda / CTO', 'ativo', 4, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 1.1.03.03 - Ferramentas e EPIs (nível 4)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.1.03.03', 'Ferramentas e EPIs', 'ativo', 4, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 1.1.03.04 - Materiais em Trânsito (nível 4)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.1.03.04', 'Materiais em Trânsito', 'ativo', 4, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 1.1.04 - Outros Ativos Circulantes (nível 3)
    SELECT id INTO v_pai_id FROM financeiro.plano_contas WHERE company_id = p_company_id AND codigo = '1.1';
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.1.04', 'Outros Ativos Circulantes', 'ativo', 3, v_pai_id, false, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    RETURNING id INTO v_pai_id;
    
    -- 1.1.04.01 - Adiantamentos a Colaboradores (nível 4)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.1.04.01', 'Adiantamentos a Colaboradores', 'ativo', 4, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 1.1.04.02 - Créditos Fiscais (nível 4)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.1.04.02', 'Créditos Fiscais', 'ativo', 4, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 1.2 - Ativo Não Circulante (nível 2)
    SELECT id INTO v_pai_id FROM financeiro.plano_contas WHERE company_id = p_company_id AND codigo = '1';
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.2', 'Ativo Não Circulante', 'ativo', 2, v_pai_id, false, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    RETURNING id INTO v_pai_id;
    
    -- 1.2.01 - Realizável a Longo Prazo (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.2.01', 'Realizável a Longo Prazo', 'ativo', 3, v_pai_id, false, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    RETURNING id INTO v_pai_id;
    
    -- 1.2.01.01 - Depósitos Judiciais (nível 4)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.2.01.01', 'Depósitos Judiciais', 'ativo', 4, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 1.2.01.02 - Adiantamentos Longo Prazo (nível 4)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.2.01.02', 'Adiantamentos Longo Prazo', 'ativo', 4, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 1.2.02 - Imobilizado (nível 3)
    SELECT id INTO v_pai_id FROM financeiro.plano_contas WHERE company_id = p_company_id AND codigo = '1.2';
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.2.02', 'Imobilizado', 'ativo', 3, v_pai_id, false, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    RETURNING id INTO v_pai_id;
    
    -- 1.2.02.01 - Veículos de Manutenção (nível 4)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.2.02.01', 'Veículos de Manutenção', 'ativo', 4, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 1.2.02.02 - Equipamentos de Campo (nível 4)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.2.02.02', 'Equipamentos de Campo', 'ativo', 4, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 1.2.02.03 - Máquinas e Equipamentos (nível 4)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.2.02.03', 'Máquinas e Equipamentos', 'ativo', 4, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 1.2.02.04 - Ferramentas Permanentes (nível 4)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.2.02.04', 'Ferramentas Permanentes', 'ativo', 4, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 1.2.02.05 - Edificações / Infraestrutura (nível 4)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.2.02.05', 'Edificações / Infraestrutura', 'ativo', 4, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 1.2.02.06 - Depreciação Acumulada (nível 4)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.2.02.06', 'Depreciação Acumulada', 'ativo', 4, v_pai_id, true, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 1.2.03 - Intangível (nível 3)
    SELECT id INTO v_pai_id FROM financeiro.plano_contas WHERE company_id = p_company_id AND codigo = '1.2';
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.2.03', 'Intangível', 'ativo', 3, v_pai_id, false, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    RETURNING id INTO v_pai_id;
    
    -- 1.2.03.01 - Softwares de Gestão (nível 4)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.2.03.01', 'Softwares de Gestão', 'ativo', 4, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 1.2.03.02 - Licenças e Sistemas de Rede (nível 4)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.2.03.02', 'Licenças e Sistemas de Rede', 'ativo', 4, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 1.2.03.03 - Amortização Acumulada (nível 4)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '1.2.03.03', 'Amortização Acumulada', 'ativo', 4, v_pai_id, true, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- =====================================================
    -- 2. PASSIVO
    -- =====================================================
    
    -- 2 - Passivo (nível 1)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '2', 'Passivo', 'passivo', 1, NULL, false, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    RETURNING id INTO v_conta_id;
    
    -- 2.1 - Passivo Circulante (nível 2)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '2.1', 'Passivo Circulante', 'passivo', 2, v_conta_id, false, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    RETURNING id INTO v_pai_id;
    
    -- 2.1.01 - Fornecedores (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '2.1.01', 'Fornecedores', 'passivo', 3, v_pai_id, true, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 2.1.02 - Obrigações Trabalhistas (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '2.1.02', 'Obrigações Trabalhistas', 'passivo', 3, v_pai_id, true, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 2.1.03 - Obrigações Fiscais (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '2.1.03', 'Obrigações Fiscais', 'passivo', 3, v_pai_id, true, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 2.1.04 - Empréstimos Curto Prazo (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '2.1.04', 'Empréstimos Curto Prazo', 'passivo', 3, v_pai_id, true, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 2.1.05 - Arrendamentos / Leasing CP (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '2.1.05', 'Arrendamentos / Leasing CP', 'passivo', 3, v_pai_id, true, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 2.1.06 - Provisão de Férias (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '2.1.06', 'Provisão de Férias', 'passivo', 3, v_pai_id, true, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 2.1.07 - Provisão 13º (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '2.1.07', 'Provisão 13º', 'passivo', 3, v_pai_id, true, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 2.2 - Passivo Não Circulante (nível 2)
    SELECT id INTO v_pai_id FROM financeiro.plano_contas WHERE company_id = p_company_id AND codigo = '2';
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '2.2', 'Passivo Não Circulante', 'passivo', 2, v_pai_id, false, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    RETURNING id INTO v_pai_id;
    
    -- 2.2.01 - Empréstimos Longo Prazo (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '2.2.01', 'Empréstimos Longo Prazo', 'passivo', 3, v_pai_id, true, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 2.2.02 - Arrendamento / Leasing LP (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '2.2.02', 'Arrendamento / Leasing LP', 'passivo', 3, v_pai_id, true, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 2.2.03 - Provisões Diversas (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '2.2.03', 'Provisões Diversas', 'passivo', 3, v_pai_id, true, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- =====================================================
    -- 3. PATRIMÔNIO LÍQUIDO
    -- =====================================================
    
    -- 3 - Patrimônio Líquido (nível 1)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '3', 'Patrimônio Líquido', 'patrimonio', 1, NULL, false, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    RETURNING id INTO v_conta_id;
    
    -- 3.1 - Capital Social (nível 2)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '3.1', 'Capital Social', 'patrimonio', 2, v_conta_id, true, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 3.2 - Reservas de Capital (nível 2)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '3.2', 'Reservas de Capital', 'patrimonio', 2, v_conta_id, true, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 3.3 - Ajustes Acumulados (nível 2)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '3.3', 'Ajustes Acumulados', 'patrimonio', 2, v_conta_id, true, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 3.4 - Lucros / Prejuízos Acumulados (nível 2)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '3.4', 'Lucros / Prejuízos Acumulados', 'patrimonio', 2, v_conta_id, true, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- =====================================================
    -- 4. RECEITAS
    -- =====================================================
    
    -- 4 - Receitas (nível 1)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '4', 'Receitas', 'receita', 1, NULL, false, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    RETURNING id INTO v_conta_id;
    
    -- 4.1 - Receitas Operacionais (nível 2)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '4.1', 'Receitas Operacionais', 'receita', 2, v_conta_id, false, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    RETURNING id INTO v_pai_id;
    
    -- 4.1.01 - Serviços de Implantação de Fibra Óptica (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '4.1.01', 'Serviços de Implantação de Fibra Óptica', 'receita', 3, v_pai_id, true, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 4.1.02 - Serviços de Manutenção de Rede (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '4.1.02', 'Serviços de Manutenção de Rede', 'receita', 3, v_pai_id, true, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 4.1.03 - Locação de Equipamentos (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '4.1.03', 'Locação de Equipamentos', 'receita', 3, v_pai_id, true, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 4.1.04 - Engenharia e Projetos (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '4.1.04', 'Engenharia e Projetos', 'receita', 3, v_pai_id, true, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 4.1.05 - Venda de Materiais (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '4.1.05', 'Venda de Materiais', 'receita', 3, v_pai_id, true, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 4.2 - Deduções da Receita (nível 2)
    SELECT id INTO v_pai_id FROM financeiro.plano_contas WHERE company_id = p_company_id AND codigo = '4';
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '4.2', 'Deduções da Receita', 'receita', 2, v_pai_id, false, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    RETURNING id INTO v_pai_id;
    
    -- 4.2.01 - ISS (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '4.2.01', 'ISS', 'receita', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 4.2.02 - PIS (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '4.2.02', 'PIS', 'receita', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 4.2.03 - COFINS (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '4.2.03', 'COFINS', 'receita', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 4.2.04 - Devoluções (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '4.2.04', 'Devoluções', 'receita', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- =====================================================
    -- 5. CUSTOS DOS SERVIÇOS PRESTADOS (CSP)
    -- =====================================================
    
    -- 5 - Custos dos Serviços Prestados (nível 1)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '5', 'Custos dos Serviços Prestados', 'custos', 1, NULL, false, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    RETURNING id INTO v_conta_id;
    
    -- 5.1 - Implantação (nível 2)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '5.1', 'Implantação', 'custos', 2, v_conta_id, false, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    RETURNING id INTO v_pai_id;
    
    -- 5.1.01 - Mão de Obra Direta – Implantação (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '5.1.01', 'Mão de Obra Direta – Implantação', 'custos', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 5.1.02 - Materiais de Rede – Implantação (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '5.1.02', 'Materiais de Rede – Implantação', 'custos', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 5.1.03 - Equipes Terceirizadas – Implantação (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '5.1.03', 'Equipes Terceirizadas – Implantação', 'custos', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 5.1.04 - Veículos e Deslocamentos – Implantação (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '5.1.04', 'Veículos e Deslocamentos – Implantação', 'custos', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 5.1.05 - Equipamentos de Campo – Implantação (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '5.1.05', 'Equipamentos de Campo – Implantação', 'custos', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 5.2 - Manutenção (nível 2)
    SELECT id INTO v_pai_id FROM financeiro.plano_contas WHERE company_id = p_company_id AND codigo = '5';
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '5.2', 'Manutenção', 'custos', 2, v_pai_id, false, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    RETURNING id INTO v_pai_id;
    
    -- 5.2.01 - Mão de Obra Direta – Manutenção (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '5.2.01', 'Mão de Obra Direta – Manutenção', 'custos', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 5.2.02 - Materiais de Rede – Manutenção (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '5.2.02', 'Materiais de Rede – Manutenção', 'custos', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 5.2.03 - Equipes Terceirizadas – Manutenção (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '5.2.03', 'Equipes Terceirizadas – Manutenção', 'custos', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 5.2.04 - Veículos e Deslocamentos – Manutenção (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '5.2.04', 'Veículos e Deslocamentos – Manutenção', 'custos', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 5.2.05 - Equipamentos de Campo – Manutenção (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '5.2.05', 'Equipamentos de Campo – Manutenção', 'custos', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- =====================================================
    -- 6. DESPESAS OPERACIONAIS
    -- =====================================================
    
    -- 6 - Despesas Operacionais (nível 1)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '6', 'Despesas Operacionais', 'despesa', 1, NULL, false, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    RETURNING id INTO v_conta_id;
    
    -- 6.1 - Administrativas (nível 2)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '6.1', 'Administrativas', 'despesa', 2, v_conta_id, false, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    RETURNING id INTO v_pai_id;
    
    -- 6.1.01 - Salários Administrativos (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '6.1.01', 'Salários Administrativos', 'despesa', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 6.1.02 - Encargos e Benefícios (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '6.1.02', 'Encargos e Benefícios', 'despesa', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 6.1.03 - Telefonia e Internet (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '6.1.03', 'Telefonia e Internet', 'despesa', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 6.1.04 - Energia Elétrica (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '6.1.04', 'Energia Elétrica', 'despesa', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 6.1.05 - Água (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '6.1.05', 'Água', 'despesa', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 6.1.06 - Serviços Contábeis (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '6.1.06', 'Serviços Contábeis', 'despesa', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 6.1.07 - Despesas com Viagens (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '6.1.07', 'Despesas com Viagens', 'despesa', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 6.2 - Comerciais (nível 2)
    SELECT id INTO v_pai_id FROM financeiro.plano_contas WHERE company_id = p_company_id AND codigo = '6';
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '6.2', 'Comerciais', 'despesa', 2, v_pai_id, false, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    RETURNING id INTO v_pai_id;
    
    -- 6.2.01 - Comissões (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '6.2.01', 'Comissões', 'despesa', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 6.2.02 - Publicidade e Marketing (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '6.2.02', 'Publicidade e Marketing', 'despesa', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 6.3 - Despesas Gerais (nível 2)
    SELECT id INTO v_pai_id FROM financeiro.plano_contas WHERE company_id = p_company_id AND codigo = '6';
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '6.3', 'Despesas Gerais', 'despesa', 2, v_pai_id, false, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    RETURNING id INTO v_pai_id;
    
    -- 6.3.01 - Serviços de Terceiros (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '6.3.01', 'Serviços de Terceiros', 'despesa', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 6.3.02 - Materiais de Escritório (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '6.3.02', 'Materiais de Escritório', 'despesa', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 6.3.03 - Manutenção Predial (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '6.3.03', 'Manutenção Predial', 'despesa', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 6.3.04 - Tarifas Bancárias (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '6.3.04', 'Tarifas Bancárias', 'despesa', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 6.4 - Despesas Financeiras (nível 2)
    SELECT id INTO v_pai_id FROM financeiro.plano_contas WHERE company_id = p_company_id AND codigo = '6';
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '6.4', 'Despesas Financeiras', 'despesa', 2, v_pai_id, false, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    RETURNING id INTO v_pai_id;
    
    -- 6.4.01 - Juros (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '6.4.01', 'Juros', 'despesa', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 6.4.02 - Multas (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '6.4.02', 'Multas', 'despesa', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 6.4.03 - Variações Monetárias (nível 3)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '6.4.03', 'Variações Monetárias', 'despesa', 3, v_pai_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- =====================================================
    -- 7. OUTRAS RECEITAS E DESPESAS
    -- =====================================================
    
    -- 7 - Outras Receitas e Despesas (nível 1)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '7', 'Outras Receitas e Despesas', 'receita', 1, NULL, false, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    RETURNING id INTO v_conta_id;
    
    -- 7.1 - Outras Receitas (nível 2)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '7.1', 'Outras Receitas', 'receita', 2, v_conta_id, true, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- 7.2 - Outras Despesas (nível 2)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '7.2', 'Outras Despesas', 'despesa', 2, v_conta_id, true, 'devedora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- =====================================================
    -- 8. RESULTADO
    -- =====================================================
    
    -- 8 - Resultado (nível 1)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '8', 'Resultado', 'patrimonio', 1, NULL, false, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao
    RETURNING id INTO v_conta_id;
    
    -- 8.1 - Resultado do Exercício (nível 2)
    INSERT INTO financeiro.plano_contas (company_id, codigo, descricao, tipo_conta, nivel, conta_pai_id, aceita_lancamento, natureza, created_by)
    VALUES (p_company_id, '8.1', 'Resultado do Exercício', 'patrimonio', 2, v_conta_id, true, 'credora', p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET descricao = EXCLUDED.descricao;
    
    -- Retornar resultado
    SELECT jsonb_build_object(
        'success', true,
        'message', 'Plano de contas inserido com sucesso',
        'company_id', p_company_id
    ) INTO v_result;
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    SELECT jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'company_id', p_company_id
    ) INTO v_result;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário
COMMENT ON FUNCTION financeiro.insert_plano_contas_telecom(UUID, UUID) IS 
'Insere o plano de contas contábil completo para empresas de Telecom/Fibra Óptica';

-- Grant
GRANT EXECUTE ON FUNCTION financeiro.insert_plano_contas_telecom(UUID, UUID) TO authenticated;

