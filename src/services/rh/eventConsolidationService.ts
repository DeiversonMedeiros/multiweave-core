import { EntityService } from '@/services/generic/entityService';
import { EventConsolidation } from '@/integrations/supabase/rh-types';

export const EventConsolidationService = {
  list: async (companyId: string) => {
    try {
      const result = await EntityService.list<EventConsolidation>({
        schema: 'rh',
        table: 'event_consolidations',
        companyId: companyId,
        filters: {},
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
      return result.data;
    } catch (error) {
      console.error('Erro ao buscar consolidações de eventos:', error);
      throw error;
    }
  },

  getById: async (id: string, companyId: string): Promise<EventConsolidation | null> => {
    try {
      const result = await EntityService.list<EventConsolidation>({
        schema: 'rh',
        table: 'event_consolidations',
        companyId: companyId,
        filters: { id },
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
      return result.data[0] || null;
    } catch (error) {
      console.error('Erro ao buscar consolidação de eventos:', error);
      throw error;
    }
  },

  create: async (data: Partial<EventConsolidation>, companyId: string): Promise<EventConsolidation> => {
    try {
      return await EntityService.create<EventConsolidation>({
        schema: 'rh',
        table: 'event_consolidations',
        companyId: companyId,
        data: data
      });
    } catch (error) {
      console.error('Erro ao criar consolidação de eventos:', error);
      throw error;
    }
  },

  update: async (id: string, data: Partial<EventConsolidation>, companyId: string): Promise<EventConsolidation> => {
    try {
      return await EntityService.update<EventConsolidation>({
        schema: 'rh',
        table: 'event_consolidations',
        companyId: companyId,
        id: id,
        data: data
      });
    } catch (error) {
      console.error('Erro ao atualizar consolidação de eventos:', error);
      throw error;
    }
  },

  delete: async (id: string, companyId: string): Promise<void> => {
    try {
      await EntityService.delete({
        schema: 'rh',
        table: 'event_consolidations',
        companyId: companyId,
        id: id
      });
    } catch (error) {
      console.error('Erro ao remover consolidação de eventos:', error);
      throw error;
    }
  }
};

