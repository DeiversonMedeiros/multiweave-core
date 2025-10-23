import { EntityService } from '@/services/generic/entityService';
import { EsocialIntegration } from '@/integrations/supabase/rh-types';

export const EsocialIntegrationService = {
  list: async (companyId: string) => {
    try {
      const result = await EntityService.list<EsocialIntegration>({
        schema: 'rh',
        table: 'esocial_integrations',
        companyId: companyId,
        filters: {},
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
      return result.data;
    } catch (error) {
      console.error('Erro ao buscar integrações eSocial:', error);
      throw error;
    }
  },

  getById: async (id: string, companyId: string): Promise<EsocialIntegration | null> => {
    try {
      const result = await EntityService.list<EsocialIntegration>({
        schema: 'rh',
        table: 'esocial_integrations',
        companyId: companyId,
        filters: { id },
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
      return result.data[0] || null;
    } catch (error) {
      console.error('Erro ao buscar integração eSocial:', error);
      throw error;
    }
  },

  create: async (data: Partial<EsocialIntegration>, companyId: string): Promise<EsocialIntegration> => {
    try {
      return await EntityService.create<EsocialIntegration>({
        schema: 'rh',
        table: 'esocial_integrations',
        companyId: companyId,
        data: data
      });
    } catch (error) {
      console.error('Erro ao criar integração eSocial:', error);
      throw error;
    }
  },

  update: async (id: string, data: Partial<EsocialIntegration>, companyId: string): Promise<EsocialIntegration> => {
    try {
      return await EntityService.update<EsocialIntegration>({
        schema: 'rh',
        table: 'esocial_integrations',
        companyId: companyId,
        id: id,
        data: data
      });
    } catch (error) {
      console.error('Erro ao atualizar integração eSocial:', error);
      throw error;
    }
  },

  delete: async (id: string, companyId: string): Promise<void> => {
    try {
      await EntityService.delete({
        schema: 'rh',
        table: 'esocial_integrations',
        companyId: companyId,
        id: id
      });
    } catch (error) {
      console.error('Erro ao remover integração eSocial:', error);
      throw error;
    }
  }
};

