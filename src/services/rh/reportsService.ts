import { EntityService } from '@/services/generic/entityService';
import { Report } from '@/integrations/supabase/rh-types';

// =====================================================
// SERVIÇO DE RELATÓRIOS
// =====================================================

export const ReportsService = {
  /**
   * Lista todos os relatórios de uma empresa
   */
  list: async (companyId: string) => {
    try {
      const result = await EntityService.list<Report>({
        schema: 'rh',
        table: 'reports',
        companyId: companyId,
        filters: {},
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
      return result.data;
    } catch (error) {
      console.error('Erro ao buscar relatórios:', error);
      throw error;
    }
  },

  /**
   * Busca um relatório por ID
   */
  getById: async (id: string, companyId: string): Promise<Report | null> => {
    try {
      const result = await EntityService.list<Report>({
        schema: 'rh',
        table: 'reports',
        companyId: companyId,
        filters: { id },
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
      return result.data[0] || null;
    } catch (error) {
      console.error('Erro ao buscar relatório:', error);
      throw error;
    }
  },

  /**
   * Cria um novo relatório
   */
  create: async (data: Partial<Report>, companyId: string): Promise<Report> => {
    try {
      return await EntityService.create<Report>({
        schema: 'rh',
        table: 'reports',
        companyId: companyId,
        data: data
      });
    } catch (error) {
      console.error('Erro ao criar relatório:', error);
      throw error;
    }
  },

  /**
   * Atualiza um relatório
   */
  update: async (id: string, data: Partial<Report>, companyId: string): Promise<Report> => {
    try {
      return await EntityService.update<Report>({
        schema: 'rh',
        table: 'reports',
        companyId: companyId,
        id: id,
        data: data
      });
    } catch (error) {
      console.error('Erro ao atualizar relatório:', error);
      throw error;
    }
  },

  /**
   * Remove um relatório
   */
  delete: async (id: string, companyId: string): Promise<void> => {
    try {
      await EntityService.delete({
        schema: 'rh',
        table: 'reports',
        companyId: companyId,
        id: id
      });
    } catch (error) {
      console.error('Erro ao remover relatório:', error);
      throw error;
    }
  },

  /**
   * Gera um relatório
   */
  generate: async (id: string, companyId: string): Promise<Report> => {
    try {
      return await EntityService.update<Report>({
        schema: 'rh',
        table: 'reports',
        companyId: companyId,
        id: id,
        data: {
          status: 'processando',
          data_geracao: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      throw error;
    }
  }
};
