-- =====================================================
-- FASE 1.2: ÍNDICES OTIMIZADOS
-- Sistema: MultiWeave Core
-- Data: 2025-11-09
-- Descrição: Criação de índices otimizados para acelerar
--           consultas frequentes no sistema
-- =====================================================

-- =====================================================
-- 1. ÍNDICES PARA TABELA rh.employees
-- =====================================================

-- Índice composto para ordenação por data de criação
CREATE INDEX IF NOT EXISTS idx_employees_created_at_id 
ON rh.employees(created_at DESC, id DESC);

-- Índice parcial para funcionários ativos (otimiza consultas WHERE status = 'ativo')
CREATE INDEX IF NOT EXISTS idx_employees_active 
ON rh.employees(company_id, status) 
WHERE status = 'ativo';

-- Índice para busca por matrícula/CPF
CREATE INDEX IF NOT EXISTS idx_employees_search 
ON rh.employees(company_id, matricula, cpf);

-- Índice composto para funcionários por empresa e status
CREATE INDEX IF NOT EXISTS idx_employees_company_status 
ON rh.employees(company_id, status, created_at DESC);

-- =====================================================
-- 2. ÍNDICES PARA TABELA rh.time_records
-- =====================================================

-- Índice composto para consultas por funcionário e data (usando data_registro)
CREATE INDEX IF NOT EXISTS idx_time_records_employee_date 
ON rh.time_records(employee_id, data_registro DESC, id DESC);

-- Índice para status e data (otimiza consultas de aprovação)
CREATE INDEX IF NOT EXISTS idx_time_records_status_date 
ON rh.time_records(company_id, status, data_registro DESC);

-- Índice composto para consultas por empresa, funcionário e período
CREATE INDEX IF NOT EXISTS idx_time_records_company_employee_date 
ON rh.time_records(company_id, employee_id, data_registro DESC);

-- =====================================================
-- 3. ÍNDICES PARA TABELA frota.vehicles
-- =====================================================

-- Índice composto para ordenação por data de criação
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at_id 
ON frota.vehicles(created_at DESC, id DESC);

-- Índice parcial para veículos ativos
CREATE INDEX IF NOT EXISTS idx_vehicles_active 
ON frota.vehicles(company_id, situacao) 
WHERE situacao = 'ativo';

-- Índice composto para veículos por empresa e tipo
CREATE INDEX IF NOT EXISTS idx_vehicles_company_tipo 
ON frota.vehicles(company_id, tipo, situacao);

-- =====================================================
-- 4. ÍNDICES PARA TABELA almoxarifado.estoque_atual
-- =====================================================

-- Índice composto para consultas por almoxarifado e material
CREATE INDEX IF NOT EXISTS idx_estoque_almoxarifado_material 
ON almoxarifado.estoque_atual(almoxarifado_id, material_equipamento_id);

-- Índice parcial para itens em ruptura (quantidade_atual <= 0 ou abaixo do mínimo)
CREATE INDEX IF NOT EXISTS idx_estoque_ruptura 
ON almoxarifado.estoque_atual(company_id, quantidade_atual) 
WHERE quantidade_atual <= 0;

-- Índice composto para consultas por empresa e material
CREATE INDEX IF NOT EXISTS idx_estoque_company_material 
ON almoxarifado.estoque_atual(company_id, material_equipamento_id, quantidade_atual);

-- =====================================================
-- 5. ÍNDICES PARA TABELA almoxarifado.movimentacoes_estoque
-- =====================================================

-- Índice composto para consultas por tipo e data
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo_data 
ON almoxarifado.movimentacoes_estoque(tipo_movimentacao, data_movimentacao DESC);

-- Índice composto para consultas por empresa, tipo e data
CREATE INDEX IF NOT EXISTS idx_movimentacoes_company_tipo_data 
ON almoxarifado.movimentacoes_estoque(company_id, tipo_movimentacao, data_movimentacao DESC);

-- =====================================================
-- 6. ÍNDICES PARA TABELA rh.trainings
-- =====================================================

-- Índice composto para treinamentos por empresa e status
CREATE INDEX IF NOT EXISTS idx_trainings_company_active 
ON rh.trainings(company_id, is_active, created_at DESC);

-- =====================================================
-- 7. ÍNDICES PARA TABELA rh.periodic_exams
-- =====================================================

-- Índice composto para exames por funcionário e data de vencimento
CREATE INDEX IF NOT EXISTS idx_periodic_exams_employee_vencimento 
ON rh.periodic_exams(employee_id, data_vencimento, status);

-- Índice parcial para exames não realizados (vencimento será filtrado na query)
CREATE INDEX IF NOT EXISTS idx_periodic_exams_overdue 
ON rh.periodic_exams(company_id, data_vencimento, status) 
WHERE status != 'realizado';

-- =====================================================
-- 8. ÍNDICES PARA TABELA financeiro.contas_pagar
-- =====================================================

-- Índice composto para contas a pagar por status e data de vencimento
CREATE INDEX IF NOT EXISTS idx_contas_pagar_status_vencimento 
ON financeiro.contas_pagar(company_id, status, data_vencimento);

-- Índice parcial para contas pendentes
CREATE INDEX IF NOT EXISTS idx_contas_pagar_pendentes 
ON financeiro.contas_pagar(company_id, data_vencimento) 
WHERE status = 'pendente';

-- =====================================================
-- 9. ÍNDICES PARA TABELA financeiro.contas_receber
-- =====================================================

-- Índice composto para contas a receber por status e data de vencimento
CREATE INDEX IF NOT EXISTS idx_contas_receber_status_vencimento 
ON financeiro.contas_receber(company_id, status, data_vencimento);

-- Índice parcial para contas pendentes
CREATE INDEX IF NOT EXISTS idx_contas_receber_pendentes 
ON financeiro.contas_receber(company_id, data_vencimento) 
WHERE status = 'pendente';

-- =====================================================
-- 10. ÍNDICES PARA TABELA financeiro.fluxo_caixa
-- =====================================================

-- Índice composto para fluxo de caixa por tipo e data
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_tipo_data 
ON financeiro.fluxo_caixa(company_id, tipo_movimento, created_at DESC);

-- =====================================================
-- 11. ÍNDICES PARA TABELA public.projects
-- =====================================================

-- Índice composto para projetos por empresa e status
CREATE INDEX IF NOT EXISTS idx_projects_company_ativo 
ON public.projects(company_id, ativo, created_at DESC);

-- =====================================================
-- 12. ÍNDICES PARA TABELA public.cost_centers
-- =====================================================

-- Índice composto para centros de custo por empresa e tipo
CREATE INDEX IF NOT EXISTS idx_cost_centers_company_tipo 
ON public.cost_centers(company_id, tipo, ativo);

-- =====================================================
-- 13. ÍNDICES PARA TABELA rh.disciplinary_actions
-- =====================================================

-- Índice composto para ações disciplinares por funcionário e data
CREATE INDEX IF NOT EXISTS idx_disciplinary_actions_employee_date 
ON rh.disciplinary_actions(employee_id, created_at DESC);

-- Índice parcial para ações ativas
CREATE INDEX IF NOT EXISTS idx_disciplinary_actions_active 
ON rh.disciplinary_actions(company_id, is_active, created_at DESC) 
WHERE is_active = true;

-- =====================================================
-- 14. ÍNDICES PARA TABELA frota.vehicle_maintenances
-- =====================================================

-- Índice composto para manutenções por veículo e status
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenances_vehicle_status 
ON frota.vehicle_maintenances(vehicle_id, status, data_agendada);

-- Índice parcial para manutenções pendentes
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenances_pending 
ON frota.vehicle_maintenances(vehicle_id, data_agendada) 
WHERE status = 'pendente';

-- =====================================================
-- 15. ÍNDICES PARA TABELA frota.vehicle_occurrences
-- =====================================================

-- Índice composto para ocorrências por veículo e data
CREATE INDEX IF NOT EXISTS idx_vehicle_occurrences_vehicle_date 
ON frota.vehicle_occurrences(vehicle_id, created_at DESC);

-- Índice parcial para ocorrências pendentes
CREATE INDEX IF NOT EXISTS idx_vehicle_occurrences_pending 
ON frota.vehicle_occurrences(vehicle_id, created_at DESC) 
WHERE status = 'pendente';

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON INDEX idx_employees_created_at_id IS 
'Índice composto para ordenação de funcionários por data de criação';

COMMENT ON INDEX idx_employees_active IS 
'Índice parcial otimizado para consultas de funcionários ativos';

COMMENT ON INDEX idx_time_records_employee_date IS 
'Índice composto para consultas de registros de ponto por funcionário e data';

COMMENT ON INDEX idx_time_records_status_date IS 
'Índice para consultas de registros de ponto por status e data';

COMMENT ON INDEX idx_vehicles_active IS 
'Índice parcial otimizado para consultas de veículos ativos';

COMMENT ON INDEX idx_estoque_ruptura IS 
'Índice parcial para identificação rápida de itens em ruptura de estoque';

