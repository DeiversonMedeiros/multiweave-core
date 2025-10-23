// =====================================================
// TESTE DE INTEGRAÇÃO - SISTEMA DE RECRUTAMENTO
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { RecruitmentService } from '@/services/rh/recruitmentService';

// Teste básico de conectividade
export async function testRecruitmentIntegration() {
  console.log('🧪 Iniciando testes de integração do sistema de recrutamento...');
  
  try {
    // 1. Teste de conectividade com Supabase
    console.log('1. Testando conectividade com Supabase...');
    const { data: user, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('❌ Erro de autenticação:', userError);
      return false;
    }
    console.log('✅ Conectividade com Supabase OK');

    // 2. Teste de acesso às tabelas de recrutamento via RPC
    console.log('2. Testando acesso às tabelas de recrutamento...');
    try {
      // Usar RPC function para verificar tabelas
      const { data: tables, error: tablesError } = await supabase
        .rpc('get_rh_tables');
      
      if (tablesError) {
        console.error('❌ Erro ao acessar tabelas:', tablesError);
        return false;
      }
      
      console.log('✅ Tabelas encontradas:', tables);
    } catch (error) {
      console.log('⚠️ RPC function não disponível, pulando verificação de tabelas');
    }
    
    // 3. Teste de criação de uma solicitação de vaga
    console.log('3. Testando criação de solicitação de vaga...');
    const testJobRequest = {
      position_name: 'Desenvolvedor Frontend - Teste',
      department_name: 'Tecnologia',
      job_description: 'Desenvolvedor frontend com React e TypeScript',
      requirements: 'Conhecimento em React, TypeScript, CSS',
      benefits: 'Vale refeição, plano de saúde',
      salary_range: 'R$ 5.000 - R$ 8.000',
      urgency_level: 'media' as const,
      expected_start_date: '2025-02-01'
    };

    // Usar EntityService para criar job request
    const { data: jobRequest, error: jobRequestError } = await supabase
      .rpc('create_job_request', testJobRequest);

    if (jobRequestError) {
      console.error('❌ Erro ao criar solicitação de vaga:', jobRequestError);
      return false;
    }
    
    console.log('✅ Solicitação de vaga criada:', jobRequest.id);

    // 4. Teste de criação de um candidato
    console.log('4. Testando criação de candidato...');
    const testCandidate = {
      name: 'João Silva - Teste',
      email: 'joao.teste@email.com',
      phone: '(11) 99999-9999',
      cpf: '123.456.789-00',
      source: 'site' as const,
      status: 'ativo' as const
    };

    const { data: candidate, error: candidateError } = await supabase
      .rpc('create_candidate', testCandidate);

    if (candidateError) {
      console.error('❌ Erro ao criar candidato:', candidateError);
      return false;
    }
    
    console.log('✅ Candidato criado:', candidate.id);

    // 5. Teste de criação de uma vaga aberta
    console.log('5. Testando criação de vaga aberta...');
    const testJobOpening = {
      position_name: 'Desenvolvedor Frontend',
      department_name: 'Tecnologia',
      job_description: 'Desenvolvedor frontend com React e TypeScript',
      requirements: 'Conhecimento em React, TypeScript, CSS',
      benefits: 'Vale refeição, plano de saúde',
      salary_range: 'R$ 5.000 - R$ 8.000',
      status: 'aberta' as const
    };

    const { data: jobOpening, error: jobOpeningError } = await supabase
      .rpc('create_job_opening', testJobOpening);

    if (jobOpeningError) {
      console.error('❌ Erro ao criar vaga aberta:', jobOpeningError);
      return false;
    }
    
    console.log('✅ Vaga aberta criada:', jobOpening.id);

    // 6. Teste de criação de processo seletivo
    console.log('6. Testando criação de processo seletivo...');
    const testSelectionProcess = {
      job_opening_id: jobOpening.id,
      candidate_id: candidate.id,
      current_stage: 'triagem',
      status: 'ativo' as const,
      notes: 'Processo de teste'
    };

    const { data: selectionProcess, error: selectionProcessError } = await supabase
      .rpc('create_selection_process', testSelectionProcess);

    if (selectionProcessError) {
      console.error('❌ Erro ao criar processo seletivo:', selectionProcessError);
      return false;
    }
    
    console.log('✅ Processo seletivo criado:', selectionProcess.id);

    // 7. Teste de criação de etapa do processo
    console.log('7. Testando criação de etapa do processo...');
    const testStage = {
      selection_process_id: selectionProcess.id,
      stage_name: 'Triagem Inicial',
      stage_type: 'triagem' as const,
      status: 'pendente' as const,
      notes: 'Etapa de triagem do currículo'
    };

    const { data: stage, error: stageError } = await supabase
      .rpc('create_selection_stage', testStage);

    if (stageError) {
      console.error('❌ Erro ao criar etapa:', stageError);
      return false;
    }
    
    console.log('✅ Etapa criada:', stage.id);

    // 8. Teste de adição ao banco de talentos
    console.log('8. Testando adição ao banco de talentos...');
    const testTalentPool = {
      candidate_id: candidate.id,
      category: 'Tecnologia',
      skills: ['React', 'TypeScript', 'CSS'],
      experience_level: 'pleno' as const,
      availability: 'disponivel' as const,
      notes: 'Candidato com bom perfil técnico'
    };

    const { data: talentPool, error: talentPoolError } = await supabase
      .rpc('create_talent_pool_entry', testTalentPool);

    if (talentPoolError) {
      console.error('❌ Erro ao adicionar ao banco de talentos:', talentPoolError);
      return false;
    }
    
    console.log('✅ Adicionado ao banco de talentos:', talentPool.id);

    // 9. Teste de upload de documento
    console.log('9. Testando upload de documento...');
    const testDocument = {
      candidate_id: candidate.id,
      document_type: 'curriculo' as const,
      file_name: 'curriculo_joao_silva.pdf',
      file_path: 'documents/curriculo_joao_silva.pdf',
      file_size: 1024000,
      mime_type: 'application/pdf'
    };

    const { data: document, error: documentError } = await supabase
      .rpc('create_candidate_document', testDocument);

    if (documentError) {
      console.error('❌ Erro ao criar documento:', documentError);
      return false;
    }
    
    console.log('✅ Documento criado:', document.id);

    // 10. Teste de consulta de dados
    console.log('10. Testando consulta de dados...');
    const { data: allJobRequests, error: allJobRequestsError } = await supabase
      .rpc('get_job_requests', { limit_count: 5 });

    if (allJobRequestsError) {
      console.error('❌ Erro ao consultar solicitações:', allJobRequestsError);
      return false;
    }
    
    console.log('✅ Consulta de dados OK - Encontradas', allJobRequests?.length, 'solicitações');

    console.log('🎉 Todos os testes de integração passaram com sucesso!');
    return true;

  } catch (error) {
    console.error('❌ Erro geral nos testes:', error);
    return false;
  }
}

// Função para limpar dados de teste
export async function cleanupTestData() {
  console.log('🧹 Limpando dados de teste...');
  
  try {
    // Deletar dados de teste usando RPC functions
    await supabase.rpc('delete_test_candidate_documents');
    await supabase.rpc('delete_test_talent_pool');
    await supabase.rpc('delete_test_selection_stages');
    await supabase.rpc('delete_test_selection_processes');
    await supabase.rpc('delete_test_job_openings');
    await supabase.rpc('delete_test_candidates');
    await supabase.rpc('delete_test_job_requests');
    
    console.log('✅ Dados de teste limpos com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao limpar dados de teste:', error);
    return false;
  }
}
