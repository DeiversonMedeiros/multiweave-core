import { EntityService } from '@/services/generic/entityService';
import { DelayReason } from '@/integrations/supabase/rh-types';

// =====================================================
// SERVIÇO DE MOTIVOS DE ATRASO
// =====================================================

export const DelayReasonsService = {
  /**
   * Lista todos os motivos de atraso de uma empresa
   */
  list: async (companyId: string) => {
    try {
      const result = await EntityService.list<DelayReason>({
        schema: 'rh',
        table: 'delay_reasons',
        companyId: companyId,
        filters: {},
        orderBy: 'nome',
        orderDirection: 'ASC'
      });
      return result.data;
    } catch (error) {
      console.error('Erro ao buscar motivos de atraso:', error);
      throw error;
    }
  },

  /**
   * Busca um motivo de atraso por ID
   */
  getById: async (id: string, companyId: string): Promise<DelayReason | null> => {
    try {
      const result = await EntityService.list<DelayReason>({
        schema: 'rh',
        table: 'delay_reasons',
        companyId: companyId,
        filters: { id },
        orderBy: 'nome',
        orderDirection: 'ASC'
      });
      return result.data[0] || null;
    } catch (error) {
      console.error('Erro ao buscar motivo de atraso:', error);
      throw error;
    }
  },

  /**
   * Cria um novo motivo de atraso
   */
  create: async (data: Partial<DelayReason>, companyId: string): Promise<DelayReason> => {
    try {
      return await EntityService.create<DelayReason>({
        schema: 'rh',
        table: 'delay_reasons',
        companyId: companyId,
        data: data
      });
    } catch (error) {
      console.error('Erro ao criar motivo de atraso:', error);
      throw error;
    }
  },

  /**
   * Atualiza um motivo de atraso
   */
  update: async (id: string, data: Partial<DelayReason>, companyId: string): Promise<DelayReason> => {
    try {
      return await EntityService.update<DelayReason>({
        schema: 'rh',
        table: 'delay_reasons',
        companyId: companyId,
        id: id,
        data: data
      });
    } catch (error) {
      console.error('Erro ao atualizar motivo de atraso:', error);
      throw error;
    }
  },

  /**
   * Remove um motivo de atraso
   */
  delete: async (id: string, companyId: string): Promise<void> => {
    try {
      await EntityService.delete({
        schema: 'rh',
        table: 'delay_reasons',
        companyId: companyId,
        id: id
      });
    } catch (error) {
      console.error('Erro ao remover motivo de atraso:', error);
      throw error;
    }
  }
};

