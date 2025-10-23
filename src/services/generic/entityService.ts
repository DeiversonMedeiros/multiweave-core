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
    console.log('🔍 [DEBUG] EntityService.list - chamado com params:', params);
    
    const {
      schema,
      table,
      companyId,
      filters = {},
      page = 1,
      pageSize = 100,
      orderBy = 'id',
      orderDirection = 'DESC'
    } = params;

    const offset = (page - 1) * pageSize;

    // Limpar filtros que têm valor "all" para evitar erro de UUID
    const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      if (value && value !== 'all') {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    const rpcParams = {
      schema_name: schema,
      table_name: table,
      company_id_param: companyId,
      filters: cleanFilters,
      limit_param: pageSize,
      offset_param: offset,
      order_by: orderBy,
      order_direction: orderDirection
    };

    console.log('🔍 [DEBUG] EntityService.list - rpcParams:', rpcParams);

    const { data, error } = await (supabase as any).rpc('get_entity_data', rpcParams);

    console.log('🔍 [DEBUG] EntityService.list - data:', data);
    console.log('🔍 [DEBUG] EntityService.list - error:', error);
    console.log('🔍 [DEBUG] EntityService.list - error details:', error?.details);
    console.log('🔍 [DEBUG] EntityService.list - error message:', error?.message);
    console.log('🔍 [DEBUG] EntityService.list - error code:', error?.code);

    if (error) {
      console.error(`Erro ao buscar dados de ${schema}.${table}:`, error);
      // Retornar dados vazios em caso de erro para não quebrar a interface
      return {
        data: [],
        totalCount: 0,
        hasMore: false
      };
    }

    const result = data || [];
    const totalCount = result.length > 0 ? (result[0].total_count || 0) : 0;
    const hasMore = offset + pageSize < totalCount;

    console.log('🔍 [DEBUG] EntityService.list - result:', result);
    console.log('🔍 [DEBUG] EntityService.list - totalCount:', totalCount);
    console.log('🔍 [DEBUG] EntityService.list - hasMore:', hasMore);

    const finalResult = {
      data: result.map((item: any) => item.data) as T[],
      totalCount,
      hasMore
    };

    console.log('🔍 [DEBUG] EntityService.list - finalResult:', finalResult);
    return finalResult;
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
      // Função específica para funcionários
      if (schema === 'rh' && table === 'employees') {
        const { data: result, error } = await (supabase as any).rpc('create_employee', {
          company_id_param: companyId,
          nome_param: (data as any).nome,
          cpf_param: (data as any).cpf,
          data_admissao_param: (data as any).data_admissao,
          status_param: (data as any).status || 'ativo',
          user_id_param: (data as any).user_id || null,
          matricula_param: (data as any).matricula || null  // Se null, será gerada automaticamente
        });

        if (error) {
          console.error(`Erro ao criar funcionário:`, error);
          throw error;
        }

        return result as T;
      }

      // Para outras tabelas, usar função genérica
      // NÃO incluir company_id no data_param para evitar duplicação
      const dataWithoutCompany = { ...data };
      delete (dataWithoutCompany as any).company_id;

      // Log detalhado para debug
      console.log('🔍 [DEBUG] create_entity_data:', {
        schema_name: schema,
        table_name: table,
        company_id_param: companyId,
        data_keys: Object.keys(dataWithoutCompany)
      });
      
      console.log('🔍 [DEBUG] Dados completos sendo enviados:', {
        dataWithoutCompany: dataWithoutCompany,
        dataTypes: Object.entries(dataWithoutCompany).map(([key, value]) => ({
          key,
          value,
          type: typeof value
        }))
      });

      // Log específico para campos que podem causar problemas
      Object.entries(dataWithoutCompany).forEach(([key, value]) => {
        if (value === null) {
          console.log(`🔍 [DEBUG] Campo ${key}: NULL`);
        } else if (value === undefined) {
          console.log(`🔍 [DEBUG] Campo ${key}: UNDEFINED`);
        } else if (typeof value === 'string' && value.trim() === '') {
          console.log(`🔍 [DEBUG] Campo ${key}: STRING VAZIA`);
        } else {
          console.log(`🔍 [DEBUG] Campo ${key}: ${value} (${typeof value})`);
        }
      });

      // Log específico para status
      if ('status' in dataWithoutCompany) {
        console.log('🔍 [DEBUG] Campo status:', {
          value: dataWithoutCompany.status,
          type: typeof dataWithoutCompany.status,
          isString: typeof dataWithoutCompany.status === 'string',
          isValid: ['ativo', 'inativo'].includes(dataWithoutCompany.status)
        });
      } else {
        console.log('🔍 [DEBUG] Campo status: NÃO ENCONTRADO');
      }

      const { data: result, error } = await (supabase as any).rpc('create_entity_data', {
        schema_name: schema,
        table_name: table,
        company_id_param: companyId,
        data_param: dataWithoutCompany
      });

      if (error) {
        console.error(`❌ ERRO ao criar item em ${schema}.${table}:`, error);
        throw error;
      }

      console.log('✅ SUCESSO ao criar item:', result);

      return result as T;
    }

    // Para schema 'public', usar acesso direto
    const { data: result, error } = await (supabase as any)
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error(`Erro ao criar item em ${schema}.${table}:`, error);
      throw error;
    }

    return result as T;
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
      const { data: result, error } = await (supabase as any).rpc('update_entity_data', {
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

      return result as T;
    }

    // Para schema 'public', usar acesso direto
    const { data: result, error } = await (supabase as any)
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Erro ao atualizar item em ${schema}.${table}:`, error);
      throw error;
    }

    return result as T;
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
      const { error } = await (supabase as any).rpc('delete_entity_data', {
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
    const { error } = await (supabase as any)
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
