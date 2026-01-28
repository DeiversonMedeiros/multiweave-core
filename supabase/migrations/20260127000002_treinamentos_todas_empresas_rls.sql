-- =====================================================
-- Treinamentos visíveis para todas as empresas
-- Data: 2026-01-27
-- Descrição: Permite que treinamentos na página rh/treinamentos
--            estejam disponíveis para todas as empresas e que
--            se possa atribuir a qualquer usuário de qualquer empresa.
--            Políticas RLS adicionais para acesso direto às tabelas
--            (o fluxo principal usa get_entity_data com skipCompanyFilter).
-- =====================================================

-- rh.trainings: usuários com acesso a qualquer empresa podem ver todos os treinamentos
CREATE POLICY "Users with any company can view all trainings"
  ON rh.trainings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.ativo = true
    )
  );

-- rh.training_enrollments: usuários com acesso a qualquer empresa podem ver todas as inscrições
CREATE POLICY "Users with any company can view all training enrollments"
  ON rh.training_enrollments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.ativo = true
    )
  );

-- rh.training_enrollments: usuários com acesso a qualquer empresa podem criar inscrições para qualquer empresa
CREATE POLICY "Users with any company can insert training enrollments for any company"
  ON rh.training_enrollments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.ativo = true
    )
  );

-- rh.training_enrollments: usuários com acesso a qualquer empresa podem atualizar inscrições de qualquer empresa
CREATE POLICY "Users with any company can update any training enrollment"
  ON rh.training_enrollments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.ativo = true
    )
  );

-- rh.training_enrollments: usuários com acesso a qualquer empresa podem excluir inscrições de qualquer empresa
CREATE POLICY "Users with any company can delete any training enrollment"
  ON rh.training_enrollments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.ativo = true
    )
  );

-- rh.training_attendance: visível e editável cross-company para consistência
CREATE POLICY "Users with any company can view all training attendance"
  ON rh.training_attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.ativo = true
    )
  );

CREATE POLICY "Users with any company can insert training attendance for any company"
  ON rh.training_attendance
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.ativo = true
    )
  );

CREATE POLICY "Users with any company can update any training attendance"
  ON rh.training_attendance
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.ativo = true
    )
  );

-- rh.training_certificates: visível e editável cross-company
CREATE POLICY "Users with any company can view all training certificates"
  ON rh.training_certificates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.ativo = true
    )
  );

CREATE POLICY "Users with any company can insert training certificates for any company"
  ON rh.training_certificates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.ativo = true
    )
  );

CREATE POLICY "Users with any company can update any training certificate"
  ON rh.training_certificates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.ativo = true
    )
  );

-- rh.training_evaluations: visível e editável cross-company
CREATE POLICY "Users with any company can view all training evaluations"
  ON rh.training_evaluations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.ativo = true
    )
  );

CREATE POLICY "Users with any company can insert training evaluations for any company"
  ON rh.training_evaluations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.ativo = true
    )
  );

CREATE POLICY "Users with any company can update any training evaluation"
  ON rh.training_evaluations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.ativo = true
    )
  );

COMMENT ON POLICY "Users with any company can view all trainings" ON rh.trainings IS
  'Treinamentos visíveis para todas as empresas na página rh/treinamentos';

COMMENT ON POLICY "Users with any company can view all training enrollments" ON rh.training_enrollments IS
  'Inscrições visíveis para permitir atribuir a qualquer usuário de qualquer empresa';
