import { supabase } from '@/integrations/supabase/client';
import { 
  Position, 
  PositionInsert, 
  PositionUpdate 
} from '@/integrations/supabase/rh-types';

// =====================================================
// SERVIÇO DE CARGOS
// =====================================================

export const PositionsService = {
  /**
   * Lista todos os cargos de uma empresa
   */
  list: async (companyId: string) => {
    const { data, error } = await supabase.rpc('get_positions_by_string', {
      company_id_param: companyId
    });

    if (error) {
      console.error('Erro ao buscar cargos:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Busca um cargo por ID
   */
  getById: async (id: string, companyId: string): Promise<Position | null> => {
    const { data, error } = await supabase.rpc('get_positions_by_string', {
      company_id_param: companyId
    });

    if (error) {
      console.error('Erro ao buscar cargo:', error);
      throw error;
    }

    const position = data?.find((pos: Position) => pos.id === id);
    return position || null;
  },

  /**
   * Cria um novo cargo
   */
  create: async (position: PositionInsert): Promise<Position> => {
    const { data, error } = await supabase
      .from('positions')
      .insert(position)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar cargo:', error);
      throw error;
    }

    return data;
  },

  /**
   * Atualiza um cargo
   */
  update: async (id: string, position: PositionUpdate): Promise<Position> => {
    const { data, error } = await supabase
      .from('positions')
      .update(position)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar cargo:', error);
      throw error;
    }

    return data;
  },

  /**
   * Remove um cargo
   */
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('positions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao remover cargo:', error);
      throw error;
    }
  }
};