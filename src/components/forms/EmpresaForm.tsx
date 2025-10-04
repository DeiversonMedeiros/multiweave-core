import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Company } from "@/lib/supabase-types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const empresaSchema = z.object({
  razao_social: z.string().min(3, "Razão social deve ter no mínimo 3 caracteres").max(200),
  nome_fantasia: z.string().min(3, "Nome fantasia deve ter no mínimo 3 caracteres").max(200),
  cnpj: z.string().regex(/^\d{14}$/, "CNPJ deve ter 14 dígitos"),
  inscricao_estadual: z.string().optional(),
  ativo: z.boolean().default(true),
  endereco_logradouro: z.string().optional(),
  endereco_numero: z.string().optional(),
  endereco_complemento: z.string().optional(),
  endereco_bairro: z.string().optional(),
  endereco_cidade: z.string().optional(),
  endereco_uf: z.string().optional(),
  endereco_cep: z.string().optional(),
  contato_telefone: z.string().optional(),
  contato_email: z.string().email("Email inválido").optional().or(z.literal("")),
});

type EmpresaFormData = z.infer<typeof empresaSchema>;

interface EmpresaFormProps {
  empresa?: Company;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EmpresaForm({ empresa, onSuccess, onCancel }: EmpresaFormProps) {
  const form = useForm<EmpresaFormData>({
    resolver: zodResolver(empresaSchema),
    defaultValues: {
      razao_social: empresa?.razao_social || "",
      nome_fantasia: empresa?.nome_fantasia || "",
      cnpj: empresa?.cnpj || "",
      inscricao_estadual: empresa?.inscricao_estadual || "",
      ativo: empresa?.ativo ?? true,
      endereco_logradouro: (empresa?.endereco as any)?.logradouro || "",
      endereco_numero: (empresa?.endereco as any)?.numero || "",
      endereco_complemento: (empresa?.endereco as any)?.complemento || "",
      endereco_bairro: (empresa?.endereco as any)?.bairro || "",
      endereco_cidade: (empresa?.endereco as any)?.cidade || "",
      endereco_uf: (empresa?.endereco as any)?.uf || "",
      endereco_cep: (empresa?.endereco as any)?.cep || "",
      contato_telefone: (empresa?.contato as any)?.telefone || "",
      contato_email: (empresa?.contato as any)?.email || "",
    },
  });

  const onSubmit = async (data: EmpresaFormData) => {
    try {
      const empresaData = {
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia,
        cnpj: data.cnpj.replace(/\D/g, ""),
        inscricao_estadual: data.inscricao_estadual,
        ativo: data.ativo,
        endereco: {
          logradouro: data.endereco_logradouro,
          numero: data.endereco_numero,
          complemento: data.endereco_complemento,
          bairro: data.endereco_bairro,
          cidade: data.endereco_cidade,
          uf: data.endereco_uf,
          cep: data.endereco_cep,
        },
        contato: {
          telefone: data.contato_telefone,
          email: data.contato_email,
        },
      };

      if (empresa) {
        const { error } = await supabase
          .from("companies")
          .update(empresaData)
          .eq("id", empresa.id);

        if (error) throw error;
        toast.success("Empresa atualizada com sucesso!");
      } else {
        const { error } = await supabase.from("companies").insert([empresaData]);

        if (error) throw error;
        toast.success("Empresa cadastrada com sucesso!");
      }

      onSuccess();
    } catch (error: any) {
      toast.error("Erro ao salvar empresa: " + error.message);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="razao_social"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Razão Social *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nome_fantasia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Fantasia *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cnpj"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CNPJ *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="00000000000000" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="inscricao_estadual"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inscrição Estadual</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-2">
          <h3 className="font-medium">Endereço</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="endereco_logradouro"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Logradouro</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endereco_numero"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endereco_complemento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Complemento</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endereco_bairro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bairro</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endereco_cidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endereco_uf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UF</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endereco_cep"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CEP</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-medium">Contato</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="contato_telefone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contato_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="ativo"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="!mt-0">Ativo</FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">
            {empresa ? "Atualizar" : "Cadastrar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
