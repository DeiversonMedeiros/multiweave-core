import { EntityService } from '@/services/generic/entityService';
import { CompensationRequest } from '@/integrations/supabase/rh-types';
import { CompensationValidationService } from './compensationValidationService';
import { NotificationService } from './notificationService';

// =====================================================
// SERVIÇO DE SOLICITAÇÕES DE COMPENSAÇÃO
// =====================================================

export const CompensationRequestsService = {
  /**
   * Lista todas as solicitações de compensação de uma empresa
   */
  list: async (companyId: string) => {
    try {
      const result = await EntityService.list<CompensationRequest>({
        schema: 'rh',
        table: 'compensation_requests',
        companyId: companyId,
        filters: {},
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
      return result.data;
    } catch (error) {
      console.error('Erro ao buscar solicitações de compensação:', error);
      throw error;
    }
  },

  /**
   * Busca uma solicitação de compensação por ID
   */
  getById: async (id: string, companyId: string): Promise<CompensationRequest | null> => {
    try {
      const result = await EntityService.list<CompensationRequest>({
        schema: 'rh',
        table: 'compensation_requests',
        companyId: companyId,
        filters: { id },
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
      return result.data[0] || null;
    } catch (error) {
      console.error('Erro ao buscar solicitação de compensação:', error);
      throw error;
    }
  },

  /**
   * Cria uma nova solicitação de compensação com validação
   */
  create: async (data: Partial<CompensationRequest>, companyId: string): Promise<CompensationRequest> => {
    try {
      // Validar dados antes de criar
      if (data.employee_id && data.quantidade_horas && data.data_inicio) {
        const validation = await CompensationValidationService.validateCompensationRequest(
          data.employee_id,
          companyId,
          data.quantidade_horas,
          data.data_inicio,
          data.tipo || 'banco_horas'
        );

        if (!validation.isValid) {
          throw new Error(validation.error || 'Validação falhou');
        }
      }

      const result = await EntityService.create<CompensationRequest>({
        schema: 'rh',
        table: 'compensation_requests',
        companyId: companyId,
        data: {
          ...data,
          status: data.status || 'pendente'
        }
      });

      // Enviar notificação para gestores
      if (result.data) {
        await NotificationService.notifyNewCompensationRequest(
          data.employee_id!,
          companyId,
          result.data
        );
      }

      return result.data;
    } catch (error) {
      console.error('Erro ao criar solicitação de compensação:', error);
      throw error;
    }
  },

  /**
   * Atualiza uma solicitação de compensação
   */
  update: async (id: string, data: Partial<CompensationRequest>, companyId: string): Promise<CompensationRequest> => {
    try {
      return await EntityService.update<CompensationRequest>({
        schema: 'rh',
        table: 'compensation_requests',
        companyId: companyId,
        id: id,
        data: data
      });
    } catch (error) {
      console.error('Erro ao atualizar solicitação de compensação:', error);
      throw error;
    }
  },

  /**
   * Remove uma solicitação de compensação
   */
  delete: async (id: string, companyId: string): Promise<void> => {
    try {
      await EntityService.delete({
        schema: 'rh',
        table: 'compensation_requests',
        companyId: companyId,
        id: id
      });
    } catch (error) {
      console.error('Erro ao remover solicitação de compensação:', error);
      throw error;
    }
  },

  /**
   * Aprova uma solicitação de compensação
   */
  approve: async (id: string, companyId: string, aprovadoPor: string, observacoes?: string): Promise<CompensationRequest> => {
    try {
      // Buscar dados da solicitação antes de aprovar
      const request = await CompensationRequestsService.getById(id, companyId);
      if (!request) {
        throw new Error('Solicitação não encontrada');
      }

      const result = await EntityService.update<CompensationRequest>({
        schema: 'rh',
        table: 'compensation_requests',
        companyId: companyId,
        id: id,
        data: {
          status: 'aprovado',
          aprovado_por: aprovadoPor,
          data_aprovacao: new Date().toISOString(),
          observacoes: observacoes
        }
      });

      // Enviar notificação para o funcionário
      if (result.data) {
        await NotificationService.notifyCompensationApproved(
          request.employee_id,
          companyId,
          result.data
        );
      }

      return result.data;
    } catch (error) {
      console.error('Erro ao aprovar solicitação de compensação:', error);
      throw error;
    }
  },

  /**
   * Rejeita uma solicitação de compensação
   */
  reject: async (id: string, companyId: string, motivoRejeicao: string, aprovadoPor: string): Promise<CompensationRequest> => {
    try {
      // Buscar dados da solicitação antes de rejeitar
      const request = await CompensationRequestsService.getById(id, companyId);
      if (!request) {
        throw new Error('Solicitação não encontrada');
      }

      const result = await EntityService.update<CompensationRequest>({
        schema: 'rh',
        table: 'compensation_requests',
        companyId: companyId,
        id: id,
        data: {
          status: 'rejeitado',
          motivo_rejeicao: motivoRejeicao,
          aprovado_por: aprovadoPor,
          data_aprovacao: new Date().toISOString()
        }
      });

      // Enviar notificação para o funcionário
      if (result.data) {
        await NotificationService.notifyCompensationRejected(
          request.employee_id,
          companyId,
          result.data,
          motivoRejeicao
        );
      }

      return result.data;
    } catch (error) {
      console.error('Erro ao rejeitar solicitação de compensação:', error);
      throw error;
    }
  },

  /**
   * Marca uma compensação como realizada
   */
  markAsRealized: async (id: string, companyId: string): Promise<CompensationRequest> => {
    try {
      const request = await CompensationRequestsService.getById(id, companyId);
      if (!request) {
        throw new Error('Solicitação não encontrada');
      }

      if (request.status !== 'aprovado') {
        throw new Error('Apenas solicitações aprovadas podem ser marcadas como realizadas');
      }

      const updatedRequest = await EntityService.update<CompensationRequest>({
        schema: 'rh',
        table: 'compensation_requests',
        companyId: companyId,
        id: id,
        data: {
          status: 'realizado'
        }
      });

      return updatedRequest.data;
    } catch (error) {
      console.error('Erro ao marcar compensação como realizada:', error);
      throw error;
    }
  },

  /**
   * Valida uma solicitação de compensação
   */
  validate: async (data: Partial<CompensationRequest>, companyId: string) => {
    if (!data.employee_id || !data.quantidade_horas || !data.data_inicio) {
      return {
        isValid: false,
        error: 'Dados obrigatórios não fornecidos'
      };
    }

    return await CompensationValidationService.validateCompensationRequest(
      data.employee_id,
      companyId,
      data.quantidade_horas,
      data.data_inicio,
      data.tipo || 'banco_horas'
    );
  }
};
