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
import { ImageUpload } from "@/components/ui/image-upload";
import { STORAGE_BUCKETS } from "@/config/storage";

const empresaSchema = z.object({
  razao_social: z.string().min(3, "Razão social deve ter no mínimo 3 caracteres").max(200),
  nome_fantasia: z.string().min(3, "Nome fantasia deve ter no mínimo 3 caracteres").max(200),
  cnpj: z.string().regex(/^\d{14}$/, "CNPJ deve ter 14 dígitos"),
  inscricao_estadual: z.string().optional(),
  numero_empresa: z.string().optional(),
  ativo: z.boolean().default(true),
  logo_url: z.string().optional().nullable(),
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
      numero_empresa: empresa?.numero_empresa || "",
      ativo: empresa?.ativo ?? true,
      logo_url: empresa?.logo_url || null,
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
      // Função auxiliar para converter strings vazias em null
      const emptyToNull = (value: string | undefined | null): string | null => {
        return value && value.trim() !== "" ? value.trim() : null;
      };

      // Construir objeto endereco apenas com campos preenchidos
      const endereco: Record<string, string> = {};
      if (data.endereco_logradouro?.trim()) endereco.logradouro = data.endereco_logradouro.trim();
      if (data.endereco_numero?.trim()) endereco.numero = data.endereco_numero.trim();
      if (data.endereco_complemento?.trim()) endereco.complemento = data.endereco_complemento.trim();
      if (data.endereco_bairro?.trim()) endereco.bairro = data.endereco_bairro.trim();
      if (data.endereco_cidade?.trim()) endereco.cidade = data.endereco_cidade.trim();
      if (data.endereco_uf?.trim()) endereco.uf = data.endereco_uf.trim();
      if (data.endereco_cep?.trim()) endereco.cep = data.endereco_cep.trim();

      // Construir objeto contato apenas com campos preenchidos
      const contato: Record<string, string> = {};
      if (data.contato_telefone?.trim()) contato.telefone = data.contato_telefone.trim();
      if (data.contato_email?.trim()) contato.email = data.contato_email.trim();

      const empresaData: any = {
        razao_social: data.razao_social.trim(),
        nome_fantasia: data.nome_fantasia.trim(),
        cnpj: data.cnpj.replace(/\D/g, ""),
        inscricao_estadual: emptyToNull(data.inscricao_estadual),
        numero_empresa: emptyToNull(data.numero_empresa), // Se vazio, será gerado automaticamente pelo trigger
        ativo: data.ativo,
        endereco: Object.keys(endereco).length > 0 ? endereco : null,
        contato: Object.keys(contato).length > 0 ? contato : null,
      };

      // Adicionar logo_url apenas se tiver valor (evita erro se coluna não existir)
      // A migração deve ser aplicada para que este campo funcione
      if (data.logo_url) {
        empresaData.logo_url = data.logo_url;
      }

      if (empresa) {
        // Tentar atualizar com logo_url primeiro
        let { data, error } = await supabase
          .from("companies")
          .update(empresaData)
          .eq("id", empresa.id)
          .select();

        // Se erro for relacionado a logo_url não existir, tentar sem o campo
        if (error && error.code === 'PGRST204' && error.message?.includes('logo_url')) {
          console.warn("Campo logo_url não encontrado. Tentando atualizar sem o campo...");
          const { logo_url, ...empresaDataWithoutLogo } = empresaData;
          const retryResult = await supabase
            .from("companies")
            .update(empresaDataWithoutLogo)
            .eq("id", empresa.id)
            .select();
          
          if (retryResult.error) {
            console.error("Erro ao atualizar empresa:", retryResult.error);
            console.error("Dados enviados:", empresaDataWithoutLogo);
            throw retryResult.error;
          }
          
          data = retryResult.data;
          toast.warning("Empresa atualizada, mas logo não foi salva. Aplique a migração para adicionar o campo logo_url.");
        } else if (error) {
          console.error("Erro ao atualizar empresa:", error);
          console.error("Dados enviados:", empresaData);
          throw error;
        } else {
          toast.success("Empresa atualizada com sucesso!");
        }
      } else {
        // Tentar inserir com logo_url primeiro
        let { data, error } = await supabase
          .from("companies")
          .insert([empresaData])
          .select();

        // Se erro for relacionado a logo_url não existir, tentar sem o campo
        if (error && error.code === 'PGRST204' && error.message?.includes('logo_url')) {
          console.warn("Campo logo_url não encontrado. Tentando inserir sem o campo...");
          const { logo_url, ...empresaDataWithoutLogo } = empresaData;
          const retryResult = await supabase
            .from("companies")
            .insert([empresaDataWithoutLogo])
            .select();
          
          if (retryResult.error) {
            console.error("Erro ao criar empresa:", retryResult.error);
            console.error("Dados enviados:", empresaDataWithoutLogo);
            throw retryResult.error;
          }
          
          data = retryResult.data;
          toast.warning("Empresa cadastrada, mas logo não foi salva. Aplique a migração para adicionar o campo logo_url.");
        } else if (error) {
          console.error("Erro ao criar empresa:", error);
          console.error("Dados enviados:", empresaData);
          throw error;
        } else {
          toast.success("Empresa cadastrada com sucesso!");
        }
      }

      onSuccess();
    } catch (error: any) {
      console.error("Erro completo:", error);
      const errorMessage = error.message || error.details || "Erro desconhecido ao salvar empresa";
      toast.error("Erro ao salvar empresa: " + errorMessage);
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

          <FormField
            control={form.control}
            name="numero_empresa"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número da Empresa</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Deixe em branco para gerar automaticamente" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="logo_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Logo da Empresa</FormLabel>
              <FormControl>
                <ImageUpload
                  value={field.value || undefined}
                  onChange={(url) => field.onChange(url)}
                  label=""
                  description="Clique para fazer upload da logo da empresa"
                  maxSize={5}
                  acceptedTypes={['image/jpeg', 'image/jpg', 'image/png', 'image/webp']}
                  bucket={STORAGE_BUCKETS.COMPANY_LOGOS}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
