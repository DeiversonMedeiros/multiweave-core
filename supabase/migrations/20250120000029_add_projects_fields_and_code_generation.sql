-- Migration: Add new fields to projects table and create code generation function
-- Description: Adds cidade, uf, regiao, and data_inicio fields to projects table
--              Creates function to auto-generate project codes in PRO-XXXX format

-- Add new columns to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS cidade VARCHAR(100),
ADD COLUMN IF NOT EXISTS uf VARCHAR(2),
ADD COLUMN IF NOT EXISTS regiao VARCHAR(100),
ADD COLUMN IF NOT EXISTS data_inicio DATE;

-- Add comments
COMMENT ON COLUMN public.projects.cidade IS 'Cidade do projeto';
COMMENT ON COLUMN public.projects.uf IS 'Unidade Federativa (UF) do projeto';
COMMENT ON COLUMN public.projects.regiao IS 'Região do projeto';
COMMENT ON COLUMN public.projects.data_inicio IS 'Data de início do projeto';

-- Function to generate next project code in PRO-XXXX format
CREATE OR REPLACE FUNCTION public.get_next_project_code(
    p_company_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_max_numero INTEGER;
    v_next_codigo TEXT;
BEGIN
    -- Buscar o maior número sequencial dos códigos PRO-XXXX da empresa
    -- Extrai apenas os números após "PRO-"
    SELECT COALESCE(
        MAX(CAST(SUBSTRING(codigo FROM 'PRO-([0-9]+)') AS INTEGER)),
        0
    )
    INTO v_max_numero
    FROM public.projects
    WHERE company_id = p_company_id
    AND codigo ~ '^PRO-[0-9]+$'; -- Apenas códigos no formato PRO-XXXX
    
    -- Se não encontrou nenhum código no formato PRO-XXXX, começar com 1
    IF v_max_numero IS NULL THEN
        v_max_numero := 0;
    END IF;
    
    -- Próximo código = PRO- + (máximo + 1) formatado com 4 dígitos
    v_next_codigo := 'PRO-' || LPAD((v_max_numero + 1)::TEXT, 4, '0');
    
    RETURN v_next_codigo;
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, retornar PRO-0001 como fallback
        RETURN 'PRO-0001';
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_next_project_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_project_code(UUID) TO anon;

-- Add comment
COMMENT ON FUNCTION public.get_next_project_code IS 'Retorna o próximo código de projeto sequencial no formato PRO-XXXX para a empresa';

