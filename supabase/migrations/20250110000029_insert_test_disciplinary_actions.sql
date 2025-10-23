-- =====================================================
-- INSERIR DADOS DE TESTE PARA AÇÕES DISCIPLINARES
-- =====================================================

-- Inserir dados de exemplo para testar o sistema
INSERT INTO rh.disciplinary_actions (
  id,
  company_id, 
  employee_id, 
  tipo_acao, 
  data_ocorrencia, 
  data_aplicacao,
  gravidade, 
  motivo, 
  descricao_ocorrencia, 
  status, 
  is_active,
  duration_days,
  start_date,
  end_date,
  aplicado_por,
  observacoes
) VALUES 
(
  gen_random_uuid(),
  'a9784891-9d58-4cc4-8404-18032105c335',
  'f1a121b9-fdf0-4b15-8162-aaaa0f5a1deb',
  'advertencia_verbal',
  '2025-01-15',
  '2025-01-15',
  'leve',
  'Atraso no trabalho',
  'Funcionário chegou 30 minutos atrasado sem justificativa. Foi orientado sobre a importância da pontualidade.',
  'active',
  true,
  NULL,
  NULL,
  NULL,
  'e745168f-addb-4456-a6fa-f4a336d874ac',
  'Primeira ocorrência - orientação verbal aplicada.'
),
(
  gen_random_uuid(),
  'a9784891-9d58-4cc4-8404-18032105c335',
  'f1a121b9-fdf0-4b15-8162-aaaa0f5a1deb',
  'advertencia_escrita',
  '2025-01-20',
  '2025-01-20',
  'moderada',
  'Falta de comunicação',
  'Funcionário não comunicou ausência em reunião importante, causando atraso no projeto. Documento de advertência escrita entregue.',
  'active',
  true,
  NULL,
  NULL,
  NULL,
  'e745168f-addb-4456-a6fa-f4a336d874ac',
  'Segunda ocorrência - advertência escrita aplicada.'
),
(
  gen_random_uuid(),
  'a9784891-9d58-4cc4-8404-18032105c335',
  '8e06f37d-c730-47b7-b0cd-d9c6c455ee32',
  'suspensao',
  '2025-01-25',
  '2025-01-25',
  'grave',
  'Descumprimento de normas de segurança',
  'Funcionário não utilizou equipamentos de proteção individual obrigatórios, colocando em risco sua segurança e de outros colaboradores.',
  'active',
  true,
  3,
  '2025-01-26',
  '2025-01-28',
  'e745168f-addb-4456-a6fa-f4a336d874ac',
  'Suspensão de 3 dias por descumprimento de normas de segurança.'
),
(
  gen_random_uuid(),
  'a9784891-9d58-4cc4-8404-18032105c335',
  '8e06f37d-c730-47b7-b0cd-d9c6c455ee32',
  'demissao_justa_causa',
  '2025-02-01',
  '2025-02-01',
  'gravissima',
  'Apropriação indébita',
  'Funcionário foi flagrado desviando materiais da empresa para uso pessoal. Ação grave que configura apropriação indébita.',
  'active',
  true,
  NULL,
  NULL,
  NULL,
  'e745168f-addb-4456-a6fa-f4a336d874ac',
  'Demissão por justa causa aplicada devido à gravidade da infração.'
);

-- Atualizar estatísticas para verificar se estão funcionando
COMMENT ON TABLE rh.disciplinary_actions IS 'Ações disciplinares - Dados de teste inseridos para validação da nova estrutura';
