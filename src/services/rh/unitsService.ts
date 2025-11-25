import { EntityService } from '@/services/generic/entityService';
import { 
  Unit, 
  UnitInsert, 
  UnitUpdate 
} from '@/integrations/supabase/rh-types';

// =====================================================
// SERVIÇO DE DEPARTAMENTOS
// =====================================================

export const UnitsService = {
  /**
   * Lista todos os departamentos de uma empresa
   */
  list: async (companyId: string): Promise<Unit[]> => {
    const result = await EntityService.list<Unit>({
      schema: 'rh',
      table: 'units',
      companyId: companyId,
      filters: {},
      page: 1,
      pageSize: 1000
    });

    return result.data || [];
  },

  /**
   * Busca um departamento por ID
   */
  getById: async (id: string, companyId: string): Promise<Unit | null> => {
    const result = await EntityService.list<Unit>({
      schema: 'rh',
      table: 'units',
      companyId: companyId,
      filters: { id },
      page: 1,
      pageSize: 1
    });

    return result.data?.[0] || null;
  },

  /**
   * Busca departamentos ativos
   */
  getActive: async (companyId: string): Promise<Unit[]> => {
    const result = await EntityService.list<Unit>({
      schema: 'rh',
      table: 'units',
      companyId: companyId,
      filters: { is_active: true },
      page: 1,
      pageSize: 1000
    });

    return result.data || [];
  },

  /**
   * Cria um novo departamento
   */
  create: async (unit: UnitInsert): Promise<Unit> => {
    if (!unit.company_id) {
      throw new Error('company_id é obrigatório');
    }

    const result = await EntityService.create<Unit>({
      schema: 'rh',
      table: 'units',
      companyId: unit.company_id,
      data: unit
    });

    return result;
  },

  /**
   * Atualiza um departamento
   */
  update: async (id: string, unit: UnitUpdate): Promise<Unit> => {
    if (!unit.company_id) {
      throw new Error('company_id é obrigatório');
    }

    const result = await EntityService.update<Unit>({
      schema: 'rh',
      table: 'units',
      companyId: unit.company_id,
      id: id,
      data: unit
    });

    return result;
  },

  /**
   * Remove um departamento
   */
  delete: async (id: string, companyId: string): Promise<void> => {
    if (!companyId) {
      throw new Error('company_id é obrigatório para deletar');
    }

    await EntityService.delete({
      schema: 'rh',
      table: 'units',
      companyId: companyId,
      id: id
    });
  },

  /**
   * Ativa/desativa um departamento
   */
  toggleStatus: async (id: string, isActive: boolean, companyId: string): Promise<Unit> => {
    if (!companyId) {
      throw new Error('company_id é obrigatório');
    }

    const unit = await UnitsService.getById(id, companyId);
    if (!unit) {
      throw new Error('Departamento não encontrado');
    }

    return await UnitsService.update(id, {
      ...unit,
      is_active: isActive
    });
  }
};