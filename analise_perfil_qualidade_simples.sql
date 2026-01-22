-- Análise Simplificada - Perfil Gestor Qualidade
-- Query 1: Buscar perfil
SELECT id, nome, is_active FROM profiles WHERE nome ILIKE '%qualidade%' OR nome ILIKE '%gestor%qualidade%' ORDER BY nome;

-- Query 2: Permissões de módulos (RH)
SELECT mp.module_name, mp.can_read, mp.can_create, mp.can_edit, mp.can_delete, p.nome as perfil_nome
FROM module_permissions mp
JOIN profiles p ON p.id = mp.profile_id
WHERE (p.nome ILIKE '%qualidade%' OR p.nome ILIKE '%gestor%qualidade%')
  AND (mp.module_name = 'rh' OR mp.module_name = 'treinamento');

-- Query 3: Permissões de entidades (treinamento)
SELECT ep.entity_name, ep.can_read, ep.can_create, ep.can_edit, ep.can_delete, p.nome as perfil_nome
FROM entity_permissions ep
JOIN profiles p ON p.id = ep.profile_id
WHERE (p.nome ILIKE '%qualidade%' OR p.nome ILIKE '%gestor%qualidade%')
  AND (ep.entity_name ILIKE '%trein%' OR ep.entity_name ILIKE '%training%');

-- Query 4: Todas as entidades do RH que o perfil tem acesso
SELECT ep.entity_name, ep.can_read, p.nome as perfil_nome
FROM entity_permissions ep
JOIN profiles p ON p.id = ep.profile_id
WHERE (p.nome ILIKE '%qualidade%' OR p.nome ILIKE '%gestor%qualidade%')
  AND ep.entity_name IN ('employees', 'funcionarios', 'positions', 'cargos', 'units', 'unidades', 'trainings', 'treinamentos', 'time_records', 'registros_ponto')
ORDER BY ep.entity_name;
