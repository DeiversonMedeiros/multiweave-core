-- Corrigir a função is_admin para resolver ambiguidade de colunas
-- Primeiro, dropar a função existente
DROP FUNCTION IF EXISTS is_admin(UUID);

-- Recriar a função com parâmetro renomeado
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_companies uc
    JOIN profiles p ON uc.profile_id = p.id
    WHERE uc.user_id = p_user_id 
    AND p.nome = 'Super Admin'
    AND uc.ativo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que a função seja acessível via RPC
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO anon;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO service_role;
