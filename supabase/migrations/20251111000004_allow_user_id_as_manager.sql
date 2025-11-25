-- =====================================================
-- MIGRAÇÃO: Permitir que gestor_imediato_id seja user_id ou employee_id
-- =====================================================
-- Data: 2025-11-11
-- Descrição: Remove a foreign key que restringe gestor_imediato_id apenas a employees
--            Permite que gestor_imediato_id possa ser tanto um employee_id quanto um user_id
--            Isso permite que usuários terceirizados sejam gestores imediatos

-- Remover a foreign key existente que restringe apenas a employees
ALTER TABLE rh.employees 
DROP CONSTRAINT IF EXISTS employees_gestor_imediato_id_fkey;

-- Comentário explicativo
COMMENT ON COLUMN rh.employees.gestor_imediato_id IS 
'ID do gestor imediato. Pode ser um employee_id (funcionário) ou user_id (usuário terceirizado). 
Se for employee_id, referencia rh.employees(id). 
Se for user_id, referencia auth.users(id) através de public.users(id).';

