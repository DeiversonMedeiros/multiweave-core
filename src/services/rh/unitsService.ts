import { supabase } from '@/integrations/supabase/client';
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
  list: async (companyId: string) => {
    const { data, error } = await supabase.rpc('get_units_by_string', {
      company_id_param: companyId
    });

    if (error) {
      console.error('Erro ao buscar departamentos:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Busca um departamento por ID
   */
  getById: async (id: string, companyId: string): Promise<Unit | null> => {
    const { data, error } = await supabase.rpc('get_units_by_string', {
      company_id_param: companyId
    });

    if (error) {
      console.error('Erro ao buscar departamento:', error);
      throw error;
    }

    const unit = data?.find((unit: Unit) => unit.id === id);
    return unit || null;
  },

  /**
   * Cria um novo departamento
   */
  create: async (unit: UnitInsert): Promise<Unit> => {
    const { data, error } = await supabase
      .from('units')
      .insert(unit)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar departamento:', error);
      throw error;
    }

    return data;
  },

  /**
   * Atualiza um departamento
   */
  update: async (id: string, unit: UnitUpdate): Promise<Unit> => {
    const { data, error } = await supabase
      .from('units')
      .update(unit)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar departamento:', error);
      throw error;
    }

    return data;
  },

  /**
   * Remove um departamento
   */
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('units')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao remover departamento:', error);
      throw error;
    }
  }
};