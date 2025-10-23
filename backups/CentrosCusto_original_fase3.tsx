import { useEffect, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { CostCenter } from "@/lib/supabase-types";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCompany } from "@/lib/company-context";

import { RequireModule } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

const costCenterSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(100),
  codigo: z.string().min(1, "Código é obrigatório").max(50),
  ativo: z.boolean().default(true),
});

type CostCenterFormData = z.infer<typeof costCenterSchema>;

export default function CentrosCusto() {
  const { canCreateModule, canEditModule, canDeleteModule } = usePermissions();
  const [centros, setCentros] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCentro, setEditingCentro] = useState<CostCenter | null>(null);
  const { selectedCompany } = useCompany();

  const form = useForm<CostCenterFormData>({
    resolver: zodResolver(costCenterSchema),
    defaultValues: {
      nome: "",
      codigo: "",
      ativo: true,
    },
  });

  useEffect(() => {
    if (selectedCompany) {
      fetchCentros();
    }
  }, [selectedCompany]);

  const fetchCentros = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("cost_centers")
        .select("*")
        .eq("company_id", selectedCompany?.id)
        .order("nome");

      if (error) throw error;
      setCentros(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar centros de custo:", error);
      toast.error("Erro ao carregar centros de custo: " + error.message);
      setCentros([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: CostCenterFormData) => {
    try {
      const { error } = await supabase
        .from('cost_centers')
        .insert({
          ...data,
          company_id: selectedCompany?.id
        });

      if (error) throw error;
      
      toast.success('Centro de custo criado com sucesso');
      fetchCentros();
      setIsDialogOpen(false);
      form.reset();
    } catch (error: any) {
      toast.error('Erro ao criar centro de custo: ' + error.message);
    }
  };

  const handleUpdate = async (id: string, data: CostCenterFormData) => {
    try {
      const { error } = await supabase
        .from('cost_centers')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Centro de custo atualizado com sucesso');
      fetchCentros();
      setIsDialogOpen(false);
      form.reset();
    } catch (error: any) {
      toast.error('Erro ao atualizar centro de custo: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cost_centers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Centro de custo excluído com sucesso');
      fetchCentros();
    } catch (error: any) {
      toast.error('Erro ao excluir centro de custo: ' + error.message);
    }
  };

  const columns = [
    { header: "Nome", accessor: "nome" as keyof CostCenter },
    { header: "Código", accessor: "codigo" as keyof CostCenter },
    {
      header: "Status",
      accessor: (item: CostCenter) => (
        <Badge variant={item.ativo ? "default" : "secondary"} className={item.ativo ? "badge-success" : ""}>
          {item.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
  ];

  if (loading) return <div>Carregando...</div>;

  return (
    <RequireModule moduleName="cost_centers" action="read">
      <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Centros de Custo</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie os centros de custo da empresa
        </p>
      </div>

      <DataTable
        data={centros}
        columns={columns}
        onNew={handleNew}
        onExport={() => toast.info("Exportação em desenvolvimento")}
        searchPlaceholder="Buscar por nome ou código..."
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCentro ? "Editar" : "Novo"} Centro de Custo</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Centro de Custo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome do centro de custo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="codigo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código *</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o código do centro de custo" {...field} />
                    </FormControl>
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
                        Centro de custo está ativo no sistema
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
