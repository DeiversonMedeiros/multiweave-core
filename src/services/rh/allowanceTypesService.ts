import { EntityService } from '@/services/generic/entityService';
import { AllowanceType } from '@/integrations/supabase/rh-types';

export const AllowanceTypesService = {
  list: async (companyId: string) => {
    try {
      const result = await EntityService.list<AllowanceType>({
        schema: 'rh',
        table: 'allowance_types',
        companyId: companyId,
        filters: {},
        orderBy: 'nome',
        orderDirection: 'ASC'
      });
      return result.data;
    } catch (error) {
      console.error('Erro ao buscar tipos de adicionais:', error);
      throw error;
    }
  },

  getById: async (id: string, companyId: string): Promise<AllowanceType | null> => {
    try {
      const result = await EntityService.list<AllowanceType>({
        schema: 'rh',
        table: 'allowance_types',
        companyId: companyId,
        filters: { id },
        orderBy: 'nome',
        orderDirection: 'ASC'
      });
      return result.data[0] || null;
    } catch (error) {
      console.error('Erro ao buscar tipo de adicional:', error);
      throw error;
    }
  },

  create: async (data: Partial<AllowanceType>, companyId: string): Promise<AllowanceType> => {
    try {
      return await EntityService.create<AllowanceType>({
        schema: 'rh',
        table: 'allowance_types',
        companyId: companyId,
        data: data
      });
    } catch (error) {
      console.error('Erro ao criar tipo de adicional:', error);
      throw error;
    }
  },

  update: async (id: string, data: Partial<AllowanceType>, companyId: string): Promise<AllowanceType> => {
    try {
      return await EntityService.update<AllowanceType>({
        schema: 'rh',
        table: 'allowance_types',
        companyId: companyId,
        id: id,
        data: data
      });
    } catch (error) {
      console.error('Erro ao atualizar tipo de adicional:', error);
      throw error;
    }
  },

  delete: async (id: string, companyId: string): Promise<void> => {
    try {
      await EntityService.delete({
        schema: 'rh',
        table: 'allowance_types',
        companyId: companyId,
        id: id
      });
    } catch (error) {
      console.error('Erro ao remover tipo de adicional:', error);
      throw error;
    }
  }
};

