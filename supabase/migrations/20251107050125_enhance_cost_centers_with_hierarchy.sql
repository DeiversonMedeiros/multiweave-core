-- Migração: Melhorias nos Centros de Custo com Hierarquia
-- Adiciona novos campos e suporte a hierarquia (pai/filho)

-- Adicionar novos campos à tabela cost_centers
ALTER TABLE public.cost_centers
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS tipo TEXT CHECK (tipo IN ('producao', 'administrativo', 'comercial', 'financeiro', 'operacional', 'outros')) DEFAULT 'outros',
  ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES rh.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS data_inicio DATE,
  ADD COLUMN IF NOT EXISTS data_fim DATE,
  ADD COLUMN IF NOT EXISTS orcamento_anual DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL;

-- Criar índice para melhorar performance de consultas hierárquicas
CREATE INDEX IF NOT EXISTS idx_cost_centers_parent_id ON public.cost_centers(parent_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_responsavel_id ON public.cost_centers(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_tipo ON public.cost_centers(tipo);

-- Adicionar comentários nas colunas
COMMENT ON COLUMN public.cost_centers.descricao IS 'Descrição detalhada do centro de custo';
COMMENT ON COLUMN public.cost_centers.tipo IS 'Tipo do centro de custo: producao, administrativo, comercial, financeiro, operacional, outros';
COMMENT ON COLUMN public.cost_centers.responsavel_id IS 'ID do funcionário responsável pelo centro de custo';
COMMENT ON COLUMN public.cost_centers.data_inicio IS 'Data de início de vigência do centro de custo';
COMMENT ON COLUMN public.cost_centers.data_fim IS 'Data de fim de vigência do centro de custo (opcional)';
COMMENT ON COLUMN public.cost_centers.orcamento_anual IS 'Orçamento anual previsto para o centro de custo';
COMMENT ON COLUMN public.cost_centers.observacoes IS 'Observações e notas adicionais sobre o centro de custo';
COMMENT ON COLUMN public.cost_centers.parent_id IS 'ID do centro de custo pai (para hierarquia)';

-- Função para prevenir loops na hierarquia (um centro não pode ser pai de si mesmo ou de seus ancestrais)
CREATE OR REPLACE FUNCTION public.check_cost_center_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
  current_parent_id UUID;
  ancestor_id UUID;
BEGIN
  -- Se não há parent_id, não há problema
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Um centro não pode ser pai de si mesmo
  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'Um centro de custo não pode ser pai de si mesmo';
  END IF;

  -- Verificar se o parent_id não é um descendente do centro atual
  -- (prevenir loops circulares)
  current_parent_id := NEW.parent_id;
  
  -- Verificar até 10 níveis de profundidade para evitar loops infinitos
  FOR i IN 1..10 LOOP
    SELECT parent_id INTO ancestor_id
    FROM public.cost_centers
    WHERE id = current_parent_id;
    
    -- Se chegou ao topo da hierarquia, está ok
    IF ancestor_id IS NULL THEN
      EXIT;
    END IF;
    
    -- Se encontrou o próprio centro na cadeia, há loop
    IF ancestor_id = NEW.id THEN
      RAISE EXCEPTION 'Não é possível criar uma hierarquia circular. O centro de custo selecionado como pai é descendente deste centro.';
    END IF;
    
    current_parent_id := ancestor_id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar hierarquia antes de inserir ou atualizar
DROP TRIGGER IF EXISTS check_cost_center_hierarchy_trigger ON public.cost_centers;
CREATE TRIGGER check_cost_center_hierarchy_trigger
  BEFORE INSERT OR UPDATE ON public.cost_centers
  FOR EACH ROW
  EXECUTE FUNCTION public.check_cost_center_hierarchy();

-- Função auxiliar para obter o caminho completo de um centro de custo (código do pai até o filho)
CREATE OR REPLACE FUNCTION public.get_cost_center_path(cost_center_id UUID)
RETURNS TEXT AS $$
DECLARE
  path TEXT := '';
  current_id UUID := cost_center_id;
  current_code TEXT;
  current_parent_id UUID;
BEGIN
  -- Construir o caminho do mais profundo até a raiz
  WHILE current_id IS NOT NULL LOOP
    SELECT codigo, parent_id INTO current_code, current_parent_id
    FROM public.cost_centers
    WHERE id = current_id;
    
    IF current_code IS NOT NULL THEN
      IF path = '' THEN
        path := current_code;
      ELSE
        path := current_code || ' > ' || path;
      END IF;
    END IF;
    
    current_id := current_parent_id;
    
    -- Proteção contra loops infinitos
    IF current_id = cost_center_id THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN path;
END;
$$ LANGUAGE plpgsql;

