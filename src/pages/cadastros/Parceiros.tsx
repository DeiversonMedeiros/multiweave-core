import { useEffect, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { Partner } from "@/lib/supabase-types";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCompany } from "@/lib/company-context";

const partnerSchema = z.object({
  razao_social: z.string().min(3, "Razão social deve ter no mínimo 3 caracteres").max(200),
  nome_fantasia: z.string().optional(),
  cnpj: z.string().regex(/^\d{14}$/, "CNPJ deve ter 14 dígitos"),
  tipos: z.object({
    cliente: z.boolean(),
    fornecedor: z.boolean(),
    transportador: z.boolean(),
  }).refine(data => data.cliente || data.fornecedor || data.transportador, {
    message: "Selecione pelo menos um tipo",
  }),
  ativo: z.boolean().default(true),
});

type PartnerFormData = z.infer<typeof partnerSchema>;

export default function Parceiros() {
  const [parceiros, setParceiros] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingParceiro, setEditingParceiro] = useState<Partner | null>(null);
  const { selectedCompany } = useCompany();

  const form = useForm<PartnerFormData>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      razao_social: "",
      nome_fantasia: "",
      cnpj: "",
      tipos: { cliente: false, fornecedor: false, transportador: false },
      ativo: true,
    },
  });

  useEffect(() => {
    if (selectedCompany) {
      fetchParceiros();
    }
  }, [selectedCompany]);

  const fetchParceiros = async () => {
    if (!selectedCompany) return;
    
    try {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("company_id", selectedCompany.id)
        .order("razao_social");

      if (error) throw error;
      setParceiros(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar parceiros: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setEditingParceiro(null);
    form.reset({
      razao_social: "",
      nome_fantasia: "",
      cnpj: "",
      tipos: { cliente: false, fornecedor: false, transportador: false },
      ativo: true,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: PartnerFormData) => {
    if (!selectedCompany) return;

    try {
      const tipos: ("cliente" | "fornecedor" | "transportador")[] = [];
      if (data.tipos.cliente) tipos.push("cliente");
      if (data.tipos.fornecedor) tipos.push("fornecedor");
      if (data.tipos.transportador) tipos.push("transportador");

      const parceiroData = {
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia || null,
        cnpj: data.cnpj.replace(/\D/g, ""),
        tipo: tipos,
        ativo: data.ativo,
        company_id: selectedCompany.id,
      };

      if (editingParceiro) {
        const { error } = await supabase
          .from("partners")
          .update(parceiroData)
          .eq("id", editingParceiro.id);

        if (error) throw error;
        toast.success("Parceiro atualizado!");
      } else {
        const { error } = await supabase.from("partners").insert([parceiroData]);
        if (error) throw error;
        toast.success("Parceiro cadastrado!");
      }

      setIsDialogOpen(false);
      fetchParceiros();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    }
  };

  const columns = [
    { header: "Razão Social", accessor: "razao_social" as keyof Partner },
    { header: "Nome Fantasia", accessor: "nome_fantasia" as keyof Partner },
    { header: "CNPJ", accessor: "cnpj" as keyof Partner },
    {
      header: "Tipos",
      accessor: (item: Partner) => (
        <div className="flex gap-1">
          {(item.tipo as string[]).map((t: string) => (
            <Badge key={t} variant="outline" className="text-xs">
              {t}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      header: "Status",
      accessor: (item: Partner) => (
        <Badge variant={item.ativo ? "default" : "secondary"}>
          {item.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
  ];

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Parceiros</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie clientes, fornecedores e transportadores
        </p>
      </div>

      <DataTable
        data={parceiros}
        columns={columns}
        onNew={handleNew}
        onExport={() => toast.info("Exportação em desenvolvimento")}
        searchPlaceholder="Buscar por razão social ou CNPJ..."
        newButtonLabel="Novo Parceiro"
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingParceiro ? "Editar" : "Novo"} Parceiro</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="razao_social"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
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
                      <FormLabel>Nome Fantasia</FormLabel>
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
              </div>

              <FormField
                control={form.control}
                name="tipos"
                render={() => (
                  <FormItem>
                    <FormLabel>Tipo de Parceiro *</FormLabel>
                    <div className="flex gap-4">
                      <FormField
                        control={form.control}
                        name="tipos.cliente"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="!mt-0">Cliente</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tipos.fornecedor"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="!mt-0">Fornecedor</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tipos.transportador"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="!mt-0">Transportador</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ativo"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">Ativo</FormLabel>
                  </FormItem>
                )}
              />

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
