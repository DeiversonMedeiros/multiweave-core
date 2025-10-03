import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useCompany } from "@/lib/company-context";
import { Company } from "@/lib/supabase-types";
import { toast } from "sonner";
import { Building2, ChevronRight } from "lucide-react";

export default function CompanySelect() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { setSelectedCompany, setCompanies: setContextCompanies } = useCompany();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const fetchCompanies = async () => {
      try {
        const { data, error } = await supabase
          .schema("core")
          .from("companies")
          .select("*")
          .eq("ativo", true);

        if (error) throw error;

        setCompanies(data || []);
        setContextCompanies(data || []);
      } catch (error: any) {
        toast.error("Erro ao carregar empresas: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, [user, navigate, setContextCompanies]);

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Nenhuma empresa disponível</CardTitle>
            <CardDescription>
              Você ainda não tem acesso a nenhuma empresa. Entre em contato com o administrador.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Building2 className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Selecione uma empresa</CardTitle>
          <CardDescription>
            Escolha a empresa que deseja acessar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {companies.map((company) => (
              <Button
                key={company.id}
                variant="outline"
                className="h-auto p-4 justify-between hover:border-primary hover:bg-primary/5"
                onClick={() => handleSelectCompany(company)}
              >
                <div className="flex items-start gap-3 text-left">
                  <Building2 className="h-5 w-5 mt-0.5 text-primary" />
                  <div>
                    <div className="font-semibold">{company.nome_fantasia}</div>
                    <div className="text-sm text-muted-foreground">{company.razao_social}</div>
                    <div className="text-xs text-muted-foreground mt-1">CNPJ: {company.cnpj}</div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
