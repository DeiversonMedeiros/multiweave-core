import { EntityService } from '@/services/generic/entityService';
import { callSchemaFunction } from '@/services/generic/entityService';
import { supabase } from '@/integrations/supabase/client';
import type { Training } from '@/hooks/rh/useTraining';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface TrainingContent {
  id: string;
  company_id: string;
  training_id: string;
  titulo: string;
  descricao?: string;
  tipo_conteudo: 'video' | 'pdf' | 'texto' | 'link_externo' | 'audio';
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
  tipo_atribuicao: 'obrigatorio' | 'opcional' | 'publica';
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
    return await EntityService.getById<TrainingContent>(
      'rh',
      'training_content',
      contentId,
      companyId
    );
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
    console.log('[getProgressStats] 🚀 INÍCIO - Buscando estatísticas de progresso', {
      companyId,
      trainingId,
      employeeId,
      timestamp: new Date().toISOString()
    });
    
    try {
      const rawResult = await callSchemaFunction<any>(
        'rh',
        'calculate_training_progress',
        {
          p_training_id: trainingId,
          p_employee_id: employeeId,
          p_company_id: companyId
        }
      );
      
      console.log('[getProgressStats] 📥 Resultado bruto da função do banco:', {
        trainingId,
        employeeId,
        rawResult,
        rawResultString: typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult),
        rawResultLength: typeof rawResult === 'string' ? rawResult.length : 'N/A',
        resultType: typeof rawResult,
        isNull: rawResult === null,
        isUndefined: rawResult === undefined,
        isString: typeof rawResult === 'string',
        firstChars: typeof rawResult === 'string' ? rawResult.substring(0, 200) : 'N/A',
        // Expandir completamente a string
        fullRawResultString: typeof rawResult === 'string' ? rawResult : null,
        // Tentar parsear se for string
        parsedFromString: typeof rawResult === 'string' ? (() => {
          try {
            return JSON.parse(rawResult);
          } catch {
            return 'ERRO_NO_PARSE';
          }
        })() : null
      });
      
      // Se o resultado é uma string JSON, fazer parse
      let result: any = rawResult;
      if (typeof rawResult === 'string') {
        try {
          result = JSON.parse(rawResult);
          console.log('[getProgressStats] 🔄 Resultado parseado de string JSON:', {
            trainingId,
            employeeId,
            parsedResult: result
          });
        } catch (parseError) {
          console.error('[getProgressStats] ❌ Erro ao fazer parse do JSON:', {
            trainingId,
            employeeId,
            rawResult,
            error: parseError
          });
          throw new Error('Erro ao processar resposta do servidor');
        }
      }
      
      // Verificar se há erro na resposta OU se os valores estão zerados (pode ser problema de RLS)
      const hasError = result?.error === true;
      const hasZeroValues = result && result.total_content === 0 && result.completed_content === 0;
      
      console.log('[getProgressStats] 🔍 Verificando se precisa usar fallback:', {
        trainingId,
        employeeId,
        hasError,
        hasZeroValues,
        result: result
      });
      
      if (hasError || hasZeroValues) {
        if (hasError) {
          console.error('[getProgressStats] ❌ ERRO retornado pela função do banco:', {
            trainingId,
            employeeId,
            error: result.error,
            message: result.message,
            fullResult: result
          });
        } else {
          console.warn('[getProgressStats] ⚠️ Valores zerados retornados pela função (possível problema de RLS):', {
            trainingId,
            employeeId,
            result: result
          });
        }
        
        // Se for erro de acesso negado OU valores zerados, tentar buscar progresso diretamente da tabela
        if (hasError && (result.message === 'Acesso negado' || result.message?.includes('Acesso negado'))) {
          console.log('[getProgressStats] 🔄 Erro de acesso negado detectado, tentando buscar progresso diretamente da tabela');
        } else if (hasZeroValues) {
          console.log('[getProgressStats] 🔄 Valores zerados detectados, tentando buscar progresso diretamente da tabela (fallback)');
        }
        
        try {
          // Buscar progresso diretamente da tabela training_progress
          const progressResult = await EntityService.list({
            schema: 'rh',
            table: 'training_progress',
            companyId,
            filters: {
              training_id: trainingId,
              employee_id: employeeId
            }
          });
          
          console.log('[getProgressStats] 📊 Progresso encontrado diretamente:', {
            trainingId,
            employeeId,
            progressCount: progressResult.data.length,
            progressItems: progressResult.data.map((p: any) => ({
              content_id: p.content_id,
              concluido: p.concluido,
              percentual_concluido: p.percentual_concluido
            }))
          });
          
          // Buscar conteúdos do treinamento
          const contentResult = await EntityService.list({
            schema: 'rh',
            table: 'training_content',
            companyId,
            filters: {
              training_id: trainingId,
              is_active: true
            }
          });
          
          console.log('[getProgressStats] 📚 Conteúdos encontrados diretamente:', {
            trainingId,
            contentCount: contentResult.data.length
          });
          
          const totalContent = contentResult.data.length;
          // Considerar concluído se concluido = true OU percentual_concluido >= 100
          const completedContent = progressResult.data.filter((p: any) => 
            p.concluido === true || (p.percentual_concluido !== null && p.percentual_concluido >= 100)
          ).length;
          
          const progressPercent = totalContent > 0 ? (completedContent / totalContent) * 100 : 0;
          
          // Se todos concluídos, garantir 100%
          const finalProgressPercent = (completedContent === totalContent && totalContent > 0) ? 100 : progressPercent;
          
          // Calcular tempo assistido
          const totalTimeWatchedSeconds = progressResult.data.reduce((sum: number, p: any) => 
            sum + (Number(p.tempo_assistido_segundos) || 0), 0
          );
          const totalTimeMinutes = contentResult.data.reduce((sum: number, c: any) => 
            sum + (Number(c.duracao_minutos) || 0), 0
          );
          
          const fallbackResult: TrainingProgressStats = {
            total_content: totalContent,
            completed_content: completedContent,
            progress_percent: finalProgressPercent,
            total_time_minutes: totalTimeMinutes,
            time_watched_seconds: totalTimeWatchedSeconds,
            time_watched_minutes: Math.round((totalTimeWatchedSeconds / 60) * 100) / 100
          };
          
          console.log('[getProgressStats] ✅ Progresso calculado diretamente da tabela (FALLBACK):', {
            trainingId,
            employeeId,
            fallbackResult,
            calculationDetails: {
              totalContent,
              completedContent,
              progressPercent,
              finalProgressPercent,
              allProgressItems: progressResult.data,
              allContentItems: contentResult.data
            }
          });
          
          return fallbackResult;
        } catch (fallbackError) {
          console.error('[getProgressStats] ❌ Erro ao buscar progresso diretamente:', fallbackError);
          if (hasError) {
            throw new Error(result.message || 'Erro ao buscar progresso do treinamento');
          }
          // Se não foi erro, mas valores zerados, retornar os valores zerados mesmo
          // (melhor mostrar "Não iniciado" do que crashar)
        }
      }
      
      console.log('[getProgressStats] 📊 Resultado processado (sem erro):', {
        trainingId,
        employeeId,
        result,
        resultStringified: JSON.stringify(result),
        keys: result ? Object.keys(result) : null,
        rawValues: result ? {
          total_content: result.total_content,
          completed_content: result.completed_content,
          progress_percent: result.progress_percent,
          total_time_minutes: result.total_time_minutes,
          time_watched_seconds: result.time_watched_seconds,
          time_watched_minutes: result.time_watched_minutes,
          total_content_type: typeof result.total_content,
          completed_content_type: typeof result.completed_content,
          progress_percent_type: typeof result.progress_percent,
          total_content_value: result.total_content,
          completed_content_value: result.completed_content,
          progress_percent_value: result.progress_percent
        } : null
      });
      
      // Verificar se result é null ou undefined
      if (!result) {
        console.warn('[getProgressStats] ⚠️ Resultado é null/undefined, retornando valores padrão');
        return {
          total_content: 0,
          completed_content: 0,
          progress_percent: 0,
          total_time_minutes: 0,
          time_watched_seconds: 0,
          time_watched_minutes: 0
        };
      }
      
      // Garantir que todos os valores sejam válidos (não null, não NaN, não undefined)
      const safeResult: TrainingProgressStats = {
        total_content: Number(result?.total_content) || 0,
        completed_content: Number(result?.completed_content) || 0,
        progress_percent: Number(result?.progress_percent) || 0,
        total_time_minutes: Number(result?.total_time_minutes) || 0,
        time_watched_seconds: Number(result?.time_watched_seconds) || 0,
        time_watched_minutes: Number(result?.time_watched_minutes) || 0
      };
      
      console.log('[getProgressStats] 🔄 Valores após conversão Number():', {
        trainingId,
        employeeId,
        before: {
          total_content: result?.total_content,
          completed_content: result?.completed_content,
          progress_percent: result?.progress_percent,
          total_content_raw: result?.total_content,
          completed_content_raw: result?.completed_content,
          progress_percent_raw: result?.progress_percent
        },
        after: {
          total_content: safeResult.total_content,
          completed_content: safeResult.completed_content,
          progress_percent: safeResult.progress_percent
        },
        isNaN: {
          total_content: isNaN(safeResult.total_content),
          completed_content: isNaN(safeResult.completed_content),
          progress_percent: isNaN(safeResult.progress_percent)
        },
        conversionDetails: {
          total_content_converted: Number(result?.total_content),
          completed_content_converted: Number(result?.completed_content),
          progress_percent_converted: Number(result?.progress_percent),
          total_content_or_zero: Number(result?.total_content) || 0,
          completed_content_or_zero: Number(result?.completed_content) || 0,
          progress_percent_or_zero: Number(result?.progress_percent) || 0
        }
      });
      
      // Se todos os conteúdos foram concluídos, garantir que progress_percent seja 100
      if (safeResult.total_content > 0 && 
          safeResult.completed_content === safeResult.total_content && 
          safeResult.progress_percent < 100) {
        console.log('[getProgressStats] 🔧 CORREÇÃO: Todos os conteúdos concluídos mas progress_percent < 100', {
          trainingId,
          employeeId,
          before: safeResult.progress_percent,
          after: 100,
          completed_content: safeResult.completed_content,
          total_content: safeResult.total_content
        });
        safeResult.progress_percent = 100;
      }
      
      // Garantir que progress_percent esteja entre 0 e 100
      if (isNaN(safeResult.progress_percent) || safeResult.progress_percent < 0) {
        console.log('[getProgressStats] ⚠️ progress_percent inválido (NaN ou < 0), corrigindo para 0', {
          trainingId,
          employeeId,
          original: safeResult.progress_percent
        });
        safeResult.progress_percent = 0;
      } else if (safeResult.progress_percent > 100) {
        console.log('[getProgressStats] ⚠️ progress_percent > 100, corrigindo para 100', {
          trainingId,
          employeeId,
          original: safeResult.progress_percent
        });
        safeResult.progress_percent = 100;
      }
      
      console.log('[getProgressStats] ✅ Resultado final processado:', {
        trainingId,
        employeeId,
        finalResult: safeResult,
        finalResultStringified: JSON.stringify(safeResult),
        breakdown: {
          total_content: safeResult.total_content,
          completed_content: safeResult.completed_content,
          progress_percent: safeResult.progress_percent,
          total_time_minutes: safeResult.total_time_minutes,
          time_watched_seconds: safeResult.time_watched_seconds,
          time_watched_minutes: safeResult.time_watched_minutes
        },
        isComplete: safeResult.progress_percent >= 100 || 
                   (safeResult.completed_content > 0 && 
                    safeResult.total_content > 0 && 
                    safeResult.completed_content === safeResult.total_content),
        completionChecks: {
          progress_percent_ge_100: safeResult.progress_percent >= 100,
          completed_gt_0: safeResult.completed_content > 0,
          total_gt_0: safeResult.total_content > 0,
          completed_eq_total: safeResult.completed_content === safeResult.total_content,
          all_conditions: safeResult.completed_content > 0 && 
                         safeResult.total_content > 0 && 
                         safeResult.completed_content === safeResult.total_content
        }
      });
      
      return safeResult;
    } catch (error) {
      console.error('[getProgressStats] ❌ ERRO ao buscar estatísticas de progresso:', {
        trainingId,
        employeeId,
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
      // Retornar valores padrão em caso de erro
      return {
        total_content: 0,
        completed_content: 0,
        progress_percent: 0,
        total_time_minutes: 0,
        time_watched_seconds: 0,
        time_watched_minutes: 0
      };
    }
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
    return await EntityService.getById<TrainingExam>(
      'rh',
      'training_exams',
      examId,
      companyId
    );
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
    const question = await EntityService.getById<TrainingExamQuestion>(
      'rh',
      'training_exam_questions',
      questionId,
      companyId
    );

    if (!question) return null;

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
      question: question,
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
    const question = await EntityService.getById<TrainingExamQuestion>(
      'rh',
      'training_exam_questions',
      questionId,
      companyId
    );

    let isCorrect = false;
    let pontuacaoObtida = 0;

    if (question) {
      if (question.tipo_questao === 'multipla_escolha' && data.alternative_id) {
        const alternative = await EntityService.getById<TrainingExamAlternative>(
          'rh',
          'training_exam_alternatives',
          data.alternative_id,
          companyId
        );
        if (alternative) {
          isCorrect = alternative.is_correct;
          pontuacaoObtida = isCorrect ? question.pontuacao : 0;
        }
      } else if (question.tipo_questao === 'verdadeiro_falso' && data.alternative_id) {
        const alternative = await EntityService.getById<TrainingExamAlternative>(
          'rh',
          'training_exam_alternatives',
          data.alternative_id,
          companyId
        );
        if (alternative) {
          isCorrect = alternative.is_correct;
          pontuacaoObtida = isCorrect ? question.pontuacao : 0;
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
    return await EntityService.getById<TrainingExamAttempt>(
      'rh',
      'training_exam_attempts',
      attemptId,
      companyId
    );
  },

  async listExamAttempts(companyId: string, examId: string, employeeId: string): Promise<TrainingExamAttempt[]> {
    const result = await EntityService.list<TrainingExamAttempt>({
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
    console.log('[getDashboardStats] Chamando função com:', { companyId, trainingId });
    
    const result = await callSchemaFunction<TrainingDashboardStats>(
      'rh',
      'get_training_dashboard_stats',
      {
        p_company_id: companyId,
        p_training_id: trainingId || null
      }
    );
    
    console.log('[getDashboardStats] Resultado bruto da função:', result);
    console.log('[getDashboardStats] Tipo do resultado:', typeof result);
    
    // Garantir que todos os valores numéricos sejam convertidos corretamente
    if (!result) {
      console.log('[getDashboardStats] Resultado é null/undefined, retornando zeros');
      return {
        total_trainings: 0,
        trainings_to_start: 0,
        trainings_in_progress: 0,
        trainings_completed: 0,
        total_enrollments: 0,
        total_certificates: 0,
        avg_completion_rate: 0,
        avg_reaction_score: 0
      };
    }
    
    // Se o resultado for uma string JSON, fazer parse
    let parsedResult = result;
    if (typeof result === 'string') {
      try {
        parsedResult = JSON.parse(result);
        console.log('[getDashboardStats] Resultado parseado:', parsedResult);
      } catch (e) {
        console.error('[getDashboardStats] Erro ao fazer parse do JSON:', e);
        return {
          total_trainings: 0,
          trainings_to_start: 0,
          trainings_in_progress: 0,
          trainings_completed: 0,
          total_enrollments: 0,
          total_certificates: 0,
          avg_completion_rate: 0,
          avg_reaction_score: 0
        };
      }
    }
    
    // Usar conversão mais robusta
    // Se o valor for null/undefined, usar 0
    // Se for um número válido, usar o número
    // Se for NaN, usar 0
    const toNumber = (value: any): number => {
      if (value == null) return 0;
      const num = Number(value);
      return isNaN(num) ? 0 : num;
    };
    
    const processed = {
      total_trainings: toNumber(parsedResult.total_trainings),
      trainings_to_start: toNumber(parsedResult.trainings_to_start),
      trainings_in_progress: toNumber(parsedResult.trainings_in_progress),
      trainings_completed: toNumber(parsedResult.trainings_completed),
      total_enrollments: toNumber(parsedResult.total_enrollments),
      total_certificates: toNumber(parsedResult.total_certificates),
      avg_completion_rate: toNumber(parsedResult.avg_completion_rate),
      avg_reaction_score: toNumber(parsedResult.avg_reaction_score)
    };
    
    console.log('[getDashboardStats] Resultado processado:', processed);
    
    return processed;
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
  },

  // =====================================================
  // TREINAMENTOS DISPONÍVEIS PARA O COLABORADOR
  // =====================================================

  async getAvailableTrainingsForEmployee(companyId: string, employeeId: string): Promise<{
    assigned: Array<{
      training: Training;
      assignment: TrainingAssignment;
      progress?: TrainingProgressStats;
      deadline?: string;
    }>;
    byPosition: Array<{
      training: Training;
      assignment: TrainingAssignment;
      progress?: TrainingProgressStats;
      deadline?: string;
    }>;
    public: Array<{
      training: Training;
      assignment: TrainingAssignment;
      progress?: TrainingProgressStats;
    }>;
  }> {
    // IMPORTANTE: Primeiro buscar o funcionário para obter o company_id correto
    // O funcionário pode estar vinculado a uma empresa diferente da selecionada
    let employee: any = null;
    let employeeCompanyId = companyId; // Fallback para a empresa selecionada
    
    // Tentar buscar o funcionário na empresa selecionada primeiro
    try {
      const employeeResult = await EntityService.list({
        schema: 'rh',
        table: 'employees',
        companyId,
        filters: {
          id: employeeId
        }
      });

      if (employeeResult.data && employeeResult.data.length > 0) {
        employee = employeeResult.data[0];
        employeeCompanyId = employee.company_id;
      }
    } catch (error) {
      console.warn('[getAvailableTrainingsForEmployee] Erro ao buscar funcionário na empresa selecionada:', error);
    }

    // Se não encontrou o funcionário na empresa selecionada, buscar em todas as empresas do usuário
    if (!employee) {
      try {
        // Buscar funcionário em todas as empresas do usuário atual
        // Primeiro, precisamos obter o user_id do funcionário através de uma busca mais ampla
        // Vamos buscar o funcionário através de uma query SQL usando RPC ou buscar em todas as empresas conhecidas
        
        // Tentar buscar através de uma função RPC se existir, ou buscar em todas as empresas do usuário
        // Como não temos acesso direto ao userId aqui, vamos tentar buscar o funcionário
        // através de todas as empresas conhecidas do usuário atual
        
        // Buscar empresas do usuário atual através do contexto de autenticação
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.error('[getAvailableTrainingsForEmployee] ❌ Usuário não autenticado');
          return {
            assigned: [],
            byPosition: [],
            public: []
          };
        }

        const { data: userCompanies, error: userCompaniesError } = await supabase
          .from('user_companies')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('ativo', true);

        if (!userCompaniesError && userCompanies && userCompanies.length > 0) {
          // Tentar buscar o funcionário em cada empresa do usuário
          for (const uc of userCompanies) {
            try {
              const result = await EntityService.list({
                schema: 'rh',
                table: 'employees',
                companyId: uc.company_id,
                filters: { id: employeeId },
                pageSize: 1
              });

              if (result.data && result.data.length > 0) {
                employee = result.data[0];
                employeeCompanyId = employee.company_id;
                console.log('[getAvailableTrainingsForEmployee] ✅ Funcionário encontrado na empresa:', employeeCompanyId);
                break;
              }
            } catch (error) {
              console.warn('[getAvailableTrainingsForEmployee] ⚠️ Erro ao buscar na empresa:', uc.company_id, error);
            }
          }
        }

        // Se ainda não encontrou, retornar resultado vazio
        if (!employee) {
          console.error('[getAvailableTrainingsForEmployee] ❌ Funcionário não encontrado em nenhuma empresa do usuário');
          return {
            assigned: [],
            byPosition: [],
            public: []
          };
        }
      } catch (error) {
        console.error('[getAvailableTrainingsForEmployee] ❌ Erro ao buscar funcionário em todas as empresas:', error);
        // Retornar resultado vazio se não encontrou o funcionário
        return {
          assigned: [],
          byPosition: [],
          public: []
        };
      }
    }

    // IMPORTANTE: Para treinamentos públicos, precisamos buscar em TODAS as empresas do usuário
    // Para treinamentos atribuídos diretamente, buscamos apenas da empresa do funcionário
    
    // Obter todas as empresas do usuário para buscar treinamentos públicos
    const { data: { user } } = await supabase.auth.getUser();
    let userCompanyIds: string[] = [employeeCompanyId]; // Incluir a empresa do funcionário
    
    if (user) {
      const { data: userCompanies } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('ativo', true);
      
      if (userCompanies && userCompanies.length > 0) {
        userCompanyIds = userCompanies.map(uc => uc.company_id);
        // Garantir que a empresa do funcionário está incluída
        if (!userCompanyIds.includes(employeeCompanyId)) {
          userCompanyIds.push(employeeCompanyId);
        }
      }
    }

    console.log('[getAvailableTrainingsForEmployee] 🔍 Empresas do usuário para busca:', {
      employeeCompanyId,
      userCompanyIds,
      totalCompanies: userCompanyIds.length
    });

    // Buscar treinamentos de todas as empresas do usuário (para treinamentos públicos)
    const allTrainings: Training[] = [];
    const allAssignments: TrainingAssignment[] = [];
    
    for (const companyId of userCompanyIds) {
      try {
        // Buscar treinamentos online ativos desta empresa
        const trainingsResult = await EntityService.list<Training>({
          schema: 'rh',
          table: 'trainings',
          companyId,
          filters: {
            modalidade: 'online',
            is_active: true
          }
        });
        
        allTrainings.push(...trainingsResult.data);

        // Buscar atribuições desta empresa
        const assignmentsResult = await EntityService.list<TrainingAssignment>({
          schema: 'rh',
          table: 'training_assignments',
          companyId,
          filters: {}
        });
        
        allAssignments.push(...assignmentsResult.data);
      } catch (error) {
        console.warn('[getAvailableTrainingsForEmployee] ⚠️ Erro ao buscar dados da empresa:', companyId, error);
      }
    }

    // Remover duplicatas de treinamentos (mesmo treinamento pode estar em múltiplas empresas)
    const uniqueTrainings = allTrainings.filter((t, index, self) => 
      index === self.findIndex(tr => tr.id === t.id)
    );

    const trainings = uniqueTrainings;
    const assignments = allAssignments;

    const positionId = employee?.position_id;
    const unitId = employee?.unit_id;

    const assigned: any[] = [];
    const byPosition: any[] = [];
    const publicTrainings: any[] = [];

    // Processar cada treinamento
    for (const training of trainings) {
      // Buscar atribuições relacionadas a este treinamento
      const trainingAssignments = assignments.filter(a => a.training_id === training.id);

      for (const assignment of trainingAssignments) {
        let shouldInclude = false;
        let assignmentType: 'assigned' | 'byPosition' | 'public' | null = null;

        // Verificar se é atribuição pública (deve aparecer de qualquer empresa onde o usuário tem acesso)
        if (assignment.tipo_atribuicao === 'publica') {
          shouldInclude = true;
          assignmentType = 'public';
        }
        // Verificar se é atribuição direta ao funcionário (apenas da empresa do funcionário)
        else if (assignment.employee_id === employeeId && assignment.company_id === employeeCompanyId) {
          shouldInclude = true;
          assignmentType = 'assigned';
        }
        // Verificar se é atribuição por cargo (apenas da empresa do funcionário)
        else if (assignment.position_id === positionId && assignment.company_id === employeeCompanyId) {
          shouldInclude = true;
          assignmentType = 'byPosition';
        }
        // Verificar se é atribuição por departamento (apenas da empresa do funcionário)
        else if (assignment.unit_id === unitId && assignment.company_id === employeeCompanyId) {
          shouldInclude = true;
          assignmentType = 'byPosition';
        }

        if (shouldInclude && assignmentType) {
          // Buscar progresso usando o company_id do treinamento (não o do funcionário)
          // Para treinamentos públicos de outras empresas, precisamos usar o company_id do treinamento
          const trainingCompanyId = training.company_id || employeeCompanyId;
          let progress: TrainingProgressStats | undefined;
          try {
            console.log('[getAvailableTrainingsForEmployee] 🔍 Buscando progresso para treinamento', {
              trainingId: training.id,
              trainingName: training.nome,
              employeeId,
              employeeCompanyId,
              trainingCompanyId,
              assignmentType,
              originalCompanyId: companyId
            });
            
            // Para treinamentos públicos, usar o company_id do treinamento
            // Para treinamentos atribuídos, usar o company_id do funcionário
            const progressCompanyId = assignmentType === 'public' ? trainingCompanyId : employeeCompanyId;
            progress = await this.getProgressStats(progressCompanyId, training.id, employeeId);
            
            console.log('[getAvailableTrainingsForEmployee] ✅ Progresso recebido', {
              trainingId: training.id,
              trainingName: training.nome,
              progress: progress ? {
                progress_percent: progress.progress_percent,
                completed_content: progress.completed_content,
                total_content: progress.total_content,
                isComplete: progress.progress_percent >= 100 || (progress.completed_content > 0 && progress.completed_content === progress.total_content)
              } : 'undefined'
            });
          } catch (err) {
            console.error('[getAvailableTrainingsForEmployee] ❌ Erro ao buscar progresso:', {
              trainingId: training.id,
              trainingName: training.nome,
              error: err
            });
          }

          const trainingData = {
            training,
            assignment,
            progress,
            deadline: assignment.data_limite
          };
          
          console.log('[getAvailableTrainingsForEmployee] 📦 Dados do treinamento preparados', {
            trainingId: training.id,
            trainingName: training.nome,
            assignmentType,
            hasProgress: !!progress,
            progressPercent: progress?.progress_percent,
            completedContent: progress?.completed_content,
            totalContent: progress?.total_content
          });

          if (assignmentType === 'assigned') {
            assigned.push(trainingData);
          } else if (assignmentType === 'byPosition') {
            byPosition.push(trainingData);
          } else if (assignmentType === 'public') {
            publicTrainings.push(trainingData);
          }
        }
      }
    }

    // Remover duplicatas (mesmo treinamento pode aparecer em múltiplas categorias)
    const seenTrainingIds = new Set<string>();
    const uniqueAssigned = assigned.filter(t => {
      if (seenTrainingIds.has(t.training.id)) return false;
      seenTrainingIds.add(t.training.id);
      return true;
    });

    const uniqueByPosition = byPosition.filter(t => {
      if (seenTrainingIds.has(t.training.id)) return false;
      seenTrainingIds.add(t.training.id);
      return true;
    });

    const uniquePublic = publicTrainings.filter(t => {
      if (seenTrainingIds.has(t.training.id)) return false;
      seenTrainingIds.add(t.training.id);
      return true;
    });

    const finalResult = {
      assigned: uniqueAssigned,
      byPosition: uniqueByPosition,
      public: uniquePublic
    };
    
    console.log('[getAvailableTrainingsForEmployee] ✅ RESULTADO FINAL', {
      employeeId,
      employeeCompanyId,
      originalCompanyId: companyId,
      userCompanyIds,
      totalTrainingsFound: trainings.length,
      totalAssignmentsFound: assignments.length,
      totalAssigned: finalResult.assigned.length,
      totalByPosition: finalResult.byPosition.length,
      totalPublic: finalResult.public.length,
      assignedDetails: finalResult.assigned.map(t => ({
        trainingId: t.training.id,
        trainingName: t.training.nome,
        hasProgress: !!t.progress,
        progress: t.progress ? {
          progress_percent: t.progress.progress_percent,
          completed_content: t.progress.completed_content,
          total_content: t.progress.total_content,
          isComplete: t.progress.progress_percent >= 100 || 
                     (t.progress.completed_content > 0 && 
                      t.progress.total_content > 0 && 
                      t.progress.completed_content === t.progress.total_content)
        } : null
      })),
      byPositionDetails: finalResult.byPosition.map(t => ({
        trainingId: t.training.id,
        trainingName: t.training.nome,
        hasProgress: !!t.progress,
        progress: t.progress ? {
          progress_percent: t.progress.progress_percent,
          completed_content: t.progress.completed_content,
          total_content: t.progress.total_content,
          isComplete: t.progress.progress_percent >= 100 || 
                     (t.progress.completed_content > 0 && 
                      t.progress.total_content > 0 && 
                      t.progress.completed_content === t.progress.total_content)
        } : null
      })),
      publicDetails: finalResult.public.map(t => ({
        trainingId: t.training.id,
        trainingName: t.training.nome,
        hasProgress: !!t.progress,
        progress: t.progress ? {
          progress_percent: t.progress.progress_percent,
          completed_content: t.progress.completed_content,
          total_content: t.progress.total_content,
          isComplete: t.progress.progress_percent >= 100 || 
                     (t.progress.completed_content > 0 && 
                      t.progress.total_content > 0 && 
                      t.progress.completed_content === t.progress.total_content)
        } : null
      })),
      timestamp: new Date().toISOString()
    });

    return finalResult;
  }
};



