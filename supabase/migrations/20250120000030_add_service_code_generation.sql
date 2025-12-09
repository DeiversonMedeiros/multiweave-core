-- Migration: Create function to auto-generate service codes in SEG-XXXX format
-- Description: Creates function to auto-generate service codes in SEG-XXXX format

-- Function to generate next service code in SEG-XXXX format
CREATE OR REPLACE FUNCTION public.get_next_service_code(
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
    -- Buscar o maior número sequencial dos códigos SEG-XXXX da empresa
    -- Extrai apenas os números após "SEG-"
    SELECT COALESCE(
        MAX(CAST(SUBSTRING(codigo FROM 'SEG-([0-9]+)') AS INTEGER)),
        0
    )
    INTO v_max_numero
    FROM public.services
    WHERE company_id = p_company_id
    AND codigo ~ '^SEG-[0-9]+$'; -- Apenas códigos no formato SEG-XXXX
    
    -- Se não encontrou nenhum código no formato SEG-XXXX, começar com 1
    IF v_max_numero IS NULL THEN
        v_max_numero := 0;
    END IF;
    
    -- Próximo código = SEG- + (máximo + 1) formatado com 4 dígitos
    v_next_codigo := 'SEG-' || LPAD((v_max_numero + 1)::TEXT, 4, '0');
    
    RETURN v_next_codigo;
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, retornar SEG-0001 como fallback
        RETURN 'SEG-0001';
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_next_service_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_service_code(UUID) TO anon;

-- Add comment
COMMENT ON FUNCTION public.get_next_service_code IS 'Retorna o próximo código de serviço sequencial no formato SEG-XXXX para a empresa';

