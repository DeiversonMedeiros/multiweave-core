-- Query para verificar se o funcionário existe no banco
-- Substitua os valores abaixo pelos dados do log

-- Verificar funcionário pelo user_id
SELECT 
  e.id,
  e.nome,
  e.user_id,
  e.company_id,
  e.status,
  c.nome_fantasia as empresa_nome,
  c.id as empresa_id
FROM rh.employees e
LEFT JOIN companies c ON c.id = e.company_id
WHERE e.user_id = 'e745168f-addb-4456-a6fa-f4a336d874ac';

-- Verificar se o usuário tem acesso à empresa
SELECT 
  uc.id,
  uc.user_id,
  uc.company_id,
  uc.ativo,
  c.nome_fantasia as empresa_nome
FROM user_companies uc
LEFT JOIN companies c ON c.id = uc.company_id
WHERE uc.user_id = 'e745168f-addb-4456-a6fa-f4a336d874ac'
  AND uc.ativo = true;

-- Verificar empresa selecionada
SELECT 
  id,
  nome_fantasia,
  razao_social,
  ativo
FROM companies
WHERE id = 'ce390408-1c18-47fc-bd7d-76379ec488b7';




