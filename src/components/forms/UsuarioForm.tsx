import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { User } from "@/lib/supabase-types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

const usuarioSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(100),
  email: z.string().email("Email inválido").max(255),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").optional(),
  ativo: z.boolean().default(true),
});

type UsuarioFormData = z.infer<typeof usuarioSchema>;

interface UsuarioFormProps {
  usuario?: User;
  onSuccess: () => void;
  onCancel: () => void;
}

export function UsuarioForm({ usuario, onSuccess, onCancel }: UsuarioFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<UsuarioFormData>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: {
      nome: usuario?.nome || "",
      email: usuario?.email || "",
      senha: "",
      ativo: usuario?.ativo ?? true,
    },
  });

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

        const response = await fetch(
          `https://wmtftyaqucwfsnnjepiy.supabase.co/functions/v1/create-user`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              nome: data.nome,
              email: data.email,
              senha: data.senha,
              ativo: data.ativo,
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Erro ao criar usuário");
        }

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
