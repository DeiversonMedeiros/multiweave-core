-- =====================================================
-- FIX: dependents_with_employee view - Remover filtro de status
-- =====================================================
-- Data: 2025-12-08
-- Descrição: Remove o filtro WHERE d.status = 'ativo' da view
--            para que todos os dependentes sejam retornados
--            com informações do funcionário, independente do status
-- =====================================================

CREATE OR REPLACE VIEW rh.dependents_with_employee AS
SELECT 
  d.id,
  d.company_id,
  d.employee_id,
  d.nome,
  d.cpf,
  d.rg,
  d.data_nascimento,
  d.parentesco,
  d.sexo,
  d.estado_civil,
  d.nacionalidade,
  d.naturalidade,
  d.nome_mae,
  d.nome_pai,
  d.cpf_mae,
  d.cpf_pai,
  d.telefone,
  d.email,
  d.endereco,
  d.cidade,
  d.estado,
  d.cep,
  d.data_casamento,
  d.data_uniao_estavel,
  d.data_separacao,
  d.data_obito,
  d.data_nascimento_mae,
  d.escolaridade,
  d.instituicao_ensino,
  d.possui_deficiencia,
  d.tipo_deficiencia,
  d.grau_deficiencia,
  d.necessita_cuidados_especiais,
  d.certidao_nascimento,
  d.certidao_casamento,
  d.certidao_uniao_estavel,
  d.comprovante_residencia,
  d.status,
  d.data_inclusao,
  d.data_exclusao,
  d.motivo_exclusao,
  d.observacoes,
  d.created_at,
  d.updated_at,
  d.created_by,
  d.updated_by,
  e.nome AS funcionario_nome,
  e.matricula AS funcionario_matricula,
  e.cpf AS funcionario_cpf
FROM rh.dependents d
LEFT JOIN rh.employees e ON d.employee_id = e.id;

-- Comentário atualizado
COMMENT ON VIEW rh.dependents_with_employee IS 'View para consultar dependentes com informações do funcionário. Retorna todos os dependentes independente do status. Use filtros no código para filtrar por status se necessário.';
