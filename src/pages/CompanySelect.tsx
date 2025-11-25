import { useEffect, useState, useMemo, useTransition } from "react";
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
  const [isPending, startTransition] = useTransition();
  const { user } = useAuth();
  const { setSelectedCompany, setCompanies: setContextCompanies } = useCompany();
  const navigate = useNavigate();

  // Memoizar a lista de empresas para evitar re-renderizações desnecessárias
  const memoizedCompanies = useMemo(() => companies, [companies]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    let isMounted = true;

    const fetchCompanies = async () => {
      try {
        // Primeiro, verificar se o usuário é admin
        const { data: adminData, error: adminError } = await supabase
          .rpc('is_admin_simple', { p_user_id: user?.id });
        
        if (adminError) {
          console.error('Erro ao verificar admin:', adminError);
        }

        // Se for admin, carrega todas as empresas
        if (adminData) {
          const { data, error } = await supabase
            .from("companies")
            .select("*")
            .eq("ativo", true);

          if (error) throw error;

          if (isMounted) {
            startTransition(() => {
              setCompanies(data || []);
              setContextCompanies(data || []);
            });
          }
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
          .eq('user_id', user?.id)
          .eq('ativo', true);

        if (userError) throw userError;

        const companiesList = userCompanyData
          ?.map(uc => uc.companies)
          .filter(Boolean) as Company[] || [];

        if (isMounted) {
          startTransition(() => {
            setCompanies(companiesList);
            setContextCompanies(companiesList);
          });
        }
      } catch (error: any) {
        if (isMounted) {
          toast.error("Erro ao carregar empresas: " + error.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCompanies();

    return () => {
      isMounted = false;
    };
  }, [user, navigate, setContextCompanies]);

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
    navigate("/");
  };

  // Renderização única e estável - evitar múltiplas renderizações condicionais
  // Usar estrutura única de retorno para evitar problemas de insertBefore
  if (loading || isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (memoizedCompanies.length === 0) {
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
            {memoizedCompanies.map((company) => (
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
