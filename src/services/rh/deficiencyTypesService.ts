import { EntityService } from '@/services/generic/entityService';
import { DeficiencyType } from '@/integrations/supabase/rh-types';

export const DeficiencyTypesService = {
  list: async (companyId: string) => {
    try {
      const result = await EntityService.list<DeficiencyType>({
        schema: 'rh',
        table: 'deficiency_types',
        companyId: companyId,
        filters: {},
        orderBy: 'nome',
        orderDirection: 'ASC'
      });
      return result.data;
    } catch (error) {
      console.error('Erro ao buscar tipos de deficiência:', error);
      throw error;
    }
  },

  getById: async (id: string, companyId: string): Promise<DeficiencyType | null> => {
    try {
      const result = await EntityService.list<DeficiencyType>({
        schema: 'rh',
        table: 'deficiency_types',
        companyId: companyId,
        filters: { id },
        orderBy: 'nome',
        orderDirection: 'ASC'
      });
      return result.data[0] || null;
    } catch (error) {
      console.error('Erro ao buscar tipo de deficiência:', error);
      throw error;
    }
  },

  create: async (data: Partial<DeficiencyType>, companyId: string): Promise<DeficiencyType> => {
    try {
      return await EntityService.create<DeficiencyType>({
        schema: 'rh',
        table: 'deficiency_types',
        companyId: companyId,
        data: data
      });
    } catch (error) {
      console.error('Erro ao criar tipo de deficiência:', error);
      throw error;
    }
  },

  update: async (id: string, data: Partial<DeficiencyType>, companyId: string): Promise<DeficiencyType> => {
    try {
      return await EntityService.update<DeficiencyType>({
        schema: 'rh',
        table: 'deficiency_types',
        companyId: companyId,
        id: id,
        data: data
      });
    } catch (error) {
      console.error('Erro ao atualizar tipo de deficiência:', error);
      throw error;
    }
  },

  delete: async (id: string, companyId: string): Promise<void> => {
    try {
      await EntityService.delete({
        schema: 'rh',
        table: 'deficiency_types',
        companyId: companyId,
        id: id
      });
    } catch (error) {
      console.error('Erro ao remover tipo de deficiência:', error);
      throw error;
    }
  }
};

