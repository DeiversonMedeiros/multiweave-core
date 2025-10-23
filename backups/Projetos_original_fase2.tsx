import { useEffect, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { Project, CostCenter } from "@/lib/supabase-types";
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

const projectSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(100),
  codigo: z.string().min(1, "Código é obrigatório").max(50),
  cost_center_id: z.string().optional(),
  ativo: z.boolean().default(true),
});

type ProjectFormData = z.infer<typeof projectSchema>;

export default function Projetos() {
  const { canCreateModule, canEditModule, canDeleteModule } = usePermissions();
  const [projetos, setProjetos] = useState<Project[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProjeto, setEditingProjeto] = useState<Project | null>(null);
  const { selectedCompany } = useCompany();

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      nome: "",
      codigo: "",
      cost_center_id: "",
      ativo: true,
    },
  });

  useEffect(() => {
    fetchProjetos();
    fetchCentrosCusto();
  }, []);

  const fetchProjetos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          cost_centers (
            id,
            nome
          )
        `)
        .order("nome");

      if (error) throw error;
      setProjetos(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar projetos:", error);
      toast.error("Erro ao carregar projetos: " + error.message);
      setProjetos([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCentrosCusto = async () => {
    try {
      const { data, error } = await supabase
        .from("cost_centers")
        .select("*")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      setCentrosCusto(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar centros de custo:", error);
    }
  };

  const handleCreate = async (data: ProjectFormData) => {
    try {
      const { error } = await supabase
        .from('projects')
        .insert({
          ...data,
          company_id: selectedCompany?.id
        });

      if (error) throw error;
      
      toast.success('Projeto criado com sucesso');
      fetchProjetos();
      setIsDialogOpen(false);
      form.reset();
    } catch (error: any) {
      toast.error('Erro ao criar projeto: ' + error.message);
    }
  };

  const handleUpdate = async (id: string, data: ProjectFormData) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Projeto atualizado com sucesso');
      fetchProjetos();
      setIsDialogOpen(false);
      form.reset();
    } catch (error: any) {
      toast.error('Erro ao atualizar projeto: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Projeto excluído com sucesso');
      fetchProjetos();
    } catch (error: any) {
      toast.error('Erro ao excluir projeto: ' + error.message);
    }
  };

  const columns = [
    { header: "Nome", accessor: "nome" as keyof Project },
    { header: "Código", accessor: "codigo" as keyof Project },
    { 
      header: "Centro de Custo", 
      accessor: (item: Project) => item.cost_centers?.nome || "N/A"
    },
    {
      header: "Status",
      accessor: (item: Project) => (
        <Badge variant={item.ativo ? "default" : "secondary"} className={item.ativo ? "badge-success" : ""}>
          {item.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
  ];

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <RequireModule moduleName="projects" action="read">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Projetos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os projetos da empresa
          </p>
        </div>

        <DataTable
          data={projetos}
          columns={columns}
          onNew={() => {
            setEditingProjeto(null);
            setIsDialogOpen(true);
            form.reset();
          }}
          onEdit={(projeto) => {
            setEditingProjeto(projeto);
            form.reset({
              nome: projeto.nome,
              codigo: projeto.codigo,
              cost_center_id: projeto.cost_center_id || "",
              ativo: projeto.ativo,
            });
            setIsDialogOpen(true);
          }}
          onDelete={handleDelete}
          onExport={() => toast.info("Exportação em desenvolvimento")}
          searchPlaceholder="Buscar por nome ou código..."
          newButtonLabel="Novo Projeto"
          showNewButton={canCreateModule('projects')}
        />

        <PermissionGuard module="projects" action="create">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingProjeto ? "Editar" : "Novo"} Projeto
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(editingProjeto ? 
                  (data) => handleUpdate(editingProjeto.id, data) : 
                  handleCreate
                )} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Projeto</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite o nome do projeto" {...field} />
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
                        <FormLabel>Código</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite o código do projeto" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cost_center_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Centro de Custo</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um centro de custo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {centrosCusto.map((centro) => (
                              <SelectItem key={centro.id} value={centro.id}>
                                {centro.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                            Projeto está ativo no sistema
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

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingProjeto ? "Atualizar" : "Criar"} Projeto
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </PermissionGuard>
      </div>
    </RequireModule>
  );
}
