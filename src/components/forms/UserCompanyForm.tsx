import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { User, Profile, Company } from "@/lib/supabase-types";
import { useUsers } from "@/hooks/useUsers";
import { useCompany } from "@/lib/company-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const userCompanySchema = z.object({
  user_id: z.string().min(1, "Usuário é obrigatório"),
  profile_id: z.string().min(1, "Perfil é obrigatório"),
  company_id: z.string().min(1, "Empresa é obrigatória").optional(),
  ativo: z.boolean().default(true),
});

type UserCompanyFormData = z.infer<typeof userCompanySchema>;

interface UserCompanyFormProps {
  userCompany?: any;
  onSuccess: () => void;
  onCancel: () => void;
  allowCompanySelection?: boolean;
}

export function UserCompanyForm({ userCompany, onSuccess, onCancel, allowCompanySelection = false }: UserCompanyFormProps) {
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const { users, loading: usersLoading } = useUsers();
  const { selectedCompany } = useCompany();

  const form = useForm<UserCompanyFormData>({
    resolver: zodResolver(userCompanySchema),
    defaultValues: {
      user_id: userCompany?.user_id || "",
      profile_id: userCompany?.profile_id || "",
      company_id: userCompany?.company_id || selectedCompany?.id || "",
      ativo: userCompany?.ativo ?? true,
    },
  });

  // Carregar perfis e empresas disponíveis
  useEffect(() => {
    const loadData = async () => {
      // Carregar perfis
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("nome");

      if (profilesError) {
        console.error("Erro ao carregar perfis:", profilesError);
        toast.error("Erro ao carregar perfis");
      } else {
        setProfiles(profilesData || []);
      }

      // Carregar empresas se permitir seleção
      if (allowCompanySelection) {
        const { data: companiesData, error: companiesError } = await supabase
          .from("companies")
          .select("*")
          .eq("ativo", true)
          .order("razao_social");

        if (companiesError) {
          console.error("Erro ao carregar empresas:", companiesError);
          toast.error("Erro ao carregar empresas");
        } else {
          setCompanies(companiesData || []);
        }
      }
    };

    loadData();
  }, [allowCompanySelection]);

  const onSubmit = async (data: UserCompanyFormData) => {
    setLoading(true);
    try {
      if (userCompany) {
        // Atualizar vínculo existente
        const { error } = await supabase
          .from('user_companies')
          .update({
            profile_id: data.profile_id,
            ativo: data.ativo,
          })
          .eq('id', userCompany.id);

        if (error) throw error;
        toast.success("Vínculo atualizado com sucesso!");
      } else {
        // Criar novo vínculo
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error("Sessão não encontrada");
        }

        const companyId = allowCompanySelection ? data.company_id : selectedCompany?.id;
        
        if (!companyId) {
          throw new Error("Empresa não selecionada");
        }

        const { error } = await supabase
          .from('user_companies')
          .insert({
            user_id: data.user_id,
            company_id: companyId,
            profile_id: data.profile_id,
            ativo: data.ativo,
          });

        if (error) throw error;
        toast.success("Vínculo criado com sucesso!");
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar vínculo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="user_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Usuário *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.nome} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="profile_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Perfil *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um perfil" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {allowCompanySelection && (
          <FormField
            control={form.control}
            name="company_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Empresa *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma empresa" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="ativo"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Status Ativo</FormLabel>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || usersLoading}>
            {loading ? "Salvando..." : userCompany ? "Atualizar" : "Criar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
