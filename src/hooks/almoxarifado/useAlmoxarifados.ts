import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company-context';

export interface Almoxarifado {
  id: string;
  company_id: string;
  nome: string;
  codigo: string;
  endereco?: string;
  responsavel_id?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  responsavel?: {
    id: string;
    nome: string;
    email: string;
  };
}

export const useAlmoxarifados = () => {
  const [almoxarifados, setAlmoxarifados] = useState<Almoxarifado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedCompany } = useCompany();

  const fetchAlmoxarifados = async () => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Definir o contexto da empresa para RLS

      await supabase.rpc('set_company_context', { company_id: selectedCompany.id });

      

      const { data, error: fetchError } = await supabase
        .from('almoxarifado.almoxarifados')
        .select(`
          *,
          responsavel:users!responsavel_id(id, nome, email)
        `)
        .eq('company_id', selectedCompany.id)
        .eq('ativo', true)
        .order('nome');

      if (fetchError) throw fetchError;

      setAlmoxarifados(data || []);
    } catch (err) {
      console.error('Erro ao buscar almoxarifados:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const createAlmoxarifado = async (data: Omit<Almoxarifado, 'id' | 'created_at' | 'updated_at'>) => {
    if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

    try {
      const { data: newAlmoxarifado, error } = await supabase
        .from('almoxarifado.almoxarifados')
        .insert([{
          ...data,
          company_id: selectedCompany.id
        }])
        .select(`
          *,
          responsavel:users!responsavel_id(id, nome, email)
        `)
        .single();

      if (error) throw error;

      setAlmoxarifados(prev => [...prev, newAlmoxarifado]);
      return newAlmoxarifado;
    } catch (err) {
      console.error('Erro ao criar almoxarifado:', err);
      throw err;
    }
  };

  const updateAlmoxarifado = async (id: string, data: Partial<Almoxarifado>) => {
    try {
      const { data: updatedAlmoxarifado, error } = await supabase
        .from('almoxarifado.almoxarifados')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          responsavel:users!responsavel_id(id, nome, email)
        `)
        .single();

      if (error) throw error;

      setAlmoxarifados(prev => 
        prev.map(almoxarifado => 
          almoxarifado.id === id ? updatedAlmoxarifado : almoxarifado
        )
      );
      return updatedAlmoxarifado;
    } catch (err) {
      console.error('Erro ao atualizar almoxarifado:', err);
      throw err;
    }
  };

  const deleteAlmoxarifado = async (id: string) => {
    try {
      const { error } = await supabase
        .from('almoxarifado.almoxarifados')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;

      setAlmoxarifados(prev => prev.filter(almoxarifado => almoxarifado.id !== id));
    } catch (err) {
      console.error('Erro ao excluir almoxarifado:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchAlmoxarifados();
  }, [selectedCompany?.id]);

  return {
    almoxarifados,
    loading,
    error,
    refetch: fetchAlmoxarifados,
    createAlmoxarifado,
    updateAlmoxarifado,
    deleteAlmoxarifado
  };
};

