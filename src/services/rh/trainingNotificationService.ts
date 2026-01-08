import { callSchemaFunction } from '@/services/generic/entityService';
import { EntityService } from '@/services/generic/entityService';

// =====================================================
// SERVIÇO DE NOTIFICAÇÕES DE TREINAMENTOS
// =====================================================

export interface TrainingNotificationResult {
  success: boolean;
  notifications_created: number;
  overdue_count?: number;
  message: string;
}

export interface TrainingFileHistory {
  content_id: string;
  content_title: string;
  file_path: string;
  file_url: string;
  file_type: string;
  uploaded_at: string;
  updated_at: string;
}

// Cache para verificar se as funções estão disponíveis
let functionsAvailable: { create?: boolean; check?: boolean } = {};

export const TrainingNotificationService = {
  /**
   * Criar notificações para treinamentos obrigatórios
   */
  async createTrainingNotifications(companyId: string): Promise<TrainingNotificationResult> {
    // Se já sabemos que a função não existe, retornar sem tentar
    if (functionsAvailable.create === false) {
      return {
        success: true,
        notifications_created: 0,
        message: 'Função não disponível - migração não aplicada'
      };
    }

    try {
      const result = await callSchemaFunction<TrainingNotificationResult>(
        'rh',
        'create_training_notifications',
        {
          p_company_id: companyId
        }
      );

      functionsAvailable.create = true;
      return result || {
        success: false,
        notifications_created: 0,
        message: 'Erro ao criar notificações'
      };
    } catch (err: any) {
      // Se a função não existir, marcar como não disponível e retornar silenciosamente
      if (err?.message?.includes('does not exist')) {
        functionsAvailable.create = false;
        return {
          success: true,
          notifications_created: 0,
          message: 'Função não disponível - migração não aplicada'
        };
      }
      throw err;
    }
  },

  /**
   * Verificar e criar notificações para treinamentos vencidos
   */
  async checkOverdueTrainings(companyId: string): Promise<TrainingNotificationResult> {
    // Se já sabemos que a função não existe, retornar sem tentar
    if (functionsAvailable.check === false) {
      return {
        success: true,
        notifications_created: 0,
        overdue_count: 0,
        message: 'Função não disponível - migração não aplicada'
      };
    }

    try {
      const result = await callSchemaFunction<TrainingNotificationResult>(
        'rh',
        'check_overdue_trainings',
        {
          p_company_id: companyId
        }
      );

      functionsAvailable.check = true;
      return result || {
        success: false,
        notifications_created: 0,
        overdue_count: 0,
        message: 'Erro ao verificar treinamentos vencidos'
      };
    } catch (err: any) {
      // Se a função não existir, marcar como não disponível e retornar silenciosamente
      if (err?.message?.includes('does not exist')) {
        functionsAvailable.check = false;
        return {
          success: true,
          notifications_created: 0,
          overdue_count: 0,
          message: 'Função não disponível - migração não aplicada'
        };
      }
      throw err;
    }
  },

  /**
   * Obter histórico de arquivos de treinamento
   */
  async getFileHistory(
    companyId: string,
    trainingId?: string,
    contentId?: string
  ): Promise<{ files: TrainingFileHistory[]; count: number }> {
    const result = await callSchemaFunction<{
      success: boolean;
      files: TrainingFileHistory[];
      count: number;
    }>(
      'rh',
      'get_training_file_history',
      {
        p_company_id: companyId,
        p_training_id: trainingId || null,
        p_content_id: contentId || null
      }
    );

    return result || {
      files: [],
      count: 0
    };
  }
};



