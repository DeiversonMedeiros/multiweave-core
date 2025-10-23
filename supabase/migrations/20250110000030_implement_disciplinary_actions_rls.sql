-- =====================================================
-- IMPLEMENTAR RLS E PERMISSÕES PARA DISCIPLINARY_ACTIONS
-- =====================================================

-- Habilitar RLS na tabela
ALTER TABLE rh.disciplinary_actions ENABLE ROW LEVEL SECURITY;

-- Política para SELECT (visualizar)
CREATE POLICY "Users can view disciplinary actions from their company" 
ON rh.disciplinary_actions FOR SELECT 
USING (("company_id" = ANY ("public"."get_user_companies"())) 
AND "public"."check_access_permission"('rh'::"text", 'disciplinary_actions'::"text", 'read'::"text"));

-- Política para INSERT (criar)
CREATE POLICY "Users can insert disciplinary actions in their company" 
ON rh.disciplinary_actions FOR INSERT 
WITH CHECK (("company_id" = ANY ("public"."get_user_companies"())) 
AND "public"."check_access_permission"('rh'::"text", 'disciplinary_actions'::"text", 'create'::"text"));

-- Política para UPDATE (editar)
CREATE POLICY "Users can update disciplinary actions from their company" 
ON rh.disciplinary_actions FOR UPDATE 
USING (("company_id" = ANY ("public"."get_user_companies"())) 
AND "public"."check_access_permission"('rh'::"text", 'disciplinary_actions'::"text", 'edit'::"text"));

-- Política para DELETE (excluir)
CREATE POLICY "Users can delete disciplinary actions from their company" 
ON rh.disciplinary_actions FOR DELETE 
USING (("company_id" = ANY ("public"."get_user_companies"())) 
AND "public"."check_access_permission"('rh'::"text", 'disciplinary_actions'::"text", 'delete'::"text"));

-- Adicionar permissões para disciplinary_actions no sistema de permissões
INSERT INTO public.entity_permissions (id, profile_id, entity_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  p.id,
  'disciplinary_actions',
  CASE 
    WHEN p.nome = 'Super Admin' THEN true
    WHEN p.nome = 'Administrador' THEN true
    WHEN p.nome = 'Gerente' THEN true
    ELSE false
  END,
  CASE 
    WHEN p.nome = 'Super Admin' THEN true
    WHEN p.nome = 'Administrador' THEN true
    WHEN p.nome = 'Gerente' THEN true
    ELSE false
  END,
  CASE 
    WHEN p.nome = 'Super Admin' THEN true
    WHEN p.nome = 'Administrador' THEN true
    WHEN p.nome = 'Gerente' THEN true
    ELSE false
  END,
  CASE 
    WHEN p.nome = 'Super Admin' THEN true
    WHEN p.nome = 'Administrador' THEN true
    ELSE false
  END,
  NOW(),
  NOW()
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.entity_permissions ep 
  WHERE ep.profile_id = p.id AND ep.entity_name = 'disciplinary_actions'
);

-- Adicionar permissões de módulo para RH (se não existir)
INSERT INTO public.module_permissions (id, profile_id, module_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  p.id,
  'rh',
  CASE 
    WHEN p.nome = 'Super Admin' THEN true
    WHEN p.nome = 'Administrador' THEN true
    WHEN p.nome = 'Gerente' THEN true
    WHEN p.nome = 'Usuário' THEN true
    ELSE false
  END,
  CASE 
    WHEN p.nome = 'Super Admin' THEN true
    WHEN p.nome = 'Administrador' THEN true
    WHEN p.nome = 'Gerente' THEN true
    ELSE false
  END,
  CASE 
    WHEN p.nome = 'Super Admin' THEN true
    WHEN p.nome = 'Administrador' THEN true
    WHEN p.nome = 'Gerente' THEN true
    ELSE false
  END,
  CASE 
    WHEN p.nome = 'Super Admin' THEN true
    WHEN p.nome = 'Administrador' THEN true
    ELSE false
  END,
  NOW(),
  NOW()
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.module_permissions mp 
  WHERE mp.profile_id = p.id AND mp.module_name = 'rh'
);

-- Comentários das políticas
COMMENT ON POLICY "Users can view disciplinary actions from their company" ON rh.disciplinary_actions IS 'Permite visualizar ações disciplinares da empresa do usuário';
COMMENT ON POLICY "Users can insert disciplinary actions in their company" ON rh.disciplinary_actions IS 'Permite criar ações disciplinares na empresa do usuário';
COMMENT ON POLICY "Users can update disciplinary actions from their company" ON rh.disciplinary_actions IS 'Permite editar ações disciplinares da empresa do usuário';
COMMENT ON POLICY "Users can delete disciplinary actions from their company" ON rh.disciplinary_actions IS 'Permite excluir ações disciplinares da empresa do usuário';
