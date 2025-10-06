-- =====================================================
-- FUNÇÕES RPC PARA MOTOR DE CÁLCULO
-- =====================================================

-- Função para criar dados em qualquer schema
CREATE OR REPLACE FUNCTION create_entity_data(
  schema_name TEXT,
  table_name TEXT,
  company_id_param UUID,
  data_param JSONB
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
  sql_query TEXT;
BEGIN
  -- Construir query dinâmica
  sql_query := format('INSERT INTO %I.%I (company_id, %s) VALUES ($1, %s) RETURNING to_jsonb(*)',
    schema_name,
    table_name,
    (SELECT string_agg(key, ', ') FROM jsonb_each_keys(data_param)),
    (SELECT string_agg('$' || (row_number() OVER() + 1)::text, ', ') FROM jsonb_each(data_param))
  );
  
  -- Executar query
  EXECUTE sql_query INTO result USING company_id_param, (SELECT array_agg(value) FROM jsonb_each(data_param));
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao criar dados: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar dados em qualquer schema
CREATE OR REPLACE FUNCTION update_entity_data(
  schema_name TEXT,
  table_name TEXT,
  company_id_param UUID,
  id_param UUID,
  data_param JSONB
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
  sql_query TEXT;
BEGIN
  -- Construir query dinâmica
  sql_query := format('UPDATE %I.%I SET %s, updated_at = now() WHERE id = $1 AND company_id = $2 RETURNING to_jsonb(*)',
    schema_name,
    table_name,
    (SELECT string_agg(key || ' = $' || (row_number() OVER() + 2)::text, ', ') FROM jsonb_each(data_param))
  );
  
  -- Executar query
  EXECUTE sql_query INTO result USING id_param, company_id_param, (SELECT array_agg(value) FROM jsonb_each(data_param));
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao atualizar dados: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para deletar dados em qualquer schema
CREATE OR REPLACE FUNCTION delete_entity_data(
  schema_name TEXT,
  table_name TEXT,
  company_id_param UUID,
  id_param UUID
) RETURNS BOOLEAN AS $$
DECLARE
  affected_rows INTEGER;
  sql_query TEXT;
BEGIN
  -- Construir query dinâmica
  sql_query := format('DELETE FROM %I.%I WHERE id = $1 AND company_id = $2',
    schema_name,
    table_name
  );
  
  -- Executar query
  EXECUTE sql_query USING id_param, company_id_param;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  RETURN affected_rows > 0;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao deletar dados: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função específica para criar logs de cálculo
CREATE OR REPLACE FUNCTION create_calculation_log(
  company_id_param UUID,
  processo_id_param TEXT,
  tipo_processo_param TEXT,
  mes_referencia_param INTEGER,
  ano_referencia_param INTEGER,
  descricao_processo_param TEXT DEFAULT NULL,
  usuario_id_param UUID DEFAULT NULL,
  usuario_nome_param TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO rh.calculation_logs (
    company_id,
    processo_id,
    tipo_processo,
    descricao_processo,
    mes_referencia,
    ano_referencia,
    status,
    progresso,
    total_funcionarios,
    funcionarios_processados,
    eventos_calculados,
    erros_encontrados,
    inicio_processamento,
    usuario_id,
    usuario_nome,
    logs_execucao,
    erros_execucao
  ) VALUES (
    company_id_param,
    processo_id_param,
    tipo_processo_param,
    descricao_processo_param,
    mes_referencia_param,
    ano_referencia_param,
    'iniciado',
    0,
    0,
    0,
    0,
    0,
    now(),
    usuario_id_param,
    usuario_nome_param,
    '[]'::jsonb,
    '[]'::jsonb
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao criar log de cálculo: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar log de cálculo
CREATE OR REPLACE FUNCTION update_calculation_log(
  log_id_param UUID,
  company_id_param UUID,
  updates JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE rh.calculation_logs 
  SET 
    status = COALESCE((updates->>'status')::text, status),
    progresso = COALESCE((updates->>'progresso')::integer, progresso),
    total_funcionarios = COALESCE((updates->>'total_funcionarios')::integer, total_funcionarios),
    funcionarios_processados = COALESCE((updates->>'funcionarios_processados')::integer, funcionarios_processados),
    eventos_calculados = COALESCE((updates->>'eventos_calculados')::integer, eventos_calculados),
    erros_encontrados = COALESCE((updates->>'erros_encontrados')::integer, erros_encontrados),
    fim_processamento = CASE WHEN updates->>'fim_processamento' IS NOT NULL THEN (updates->>'fim_processamento')::timestamptz ELSE fim_processamento END,
    tempo_execucao_segundos = COALESCE((updates->>'tempo_execucao_segundos')::integer, tempo_execucao_segundos),
    logs_execucao = COALESCE(updates->'logs_execucao', logs_execucao),
    erros_execucao = COALESCE(updates->'erros_execucao', erros_execucao),
    resumo_calculos = COALESCE(updates->'resumo_calculos', resumo_calculos),
    updated_at = now()
  WHERE id = log_id_param AND company_id = company_id_param;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  RETURN affected_rows > 0;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao atualizar log de cálculo: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar logs de cálculo
CREATE OR REPLACE FUNCTION get_calculation_logs(
  company_id_param UUID,
  filters JSONB DEFAULT '{}'::jsonb
) RETURNS TABLE(
  id UUID,
  company_id UUID,
  processo_id TEXT,
  tipo_processo TEXT,
  descricao_processo TEXT,
  mes_referencia INTEGER,
  ano_referencia INTEGER,
  status TEXT,
  progresso INTEGER,
  total_funcionarios INTEGER,
  funcionarios_processados INTEGER,
  eventos_calculados INTEGER,
  erros_encontrados INTEGER,
  inicio_processamento TIMESTAMPTZ,
  fim_processamento TIMESTAMPTZ,
  tempo_execucao_segundos INTEGER,
  usuario_id UUID,
  usuario_nome TEXT,
  logs_execucao JSONB,
  erros_execucao JSONB,
  resumo_calculos JSONB,
  observacoes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  where_clause TEXT := 'WHERE company_id = $1';
  order_clause TEXT := 'ORDER BY created_at DESC';
BEGIN
  -- Construir filtros dinâmicos
  IF filters->>'mes_referencia' IS NOT NULL THEN
    where_clause := where_clause || ' AND mes_referencia = ' || (filters->>'mes_referencia')::text;
  END IF;
  
  IF filters->>'ano_referencia' IS NOT NULL THEN
    where_clause := where_clause || ' AND ano_referencia = ' || (filters->>'ano_referencia')::text;
  END IF;
  
  IF filters->>'status' IS NOT NULL THEN
    where_clause := where_clause || ' AND status = ''' || (filters->>'status')::text || '''';
  END IF;
  
  IF filters->>'tipo_processo' IS NOT NULL THEN
    where_clause := where_clause || ' AND tipo_processo = ''' || (filters->>'tipo_processo')::text || '''';
  END IF;
  
  -- Executar query
  RETURN QUERY EXECUTE format('
    SELECT 
      id, company_id, processo_id, tipo_processo, descricao_processo,
      mes_referencia, ano_referencia, status, progresso,
      total_funcionarios, funcionarios_processados, eventos_calculados, erros_encontrados,
      inicio_processamento, fim_processamento, tempo_execucao_segundos,
      usuario_id, usuario_nome, logs_execucao, erros_execucao, resumo_calculos,
      observacoes, created_at, updated_at
    FROM rh.calculation_logs
    %s
    %s
  ', where_clause, order_clause) USING company_id_param;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao buscar logs de cálculo: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
