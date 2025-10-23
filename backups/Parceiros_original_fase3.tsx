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

import { RequireModule } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

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
  const { canCreateModule, canEditModule, canDeleteModule } = usePermissions();
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
      tipos: {
        cliente: false,
        fornecedor: false,
        transportador: false,
      },
      ativo: true,
    },
  });

  useEffect(() => {
    fetchParceiros();
  }, []);

  const fetchParceiros = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("razao_social");

      if (error) throw error;
      setParceiros(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar parceiros:", error);
      toast.error("Erro ao carregar parceiros: " + error.message);
      setParceiros([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: PartnerFormData) => {
    try {
      const { error } = await supabase
        .from('partners')
        .insert({
          ...data,
          company_id: selectedCompany?.id
        });

      if (error) throw error;
      
      toast.success('Parceiro criado com sucesso');
      fetchParceiros();
      setIsDialogOpen(false);
      form.reset();
    } catch (error: any) {
      toast.error('Erro ao criar parceiro: ' + error.message);
    }
  };

  const handleUpdate = async (id: string, data: PartnerFormData) => {
    try {
      const { error } = await supabase
        .from('partners')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Parceiro atualizado com sucesso');
      fetchParceiros();
      setIsDialogOpen(false);
      form.reset();
    } catch (error: any) {
      toast.error('Erro ao atualizar parceiro: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('partners')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Parceiro excluído com sucesso');
      fetchParceiros();
    } catch (error: any) {
      toast.error('Erro ao excluir parceiro: ' + error.message);
    }
  };

  const columns = [
    { header: "Razão Social", accessor: "razao_social" as keyof Partner },
    { header: "Nome Fantasia", accessor: "nome_fantasia" as keyof Partner },
    { header: "CNPJ", accessor: "cnpj" as keyof Partner },
    {
      header: "Tipos",
      accessor: (item: Partner) => {
        const tipos = [];
        if (item.tipos?.cliente) tipos.push("Cliente");
        if (item.tipos?.fornecedor) tipos.push("Fornecedor");
        if (item.tipos?.transportador) tipos.push("Transportador");
        return tipos.join(", ");
      },
    },
    {
      header: "Status",
      accessor: (item: Partner) => (
        <Badge variant={item.ativo ? "default" : "secondary"} className={item.ativo ? "badge-success" : ""}>
          {item.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
  ];

  if (loading) return <div>Carregando...</div>;

  return (
    <RequireModule moduleName="partners" action="read">
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
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                    <FormItem>
                      <FormLabel>Razão Social *</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite a razão social" {...field} />
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
                        <Input placeholder="Digite o nome fantasia" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ *</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o CNPJ (apenas números)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipos *</FormLabel>
                    <div className="flex space-x-4">
                      <FormField
                        control={form.control}
                        name="tipos.cliente"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Cliente</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tipos.fornecedor"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Fornecedor</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tipos.transportador"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Transportador</FormLabel>
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
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Ativo</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Parceiro está ativo no sistema
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
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
    </RequireModule>
  );
}
