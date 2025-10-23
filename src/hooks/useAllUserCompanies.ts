import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AllUserCompany {
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

export const useAllUserCompanies = () => {
  const [allUserCompanies, setAllUserCompanies] = useState<AllUserCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllUserCompanies = async () => {
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
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAllUserCompanies(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao carregar todos os vínculos:', err);
    } finally {
      setLoading(false);
    }
  };

  const createUserCompany = async (userId: string, companyId: string, profileId: string) => {
    const { data, error } = await supabase
      .from('user_companies')
      .insert({
        user_id: userId,
        company_id: companyId,
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

    setAllUserCompanies(prev => [data, ...prev]);
    return data;
  };

  const updateUserCompany = async (id: string, updates: Partial<AllUserCompany>) => {
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

    setAllUserCompanies(prev => 
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

    setAllUserCompanies(prev => prev.filter(uc => uc.id !== id));
  };

  useEffect(() => {
    fetchAllUserCompanies();
  }, []);

  return {
    allUserCompanies,
    loading,
    error,
    fetchAllUserCompanies,
    createUserCompany,
    updateUserCompany,
    deleteUserCompany
  };
};
