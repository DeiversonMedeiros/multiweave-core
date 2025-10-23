import { useEffect, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { Material } from "@/lib/supabase-types";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCompany } from "@/lib/company-context";

import { RequireModule } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

const materialSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(200),
  codigo: z.string().min(1, "Código é obrigatório").max(50),
  tipo: z.enum(["produto", "servico", "materia_prima"]),
  unidade_medida: z.string().min(1, "Unidade de medida é obrigatória"),
  classe: z.string().optional(),
  ncm: z.string().optional(),
  cfop: z.string().optional(),
  cst: z.string().optional(),
  ativo: z.boolean().default(true),
});

type MaterialFormData = z.infer<typeof materialSchema>;

export default function Materiais() {
  const { canCreateModule, canEditModule, canDeleteModule } = usePermissions();
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const { selectedCompany } = useCompany();

  const form = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      nome: "",
      codigo: "",
      tipo: "produto",
      unidade_medida: "",
      classe: "",
      ncm: "",
      cfop: "",
      cst: "",
      ativo: true,
    },
  });

  useEffect(() => {
    fetchMateriais();
  }, []);

  const fetchMateriais = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .order("nome");

      if (error) throw error;
      setMateriais(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar materiais:", error);
      toast.error("Erro ao carregar materiais: " + error.message);
      setMateriais([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: MaterialFormData) => {
    try {
      const { error } = await supabase
        .from('materials')
        .insert({
          ...data,
          company_id: selectedCompany?.id
        });

      if (error) throw error;
      
      toast.success('Material criado com sucesso');
      fetchMateriais();
      setIsDialogOpen(false);
      form.reset();
    } catch (error: any) {
      toast.error('Erro ao criar material: ' + error.message);
    }
  };

  const handleUpdate = async (id: string, data: MaterialFormData) => {
    try {
      const { error } = await supabase
        .from('materials')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Material atualizado com sucesso');
      fetchMateriais();
      setIsDialogOpen(false);
      form.reset();
    } catch (error: any) {
      toast.error('Erro ao atualizar material: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Material excluído com sucesso');
      fetchMateriais();
    } catch (error: any) {
      toast.error('Erro ao excluir material: ' + error.message);
    }
  };

  const columns = [
    { header: "Nome", accessor: "nome" as keyof Material },
    { header: "Código", accessor: "codigo" as keyof Material },
    { header: "Tipo", accessor: "tipo" as keyof Material },
    { header: "Unidade", accessor: "unidade_medida" as keyof Material },
    {
      header: "Status",
      accessor: (item: Material) => (
        <Badge variant={item.ativo ? "default" : "secondary"} className={item.ativo ? "badge-success" : ""}>
          {item.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
  ];

  if (loading) return <div>Carregando...</div>;

  return (
    <RequireModule moduleName="materials" action="read">
      <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Materiais</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie os materiais e produtos da empresa
        </p>
      </div>

      <DataTable
        data={materiais}
        columns={columns}
        onNew={handleNew}
        onExport={() => toast.info("Exportação em desenvolvimento")}
        searchPlaceholder="Buscar por nome ou código..."
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMaterial ? "Editar" : "Novo"} Material</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Material *</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o nome do material" {...field} />
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
                        <Input placeholder="Digite o código do material" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="produto">Produto</SelectItem>
                          <SelectItem value="servico">Serviço</SelectItem>
                          <SelectItem value="materia_prima">Matéria Prima</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unidade_medida"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade de Medida *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: UN, KG, M" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="classe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Classe</FormLabel>
                      <FormControl>
                        <Input placeholder="Classe do material" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ncm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NCM</FormLabel>
                      <FormControl>
                        <Input placeholder="Código NCM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cfop"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CFOP</FormLabel>
                      <FormControl>
                        <Input placeholder="Código CFOP" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="cst"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CST</FormLabel>
                    <FormControl>
                      <Input placeholder="Código CST" {...field} />
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
                        Material está ativo no sistema
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
