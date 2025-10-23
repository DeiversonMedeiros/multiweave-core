import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Profile } from "@/lib/supabase-types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

const profileSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(100),
  descricao: z.string().optional(),
  is_active: z.boolean().default(true),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  profile?: Profile;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProfileForm({ profile, onSuccess, onCancel }: ProfileFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nome: profile?.nome || "",
      descricao: profile?.descricao || "",
      is_active: profile?.is_active ?? true,
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setLoading(true);
    try {
      if (profile) {
        // Atualizar perfil existente via RPC
        const { data: updatedProfile, error } = await supabase
          .rpc("update_profile", {
            p_id: profile.id,
            p_nome: data.nome,
            p_descricao: data.descricao,
            p_is_active: data.is_active,
          });

        if (error) throw error;
        toast.success("Perfil atualizado com sucesso!");
      } else {
        // Criar novo perfil via RPC
        const { data: newProfile, error } = await supabase
          .rpc("create_profile", {
            p_nome: data.nome,
            p_descricao: data.descricao,
            p_is_active: data.is_active,
          });

        if (error) throw error;
        toast.success("Perfil criado com sucesso!");
      }

      onSuccess();
    } catch (error: any) {
      console.error("Erro ao salvar perfil:", error);
      toast.error(error.message || "Erro ao salvar perfil");
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
              <FormLabel>Nome do Perfil *</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Gerente de Vendas" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="descricao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Descreva as responsabilidades e acesso deste perfil..."
                  className="resize-none"
                  rows={3}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Perfil Ativo</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Perfis inativos não podem ser atribuídos a novos usuários
                </div>
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
            {loading ? "Salvando..." : profile ? "Atualizar" : "Criar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
