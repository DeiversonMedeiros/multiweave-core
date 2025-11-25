import { EntityService } from '@/services/generic/entityService';
import { 
  BankHoursType, 
  BankHoursTypeForm,
  BankHoursTypeSummary
} from '@/integrations/supabase/bank-hours-types-v2';

// =====================================================
// SERVIÇO DE TIPOS DE BANCO DE HORAS
// =====================================================

export const BankHoursTypesService = {
  /**
   * Lista todos os tipos de banco de horas de uma empresa
   */
  list: async (companyId: string) => {
    try {
      const result = await EntityService.list<BankHoursType>({
        schema: 'rh',
        table: 'bank_hours_types',
        companyId,
        orderBy: 'name',
        orderDirection: 'ASC'
      });

      return result.data;
    } catch (error) {
      console.error('❌ Erro ao buscar tipos de banco de horas:', error);
      return [];
    }
  },

  /**
   * Busca um tipo por ID
   */
  getById: async (id: string, companyId: string): Promise<BankHoursType | null> => {
    return await EntityService.getById<BankHoursType>('rh', 'bank_hours_types', id, companyId);
  },

  /**
   * Cria um novo tipo de banco de horas
   */
  create: async (type: BankHoursTypeForm, companyId: string): Promise<BankHoursType> => {
    return await EntityService.create<BankHoursType>({
      schema: 'rh',
      table: 'bank_hours_types',
      companyId,
      data: type
    });
  },

  /**
   * Atualiza um tipo de banco de horas
   */
  update: async (id: string, type: Partial<BankHoursTypeForm>, companyId: string): Promise<BankHoursType> => {
    return await EntityService.update<BankHoursType>({
      schema: 'rh',
      table: 'bank_hours_types',
      companyId,
      id,
      data: type
    });
  },

  /**
   * Remove um tipo de banco de horas
   */
  delete: async (id: string, companyId: string): Promise<void> => {
    return await EntityService.delete({
      schema: 'rh',
      table: 'bank_hours_types',
      companyId,
      id
    });
  },

  /**
   * Define um tipo como padrão
   */
  setAsDefault: async (id: string, companyId: string): Promise<BankHoursType> => {
    // Primeiro, buscar e desmarcar todos os outros como padrão
    const existingDefaultTypes = await EntityService.list<BankHoursType>({
      schema: 'rh',
      table: 'bank_hours_types',
      companyId,
      filters: { is_default: true }
    });

    // Desmarcar tipos existentes como padrão
    for (const existingType of existingDefaultTypes.data) {
      if (existingType.id !== id) {
        await EntityService.update({
          schema: 'rh',
          table: 'bank_hours_types',
          companyId,
          id: existingType.id,
          data: { is_default: false }
        });
      }
    }

    // Depois, marcar o selecionado como padrão
    return await EntityService.update<BankHoursType>({
      schema: 'rh',
      table: 'bank_hours_types',
      companyId,
      id,
      data: { is_default: true }
    });
  },

  /**
   * Busca tipos ativos
   */
  getActive: async (companyId: string): Promise<BankHoursType[]> => {
    const result = await EntityService.list<BankHoursType>({
      schema: 'rh',
      table: 'bank_hours_types',
      companyId,
      filters: { is_active: true },
      orderBy: 'name',
      orderDirection: 'ASC'
    });

    return result.data;
  },

  /**
   * Busca o tipo padrão da empresa
   */
  getDefault: async (companyId: string): Promise<BankHoursType | null> => {
    const result = await EntityService.list<BankHoursType>({
      schema: 'rh',
      table: 'bank_hours_types',
      companyId,
      filters: { is_default: true, is_active: true }
    });

    return result.data.length > 0 ? result.data[0] : null;
  },

  /**
   * Busca resumo dos tipos com contagem de funcionários
   */
  getSummary: async (companyId: string): Promise<BankHoursTypeSummary[]> => {
    try {
      // Esta função precisaria de uma query mais complexa
      // Por enquanto, retornamos os tipos básicos
      const types = await BankHoursTypesService.list(companyId);
      
      // TODO: Implementar contagem de funcionários por tipo
      return types.map(type => ({
        id: type.id,
        name: type.name,
        code: type.code,
        employees_count: 0, // Será implementado com query específica
        is_default: type.is_default,
        is_active: type.is_active,
        created_at: type.created_at
      }));
    } catch (error) {
      console.error('❌ Erro ao buscar resumo dos tipos:', error);
      return [];
    }
  }
};
