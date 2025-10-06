import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useCompany } from '@/lib/company-context';
import { supabase } from '@/integrations/supabase/client';
import { Company } from '@/lib/supabase-types';

export interface TenantContext {
  currentCompany: Company | null;
  userCompanies: Company[];
  isMultiTenant: boolean;
  canSwitchCompany: boolean;
  loading: boolean;
  isAdmin: boolean;
}

export const useMultiTenancy = () => {
  const { user } = useAuth();
  const { selectedCompany, setSelectedCompany, companies, setCompanies } = useCompany();
  const [loading, setLoading] = useState(true);
  const [userCompanies, setUserCompanies] = useState<Company[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Carregar empresas do usuário
  const loadUserCompanies = useCallback(async () => {
    if (!user) {
      setUserCompanies([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Verificar se é admin primeiro
      const { data: adminData, error: adminError } = await supabase
        .rpc('is_admin', { user_id: user.id });
      
      if (adminError) {
        console.error('Erro ao verificar admin:', adminError);
        setIsAdmin(false);
      } else {
        setIsAdmin(adminData || false);
      }

      // Se for admin, carrega todas as empresas
      if (adminData) {
        const { data: allCompanies, error: allError } = await supabase
          .from('companies')
          .select('*')
          .eq('ativo', true)
          .order('nome_fantasia');

        if (allError) throw allError;
        setUserCompanies(allCompanies || []);
        setCompanies(allCompanies || []);
        return;
      }

      // Para usuários normais, carrega apenas empresas com acesso
      const { data: userCompanyData, error: userError } = await supabase
        .from('user_companies')
        .select(`
          company_id,
          companies (
            id,
            razao_social,
            nome_fantasia,
            cnpj,
            inscricao_estadual,
            endereco,
            contato,
            ativo,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id)
        .eq('ativo', true);

      if (userError) throw userError;

      const companies = userCompanyData
        ?.map(uc => uc.companies)
        .filter(Boolean) as Company[] || [];

      setUserCompanies(companies);
      setCompanies(companies);

      // Se não há empresa selecionada e há empresas disponíveis, seleciona a primeira
      if (!selectedCompany && companies.length > 0) {
        setSelectedCompany(companies[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar empresas do usuário:', error);
      setUserCompanies([]);
    } finally {
      setLoading(false);
    }
  }, [user, setSelectedCompany, setCompanies]);

  // Verificar se usuário tem acesso à empresa
  const hasCompanyAccess = useCallback(async (companyId: string): Promise<boolean> => {
    if (!user) return false;
    if (isAdmin) return true;

    try {
      const { data, error } = await supabase
        .from('user_companies')
        .select('id')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .eq('ativo', true)
        .single();

      if (error) return false;
      return !!data;
    } catch (error) {
      console.error('Erro ao verificar acesso à empresa:', error);
      return false;
    }
  }, [user, isAdmin]);

  // Trocar empresa
  const switchCompany = useCallback(async (company: Company) => {
    if (!user) return false;

    // Verificar se tem acesso à empresa
    const hasAccess = await hasCompanyAccess(company.id);
    if (!hasAccess) {
      console.error('Usuário não tem acesso à empresa selecionada');
      return false;
    }

    setSelectedCompany(company);
    return true;
  }, [user, hasCompanyAccess, setSelectedCompany]);

  // Verificar se é multi-tenant
  const isMultiTenant = userCompanies.length > 1;

  // Verificar se pode trocar de empresa
  const canSwitchCompany = userCompanies.length > 1;

  // Carregar empresas quando o usuário mudar
  useEffect(() => {
    if (user) {
      loadUserCompanies();
    }
  }, [user?.id]); // Apenas quando o ID do usuário mudar

  // Filtrar dados por empresa
  const filterByCompany = useCallback((query: any) => {
    if (!selectedCompany) return query;
    if (isAdmin) return query; // Admin vê tudo

    return query.eq('company_id', selectedCompany.id);
  }, [selectedCompany, isAdmin]);

  // Adicionar filtro de empresa a uma query
  const addCompanyFilter = useCallback((query: any, tableName: string) => {
    if (!selectedCompany) return query;
    if (isAdmin) return query; // Admin vê tudo

    return query.eq(`${tableName}.company_id`, selectedCompany.id);
  }, [selectedCompany, isAdmin]);

  // Verificar se tabela tem isolamento por empresa
  const hasCompanyIsolation = useCallback((tableName: string) => {
    const tablesWithCompanyId = [
      'users',
      'cost_centers',
      'materials',
      'partners',
      'projects'
    ];
    return tablesWithCompanyId.includes(tableName);
  }, []);

  // Obter contexto atual do tenant
  const getTenantContext = useCallback((): TenantContext => ({
    currentCompany: selectedCompany,
    userCompanies,
    isMultiTenant,
    canSwitchCompany,
    loading,
    isAdmin
  }), [selectedCompany, userCompanies, isMultiTenant, canSwitchCompany, loading, isAdmin]);

  return {
    // Estado
    currentCompany: selectedCompany,
    userCompanies,
    isMultiTenant,
    canSwitchCompany,
    loading,
    isAdmin,

    // Funções
    loadUserCompanies,
    hasCompanyAccess,
    switchCompany,
    filterByCompany,
    addCompanyFilter,
    hasCompanyIsolation,
    getTenantContext
  };
};
