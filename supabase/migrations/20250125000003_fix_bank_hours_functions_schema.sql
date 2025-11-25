    -- =====================================================
-- CORREÇÃO: MOVER FUNÇÕES PARA SCHEMA PUBLIC
-- =====================================================

-- Remover funções do schema rh se existirem
DROP FUNCTION IF EXISTS rh.get_bank_hours_assignments_with_relations(UUID);
DROP FUNCTION IF EXISTS rh.get_bank_hours_assignment_with_relations(UUID, UUID);
DROP FUNCTION IF EXISTS rh.get_employee_bank_hours_assignments_with_relations(UUID, UUID);
DROP FUNCTION IF EXISTS rh.get_type_bank_hours_assignments_with_relations(UUID, UUID);

-- Criar funções no schema public
CREATE OR REPLACE FUNCTION get_bank_hours_assignments_with_relations(
  p_company_id UUID
)
RETURNS TABLE(
  id UUID,
  employee_id UUID,
  company_id UUID,
  bank_hours_type_id UUID,
  is_active BOOLEAN,
  assigned_at TIMESTAMP WITH TIME ZONE,
  assigned_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  -- Dados do funcionário
  employee_nome VARCHAR(255),
  employee_matricula VARCHAR(50),
  employee_cpf VARCHAR(14),
  -- Dados do tipo de banco de horas
  type_name VARCHAR(100),
  type_code VARCHAR(20),
  type_description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.employee_id,
    a.company_id,
    a.bank_hours_type_id,
    a.is_active,
    a.assigned_at,
    a.assigned_by,
    a.notes,
    a.created_at,
    a.updated_at,
    -- Dados do funcionário
    e.nome as employee_nome,
    e.matricula as employee_matricula,
    e.cpf as employee_cpf,
    -- Dados do tipo
    t.name as type_name,
    t.code as type_code,
    t.description as type_description
  FROM rh.bank_hours_assignments a
  LEFT JOIN rh.employees e ON a.employee_id = e.id
  LEFT JOIN rh.bank_hours_types t ON a.bank_hours_type_id = t.id
  WHERE a.company_id = p_company_id
  ORDER BY a.assigned_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar vínculo específico com dados relacionados
CREATE OR REPLACE FUNCTION get_bank_hours_assignment_with_relations(
  p_assignment_id UUID,
  p_company_id UUID
)
RETURNS TABLE(
  id UUID,
  employee_id UUID,
  company_id UUID,
  bank_hours_type_id UUID,
  is_active BOOLEAN,
  assigned_at TIMESTAMP WITH TIME ZONE,
  assigned_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  -- Dados do funcionário
  employee_nome VARCHAR(255),
  employee_matricula VARCHAR(50),
  employee_cpf VARCHAR(14),
  -- Dados do tipo de banco de horas
  type_name VARCHAR(100),
  type_code VARCHAR(20),
  type_description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.employee_id,
    a.company_id,
    a.bank_hours_type_id,
    a.is_active,
    a.assigned_at,
    a.assigned_by,
    a.notes,
    a.created_at,
    a.updated_at,
    -- Dados do funcionário
    e.nome as employee_nome,
    e.matricula as employee_matricula,
    e.cpf as employee_cpf,
    -- Dados do tipo
    t.name as type_name,
    t.code as type_code,
    t.description as type_description
  FROM rh.bank_hours_assignments a
  LEFT JOIN rh.employees e ON a.employee_id = e.id
  LEFT JOIN rh.bank_hours_types t ON a.bank_hours_type_id = t.id
  WHERE a.id = p_assignment_id 
    AND a.company_id = p_company_id;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar vínculos de um funcionário específico com dados relacionados
CREATE OR REPLACE FUNCTION get_employee_bank_hours_assignments_with_relations(
  p_employee_id UUID,
  p_company_id UUID
)
RETURNS TABLE(
  id UUID,
  employee_id UUID,
  company_id UUID,
  bank_hours_type_id UUID,
  is_active BOOLEAN,
  assigned_at TIMESTAMP WITH TIME ZONE,
  assigned_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  -- Dados do funcionário
  employee_nome VARCHAR(255),
  employee_matricula VARCHAR(50),
  employee_cpf VARCHAR(14),
  -- Dados do tipo de banco de horas
  type_name VARCHAR(100),
  type_code VARCHAR(20),
  type_description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.employee_id,
    a.company_id,
    a.bank_hours_type_id,
    a.is_active,
    a.assigned_at,
    a.assigned_by,
    a.notes,
    a.created_at,
    a.updated_at,
    -- Dados do funcionário
    e.nome as employee_nome,
    e.matricula as employee_matricula,
    e.cpf as employee_cpf,
    -- Dados do tipo
    t.name as type_name,
    t.code as type_code,
    t.description as type_description
  FROM rh.bank_hours_assignments a
  LEFT JOIN rh.employees e ON a.employee_id = e.id
  LEFT JOIN rh.bank_hours_types t ON a.bank_hours_type_id = t.id
  WHERE a.employee_id = p_employee_id 
    AND a.company_id = p_company_id
  ORDER BY a.assigned_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar vínculos de um tipo específico com dados relacionados
CREATE OR REPLACE FUNCTION get_type_bank_hours_assignments_with_relations(
  p_type_id UUID,
  p_company_id UUID
)
RETURNS TABLE(
  id UUID,
  employee_id UUID,
  company_id UUID,
  bank_hours_type_id UUID,
  is_active BOOLEAN,
  assigned_at TIMESTAMP WITH TIME ZONE,
  assigned_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  -- Dados do funcionário
  employee_nome VARCHAR(255),
  employee_matricula VARCHAR(50),
  employee_cpf VARCHAR(14),
  -- Dados do tipo de banco de horas
  type_name VARCHAR(100),
  type_code VARCHAR(20),
  type_description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.employee_id,
    a.company_id,
    a.bank_hours_type_id,
    a.is_active,
    a.assigned_at,
    a.assigned_by,
    a.notes,
    a.created_at,
    a.updated_at,
    -- Dados do funcionário
    e.nome as employee_nome,
    e.matricula as employee_matricula,
    e.cpf as employee_cpf,
    -- Dados do tipo
    t.name as type_name,
    t.code as type_code,
    t.description as type_description
  FROM rh.bank_hours_assignments a
  LEFT JOIN rh.employees e ON a.employee_id = e.id
  LEFT JOIN rh.bank_hours_types t ON a.bank_hours_type_id = t.id
  WHERE a.bank_hours_type_id = p_type_id 
    AND a.company_id = p_company_id
  ORDER BY a.assigned_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Garantir permissões para as funções
GRANT EXECUTE ON FUNCTION get_bank_hours_assignments_with_relations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_bank_hours_assignment_with_relations(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_employee_bank_hours_assignments_with_relations(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_type_bank_hours_assignments_with_relations(UUID, UUID) TO authenticated;
