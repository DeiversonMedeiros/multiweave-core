import { useState, useEffect, useCallback } from 'react';
import { useMultiTenancy } from './useMultiTenancy';
import { supabase } from '@/integrations/supabase/client';

export interface TenantQueryOptions {
  table: string;
  select?: string;
  filters?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

export const useTenantQuery = <T = any>(options: TenantQueryOptions) => {
  const { currentCompany, isAdmin, addCompanyFilter, hasCompanyIsolation } = useMultiTenancy();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeQuery = useCallback(async () => {
    // Temporariamente desabilitar para evitar loops
    // TODO: Reimplementar quando o sistema estiver estável
    setData([]);
    setLoading(false);
    return;

    // if (!currentCompany && !isAdmin) {
    //   setData([]);
    //   return;
    // }

    // try {
    //   setLoading(true);
    //   setError(null);

    //   let query = supabase.from(options.table);

    //   // Aplicar filtro de empresa se necessário
    //   if (hasCompanyIsolation(options.table)) {
    //     query = addCompanyFilter(query, options.table);
    //   }

    //   // Aplicar select
    //   if (options.select) {
    //     query = query.select(options.select);
    //   }

    //   // Aplicar filtros adicionais
    //   if (options.filters) {
    //     Object.entries(options.filters).forEach(([key, value]) => {
    //       if (value !== undefined && value !== null) {
    //         query = query.eq(key, value);
    //       }
    //     });
    //   }

    //   // Aplicar ordenação
    //   if (options.orderBy) {
    //     query = query.order(options.orderBy.column, { 
    //       ascending: options.orderBy.ascending !== false 
    //     });
    //   }

    //   // Aplicar limite
    //   if (options.limit) {
    //     query = query.limit(options.limit);
    //   }

    //   // Aplicar offset
    //   if (options.offset) {
    //     query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    //   }

    //   const { data: result, error: queryError } = await query;

    //   if (queryError) throw queryError;

    //   setData(result || []);
    // } catch (err: any) {
    //   console.error('Erro na consulta tenant:', err);
    //   setError(err.message || 'Erro ao carregar dados');
    //   setData([]);
    // } finally {
    //   setLoading(false);
    // }
  }, []);

  useEffect(() => {
    executeQuery();
  }, [executeQuery]);

  return {
    data,
    loading,
    error,
    refetch: executeQuery
  };
};

// Hook para inserção com isolamento multi-tenant
export const useTenantMutation = () => {
  const { currentCompany, isAdmin, hasCompanyIsolation } = useMultiTenancy();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const insert = useCallback(async (table: string, data: any) => {
    if (!currentCompany && !isAdmin) {
      throw new Error('Nenhuma empresa selecionada');
    }

    try {
      setLoading(true);
      setError(null);

      // Adicionar company_id se a tabela tem isolamento
      if (hasCompanyIsolation(table) && currentCompany) {
        data.company_id = currentCompany.id;
      }

      const { data: result, error: insertError } = await supabase
        .from(table)
        .insert(data)
        .select()
        .single();

      if (insertError) throw insertError;

      return result;
    } catch (err: any) {
      console.error('Erro na inserção tenant:', err);
      setError(err.message || 'Erro ao inserir dados');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentCompany, hasCompanyIsolation]);

  const update = useCallback(async (table: string, id: string, data: any) => {
    if (!currentCompany && !isAdmin) {
      throw new Error('Nenhuma empresa selecionada');
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase.from(table).update(data).eq('id', id);

      // Aplicar filtro de empresa se necessário
      if (hasCompanyIsolation(table) && currentCompany) {
        query = query.eq('company_id', currentCompany.id);
      }

      const { data: result, error: updateError } = await query.select().single();

      if (updateError) throw updateError;

      return result;
    } catch (err: any) {
      console.error('Erro na atualização tenant:', err);
      setError(err.message || 'Erro ao atualizar dados');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentCompany, hasCompanyIsolation]);

  const remove = useCallback(async (table: string, id: string) => {
    if (!currentCompany && !isAdmin) {
      throw new Error('Nenhuma empresa selecionada');
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase.from(table).delete().eq('id', id);

      // Aplicar filtro de empresa se necessário
      if (hasCompanyIsolation(table) && currentCompany) {
        query = query.eq('company_id', currentCompany.id);
      }

      const { error: deleteError } = await query;

      if (deleteError) throw deleteError;

      return true;
    } catch (err: any) {
      console.error('Erro na exclusão tenant:', err);
      setError(err.message || 'Erro ao excluir dados');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentCompany, hasCompanyIsolation]);

  return {
    insert,
    update,
    remove,
    loading,
    error
  };
};

// Hook para verificar se dados pertencem à empresa atual
export const useTenantValidation = () => {
  const { currentCompany, isAdmin, hasCompanyIsolation } = useMultiTenancy();

  const validateOwnership = useCallback((table: string, data: any): boolean => {
    if (isAdmin) return true; // Admin pode acessar tudo
    if (!currentCompany) return false;
    if (!hasCompanyIsolation(table)) return true; // Tabela não tem isolamento

    return data.company_id === currentCompany.id;
  }, [currentCompany, isAdmin, hasCompanyIsolation]);

  const validateAccess = useCallback(async (table: string, id: string): Promise<boolean> => {
    if (isAdmin) return true;
    if (!currentCompany) return false;
    if (!hasCompanyIsolation(table)) return true;

    try {
      const { data, error } = await supabase
        .from(table)
        .select('company_id')
        .eq('id', id)
        .single();

      if (error) return false;
      return data.company_id === currentCompany.id;
    } catch (error) {
      console.error('Erro ao validar acesso:', error);
      return false;
    }
  }, [currentCompany, isAdmin, hasCompanyIsolation]);

  return {
    validateOwnership,
    validateAccess
  };
};
