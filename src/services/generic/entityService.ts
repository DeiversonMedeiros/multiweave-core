import { supabase } from '@/integrations/supabase/client';

// =====================================================
// SERVIÇO GENÉRICO PARA ACESSO A QUALQUER ENTIDADE
// =====================================================

export interface EntityFilters {
  search?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  [key: string]: any;
}

export interface EntityListParams {
  schema: string;
  table: string;
  companyId: string;
  filters?: EntityFilters;
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface EntityListResult<T = any> {
  data: T[];
  totalCount: number;
  hasMore: boolean;
}

export const EntityService = {
  /**
   * Lista dados de qualquer entidade usando a função genérica
   */
  list: async <T = any>(params: EntityListParams): Promise<EntityListResult<T>> => {
    const {
      schema,
      table,
      companyId,
      filters = {},
      page = 1,
      pageSize = 100,
      orderBy = 'created_at',
      orderDirection = 'DESC'
    } = params;

    const offset = (page - 1) * pageSize;

    const { data, error } = await supabase.rpc('get_entity_data_simple', {
      schema_name: schema,
      table_name: table,
      company_id_param: companyId,
      filters: filters,
      limit_param: pageSize,
      offset_param: offset,
      order_by: orderBy,
      order_direction: orderDirection
    });

    if (error) {
      console.error(`Erro ao buscar dados de ${schema}.${table}:`, error);
      throw error;
    }

    const result = data || [];
    const totalCount = result.length > 0 ? (result[0].total_count || 0) : 0;
    const hasMore = offset + pageSize < totalCount;

    return {
      data: result.map((item: any) => item.data) as T[],
      totalCount,
      hasMore
    };
  },

  /**
   * Busca um item específico por ID
   */
  getById: async <T = any>(
    schema: string,
    table: string,
    id: string,
    companyId: string
  ): Promise<T | null> => {
    const result = await EntityService.list<T>({
      schema,
      table,
      companyId,
      filters: { id }
    });

    return result.data.length > 0 ? result.data[0] : null;
  },

  /**
   * Cria um novo item
   */
  create: async <T = any>(params: {
    schema: string;
    table: string;
    companyId: string;
    data: Partial<T>;
  }): Promise<T> => {
    const { schema, table, companyId, data } = params;
    
    // Para schemas que não sejam 'public', usar RPC function
    if (schema !== 'public') {
      const { data: result, error } = await supabase.rpc('create_entity_data', {
        schema_name: schema,
        table_name: table,
        company_id_param: companyId,
        data_param: data
      });

      if (error) {
        console.error(`Erro ao criar item em ${schema}.${table}:`, error);
        throw error;
      }

      return result;
    }

    // Para schema 'public', usar acesso direto
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error(`Erro ao criar item em ${schema}.${table}:`, error);
      throw error;
    }

    return result;
  },

  /**
   * Atualiza um item existente
   */
  update: async <T = any>(params: {
    schema: string;
    table: string;
    companyId: string;
    id: string;
    data: Partial<T>;
  }): Promise<T> => {
    const { schema, table, companyId, id, data } = params;
    
    // Para schemas que não sejam 'public', usar RPC function
    if (schema !== 'public') {
      const { data: result, error } = await supabase.rpc('update_entity_data', {
        schema_name: schema,
        table_name: table,
        company_id_param: companyId,
        id_param: id,
        data_param: data
      });

      if (error) {
        console.error(`Erro ao atualizar item em ${schema}.${table}:`, error);
        throw error;
      }

      return result;
    }

    // Para schema 'public', usar acesso direto
    const { data: result, error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Erro ao atualizar item em ${schema}.${table}:`, error);
      throw error;
    }

    return result;
  },

  /**
   * Remove um item
   */
  delete: async (params: {
    schema: string;
    table: string;
    companyId: string;
    id: string;
  }): Promise<void> => {
    const { schema, table, companyId, id } = params;
    
    // Para schemas que não sejam 'public', usar RPC function
    if (schema !== 'public') {
      const { error } = await supabase.rpc('delete_entity_data', {
        schema_name: schema,
        table_name: table,
        company_id_param: companyId,
        id_param: id
      });

      if (error) {
        console.error(`Erro ao remover item de ${schema}.${table}:`, error);
        throw error;
      }
      return;
    }

    // Para schema 'public', usar acesso direto
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Erro ao remover item de ${schema}.${table}:`, error);
      throw error;
    }
  },

  /**
   * Busca com filtros avançados
   */
  search: async <T = any>(
    schema: string,
    table: string,
    companyId: string,
    searchTerm: string,
    additionalFilters: EntityFilters = {}
  ): Promise<T[]> => {
    const result = await EntityService.list<T>({
      schema,
      table,
      companyId,
      filters: {
        ...additionalFilters,
        search: searchTerm
      }
    });

    return result.data;
  }
};
