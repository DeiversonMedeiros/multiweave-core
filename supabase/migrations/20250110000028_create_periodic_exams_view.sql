-- =====================================================
-- VIEW PARA EXAMES PERIÓDICOS NO SCHEMA PUBLIC
-- =====================================================

-- Criar view para exames periódicos
CREATE OR REPLACE VIEW public.periodic_exams_view AS
SELECT 
    pe.id,
    pe.company_id,
    pe.employee_id,
    e.nome as employee_name,
    pe.tipo_exame,
    pe.data_agendamento,
    pe.data_realizacao,
    pe.data_vencimento,
    pe.status,
    pe.medico_responsavel,
    pe.clinica_local,
    pe.observacoes,
    pe.resultado,
    pe.restricoes,
    pe.anexos,
    pe.custo,
    pe.pago,
    pe.data_pagamento,
    pe.created_at,
    pe.updated_at
FROM rh.periodic_exams pe
LEFT JOIN rh.employees e ON pe.employee_id = e.id;

-- Habilitar RLS na view
ALTER VIEW public.periodic_exams_view SET (security_invoker = true);

-- Criar política RLS para a view
CREATE POLICY "Users can view periodic exams of their company" ON public.periodic_exams_view
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid() AND ativo = true
        )
    );

-- Política para colaboradores (apenas seus exames)
CREATE POLICY "Employees can view their own exams" ON public.periodic_exams_view
    FOR SELECT USING (
        employee_id IN (
            SELECT id FROM rh.employees
            WHERE user_id = auth.uid()
        )
    );

-- Política para admins e managers (gerenciar todos os exames da empresa)
CREATE POLICY "Admins and managers can manage periodic exams" ON public.periodic_exams_view
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid() AND ativo = true
            AND EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = (SELECT profile_id FROM user_companies WHERE user_id = auth.uid() AND company_id = public.periodic_exams_view.company_id LIMIT 1)
                AND (permissoes->>'admin' = 'true' OR permissoes->>'manager' = 'true')
            )
        )
    );

-- Conceder permissões
GRANT SELECT ON public.periodic_exams_view TO authenticated;
GRANT ALL ON public.periodic_exams_view TO authenticated;
