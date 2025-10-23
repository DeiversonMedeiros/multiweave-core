import { createContext, useContext, useEffect, useState } from "react";
import { Company } from "./supabase-types";

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

  // Load companies from database and selectedCompany from localStorage
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      try {
        // Load companies from database
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: companiesData, error: companiesError } = await supabase
          .from("companies")
          .select("*")
          .eq("ativo", true);

        if (companiesError) {
          console.error('Error loading companies:', companiesError);
        } else {
          setCompanies(companiesData || []);
        }

        // Load selectedCompany from localStorage
        const stored = localStorage.getItem("selectedCompany");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setSelectedCompanyState(parsed);
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
  }, []);

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
