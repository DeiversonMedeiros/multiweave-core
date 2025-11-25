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

// Schema único com validação condicional
const usernameRegex = /^[a-z0-9._-]+$/i;

const usuarioSchema = z.object({
  nome: z.string().trim().min(3, "Nome deve ter no mínimo 3 caracteres").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  username: z
    .string()
    .trim()
    .min(3, "Nome de usuário deve ter no mínimo 3 caracteres")
    .max(30, "Nome de usuário deve ter no máximo 30 caracteres")
    .regex(usernameRegex, "Use apenas letras, números, pontos, hífens ou underscores"),
  senha: z.string().optional(),
  ativo: z.boolean().default(true),
  profile_id: z.string().optional(),
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
    mode: "onChange",
    defaultValues: {
      nome: usuario?.nome || "",
      email: usuario?.email || "",
      username: usuario?.username || "",
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

  // Atualizar valores do formulário quando o usuário mudar
  useEffect(() => {
    form.clearErrors();
    
    if (usuario) {
      form.reset({
        nome: usuario.nome || "",
        email: usuario.email || "",
        username: usuario.username || "",
        senha: "",
        ativo: usuario.ativo ?? true,
        profile_id: "",
      });
    } else {
      form.reset({
        nome: "",
        email: "",
        username: "",
        senha: "",
        ativo: true,
        profile_id: "",
      });
    }
  }, [usuario, form]);

  const onSubmit = async (data: UsuarioFormData) => {
    console.log('=== UsuarioForm: onSubmit INICIADO ===');
    console.log('UsuarioForm: Modo:', usuario ? 'EDITAR' : 'CRIAR');
    console.log('UsuarioForm: Dados do formulário:', {
      nome: data.nome,
      email: data.email,
      username: data.username,
      usernameLength: data.username?.length || 0,
      usernameTrimmed: data.username?.trim(),
      senha: data.senha ? '***' : 'vazia',
      profile_id: data.profile_id,
      ativo: data.ativo
    });
    
    // Validação manual para criação
    if (!usuario) {
      if (!data.senha || data.senha.length < 6) {
        toast.error("Senha é obrigatória e deve ter no mínimo 6 caracteres");
        return;
      }
      if (!data.profile_id) {
        toast.error("Perfil é obrigatório");
        return;
      }
      if (!data.username || data.username.trim().length < 3) {
        toast.error("Nome de usuário é obrigatório e deve ter no mínimo 3 caracteres");
        return;
      }
    }
    
    setLoading(true);
    try {
      if (usuario) {
        console.log('UsuarioForm: Atualizando usuário', { id: usuario.id, data });
        // Atualizar usuário existente
        const { data: updatedData, error } = await supabase
          .from("users")
          .update({
            nome: data.nome,
            email: data.email,
            username: data.username,
            ativo: data.ativo,
          })
          .eq("id", usuario.id)
          .select();

        console.log('UsuarioForm: Resposta da atualização', { updatedData, error });

        if (error) {
          console.error('UsuarioForm: Erro ao atualizar', error);
          if ((error as any)?.code === '23505') {
            throw new Error("Nome de usuário já está em uso");
          }
          throw error;
        }
        
        toast.success("Usuário atualizado com sucesso!");
        onSuccess();
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
          username: data.username?.trim() || '',
          password: data.senha,
          company_id: selectedCompany.id,
          profile_id: data.profile_id,
        };

        console.log('=== UsuarioForm: PREPARANDO REQUEST PARA EDGE FUNCTION ===');
        console.log('UsuarioForm: requestData completo:', JSON.stringify(requestData, null, 2));
        console.log('UsuarioForm: username no requestData:', requestData.username);
        console.log('UsuarioForm: username type:', typeof requestData.username);
        console.log('UsuarioForm: username length:', requestData.username?.length || 0);
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
          console.error('=== UsuarioForm: ERRO NA RESPOSTA ===');
          console.error('UsuarioForm: Response status:', response.status);
          console.error('UsuarioForm: Response statusText:', response.statusText);
          console.error('UsuarioForm: Response headers:', Object.fromEntries(response.headers.entries()));
          console.error('UsuarioForm: Error response text (raw):', errorText);
          
          let errorData;
          try {
            errorData = JSON.parse(errorText);
            console.error('UsuarioForm: Error data (parsed):', errorData);
            console.error('UsuarioForm: Error message:', errorData.error);
            console.error('UsuarioForm: Error code:', errorData.errorCode);
            console.error('UsuarioForm: Error details:', errorData.errorDetails);
            console.error('UsuarioForm: Error hint:', errorData.errorHint);
            console.error('UsuarioForm: Error full:', errorData.errorFull);
          } catch (e) {
            console.error('UsuarioForm: Could not parse error response as JSON:', e);
            errorData = { error: errorText };
          }
          
          const errorMessage = errorData.error || errorData.errorDetails || errorData.errorHint || `Erro ${response.status}: ${errorText}`;
          console.error('UsuarioForm: Throwing error with message:', errorMessage);
          
          throw new Error(errorMessage);
        }

        const responseData = await response.json();
        console.log('=== UsuarioForm: RESPOSTA DA EDGE FUNCTION ===');
        console.log('UsuarioForm: Success response completo:', JSON.stringify(responseData, null, 2));
        console.log('UsuarioForm: responseData.success:', responseData.success);
        console.log('UsuarioForm: responseData.user:', responseData.user);

        toast.success("Usuário criado com sucesso!");
        onSuccess();
      }
    } catch (error: any) {
      console.error('UsuarioForm: Erro no onSubmit', error);
      toast.error(error.message || "Erro ao salvar usuário");
    } finally {
      setLoading(false);
    }
  };

  const onError = (errors: any) => {
    console.error('UsuarioForm: Erros de validação', errors);
    toast.error("Por favor, corrija os erros no formulário");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6">
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

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome de usuário *</FormLabel>
              <FormControl>
                <Input {...field} type="text" placeholder="usuario.exemplo" />
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
