-- =====================================================
-- CORREÇÃO: FUNÇÃO get_time_records_simple COM VERIFICAÇÃO DE PERMISSÕES
-- =====================================================

-- Recriar a função com verificação de permissões
CREATE OR REPLACE FUNCTION public.get_time_records_simple(company_id_param uuid) 
RETURNS TABLE(
  id uuid, 
  employee_id uuid, 
  company_id uuid, 
  data_registro date, 
  entrada time without time zone, 
  saida time without time zone, 
  entrada_almoco time without time zone, 
  saida_almoco time without time zone, 
  entrada_extra1 time without time zone, 
  saida_extra1 time without time zone, 
  horas_trabalhadas numeric, 
  horas_extras numeric, 
  horas_faltas numeric, 
  status character varying, 
  observacoes text, 
  aprovado_por uuid, 
  aprovado_em timestamp with time zone, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  employee_nome character varying, 
  employee_matricula character varying
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o usuário tem acesso à empresa
  IF NOT public.user_has_company_access_new(auth.uid(), company_id_param) THEN
    RAISE EXCEPTION 'Usuário não tem acesso a esta empresa';
  END IF;

  -- Retornar registros de ponto da empresa
  RETURN QUERY
  SELECT 
    tr.id,
    tr.employee_id,
    tr.company_id,
    tr.data_registro,
    tr.entrada,
    tr.saida,
    tr.entrada_almoco,
    tr.saida_almoco,
    tr.entrada_extra1,
    tr.saida_extra1,
    tr.horas_trabalhadas,
    tr.horas_extras,
    tr.horas_faltas,
    tr.status,
    tr.observacoes,
    tr.aprovado_por,
    tr.aprovado_em,
    tr.created_at,
    tr.updated_at,
    e.nome as employee_nome,
    e.matricula as employee_matricula
  FROM rh.time_records tr
  LEFT JOIN rh.employees e ON tr.employee_id = e.id
  WHERE tr.company_id = company_id_param
  ORDER BY tr.data_registro DESC, tr.created_at DESC;
END;
$$;

-- Garantir permissões
GRANT ALL ON FUNCTION public.get_time_records_simple(company_id_param uuid) TO anon;
GRANT ALL ON FUNCTION public.get_time_records_simple(company_id_param uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_time_records_simple(company_id_param uuid) TO service_role;
