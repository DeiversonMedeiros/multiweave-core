-- =====================================================
-- ANÁLISE: usuário gilvani.santos + perfil Gestor Qualidade
-- Por que não vê as páginas de Treinamentos no módulo RH?
-- =====================================================

-- 1. Usuário gilvani.santos (auth.users - email pode ser gilvani.santos@...)
SELECT id, email, created_at 
FROM auth.users 
WHERE email ILIKE '%gilvani.santos%' OR email ILIKE '%gilvani%santos%';

-- 2. Perfil "Gestor Qualidade"
SELECT id, nome, is_active 
FROM public.profiles 
WHERE nome ILIKE '%Gestor Qualidade%';

-- 3. user_companies: vínculo usuário -> perfil -> empresa
-- (assumindo que temos o user_id do passo 1)
SELECT uc.id, uc.user_id, uc.company_id, uc.profile_id, uc.ativo, p.nome as profile_name, c.name as company_name
FROM public.user_companies uc
JOIN public.profiles p ON p.id = uc.profile_id
LEFT JOIN public.companies c ON c.id = uc.company_id
WHERE uc.user_id IN (SELECT id FROM auth.users WHERE email ILIKE '%gilvani.santos%')
   OR uc.profile_id IN (SELECT id FROM public.profiles WHERE nome ILIKE '%Gestor Qualidade%');

-- 4. Permissões de PÁGINA do perfil Gestor Qualidade (o que o menu usa para Treinamentos)
SELECT pp.id, pp.profile_id, pp.page_path, pp.can_read, pp.can_create, pp.can_edit, pp.can_delete
FROM public.page_permissions pp
JOIN public.profiles p ON p.id = pp.profile_id
WHERE p.nome ILIKE '%Gestor Qualidade%'
ORDER BY pp.page_path;

-- 5. Permissões de MÓDULO do perfil Gestor Qualidade (para contexto)
SELECT mp.module_name, mp.can_read, mp.can_create, mp.can_edit, mp.can_delete
FROM public.module_permissions mp
JOIN public.profiles p ON p.id = mp.profile_id
WHERE p.nome ILIKE '%Gestor Qualidade%'
ORDER BY mp.module_name;

-- 6. O que o menu exige para Treinamentos (referência):
--    - Treinamentos Gerais: type 'page', name '/rh/training*', action 'read'
--    - Treinamentos Online:  type 'page', name '/rh/treinamentos*', action 'read'
-- Verificar se existem page_permissions para esses paths no perfil:
SELECT 
  (SELECT COUNT(*) FROM public.page_permissions pp 
   JOIN public.profiles p ON p.id = pp.profile_id 
   WHERE p.nome ILIKE '%Gestor Qualidade%' AND (pp.page_path = '/rh/training*' OR pp.page_path LIKE '/rh/training%')) as tem_training,
  (SELECT COUNT(*) FROM public.page_permissions pp 
   JOIN public.profiles p ON p.id = pp.profile_id 
   WHERE p.nome ILIKE '%Gestor Qualidade%' AND (pp.page_path = '/rh/treinamentos*' OR pp.page_path LIKE '/rh/treinamentos%')) as tem_treinamentos;
