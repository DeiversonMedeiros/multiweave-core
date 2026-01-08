import { EntityService } from '@/services/generic/entityService';
import { callSchemaFunction } from '@/services/generic/entityService';
import { supabase } from '@/integrations/supabase/client';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface TrainingContent {
  id: string;
  company_id: string;
  training_id: string;
  titulo: string;
  descricao?: string;
  tipo_conteudo: 'video' | 'pdf' | 'texto' | 'link_externo';
  ordem: number;
  duracao_minutos?: number;
  url_conteudo?: string;
  arquivo_path?: string;
  conteudo_texto?: string;
  permite_pular: boolean;
  requer_conclusao: boolean;
  tempo_minimo_segundos?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingProgress {
  id: string;
  company_id: string;
  training_id: string;
  employee_id: string;
  content_id?: string;
  enrollment_id: string;
  status: 'nao_iniciado' | 'em_andamento' | 'concluido' | 'pausado';
  percentual_concluido: number;
  tempo_assistido_segundos: number;
  data_inicio?: string;
  data_ultima_atualizacao: string;
  data_conclusao?: string;
  ultima_posicao_segundos: number;
  concluido: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingExam {
  id: string;
  company_id: string;
  training_id: string;
  content_id?: string;
  titulo: string;
  descricao?: string;
  tipo_avaliacao: 'entre_aulas' | 'final' | 'diagnostica';
  nota_minima_aprovacao: number;
  tempo_limite_minutos?: number;
  permite_tentativas: number;
  ordem: number;
  obrigatorio: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingExamQuestion {
  id: string;
  company_id: string;
  exam_id: string;
  pergunta: string;
  tipo_questao: 'multipla_escolha' | 'verdadeiro_falso' | 'texto_livre' | 'numerico';
  ordem: number;
  pontuacao: number;
  explicacao?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingExamAlternative {
  id: string;
  company_id: string;
  question_id: string;
  texto: string;
  ordem: number;
  is_correct: boolean;
  created_at: string;
}

export interface TrainingExamAttempt {
  id: string;
  company_id: string;
  exam_id: string;
  employee_id: string;
  training_id: string;
  tentativa_numero: number;
  data_inicio: string;
  data_fim?: string;
  nota_final?: number;
  percentual_acerto?: number;
  aprovado: boolean;
  tempo_gasto_segundos?: number;
  status: 'em_andamento' | 'finalizado' | 'abandonado';
  created_at: string;
  updated_at: string;
}

export interface TrainingExamAnswer {
  id: string;
  company_id: string;
  attempt_id: string;
  question_id: string;
  alternative_id?: string;
  resposta_texto?: string;
  resposta_numerica?: number;
  pontuacao_obtida: number;
  is_correct: boolean;
  created_at: string;
}

export interface TrainingReactionEvaluation {
  id: string;
  company_id: string;
  training_id: string;
  employee_id: string;
  enrollment_id: string;
  nota_conteudo?: number;
  nota_instrutor?: number;
  nota_metodologia?: number;
  nota_recursos?: number;
  nota_geral?: number;
  pontos_positivos?: string;
  pontos_melhorar?: string;
  sugestoes?: string;
  recomendaria?: boolean;
  comentarios_gerais?: string;
  data_avaliacao: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingApplicationEvaluation {
  id: string;
  company_id: string;
  training_id: string;
  employee_id: string;
  gestor_id: string;
  enrollment_id: string;
  aplica_conhecimento?: boolean;
  qualidade_aplicacao?: number;
  frequencia_aplicacao?: 'sempre' | 'frequentemente' | 'as_vezes' | 'raramente' | 'nunca';
  impacto_trabalho?: number;
  exemplos_aplicacao?: string;
  dificuldades_observadas?: string;
  sugestoes_melhoria?: string;
  recomendaria_retreinamento?: boolean;
  data_avaliacao: string;
  periodo_avaliacao_inicio?: string;
  periodo_avaliacao_fim?: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingAssignment {
  id: string;
  company_id: string;
  training_id: string;
  employee_id?: string;
  position_id?: string;
  unit_id?: string;
  tipo_atribuicao: 'obrigatorio' | 'opcional';
  data_limite?: string;
  notificar: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingProgressStats {
  total_content: number;
  completed_content: number;
  progress_percent: number;
  total_time_minutes: number;
  time_watched_seconds: number;
  time_watched_minutes: number;
}

export interface TrainingDashboardStats {
  total_trainings: number;
  trainings_to_start: number;
  trainings_in_progress: number;
  trainings_completed: number;
  total_enrollments: number;
  total_certificates: number;
  avg_completion_rate: number;
  avg_reaction_score: number;
}

// =====================================================
// SERVIÇO DE TREINAMENTOS ONLINE
// =====================================================

export const OnlineTrainingService = {
  // =====================================================
  // CONTEÚDO
  // =====================================================
  
  async listContent(companyId: string, trainingId: string): Promise<TrainingContent[]> {
    const result = await EntityService.list<TrainingContent>({
      schema: 'rh',
      table: 'training_content',
      companyId,
      filters: {
        training_id: trainingId,
        is_active: true
      },
      orderBy: 'ordem',
      orderDirection: 'ASC'
    });
    return result.data;
  },

  async getContent(companyId: string, contentId: string): Promise<TrainingContent | null> {
    const result = await EntityService.get<TrainingContent>({
      schema: 'rh',
      table: 'training_content',
      companyId,
      id: contentId
    });
    return result.data;
  },

  async createContent(companyId: string, data: Omit<TrainingContent, 'id' | 'created_at' | 'updated_at'>): Promise<TrainingContent> {
    return await EntityService.create<TrainingContent>({
      schema: 'rh',
      table: 'training_content',
      companyId,
      data: {
        ...data,
        company_id: companyId
      }
    });
  },

  async updateContent(companyId: string, contentId: string, data: Partial<TrainingContent>): Promise<TrainingContent> {
    return await EntityService.update<TrainingContent>({
      schema: 'rh',
      table: 'training_content',
      companyId,
      id: contentId,
      data
    });
  },

  async deleteContent(companyId: string, contentId: string): Promise<void> {
    await EntityService.update({
      schema: 'rh',
      table: 'training_content',
      companyId,
      id: contentId,
      data: { is_active: false }
    });
  },

  // =====================================================
  // PROGRESSO
  // =====================================================

  async getProgress(companyId: string, trainingId: string, employeeId: string): Promise<TrainingProgress[]> {
    const result = await EntityService.list<TrainingProgress>({
      schema: 'rh',
      table: 'training_progress',
      companyId,
      filters: {
        training_id: trainingId,
        employee_id: employeeId
      },
      orderBy: 'created_at',
      orderDirection: 'ASC'
    });
    return result.data;
  },

  async getProgressStats(companyId: string, trainingId: string, employeeId: string): Promise<TrainingProgressStats> {
    const result = await callSchemaFunction<TrainingProgressStats>(
      'rh',
      'calculate_training_progress',
      {
        p_training_id: trainingId,
        p_employee_id: employeeId,
        p_company_id: companyId
      }
    );
    return result || {
      total_content: 0,
      completed_content: 0,
      progress_percent: 0,
      total_time_minutes: 0,
      time_watched_seconds: 0,
      time_watched_minutes: 0
    };
  },

  async updateProgress(
    companyId: string,
    trainingId: string,
    contentId: string,
    employeeId: string,
    data: {
      tempo_assistido_segundos?: number;
      ultima_posicao_segundos?: number;
      percentual_concluido?: number;
      concluido?: boolean;
    }
  ): Promise<TrainingProgress> {
    // Buscar progresso existente
    const existing = await EntityService.list<TrainingProgress>({
      schema: 'rh',
      table: 'training_progress',
      companyId,
      filters: {
        training_id: trainingId,
        content_id: contentId,
        employee_id: employeeId
      }
    });

    if (existing.data.length > 0) {
      return await EntityService.update<TrainingProgress>({
        schema: 'rh',
        table: 'training_progress',
        companyId,
        id: existing.data[0].id,
        data: {
          ...data,
          data_ultima_atualizacao: new Date().toISOString(),
          status: data.concluido ? 'concluido' : 'em_andamento',
          data_conclusao: data.concluido ? new Date().toISOString() : undefined
        }
      });
    } else {
      // Buscar enrollment
      const enrollment = await EntityService.list({
        schema: 'rh',
        table: 'training_enrollments',
        companyId,
        filters: {
          training_id: trainingId,
          employee_id: employeeId
        }
      });

      if (enrollment.data.length === 0) {
        throw new Error('Inscrição não encontrada');
      }

      return await EntityService.create<TrainingProgress>({
        schema: 'rh',
        table: 'training_progress',
        companyId,
        data: {
          company_id: companyId,
          training_id: trainingId,
          content_id: contentId,
          employee_id: employeeId,
          enrollment_id: enrollment.data[0].id,
          status: data.concluido ? 'concluido' : 'em_andamento',
          percentual_concluido: data.percentual_concluido || 0,
          tempo_assistido_segundos: data.tempo_assistido_segundos || 0,
          ultima_posicao_segundos: data.ultima_posicao_segundos || 0,
          concluido: data.concluido || false,
          data_inicio: new Date().toISOString(),
          data_ultima_atualizacao: new Date().toISOString(),
          data_conclusao: data.concluido ? new Date().toISOString() : undefined
        }
      });
    }
  },

  async markContentAsCompleted(
    companyId: string,
    trainingId: string,
    contentId: string,
    employeeId: string,
    tempoAssistidoSegundos: number = 0
  ): Promise<any> {
    return await callSchemaFunction(
      'rh',
      'mark_content_as_completed',
      {
        p_training_id: trainingId,
        p_content_id: contentId,
        p_employee_id: employeeId,
        p_company_id: companyId,
        p_tempo_assistido_segundos: tempoAssistidoSegundos
      }
    );
  },

  async canAdvanceToNextContent(
    companyId: string,
    trainingId: string,
    contentId: string,
    employeeId: string
  ): Promise<any> {
    return await callSchemaFunction(
      'rh',
      'can_advance_to_next_content',
      {
        p_training_id: trainingId,
        p_content_id: contentId,
        p_employee_id: employeeId,
        p_company_id: companyId
      }
    );
  },

  // =====================================================
  // PROVAS
  // =====================================================

  async listExams(companyId: string, trainingId: string): Promise<TrainingExam[]> {
    const result = await EntityService.list<TrainingExam>({
      schema: 'rh',
      table: 'training_exams',
      companyId,
      filters: {
        training_id: trainingId,
        is_active: true
      },
      orderBy: 'ordem',
      orderDirection: 'ASC'
    });
    return result.data;
  },

  async getExam(companyId: string, examId: string): Promise<TrainingExam | null> {
    const result = await EntityService.get<TrainingExam>({
      schema: 'rh',
      table: 'training_exams',
      companyId,
      id: examId
    });
    return result.data;
  },

  async createExam(companyId: string, data: Omit<TrainingExam, 'id' | 'created_at' | 'updated_at'>): Promise<TrainingExam> {
    return await EntityService.create<TrainingExam>({
      schema: 'rh',
      table: 'training_exams',
      companyId,
      data: {
        ...data,
        company_id: companyId
      }
    });
  },

  async updateExam(companyId: string, examId: string, data: Partial<TrainingExam>): Promise<TrainingExam> {
    return await EntityService.update<TrainingExam>({
      schema: 'rh',
      table: 'training_exams',
      companyId,
      id: examId,
      data
    });
  },

  // =====================================================
  // QUESTÕES E ALTERNATIVAS
  // =====================================================

  async listQuestions(companyId: string, examId: string): Promise<TrainingExamQuestion[]> {
    const result = await EntityService.list<TrainingExamQuestion>({
      schema: 'rh',
      table: 'training_exam_questions',
      companyId,
      filters: {
        exam_id: examId,
        is_active: true
      },
      orderBy: 'ordem',
      orderDirection: 'ASC'
    });
    return result.data;
  },

  async getQuestionWithAlternatives(companyId: string, questionId: string): Promise<{
    question: TrainingExamQuestion;
    alternatives: TrainingExamAlternative[];
  } | null> {
    const question = await EntityService.get<TrainingExamQuestion>({
      schema: 'rh',
      table: 'training_exam_questions',
      companyId,
      id: questionId
    });

    if (!question.data) return null;

    const alternatives = await EntityService.list<TrainingExamAlternative>({
      schema: 'rh',
      table: 'training_exam_alternatives',
      companyId,
      filters: {
        question_id: questionId
      },
      orderBy: 'ordem',
      orderDirection: 'ASC'
    });

    return {
      question: question.data,
      alternatives: alternatives.data
    };
  },

  async createQuestion(companyId: string, data: Omit<TrainingExamQuestion, 'id' | 'created_at' | 'updated_at'>): Promise<TrainingExamQuestion> {
    return await EntityService.create<TrainingExamQuestion>({
      schema: 'rh',
      table: 'training_exam_questions',
      companyId,
      data: {
        ...data,
        company_id: companyId
      }
    });
  },

  async createAlternative(companyId: string, data: Omit<TrainingExamAlternative, 'id' | 'created_at'>): Promise<TrainingExamAlternative> {
    return await EntityService.create<TrainingExamAlternative>({
      schema: 'rh',
      table: 'training_exam_alternatives',
      companyId,
      data: {
        ...data,
        company_id: companyId
      }
    });
  },

  // =====================================================
  // TENTATIVAS E RESPOSTAS
  // =====================================================

  async startExamAttempt(companyId: string, examId: string, employeeId: string, trainingId: string): Promise<TrainingExamAttempt> {
    // Verificar tentativas anteriores
    const existing = await EntityService.list<TrainingExamAttempt>({
      schema: 'rh',
      table: 'training_exam_attempts',
      companyId,
      filters: {
        exam_id: examId,
        employee_id: employeeId
      },
      orderBy: 'tentativa_numero',
      orderDirection: 'DESC'
    });

    const nextAttempt = existing.data.length > 0 ? existing.data[0].tentativa_numero + 1 : 1;

    // Verificar limite de tentativas
    const exam = await this.getExam(companyId, examId);
    if (exam && exam.permite_tentativas > 0 && nextAttempt > exam.permite_tentativas) {
      throw new Error('Limite de tentativas excedido');
    }

    return await EntityService.create<TrainingExamAttempt>({
      schema: 'rh',
      table: 'training_exam_attempts',
      companyId,
      data: {
        company_id: companyId,
        exam_id: examId,
        employee_id: employeeId,
        training_id: trainingId,
        tentativa_numero: nextAttempt,
        status: 'em_andamento',
        aprovado: false
      }
    });
  },

  async saveExamAnswer(
    companyId: string,
    attemptId: string,
    questionId: string,
    data: {
      alternative_id?: string;
      resposta_texto?: string;
      resposta_numerica?: number;
    }
  ): Promise<TrainingExamAnswer> {
    // Buscar questão para calcular pontuação
    const question = await EntityService.get<TrainingExamQuestion>({
      schema: 'rh',
      table: 'training_exam_questions',
      companyId,
      id: questionId
    });

    let isCorrect = false;
    let pontuacaoObtida = 0;

    if (question.data) {
      if (question.data.tipo_questao === 'multipla_escolha' && data.alternative_id) {
        const alternative = await EntityService.get<TrainingExamAlternative>({
          schema: 'rh',
          table: 'training_exam_alternatives',
          companyId,
          id: data.alternative_id
        });
        if (alternative.data) {
          isCorrect = alternative.data.is_correct;
          pontuacaoObtida = isCorrect ? question.data.pontuacao : 0;
        }
      } else if (question.data.tipo_questao === 'verdadeiro_falso' && data.alternative_id) {
        const alternative = await EntityService.get<TrainingExamAlternative>({
          schema: 'rh',
          table: 'training_exam_alternatives',
          companyId,
          id: data.alternative_id
        });
        if (alternative.data) {
          isCorrect = alternative.data.is_correct;
          pontuacaoObtida = isCorrect ? question.data.pontuacao : 0;
        }
      } else {
        // Para texto livre e numérico, pontuação será avaliada manualmente
        pontuacaoObtida = 0;
      }
    }

    // Verificar se já existe resposta
    const existing = await EntityService.list<TrainingExamAnswer>({
      schema: 'rh',
      table: 'training_exam_answers',
      companyId,
      filters: {
        attempt_id: attemptId,
        question_id: questionId
      }
    });

    if (existing.data.length > 0) {
      return await EntityService.update<TrainingExamAnswer>({
        schema: 'rh',
        table: 'training_exam_answers',
        companyId,
        id: existing.data[0].id,
        data: {
          alternative_id: data.alternative_id,
          resposta_texto: data.resposta_texto,
          resposta_numerica: data.resposta_numerica,
          is_correct: isCorrect,
          pontuacao_obtida: pontuacaoObtida
        }
      });
    } else {
      return await EntityService.create<TrainingExamAnswer>({
        schema: 'rh',
        table: 'training_exam_answers',
        companyId,
        data: {
          company_id: companyId,
          attempt_id: attemptId,
          question_id: questionId,
          alternative_id: data.alternative_id,
          resposta_texto: data.resposta_texto,
          resposta_numerica: data.resposta_numerica,
          is_correct: isCorrect,
          pontuacao_obtida: pontuacaoObtida
        }
      });
    }
  },

  async finishExamAttempt(companyId: string, attemptId: string): Promise<any> {
    return await callSchemaFunction(
      'rh',
      'finish_exam_attempt',
      {
        p_attempt_id: attemptId,
        p_company_id: companyId
      }
    );
  },

  async getExamAttempt(companyId: string, attemptId: string): Promise<TrainingExamAttempt | null> {
    const result = await EntityService.get<TrainingExamAttempt>({
      schema: 'rh',
      table: 'training_exam_attempts',
      companyId,
      id: attemptId
    });
    return result.data;
  },

  async getExamAttemptAnswers(companyId: string, attemptId: string): Promise<TrainingExamAnswer[]> {
    const result = await EntityService.list<TrainingExamAnswer>({
      schema: 'rh',
      table: 'training_exam_answers',
      companyId,
      filters: {
        attempt_id: attemptId
      }
    });
    return result.data;
  },

  // =====================================================
  // AVALIAÇÕES
  // =====================================================

  async createReactionEvaluation(
    companyId: string,
    data: Omit<TrainingReactionEvaluation, 'id' | 'created_at' | 'updated_at'>
  ): Promise<TrainingReactionEvaluation> {
    return await EntityService.create<TrainingReactionEvaluation>({
      schema: 'rh',
      table: 'training_reaction_evaluations',
      companyId,
      data: {
        ...data,
        company_id: companyId
      }
    });
  },

  async createApplicationEvaluation(
    companyId: string,
    data: Omit<TrainingApplicationEvaluation, 'id' | 'created_at' | 'updated_at'>
  ): Promise<TrainingApplicationEvaluation> {
    return await EntityService.create<TrainingApplicationEvaluation>({
      schema: 'rh',
      table: 'training_application_evaluations',
      companyId,
      data: {
        ...data,
        company_id: companyId
      }
    });
  },

  // =====================================================
  // ATRIBUIÇÕES
  // =====================================================

  async listAssignments(companyId: string, trainingId: string): Promise<TrainingAssignment[]> {
    const result = await EntityService.list<TrainingAssignment>({
      schema: 'rh',
      table: 'training_assignments',
      companyId,
      filters: {
        training_id: trainingId
      }
    });
    return result.data;
  },

  async createAssignment(companyId: string, data: Omit<TrainingAssignment, 'id' | 'created_at' | 'updated_at'>): Promise<TrainingAssignment> {
    return await EntityService.create<TrainingAssignment>({
      schema: 'rh',
      table: 'training_assignments',
      companyId,
      data: {
        ...data,
        company_id: companyId
      }
    });
  },

  async deleteAssignment(companyId: string, assignmentId: string): Promise<void> {
    await EntityService.delete({
      schema: 'rh',
      table: 'training_assignments',
      companyId,
      id: assignmentId
    });
  },

  // =====================================================
  // DASHBOARD E ESTATÍSTICAS
  // =====================================================

  async getDashboardStats(companyId: string, trainingId?: string): Promise<TrainingDashboardStats> {
    const result = await callSchemaFunction<TrainingDashboardStats>(
      'rh',
      'get_training_dashboard_stats',
      {
        p_company_id: companyId,
        p_training_id: trainingId || null
      }
    );
    return result || {
      total_trainings: 0,
      trainings_to_start: 0,
      trainings_in_progress: 0,
      trainings_completed: 0,
      total_enrollments: 0,
      total_certificates: 0,
      avg_completion_rate: 0,
      avg_reaction_score: 0
    };
  },

  async getMandatoryTrainingsPending(companyId: string, employeeId: string): Promise<any> {
    return await callSchemaFunction(
      'rh',
      'get_mandatory_trainings_pending',
      {
        p_employee_id: employeeId,
        p_company_id: companyId
      }
    );
  }
};



