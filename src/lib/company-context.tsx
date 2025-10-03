import { createContext, useContext, useEffect, useState } from "react";
import { Company } from "./supabase-types";

type CompanyContextType = {
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company | null) => void;
  companies: Company[];
  setCompanies: (companies: Company[]) => void;
};

const CompanyContext = createContext<CompanyContextType>({
  selectedCompany: null,
  setSelectedCompany: () => {},
  companies: [],
  setCompanies: () => {},
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

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("selectedCompany");
    if (stored) {
      try {
        setSelectedCompanyState(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse stored company", e);
      }
    }
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
    <CompanyContext.Provider value={{ selectedCompany, setSelectedCompany, companies, setCompanies }}>
      {children}
    </CompanyContext.Provider>
  );
};
