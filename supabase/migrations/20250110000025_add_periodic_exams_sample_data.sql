-- =====================================================
-- DADOS DE EXEMPLO PARA EXAMES PERIÓDICOS
-- =====================================================

-- Inserir exames de exemplo para teste
INSERT INTO rh.periodic_exams (
    id,
    company_id,
    employee_id,
    tipo_exame,
    data_agendamento,
    data_realizacao,
    data_vencimento,
    status,
    medico_responsavel,
    clinica_local,
    observacoes,
    resultado,
    restricoes,
    custo,
    pago,
    data_pagamento,
    created_at,
    updated_at
) VALUES 
    -- Exame admissional realizado
    (
        gen_random_uuid(),
        'a9784891-9d58-4cc4-8404-18032105c335',
        'f1a121b9-fdf0-4b15-8162-aaaa0f5a1deb',
        'admissional',
        '2024-01-15',
        '2024-01-15',
        '2024-01-15',
        'realizado',
        'Dr. João Silva',
        'Clínica Médica Central',
        'Exame admissional realizado com sucesso',
        'apto',
        NULL,
        150.00,
        true,
        '2024-01-20',
        NOW(),
        NOW()
    ),
    
    -- Exame periódico agendado para o futuro
    (
        gen_random_uuid(),
        'a9784891-9d58-4cc4-8404-18032105c335',
        'f1a121b9-fdf0-4b15-8162-aaaa0f5a1deb',
        'periodico',
        '2025-02-15',
        NULL,
        '2025-02-15',
        'agendado',
        NULL,
        'Clínica Médica Central',
        'Exame periódico anual',
        NULL,
        NULL,
        200.00,
        false,
        NULL,
        NOW(),
        NOW()
    ),
    
    -- Exame periódico próximo (7 dias)
    (
        gen_random_uuid(),
        'a9784891-9d58-4cc4-8404-18032105c335',
        'f1a121b9-fdf0-4b15-8162-aaaa0f5a1deb',
        'periodico',
        CURRENT_DATE + INTERVAL '7 days',
        NULL,
        CURRENT_DATE + INTERVAL '7 days',
        'agendado',
        NULL,
        'Clínica Médica Central',
        'Exame periódico - lembrete próximo',
        NULL,
        NULL,
        200.00,
        false,
        NULL,
        NOW(),
        NOW()
    ),
    
    -- Exame vencido (para testar notificações)
    (
        gen_random_uuid(),
        'a9784891-9d58-4cc4-8404-18032105c335',
        'f1a121b9-fdf0-4b15-8162-aaaa0f5a1deb',
        'periodico',
        CURRENT_DATE - INTERVAL '5 days',
        NULL,
        CURRENT_DATE - INTERVAL '5 days',
        'agendado',
        NULL,
        'Clínica Médica Central',
        'Exame periódico vencido - precisa reagendamento',
        NULL,
        NULL,
        200.00,
        false,
        NULL,
        NOW(),
        NOW()
    ),
    
    -- Exame com restrições
    (
        gen_random_uuid(),
        'a9784891-9d58-4cc4-8404-18032105c335',
        '8e06f37d-c730-47b7-b0cd-d9c6c455ee32',
        'periodico',
        '2024-12-01',
        '2024-12-01',
        '2024-12-01',
        'realizado',
        'Dra. Maria Santos',
        'Clínica Ocupacional',
        'Exame com restrições médicas',
        'apto_com_restricoes',
        'Não pode trabalhar em altura superior a 2 metros',
        180.00,
        true,
        '2024-12-05',
        NOW(),
        NOW()
    ),
    
    -- Exame demissional
    (
        gen_random_uuid(),
        'a9784891-9d58-4cc4-8404-18032105c335',
        '8e06f37d-c730-47b7-b0cd-d9c6c455ee32',
        'demissional',
        '2024-11-30',
        '2024-11-30',
        '2024-11-30',
        'realizado',
        'Dr. Carlos Lima',
        'Clínica Médica Central',
        'Exame demissional realizado',
        'apto',
        NULL,
        120.00,
        true,
        '2024-12-01',
        NOW(),
        NOW()
    );

-- Comentários
COMMENT ON TABLE rh.periodic_exams IS 'Dados de exemplo inseridos para teste do sistema de exames periódicos';
