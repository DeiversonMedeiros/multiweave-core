-- =====================================================
-- Remove permissão de módulo 'rh' do perfil Gestor Qualidade
-- =====================================================
-- Alinha ao novo comportamento: ver páginas do RH exige módulo + página.
-- Se Gestor Qualidade precisar ver Treinamentos, conceder explicitamente
-- module_permissions.rh (read) além das page_permissions já existentes.
-- =====================================================

DELETE FROM public.module_permissions
WHERE profile_id = (SELECT id FROM public.profiles WHERE nome = 'Gestor Qualidade')
  AND module_name = 'rh';
