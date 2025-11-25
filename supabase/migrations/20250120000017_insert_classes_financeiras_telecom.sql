-- =====================================================
-- MIGRAÇÃO: INSERIR CLASSES FINANCEIRAS GERENCIAIS - TELECOM FIBRA ÓPTICA
-- =====================================================
-- Data: 2025-01-20
-- Descrição: Insere estrutura completa das Classes Financeiras Gerenciais
--            para empresas de Telecom/Fibra Óptica (hierarquia Pai/Filho)
-- Autor: Sistema MultiWeave Core

-- =====================================================
-- FUNÇÃO PARA INSERIR CLASSES FINANCEIRAS
-- =====================================================

CREATE OR REPLACE FUNCTION financeiro.insert_classes_financeiras_telecom(p_company_id UUID, p_created_by UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB := '{"inserted": 0, "errors": []}'::JSONB;
    v_classe_id UUID;
    v_pai_id UUID;
    v_ordem INTEGER := 0;
BEGIN
    -- =====================================================
    -- 1. PESSOAL / FOLHA DE PAGAMENTO
    -- =====================================================
    
    -- 1 - Pessoal / Folha de Pagamento (nível 1)
    v_ordem := 1;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1', 'Pessoal / Folha de Pagamento', 'Classes financeiras relacionadas a pessoal e folha de pagamento', NULL, 1, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 1.1 - Salários, Encargos e Benefícios (nível 2)
    v_ordem := 1;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.1', 'Salários, Encargos e Benefícios', NULL, v_pai_id, 2, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 1.1.01 - Salários e Ordenados (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.1.01', 'Salários e Ordenados', v_pai_id, 3, 1, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 1.1.02 - Férias (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.1.02', 'Férias', v_pai_id, 3, 2, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 1.1.03 - 13º Salário (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.1.03', '13º Salário', v_pai_id, 3, 3, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 1.1.04 - INSS (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.1.04', 'INSS', v_pai_id, 3, 4, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 1.1.05 - FGTS (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.1.05', 'FGTS', v_pai_id, 3, 5, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 1.1.06 - IRRF (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.1.06', 'IRRF', v_pai_id, 3, 6, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 1.1.07 - Rescisão Contratual (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.1.07', 'Rescisão Contratual', v_pai_id, 3, 7, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 1.1.08 - Ajuda de Custo (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.1.08', 'Ajuda de Custo', v_pai_id, 3, 8, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 1.1.09 - Empréstimo Folha (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.1.09', 'Empréstimo Folha', v_pai_id, 3, 9, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 1.2 - Benefícios (nível 2)
    SELECT id INTO v_pai_id FROM financeiro.classes_financeiras WHERE company_id = p_company_id AND codigo = '1';
    v_ordem := 2;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.2', 'Benefícios', NULL, v_pai_id, 2, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 1.2.01 - Vale Transporte (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.2.01', 'Vale Transporte', v_pai_id, 3, 1, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 1.2.02 - Vale Refeição (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.2.02', 'Vale Refeição', v_pai_id, 3, 2, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 1.2.03 - Vale Alimentação (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.2.03', 'Vale Alimentação', v_pai_id, 3, 3, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 1.2.04 - Assistência Médica (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.2.04', 'Assistência Médica', v_pai_id, 3, 4, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 1.2.05 - Seguro de Vida em Grupo (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.2.05', 'Seguro de Vida em Grupo', v_pai_id, 3, 5, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 1.3 - Programas e Saúde Ocupacional (nível 2)
    SELECT id INTO v_pai_id FROM financeiro.classes_financeiras WHERE company_id = p_company_id AND codigo = '1';
    v_ordem := 3;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.3', 'Programas e Saúde Ocupacional', NULL, v_pai_id, 2, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 1.3.01 - Programa de Saúde Ocupacional (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.3.01', 'Programa de Saúde Ocupacional', v_pai_id, 3, 1, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 1.3.02 - Serviço de Saúde Ocupacional (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.3.02', 'Serviço de Saúde Ocupacional', v_pai_id, 3, 2, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 1.3.03 - Exame Ocupacional (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.3.03', 'Exame Ocupacional', v_pai_id, 3, 3, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 1.4 - Incentivos e Premiações (nível 2)
    SELECT id INTO v_pai_id FROM financeiro.classes_financeiras WHERE company_id = p_company_id AND codigo = '1';
    v_ordem := 4;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.4', 'Incentivos e Premiações', NULL, v_pai_id, 2, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 1.4.01 - Prêmios (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.4.01', 'Prêmios', v_pai_id, 3, 1, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 1.4.02 - Gratificações (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.4.02', 'Gratificações', v_pai_id, 3, 2, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 1.4.03 - Prêmio Operacional (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.4.03', 'Prêmio Operacional', v_pai_id, 3, 3, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 1.4.04 - Prêmios (VEN) (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.4.04', 'Prêmios (VEN)', v_pai_id, 3, 4, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 1.5 - Treinamento e Desenvolvimento (nível 2)
    SELECT id INTO v_pai_id FROM financeiro.classes_financeiras WHERE company_id = p_company_id AND codigo = '1';
    v_ordem := 5;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.5', 'Treinamento e Desenvolvimento', NULL, v_pai_id, 2, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 1.5.01 - Aperfeiçoamento Profissional (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.5.01', 'Aperfeiçoamento Profissional', v_pai_id, 3, 1, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 1.5.02 - Capacitação Profissional (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.5.02', 'Capacitação Profissional', v_pai_id, 3, 2, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 1.5.03 - Treinamento (VEN) (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '1.5.03', 'Treinamento (VEN)', v_pai_id, 3, 3, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- =====================================================
    -- 2. DESPESAS ADMINISTRATIVAS
    -- =====================================================
    
    -- 2 - Despesas Administrativas (nível 1)
    v_ordem := 2;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2', 'Despesas Administrativas', 'Classes financeiras relacionadas a despesas administrativas', NULL, 1, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 2.1 - Instalações e Utilidades (nível 2)
    v_ordem := 1;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.1', 'Instalações e Utilidades', NULL, v_pai_id, 2, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 2.1.01 - Aluguéis e Condomínios (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.1.01', 'Aluguéis e Condomínios', v_pai_id, 3, 1, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.1.02 - Locação Galpão (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.1.02', 'Locação Galpão', v_pai_id, 3, 2, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.1.03 - Energia Elétrica (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.1.03', 'Energia Elétrica', v_pai_id, 3, 3, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.1.04 - Água, Gás e Esgoto (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.1.04', 'Água, Gás e Esgoto', v_pai_id, 3, 4, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.1.05 - Telefone e Internet (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.1.05', 'Telefone e Internet', v_pai_id, 3, 5, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.1.06 - Correios e Malotes (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.1.06', 'Correios e Malotes', v_pai_id, 3, 6, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.2 - Serviços (nível 2)
    SELECT id INTO v_pai_id FROM financeiro.classes_financeiras WHERE company_id = p_company_id AND codigo = '2';
    v_ordem := 2;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.2', 'Serviços', NULL, v_pai_id, 2, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 2.2.01 - Serviços Pessoa Física (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.2.01', 'Serviços Pessoa Física', v_pai_id, 3, 1, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.2.02 - Serviços Pessoa Jurídica (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.2.02', 'Serviços Pessoa Jurídica', v_pai_id, 3, 2, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.2.03 - Serviços de Auditoria (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.2.03', 'Serviços de Auditoria', v_pai_id, 3, 3, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.2.04 - Serviços de Contabilidade (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.2.04', 'Serviços de Contabilidade', v_pai_id, 3, 4, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.2.05 - Serviços de Consultoria (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.2.05', 'Serviços de Consultoria', v_pai_id, 3, 5, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.2.06 - Serviços de Advocacia (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.2.06', 'Serviços de Advocacia', v_pai_id, 3, 6, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.2.07 - Serviços de Segurança do Trabalho (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.2.07', 'Serviços de Segurança do Trabalho', v_pai_id, 3, 7, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.2.08 - Serviços de Motoboy (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.2.08', 'Serviço de Motoboy', v_pai_id, 3, 8, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.2.09 - Serviço de Rastreio Veicular (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.2.09', 'Serviço de Rastreio Veicular', v_pai_id, 3, 9, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.3 - Seguros e Taxas (nível 2)
    SELECT id INTO v_pai_id FROM financeiro.classes_financeiras WHERE company_id = p_company_id AND codigo = '2';
    v_ordem := 3;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.3', 'Seguros e Taxas', NULL, v_pai_id, 2, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 2.3.01 - Seguros (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.3.01', 'Seguros', v_pai_id, 3, 1, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.3.02 - Seguro Veicular (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.3.02', 'Seguro Veicular', v_pai_id, 3, 2, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.3.03 - Indenização Veicular (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.3.03', 'Indenização Veicular', v_pai_id, 3, 3, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.3.04 - Anuidade Registro Empresa (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.3.04', 'Anuidade Registro Empresa', v_pai_id, 3, 4, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.3.05 - Anuidade Registro Profissional (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.3.05', 'Anuidade Registro Profissional', v_pai_id, 3, 5, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.4 - Despesas Legais e Tributárias (nível 2)
    SELECT id INTO v_pai_id FROM financeiro.classes_financeiras WHERE company_id = p_company_id AND codigo = '2';
    v_ordem := 4;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.4', 'Despesas Legais e Tributárias', NULL, v_pai_id, 2, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 2.4.01 - Despesas Legais e Judiciais (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.4.01', 'Despesas Legais e Judiciais', v_pai_id, 3, 1, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.4.02 - Tributos (CREA, DAJE etc.) (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.4.02', 'Tributos (CREA, DAJE etc.)', v_pai_id, 3, 2, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.4.03 - ISS Retido s/ Serviços Prestados (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.4.03', 'ISS Retido s/ Serviços Prestados', v_pai_id, 3, 3, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.4.04 - ISS s/ Serviços (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.4.04', 'ISS s/ Serviços', v_pai_id, 3, 4, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.4.05 - Juros e Multas Passivos (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.4.05', 'Juros e Multas Passivos', v_pai_id, 3, 5, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.4.06 - ICMS – Outros (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.4.06', 'ICMS – Outros', v_pai_id, 3, 6, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.4.07 - IPI – Outros (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.4.07', 'IPI – Outros', v_pai_id, 3, 7, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.4.08 - Simples Nacional (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.4.08', 'Simples Nacional', v_pai_id, 3, 8, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.5 - Despesas de Escritório e Consumo (nível 2)
    SELECT id INTO v_pai_id FROM financeiro.classes_financeiras WHERE company_id = p_company_id AND codigo = '2';
    v_ordem := 5;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.5', 'Despesas de Escritório e Consumo', NULL, v_pai_id, 2, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 2.5.01 - Material de Escritório (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.5.01', 'Material de Escritório', v_pai_id, 3, 1, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.5.02 - Material de Limpeza e Higiene (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.5.02', 'Material de Limpeza e Higiene', v_pai_id, 3, 2, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.5.03 - Material de Copa e Cozinha (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.5.03', 'Material de Copa e Cozinha', v_pai_id, 3, 3, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.5.04 - Material Gráfico (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.5.04', 'Material Gráfico', v_pai_id, 3, 4, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.6 - Marketing e Comunicação (nível 2)
    SELECT id INTO v_pai_id FROM financeiro.classes_financeiras WHERE company_id = p_company_id AND codigo = '2';
    v_ordem := 6;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.6', 'Marketing e Comunicação', NULL, v_pai_id, 2, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 2.6.01 - Despesas com Marketing Corporativo (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.6.01', 'Despesas com Marketing Corporativo', v_pai_id, 3, 1, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.6.02 - Brindes (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.6.02', 'Brindes', v_pai_id, 3, 2, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.6.03 - Eventos e Confraternizações (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.6.03', 'Eventos e Confraternizações', v_pai_id, 3, 3, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 2.6.04 - Outros Eventos (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '2.6.04', 'Outros Eventos', v_pai_id, 3, 4, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- =====================================================
    -- 3. FROTA
    -- =====================================================
    
    -- 3 - Frota (nível 1)
    v_ordem := 3;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '3', 'Frota', 'Classes financeiras relacionadas a frota', NULL, 1, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 3.1 - Operação da Frota (nível 2)
    v_ordem := 1;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '3.1', 'Operação da Frota', NULL, v_pai_id, 2, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 3.1.01 - Locação de Veículos (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '3.1.01', 'Locação de Veículos', v_pai_id, 3, 1, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 3.1.02 - Combustíveis e Lubrificantes (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '3.1.02', 'Combustíveis e Lubrificantes', v_pai_id, 3, 2, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 3.1.03 - Pedágios e Estacionamentos (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '3.1.03', 'Pedágios e Estacionamentos', v_pai_id, 3, 3, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 3.1.04 - Multas de Trânsito (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '3.1.04', 'Multas de Trânsito', v_pai_id, 3, 4, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 3.2 - Manutenção da Frota (nível 2)
    SELECT id INTO v_pai_id FROM financeiro.classes_financeiras WHERE company_id = p_company_id AND codigo = '3';
    v_ordem := 2;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '3.2', 'Manutenção da Frota', NULL, v_pai_id, 2, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 3.2.01 - Manutenção de Veículos (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '3.2.01', 'Manutenção de Veículos', v_pai_id, 3, 1, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 3.2.02 - Lavagem de Veículo (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '3.2.02', 'Lavagem de Veículo', v_pai_id, 3, 2, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 3.2.03 - Indenização Veicular (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '3.2.03', 'Indenização Veicular', v_pai_id, 3, 3, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 3.3 - Logística (nível 2)
    SELECT id INTO v_pai_id FROM financeiro.classes_financeiras WHERE company_id = p_company_id AND codigo = '3';
    v_ordem := 3;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '3.3', 'Logística', NULL, v_pai_id, 2, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 3.3.01 - Reembolso de Despesas de Terceiros (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '3.3.01', 'Reembolso de Despesas de Terceiros', v_pai_id, 3, 1, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 3.3.02 - Logística / Envio de Materiais (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '3.3.02', 'Logística / Envio de Materiais', v_pai_id, 3, 2, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 3.3.03 - Envio e Recebimento de Mercadorias (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '3.3.03', 'Envio e Recebimento de Mercadorias', v_pai_id, 3, 3, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 3.3.04 - Fretes e Carretos (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '3.3.04', 'Fretes e Carretos', v_pai_id, 3, 4, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- =====================================================
    -- 4. EQUIPAMENTOS, MÁQUINAS E INFRAESTRUTURA
    -- =====================================================
    
    -- 4 - Equipamentos, Máquinas e Infraestrutura (nível 1)
    v_ordem := 4;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '4', 'Equipamentos, Máquinas e Infraestrutura', 'Classes financeiras relacionadas a equipamentos e infraestrutura', NULL, 1, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 4.1 - Locação e Uso (nível 2)
    v_ordem := 1;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '4.1', 'Locação e Uso', NULL, v_pai_id, 2, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 4.1.01 - Locação de Equipamentos (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '4.1.01', 'Locação de Equipamentos', v_pai_id, 3, 1, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 4.1.02 - Locação de Equipamentos a Terceiros (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '4.1.02', 'Locação de Equipamentos a Terceiros', v_pai_id, 3, 2, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 4.2 - Manutenção (nível 2)
    SELECT id INTO v_pai_id FROM financeiro.classes_financeiras WHERE company_id = p_company_id AND codigo = '4';
    v_ordem := 2;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '4.2', 'Manutenção', NULL, v_pai_id, 2, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 4.2.01 - Manutenção e Reparos (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '4.2.01', 'Manutenção e Reparos', v_pai_id, 3, 1, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 4.2.02 - Manutenção Predial (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '4.2.02', 'Manutenção Predial', v_pai_id, 3, 2, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 4.2.03 - Manutenção de Máquinas e Equipamentos (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '4.2.03', 'Manutenção de Máquinas e Equipamentos', v_pai_id, 3, 3, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 4.3 - Equipamentos e Ferramentas (nível 2)
    SELECT id INTO v_pai_id FROM financeiro.classes_financeiras WHERE company_id = p_company_id AND codigo = '4';
    v_ordem := 3;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '4.3', 'Equipamentos e Ferramentas', NULL, v_pai_id, 2, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 4.3.01 - Ferramentas (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '4.3.01', 'Ferramentas', v_pai_id, 3, 1, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 4.3.02 - Material e Equipamentos Telecom (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '4.3.02', 'Material e Equipamentos Telecom', v_pai_id, 3, 2, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 4.3.03 - Equipamentos de Informática (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '4.3.03', 'Equipamentos de Informática', v_pai_id, 3, 3, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 4.3.04 - Equipamentos de Comunicação (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '4.3.04', 'Equipamentos de Comunicação', v_pai_id, 3, 4, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 4.3.05 - Máquinas e Equipamentos (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '4.3.05', 'Máquinas e Equipamentos', v_pai_id, 3, 5, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 4.4 - Tecnologia e Sistemas (nível 2)
    SELECT id INTO v_pai_id FROM financeiro.classes_financeiras WHERE company_id = p_company_id AND codigo = '4';
    v_ordem := 4;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '4.4', 'Tecnologia e Sistemas', NULL, v_pai_id, 2, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 4.4.01 - Sistemas Aplicativos / Software (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '4.4.01', 'Sistemas Aplicativos / Software', v_pai_id, 3, 1, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- =====================================================
    -- 5. OPERAÇÕES DE CAMPO (IMPLANTAÇÃO E MANUTENÇÃO DE FIBRA ÓPTICA)
    -- =====================================================
    
    -- 5 - Operações de Campo (nível 1)
    v_ordem := 5;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '5', 'Operações de Campo (Implantação e Manutenção de Fibra Óptica)', 'Classes financeiras relacionadas a operações de campo', NULL, 1, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 5.1 - Materiais Técnicos (nível 2)
    v_ordem := 1;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '5.1', 'Materiais Técnicos', NULL, v_pai_id, 2, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 5.1.01 - Material Elétrico (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '5.1.01', 'Material Elétrico', v_pai_id, 3, 1, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 5.1.02 - Material Civil (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '5.1.02', 'Material Civil', v_pai_id, 3, 2, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 5.1.03 - Material Metálico / Galvanizado (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '5.1.03', 'Material Metálico / Galvanizado', v_pai_id, 3, 3, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 5.1.04 - Material de Segurança (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '5.1.04', 'Material de Segurança', v_pai_id, 3, 4, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 5.1.05 - Equipamentos de Informática (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '5.1.05', 'Equipamentos de Informática', v_pai_id, 3, 5, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 5.1.06 - Insumo de Metalurgia (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '5.1.06', 'Insumo de Metalurgia', v_pai_id, 3, 6, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 5.1.07 - Material Telecon (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '5.1.07', 'Material Telecon', v_pai_id, 3, 7, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 5.1.08 - EPI's (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '5.1.08', 'EPI''s', v_pai_id, 3, 8, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 5.1.09 - Produtos Acabados (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '5.1.09', 'Produtos Acabados', v_pai_id, 3, 9, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 5.1.10 - Produto Intermediário (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '5.1.10', 'Produto Intermediário', v_pai_id, 3, 10, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 5.2 - Serviços Operacionais (nível 2)
    SELECT id INTO v_pai_id FROM financeiro.classes_financeiras WHERE company_id = p_company_id AND codigo = '5';
    v_ordem := 2;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '5.2', 'Serviços Operacionais', NULL, v_pai_id, 2, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 5.2.01 - Prestador de Serviços Terceirizados (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '5.2.01', 'Prestador de Serviços Terceirizados', v_pai_id, 3, 1, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 5.2.02 - ART Elétrica (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '5.2.02', 'ART Elétrica', v_pai_id, 3, 2, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 5.2.03 - ART Civil (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '5.2.03', 'ART Civil', v_pai_id, 3, 3, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 5.3 - Deslocamentos e Apoio Operacional (nível 2)
    SELECT id INTO v_pai_id FROM financeiro.classes_financeiras WHERE company_id = p_company_id AND codigo = '5';
    v_ordem := 3;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '5.3', 'Deslocamentos e Apoio Operacional', NULL, v_pai_id, 2, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 5.3.01 - Conduções e Táxis (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '5.3.01', 'Conduções e Táxis', v_pai_id, 3, 1, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 5.3.02 - Conduções e Táxis – Reembolsos (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '5.3.02', 'Conduções e Táxis – Reembolsos', v_pai_id, 3, 2, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 5.3.03 - Viagens e Representações (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '5.3.03', 'Viagens e Representações', v_pai_id, 3, 3, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 5.3.04 - Despesas de Viagens (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '5.3.04', 'Despesas de Viagens', v_pai_id, 3, 4, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 5.3.05 - Despesas de Deslocamento (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '5.3.05', 'Despesas de Deslocamento', v_pai_id, 3, 5, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 5.3.06 - Lanches e Refeições (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '5.3.06', 'Lanches e Refeições', v_pai_id, 3, 6, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- =====================================================
    -- 6. COMERCIAL E VENDAS
    -- =====================================================
    
    -- 6 - Comercial e Vendas (nível 1)
    v_ordem := 6;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '6', 'Comercial e Vendas', 'Classes financeiras relacionadas a comercial e vendas', NULL, 1, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 6.1 - Despesas Comerciais (nível 2)
    v_ordem := 1;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '6.1', 'Despesas Comerciais', NULL, v_pai_id, 2, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 6.1.01 - Despesas Comerciais (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '6.1.01', 'Despesas Comerciais', v_pai_id, 3, 1, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 6.1.02 - Passagens (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '6.1.02', 'Passagens', v_pai_id, 3, 2, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 6.1.03 - Diárias (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '6.1.03', 'Diárias', v_pai_id, 3, 3, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 6.1.04 - Diárias (VEN) (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '6.1.04', 'Diárias (VEN)', v_pai_id, 3, 4, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- =====================================================
    -- 7. FINANCEIRO
    -- =====================================================
    
    -- 7 - Financeiro (nível 1)
    v_ordem := 7;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '7', 'Financeiro', 'Classes financeiras relacionadas a operações financeiras', NULL, 1, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 7.1 - Adiantamentos (nível 2)
    v_ordem := 1;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '7.1', 'Adiantamentos', NULL, v_pai_id, 2, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 7.1.01 - Adiantamento a Fornecedores (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '7.1.01', 'Adiantamento a Fornecedores', v_pai_id, 3, 1, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 7.1.02 - Empréstimos a Funcionários (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '7.1.02', 'Empréstimos a Funcionários', v_pai_id, 3, 2, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 7.1.03 - Compra para Entrega Futura (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '7.1.03', 'Compra para Entrega Futura', v_pai_id, 3, 3, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 7.2 - Caixas e Movimentação (nível 2)
    SELECT id INTO v_pai_id FROM financeiro.classes_financeiras WHERE company_id = p_company_id AND codigo = '7';
    v_ordem := 2;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '7.2', 'Caixas e Movimentação', NULL, v_pai_id, 2, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 7.2.01 - Caixa Rotativo (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '7.2.01', 'Caixa Rotativo', v_pai_id, 3, 1, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 7.2.02 - Reembolsos (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '7.2.02', 'Reembolsos', v_pai_id, 3, 2, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 7.3 - Diversos (nível 2)
    SELECT id INTO v_pai_id FROM financeiro.classes_financeiras WHERE company_id = p_company_id AND codigo = '7';
    v_ordem := 3;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '7.3', 'Diversos', NULL, v_pai_id, 2, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 7.3.01 - Despesas Diversas (nível 3)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '7.3.01', 'Despesas Diversas', v_pai_id, 3, 1, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- =====================================================
    -- 8. OUTROS
    -- =====================================================
    
    -- 8 - Outros (nível 1)
    v_ordem := 8;
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '8', 'Outros', 'Classes financeiras diversas', NULL, 1, v_ordem, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO v_pai_id;
    
    -- 8.1 - Outros Eventos (nível 2)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '8.1', 'Outros Eventos', NULL, v_pai_id, 2, 1, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- 8.2 - Diversos (nível 2)
    INSERT INTO financeiro.classes_financeiras (company_id, codigo, nome, descricao, classe_pai_id, nivel, ordem, created_by)
    VALUES (p_company_id, '8.2', 'Diversos', NULL, v_pai_id, 2, 2, p_created_by)
    ON CONFLICT (company_id, codigo) DO UPDATE SET nome = EXCLUDED.nome;
    
    -- Retornar resultado
    SELECT jsonb_build_object(
        'success', true,
        'message', 'Classes financeiras inseridas com sucesso',
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
COMMENT ON FUNCTION financeiro.insert_classes_financeiras_telecom(UUID, UUID) IS 
'Insere as classes financeiras gerenciais completas para empresas de Telecom/Fibra Óptica';

-- Grant
GRANT EXECUTE ON FUNCTION financeiro.insert_classes_financeiras_telecom(UUID, UUID) TO authenticated;

