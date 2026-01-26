import { createContext, useContext, useEffect, useState } from "react";
import { Company } from "./supabase-types";
import { useAuth } from "./auth-context";

type CompanyContextType = {
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company | null) => void;
  companies: Company[];
  setCompanies: (companies: Company[]) => void;
  loading: boolean;
};

const CompanyContext = createContext<CompanyContextType>({
  selectedCompany: null,
  setSelectedCompany: () => {},
  companies: [],
  setCompanies: () => {},
  loading: true,
});

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within CompanyProvider");
  }
  
  return context;
};

export const CompanyProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedCompany, setSelectedCompanyState] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Load companies from database and selectedCompany from localStorage
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        
        // Verificar se o usuário é admin
        const { data: adminData, error: adminError } = await supabase
          .rpc('is_admin_simple', { p_user_id: user.id });
        
        if (adminError) {
          console.error('Error checking admin status:', adminError);
        }

        let companiesData: Company[] = [];

        // Se for admin, carrega todas as empresas
        if (adminData) {
          const { data, error: companiesError } = await supabase
            .from("companies")
            .select("*")
            .eq("ativo", true);

          if (companiesError) {
            console.error('Error loading companies:', companiesError);
          } else {
            companiesData = data || [];
          }
        } else {
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

          if (userError) {
            console.error('Error loading user companies:', userError);
          } else {
            companiesData = userCompanyData
              ?.map(uc => uc.companies)
              .filter(Boolean) as Company[] || [];
          }
        }

        setCompanies(companiesData);

        // Load selectedCompany from localStorage
        const stored = localStorage.getItem("selectedCompany");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            // Verificar se a empresa selecionada ainda está na lista de empresas do usuário
            const isValidCompany = companiesData.some(c => c.id === parsed.id);
            if (isValidCompany) {
              setSelectedCompanyState(parsed);
            } else {
              // Se a empresa não está mais disponível, limpar seleção
              localStorage.removeItem("selectedCompany");
              setSelectedCompanyState(null);
            }
          } catch (e) {
            console.error("Failed to parse stored company", e);
            localStorage.removeItem("selectedCompany");
          }
        }
      } catch (error) {
        console.error('Error loading company data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id]);

  const setSelectedCompany = (company: Company | null) => {
    setSelectedCompanyState(company);
    if (company) {
      localStorage.setItem("selectedCompany", JSON.stringify(company));
    } else {
      localStorage.removeItem("selectedCompany");
    }
  };

  return (
    <CompanyContext.Provider value={{ selectedCompany, setSelectedCompany, companies, setCompanies, loading }}>
      {children}
    </CompanyContext.Provider>
  );
};
