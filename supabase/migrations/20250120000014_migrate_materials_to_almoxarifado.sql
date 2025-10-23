-- =====================================================
-- MIGRAÇÃO: Transferir dados de materials para materiais_equipamentos
-- Data: 2025-01-20
-- Descrição: Migra dados da tabela public.materials para almoxarifado.materiais_equipamentos
-- =====================================================

-- Função para migrar dados de materials para materiais_equipamentos
CREATE OR REPLACE FUNCTION migrate_materials_to_almoxarifado()
RETURNS TABLE(
  migrated_count INTEGER,
  error_count INTEGER,
  errors TEXT[]
) AS $$
DECLARE
  material_record RECORD;
  migrated_count INTEGER := 0;
  error_count INTEGER := 0;
  errors TEXT[] := ARRAY[]::TEXT[];
  error_message TEXT;
  new_material_id UUID;
  default_almoxarifado_id UUID;
BEGIN
  -- Log de início
  RAISE NOTICE 'Iniciando migração de materials para materiais_equipamentos...';
  
  -- Para cada material na tabela public.materials
  FOR material_record IN 
    SELECT * FROM public.materials 
    WHERE company_id IS NOT NULL
  LOOP
    BEGIN
      -- Obter o primeiro almoxarifado ativo da empresa (ou criar um padrão)
      SELECT id INTO default_almoxarifado_id
      FROM almoxarifado.almoxarifados 
      WHERE company_id = material_record.company_id 
        AND ativo = true 
      LIMIT 1;
      
      -- Se não existir almoxarifado, criar um padrão
      IF default_almoxarifado_id IS NULL THEN
        INSERT INTO almoxarifado.almoxarifados (
          company_id, 
          nome, 
          codigo, 
          ativo
        ) VALUES (
          material_record.company_id,
          'Almoxarifado Principal',
          'ALM001',
          true
        ) RETURNING id INTO default_almoxarifado_id;
      END IF;
      
      -- Mapear tipo da tabela materials para materiais_equipamentos
      -- materials: produto, servico, materia_prima
      -- materiais_equipamentos: produto, servico, equipamento
      -- materia_prima -> produto
      
      -- Inserir na tabela materiais_equipamentos
      INSERT INTO almoxarifado.materiais_equipamentos (
        company_id,
        codigo_interno,
        descricao,
        tipo,
        classe,
        unidade_medida,
        status,
        equipamento_proprio,
        ncm,
        cfop,
        cst,
        created_at,
        updated_at
      ) VALUES (
        material_record.company_id,
        material_record.codigo,
        material_record.nome,
        CASE 
          WHEN material_record.tipo = 'materia_prima' THEN 'produto'
          ELSE material_record.tipo
        END,
        material_record.classe,
        material_record.unidade_medida,
        CASE WHEN material_record.ativo THEN 'ativo' ELSE 'inativo' END,
        true, -- equipamento_proprio padrão
        material_record.ncm,
        material_record.cfop,
        material_record.cst,
        material_record.created_at,
        material_record.updated_at
      ) RETURNING id INTO new_material_id;
      
      -- Criar registro de estoque inicial (zerado)
      INSERT INTO almoxarifado.estoque_atual (
        material_equipamento_id,
        almoxarifado_id,
        quantidade_atual,
        quantidade_reservada
      ) VALUES (
        new_material_id,
        default_almoxarifado_id,
        0,
        0
      );
      
      migrated_count := migrated_count + 1;
      
      -- Log de progresso a cada 100 registros
      IF migrated_count % 100 = 0 THEN
        RAISE NOTICE 'Migrados % registros...', migrated_count;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      error_message := 'Erro ao migrar material ' || material_record.id || ': ' || SQLERRM;
      errors := array_append(errors, error_message);
      RAISE WARNING '%', error_message;
    END;
  END LOOP;
  
  -- Log final
  RAISE NOTICE 'Migração concluída. Migrados: %, Erros: %', migrated_count, error_count;
  
  RETURN QUERY SELECT migrated_count, error_count, errors;
END;
$$ LANGUAGE plpgsql;

-- Executar a migração
SELECT * FROM migrate_materials_to_almoxarifado();

-- Remover a função temporária
DROP FUNCTION migrate_materials_to_almoxarifado();

-- Verificar se a migração foi bem-sucedida
DO $$
DECLARE
  materials_count INTEGER;
  materiais_equipamentos_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO materials_count FROM public.materials;
  SELECT COUNT(*) INTO materiais_equipamentos_count FROM almoxarifado.materiais_equipamentos;
  
  RAISE NOTICE 'Contagem de registros:';
  RAISE NOTICE '  public.materials: %', materials_count;
  RAISE NOTICE '  almoxarifado.materiais_equipamentos: %', materiais_equipamentos_count;
  
  IF materials_count > 0 AND materiais_equipamentos_count >= materials_count THEN
    RAISE NOTICE 'Migração aparentemente bem-sucedida!';
  ELSE
    RAISE WARNING 'Possível problema na migração. Verificar dados.';
  END IF;
END $$;
