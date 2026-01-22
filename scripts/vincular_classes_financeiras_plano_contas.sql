-- =====================================================
-- VINCULAR CLASSES FINANCEIRAS AO PLANO DE CONTAS
-- =====================================================
-- Insere vínculos em financeiro.classes_financeiras_contas (classe -> conta contábil).
-- NÃO é migração. Execute manualmente.
--
-- OPÇÃO 1 - Supabase SQL Editor (recomendado):
--   Dashboard > SQL Editor > New query > Cole este script > Run
--
-- OPÇÃO 2 - psql:
--   psql "postgresql://postgres:SENHA@db.wmtftyaqucwfsnnjepiy.supabase.co:5432/postgres" -f scripts/vincular_classes_financeiras_plano_contas.sql
--
-- OPÇÃO 3 - Node (do diretório do projeto):
--   $env:DATABASE_URL="postgresql://postgres:SENHA@db....:5432/postgres"
--   node scripts/execute-sql.mjs scripts/vincular_classes_financeiras_plano_contas.sql
-- =====================================================

-- Mapeamento: codigo_classe -> codigo_plano_contas (conta que aceita lançamento)
WITH mapeamento(codigo_cf, codigo_pc) AS (
  VALUES
  -- 1. Pessoal / Folha
  ('1.1.01', '6.1.01'),   -- Salários e Ordenados -> Salários Administrativos
  ('1.1.02', '6.1.02'),   -- Férias -> Encargos e Benefícios
  ('1.1.03', '6.1.02'),   -- 13º Salário -> Encargos e Benefícios
  ('1.1.04', '6.1.02'),   -- INSS -> Encargos e Benefícios
  ('1.1.05', '6.1.02'),   -- FGTS -> Encargos e Benefícios
  ('1.1.06', '6.1.02'),   -- IRRF -> Encargos e Benefícios
  ('1.1.07', '6.1.02'),   -- Rescisão Contratual -> Encargos e Benefícios
  ('1.1.08', '6.1.02'),   -- Ajuda de Custo -> Encargos e Benefícios
  ('1.1.09', '1.1.04.01'), -- Empréstimo Folha -> Adiantamentos a Colaboradores (ativo)
  ('1.2.01', '6.1.02'),   -- Vale Transporte -> Encargos e Benefícios
  ('1.2.02', '6.1.02'),   -- Vale Refeição -> Encargos e Benefícios
  ('1.2.03', '6.1.02'),   -- Vale Alimentação -> Encargos e Benefícios
  ('1.2.04', '6.1.02'),   -- Assistência Médica -> Encargos e Benefícios
  ('1.2.05', '6.1.02'),   -- Seguro de Vida em Grupo -> Encargos e Benefícios
  ('1.3.01', '6.3.01'),   -- Programa de Saúde Ocupacional -> Serviços de Terceiros
  ('1.3.02', '6.3.01'),   -- Serviço de Saúde Ocupacional -> Serviços de Terceiros
  ('1.3.03', '6.3.01'),   -- Exame Ocupacional -> Serviços de Terceiros
  ('1.4.01', '6.1.02'),   -- Prêmios -> Encargos e Benefícios
  ('1.4.02', '6.1.02'),   -- Gratificações -> Encargos e Benefícios
  ('1.4.03', '6.1.02'),   -- Prêmio Operacional -> Encargos e Benefícios
  ('1.4.04', '6.1.02'),   -- Prêmios (VEN) -> Encargos e Benefícios
  ('1.5.01', '6.3.01'),   -- Aperfeiçoamento Profissional -> Serviços de Terceiros
  ('1.5.02', '6.3.01'),   -- Capacitação Profissional -> Serviços de Terceiros
  ('1.5.03', '6.3.01'),   -- Treinamento (VEN) -> Serviços de Terceiros
  -- 2. Despesas Administrativas
  ('2.1.01', '6.3.03'),   -- Aluguéis e Condomínios -> Manutenção Predial
  ('2.1.02', '6.3.03'),   -- Locação Galpão -> Manutenção Predial
  ('2.1.03', '6.1.04'),   -- Energia Elétrica -> Energia Elétrica
  ('2.1.04', '6.1.05'),   -- Água, Gás e Esgoto -> Água
  ('2.1.05', '6.1.03'),   -- Telefone e Internet -> Telefonia e Internet
  ('2.1.06', '6.3.01'),   -- Correios e Malotes -> Serviços de Terceiros
  ('2.2.01', '6.3.01'),   -- Serviços Pessoa Física -> Serviços de Terceiros
  ('2.2.02', '6.3.01'),   -- Serviços Pessoa Jurídica -> Serviços de Terceiros
  ('2.2.03', '6.3.01'),   -- Serviços de Auditoria -> Serviços de Terceiros
  ('2.2.04', '6.1.06'),   -- Serviços de Contabilidade -> Serviços Contábeis
  ('2.2.05', '6.3.01'),   -- Serviços de Consultoria -> Serviços de Terceiros
  ('2.2.06', '6.3.01'),   -- Serviços de Advocacia -> Serviços de Terceiros
  ('2.2.07', '6.3.01'),   -- Serviços de Segurança do Trabalho -> Serviços de Terceiros
  ('2.2.08', '6.3.01'),   -- Serviço de Motoboy -> Serviços de Terceiros
  ('2.2.09', '6.3.01'),   -- Serviço de Rastreio Veicular -> Serviços de Terceiros
  ('2.3.01', '6.3.01'),   -- Seguros -> Serviços de Terceiros
  ('2.3.02', '6.3.01'),   -- Seguro Veicular -> Serviços de Terceiros
  ('2.3.03', '6.3.01'),   -- Indenização Veicular -> Serviços de Terceiros
  ('2.3.04', '6.3.01'),   -- Anuidade Registro Empresa -> Serviços de Terceiros
  ('2.3.05', '6.3.01'),   -- Anuidade Registro Profissional -> Serviços de Terceiros
  ('2.4.01', '6.3.01'),   -- Despesas Legais e Judiciais -> Serviços de Terceiros
  ('2.4.02', '6.3.01'),   -- Tributos (CREA, DAJE etc.) -> Serviços de Terceiros
  ('2.4.03', '2.1.03'),   -- ISS Retido s/ Serviços Prestados -> Obrigações Fiscais
  ('2.4.04', '2.1.03'),   -- ISS s/ Serviços -> Obrigações Fiscais
  ('2.4.05', '6.4.01'),   -- Juros e Multas Passivos -> Juros
  ('2.4.06', '2.1.03'),   -- ICMS – Outros -> Obrigações Fiscais
  ('2.4.07', '2.1.03'),   -- IPI – Outros -> Obrigações Fiscais
  ('2.4.08', '2.1.03'),   -- Simples Nacional -> Obrigações Fiscais
  ('2.5.01', '6.3.02'),   -- Material de Escritório -> Materiais de Escritório
  ('2.5.02', '6.3.02'),   -- Material de Limpeza e Higiene -> Materiais de Escritório
  ('2.5.03', '6.3.02'),   -- Material de Copa e Cozinha -> Materiais de Escritório
  ('2.5.04', '6.3.02'),   -- Material Gráfico -> Materiais de Escritório
  ('2.6.01', '6.2.02'),   -- Despesas com Marketing Corporativo -> Publicidade e Marketing
  ('2.6.02', '6.2.02'),   -- Brindes -> Publicidade e Marketing
  ('2.6.03', '6.2.02'),   -- Eventos e Confraternizações -> Publicidade e Marketing
  ('2.6.04', '6.2.02'),   -- Outros Eventos -> Publicidade e Marketing
  -- 3. Frota
  ('3.1.01', '2.1.05'),   -- Locação de Veículos -> Arrendamentos / Leasing CP (ou 5.1.04/5.2.04)
  ('3.1.02', '5.1.04'),   -- Combustíveis e Lubrificantes -> Veículos e Deslocamentos – Implantação
  ('3.1.03', '5.1.04'),   -- Pedágios e Estacionamentos -> Veículos e Deslocamentos – Implantação
  ('3.1.04', '6.4.02'),   -- Multas de Trânsito -> Multas
  ('3.2.01', '6.3.01'),   -- Manutenção de Veículos -> Serviços de Terceiros
  ('3.2.02', '6.3.01'),   -- Lavagem de Veículo -> Serviços de Terceiros
  ('3.2.03', '6.3.01'),   -- Indenização Veicular -> Serviços de Terceiros
  ('3.3.01', '6.1.07'),   -- Reembolso de Despesas de Terceiros -> Despesas com Viagens
  ('3.3.02', '6.3.01'),   -- Logística / Envio de Materiais -> Serviços de Terceiros
  ('3.3.03', '6.3.01'),   -- Envio e Recebimento de Mercadorias -> Serviços de Terceiros
  ('3.3.04', '6.3.01'),   -- Fretes e Carretos -> Serviços de Terceiros
  -- 4. Equipamentos, Máquinas e Infraestrutura
  ('4.1.01', '6.3.01'),   -- Locação de Equipamentos (despesa) -> Serviços de Terceiros
  ('4.1.02', '6.3.01'),   -- Locação de Equipamentos a Terceiros -> Serviços de Terceiros
  ('4.2.01', '6.3.01'),   -- Manutenção e Reparos -> Serviços de Terceiros
  ('4.2.02', '6.3.03'),   -- Manutenção Predial -> Manutenção Predial
  ('4.2.03', '6.3.01'),   -- Manutenção de Máquinas e Equipamentos -> Serviços de Terceiros
  ('4.3.01', '1.2.02.04'), -- Ferramentas -> Ferramentas Permanentes (ativo) ou 5.1.05
  ('4.3.02', '5.1.02'),   -- Material e Equipamentos Telecom -> Materiais de Rede – Implantação
  ('4.3.03', '1.2.02.03'), -- Equipamentos de Informática -> Máquinas e Equipamentos (ativo)
  ('4.3.04', '1.2.02.03'), -- Equipamentos de Comunicação -> Máquinas e Equipamentos (ativo)
  ('4.3.05', '1.2.02.03'), -- Máquinas e Equipamentos -> Máquinas e Equipamentos (ativo)
  ('4.4.01', '1.2.03.01'), -- Sistemas Aplicativos / Software -> Softwares de Gestão (ativo) ou 6.3.01
  -- 5. Operações de Campo
  ('5.1.01', '5.1.02'),   -- Material Elétrico -> Materiais de Rede – Implantação
  ('5.1.02', '5.1.02'),   -- Material Civil -> Materiais de Rede – Implantação
  ('5.1.03', '5.1.02'),   -- Material Metálico / Galvanizado -> Materiais de Rede – Implantação
  ('5.1.04', '5.1.02'),   -- Material de Segurança -> Materiais de Rede – Implantação
  ('5.1.05', '5.1.02'),   -- Equipamentos de Informática -> Materiais de Rede – Implantação
  ('5.1.06', '5.1.02'),   -- Insumo de Metalurgia -> Materiais de Rede – Implantação
  ('5.1.07', '5.1.02'),   -- Material Telecon -> Materiais de Rede – Implantação
  ('5.1.08', '1.1.03.03'), -- EPI's -> Ferramentas e EPIs (ativo/estoque)
  ('5.1.09', '5.1.02'),   -- Produtos Acabados -> Materiais de Rede – Implantação
  ('5.1.10', '5.1.02'),   -- Produto Intermediário -> Materiais de Rede – Implantação
  ('5.2.01', '5.1.03'),   -- Prestador de Serviços Terceirizados -> Equipes Terceirizadas – Implantação
  ('5.2.02', '6.3.01'),   -- ART Elétrica -> Serviços de Terceiros
  ('5.2.03', '6.3.01'),   -- ART Civil -> Serviços de Terceiros
  ('5.3.01', '5.1.04'),   -- Conduções e Táxis -> Veículos e Deslocamentos – Implantação
  ('5.3.02', '5.1.04'),   -- Conduções e Táxis – Reembolsos -> Veículos e Deslocamentos – Implantação
  ('5.3.03', '6.1.07'),   -- Viagens e Representações -> Despesas com Viagens
  ('5.3.04', '6.1.07'),   -- Despesas de Viagens -> Despesas com Viagens
  ('5.3.05', '5.2.04'),   -- Despesas de Deslocamento -> Veículos e Deslocamentos – Manutenção
  ('5.3.06', '6.3.01'),   -- Lanches e Refeições -> Serviços de Terceiros
  -- 6. Comercial e Vendas
  ('6.1.01', '6.2.02'),   -- Despesas Comerciais -> Publicidade e Marketing
  ('6.1.02', '6.1.07'),   -- Passagens -> Despesas com Viagens
  ('6.1.03', '6.1.07'),   -- Diárias -> Despesas com Viagens
  ('6.1.04', '6.1.07'),   -- Diárias (VEN) -> Despesas com Viagens
  -- 7. Financeiro
  ('7.1.01', '1.1.02.03'), -- Adiantamento a Fornecedores -> Adiantamentos a Fornecedores (ativo)
  ('7.1.02', '1.1.04.01'), -- Empréstimos a Funcionários -> Adiantamentos a Colaboradores (ativo)
  ('7.1.03', '1.1.02.03'), -- Compra para Entrega Futura -> Adiantamentos a Fornecedores (ativo)
  ('7.2.01', '1.1.01.01'), -- Caixa Rotativo -> Caixa (ativo)
  ('7.2.02', '6.1.07'),   -- Reembolsos -> Despesas com Viagens (genérico; altern. 7.2)
  ('7.3.01', '7.2'),      -- Despesas Diversas -> Outras Despesas
  -- 8. Outros
  ('8.1', '7.2'),         -- Outros Eventos -> Outras Despesas
  ('8.2', '7.2')          -- Diversos -> Outras Despesas
),
inseridos AS (
  INSERT INTO financeiro.classes_financeiras_contas (company_id, classe_financeira_id, conta_contabil_id, is_default)
  SELECT cf.company_id, cf.id, pc.id, true
  FROM financeiro.classes_financeiras cf
  JOIN mapeamento m ON m.codigo_cf = cf.codigo
  JOIN financeiro.plano_contas pc ON pc.company_id = cf.company_id AND pc.codigo = m.codigo_pc
  ON CONFLICT (company_id, classe_financeira_id, conta_contabil_id) DO NOTHING
  RETURNING 1
)
SELECT COALESCE((SELECT COUNT(*) FROM inseridos), 0) AS vinculos_inseridos;
