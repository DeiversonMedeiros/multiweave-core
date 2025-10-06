import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useMultiTenancy } from './useMultiTenancy';

export interface TenantMutationOptions {
  table: string;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export function useTenantMutation({ table, onSuccess, onError }: TenantMutationOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const { currentCompany, isAdmin } = useMultiTenancy();

  const insert = useCallback(async (data: any) => {
    if (!currentCompany && !isAdmin) {
      const error = new Error('Nenhuma empresa selecionada');
      setError(error);
      onError?.(error);
      return { data: null, error };
    }

    setLoading(true);
    setError(null);

    try {
      const insertData = {
        ...data,
        ...(currentCompany && !isAdmin ? { company_id: currentCompany.id } : {})
      };

      const { data: result, error: insertError } = await supabase
        .from(table)
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      onSuccess?.(result);
      return { data: result, error: null };
    } catch (err) {
      setError(err);
      onError?.(err);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  }, [table, currentCompany, isAdmin, onSuccess, onError]);

  const update = useCallback(async (id: any, data: any) => {
    if (!currentCompany && !isAdmin) {
      const error = new Error('Nenhuma empresa selecionada');
      setError(error);
      onError?.(error);
      return { data: null, error };
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase.from(table).update(data).eq('id', id);

      if (currentCompany && !isAdmin) {
        query = query.eq('company_id', currentCompany.id);
      }

      const { data: result, error: updateError } = await query.select().single();

      if (updateError) throw updateError;

      onSuccess?.(result);
      return { data: result, error: null };
    } catch (err) {
      setError(err);
      onError?.(err);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  }, [table, currentCompany, isAdmin, onSuccess, onError]);

  const remove = useCallback(async (id: any) => {
    if (!currentCompany && !isAdmin) {
      const error = new Error('Nenhuma empresa selecionada');
      setError(error);
      onError?.(error);
      return { data: null, error };
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase.from(table).delete().eq('id', id);

      if (currentCompany && !isAdmin) {
        query = query.eq('company_id', currentCompany.id);
      }

      const { data: result, error: deleteError } = await query.select().single();

      if (deleteError) throw deleteError;

      onSuccess?.(result);
      return { data: result, error: null };
    } catch (err) {
      setError(err);
      onError?.(err);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  }, [table, currentCompany, isAdmin, onSuccess, onError]);

  return {
    insert,
    update,
    remove,
    loading,
    error
  };
}

