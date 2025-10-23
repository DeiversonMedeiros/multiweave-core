import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company-context';

export interface UserCompany {
  id: string;
  user_id: string;
  company_id: string;
  profile_id: string;
  ativo: boolean;
  created_at: string;
  user?: {
    id: string;
    nome: string;
    email: string;
  };
  company?: {
    id: string;
    razao_social: string;
    nome_fantasia: string;
  };
  profile?: {
    id: string;
    nome: string;
  };
}

export const useUserCompanies = () => {
  const { selectedCompany } = useCompany();
  const [userCompanies, setUserCompanies] = useState<UserCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserCompanies = async () => {
    if (!selectedCompany) return;

    setLoading(true);
    setError(null);

    try {

      const { data, error } = await supabase
        .from('user_companies')
        .select(`
          *,
          user:users(id, nome, email),
          company:companies(id, razao_social, nome_fantasia),
          profile:profiles(id, nome)
        `)
        .eq('company_id', selectedCompany.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUserCompanies(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao carregar vínculos:', err);
    } finally {
      setLoading(false);
    }
  };

  const createUserCompany = async (userId: string, profileId: string) => {
    if (!selectedCompany) throw new Error('Empresa não selecionada');

    const { data, error } = await supabase
      .from('user_companies')
      .insert({
        user_id: userId,
        company_id: selectedCompany.id,
        profile_id: profileId,
        ativo: true
      })
      .select(`
        *,
        user:users(id, nome, email),
        company:companies(id, razao_social, nome_fantasia),
        profile:profiles(id, nome)
      `)
      .single();

    if (error) throw error;

    setUserCompanies(prev => [data, ...prev]);
    return data;
  };

  const updateUserCompany = async (id: string, updates: Partial<UserCompany>) => {
    const { data, error } = await supabase
      .from('user_companies')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        user:users(id, nome, email),
        company:companies(id, razao_social, nome_fantasia),
        profile:profiles(id, nome)
      `)
      .single();

    if (error) throw error;

    setUserCompanies(prev => 
      prev.map(uc => uc.id === id ? data : uc)
    );
    return data;
  };

  const deleteUserCompany = async (id: string) => {
    const { error } = await supabase
      .from('user_companies')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setUserCompanies(prev => prev.filter(uc => uc.id !== id));
  };

  useEffect(() => {
    fetchUserCompanies();
  }, [selectedCompany]);

  return {
    userCompanies,
    loading,
    error,
    fetchUserCompanies,
    createUserCompany,
    updateUserCompany,
    deleteUserCompany
  };
};
