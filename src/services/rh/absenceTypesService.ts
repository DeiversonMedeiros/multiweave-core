import { EntityService } from '@/services/generic/entityService';
import { AbsenceType } from '@/integrations/supabase/rh-types';

// =====================================================
// SERVIÇO DE TIPOS DE AFASTAMENTO
// =====================================================

export const AbsenceTypesService = {
  list: async (companyId: string) => {
    try {
      const result = await EntityService.list<AbsenceType>({
        schema: 'rh',
        table: 'absence_types',
        companyId: companyId,
        filters: {},
        orderBy: 'nome',
        orderDirection: 'ASC'
      });
      return result.data;
    } catch (error) {
      console.error('Erro ao buscar tipos de afastamento:', error);
      throw error;
    }
  },

  getById: async (id: string, companyId: string): Promise<AbsenceType | null> => {
    try {
      const result = await EntityService.list<AbsenceType>({
        schema: 'rh',
        table: 'absence_types',
        companyId: companyId,
        filters: { id },
        orderBy: 'nome',
        orderDirection: 'ASC'
      });
      return result.data[0] || null;
    } catch (error) {
      console.error('Erro ao buscar tipo de afastamento:', error);
      throw error;
    }
  },

  create: async (data: Partial<AbsenceType>, companyId: string): Promise<AbsenceType> => {
    try {
      return await EntityService.create<AbsenceType>({
        schema: 'rh',
        table: 'absence_types',
        companyId: companyId,
        data: data
      });
    } catch (error) {
      console.error('Erro ao criar tipo de afastamento:', error);
      throw error;
    }
  },

  update: async (id: string, data: Partial<AbsenceType>, companyId: string): Promise<AbsenceType> => {
    try {
      return await EntityService.update<AbsenceType>({
        schema: 'rh',
        table: 'absence_types',
        companyId: companyId,
        id: id,
        data: data
      });
    } catch (error) {
      console.error('Erro ao atualizar tipo de afastamento:', error);
      throw error;
    }
  },

  delete: async (id: string, companyId: string): Promise<void> => {
    try {
      await EntityService.delete({
        schema: 'rh',
        table: 'absence_types',
        companyId: companyId,
        id: id
      });
    } catch (error) {
      console.error('Erro ao remover tipo de afastamento:', error);
      throw error;
    }
  }
};

