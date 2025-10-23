-- Função para definir o contexto da empresa para RLS
CREATE OR REPLACE FUNCTION set_company_context(company_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_company_id', company_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissão para a função
GRANT EXECUTE ON FUNCTION set_company_context(UUID) TO authenticated;
