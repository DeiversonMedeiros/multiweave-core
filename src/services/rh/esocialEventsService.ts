import { EntityService } from '@/services/generic/entityService';
import { ESocialEvent } from '@/integrations/supabase/rh-types';

// =====================================================
// SERVIÇO DE EVENTOS eSOCIAL
// =====================================================

export const EsocialEventsService = {
  /**
   * Lista todos os eventos eSocial de uma empresa
   */
  list: async (companyId: string) => {
    try {
      const result = await EntityService.list<ESocialEvent>({
        schema: 'rh',
        table: 'esocial_events',
        companyId: companyId,
        filters: {},
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
      return result.data;
    } catch (error) {
      console.error('Erro ao buscar eventos eSocial:', error);
      throw error;
    }
  },

  /**
   * Busca um evento eSocial por ID
   */
  getById: async (id: string, companyId: string): Promise<ESocialEvent | null> => {
    try {
      const result = await EntityService.list<ESocialEvent>({
        schema: 'rh',
        table: 'esocial_events',
        companyId: companyId,
        filters: { id },
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
      return result.data[0] || null;
    } catch (error) {
      console.error('Erro ao buscar evento eSocial:', error);
      throw error;
    }
  },

  /**
   * Cria um novo evento eSocial
   */
  create: async (data: Partial<ESocialEvent>, companyId: string): Promise<ESocialEvent> => {
    try {
      return await EntityService.create<ESocialEvent>({
        schema: 'rh',
        table: 'esocial_events',
        companyId: companyId,
        data: data
      });
    } catch (error) {
      console.error('Erro ao criar evento eSocial:', error);
      throw error;
    }
  },

  /**
   * Atualiza um evento eSocial
   */
  update: async (id: string, data: Partial<ESocialEvent>, companyId: string): Promise<ESocialEvent> => {
    try {
      return await EntityService.update<ESocialEvent>({
        schema: 'rh',
        table: 'esocial_events',
        companyId: companyId,
        id: id,
        data: data
      });
    } catch (error) {
      console.error('Erro ao atualizar evento eSocial:', error);
      throw error;
    }
  },

  /**
   * Remove um evento eSocial
   */
  delete: async (id: string, companyId: string): Promise<void> => {
    try {
      await EntityService.delete({
        schema: 'rh',
        table: 'esocial_events',
        companyId: companyId,
        id: id
      });
    } catch (error) {
      console.error('Erro ao remover evento eSocial:', error);
      throw error;
    }
  },

  /**
   * Envia evento para eSocial
   */
  sendToEsocial: async (id: string, companyId: string): Promise<ESocialEvent> => {
    try {
      return await EntityService.update<ESocialEvent>({
        schema: 'rh',
        table: 'esocial_events',
        companyId: companyId,
        id: id,
        data: {
          status: 'enviado',
          data_envio: new Date().toISOString(),
          tentativas_envio: 1
        }
      });
    } catch (error) {
      console.error('Erro ao enviar evento para eSocial:', error);
      throw error;
    }
  }
};
