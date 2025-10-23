import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Profile } from "@/lib/supabase-types";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/lib/company-context";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const usuarioSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(100),
  email: z.string().email("Email inválido").max(255),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").optional(),
  ativo: z.boolean().default(true),
  profile_id: z.string().min(1, "Perfil é obrigatório"),
});

type UsuarioFormData = z.infer<typeof usuarioSchema>;

interface UsuarioFormProps {
  usuario?: User;
  onSuccess: () => void;
  onCancel: () => void;
}

export function UsuarioForm({ usuario, onSuccess, onCancel }: UsuarioFormProps) {
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const { selectedCompany } = useCompany();

  const form = useForm<UsuarioFormData>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: {
      nome: usuario?.nome || "",
      email: usuario?.email || "",
      senha: "",
      ativo: usuario?.ativo ?? true,
      profile_id: "",
    },
  });

  // Carregar perfis disponíveis
  useEffect(() => {
    const loadProfiles = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("nome");

      if (error) {
        console.error("Erro ao carregar perfis:", error);
        toast.error("Erro ao carregar perfis");
      } else {
        setProfiles(data || []);
      }
    };

    loadProfiles();
  }, []);

  const onSubmit = async (data: UsuarioFormData) => {
    setLoading(true);
    try {
      if (usuario) {
        // Atualizar usuário existente
        const { error } = await supabase
          .from("users")
          .update({
            nome: data.nome,
            email: data.email,
            ativo: data.ativo,
          })
          .eq("id", usuario.id);

        if (error) throw error;
        toast.success("Usuário atualizado com sucesso!");
      } else {
        // Criar novo usuário via edge function
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error("Sessão não encontrada");
        }

        if (!selectedCompany) {
          throw new Error("Empresa não selecionada");
        }

        const requestData = {
          nome: data.nome,
          email: data.email,
          password: data.senha,
          company_id: selectedCompany.id,
          profile_id: data.profile_id,
        };

        console.log('UsuarioForm: Dados enviados para create-user:', requestData);
        console.log('UsuarioForm: selectedCompany:', selectedCompany);

        const response = await fetch(
          `https://wmtftyaqucwfsnnjepiy.supabase.co/functions/v1/create-user`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(requestData),
          }
        );

        console.log('UsuarioForm: Response status:', response.status);
        console.log('UsuarioForm: Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error('UsuarioForm: Error response text:', errorText);
          
          let errorData;
          try {
            errorData = JSON.parse(errorText);
            console.error('UsuarioForm: Error data:', errorData);
          } catch (e) {
            console.error('UsuarioForm: Could not parse error response as JSON');
            errorData = { error: errorText };
          }
          
          throw new Error(errorData.error || `Erro ${response.status}: ${errorText}`);
        }

        const responseData = await response.json();
        console.log('UsuarioForm: Success response:', responseData);

        toast.success("Usuário criado com sucesso!");
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar usuário");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Nome completo" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email *</FormLabel>
              <FormControl>
                <Input {...field} type="email" placeholder="email@exemplo.com" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!usuario && (
          <FormField
            control={form.control}
            name="senha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha *</FormLabel>
                <FormControl>
                  <Input {...field} type="password" placeholder="******" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {!usuario && (
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
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : usuario ? "Atualizar" : "Criar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
