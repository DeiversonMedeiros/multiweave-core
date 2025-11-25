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

import { RequireEntity } from '@/components/RequireAuth';
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
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
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
    if (selectedCompany) {
      fetchProjetos();
      fetchCentrosCusto();
    }
  }, [selectedCompany]);

  const fetchProjetos = async () => {
    if (!selectedCompany) return;
    
    try {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          cost_center:cost_centers!cost_center_id (
            id,
            codigo,
            nome
          )
        `)
        .eq("company_id", selectedCompany.id)
        .order("codigo");

      if (error) throw error;
      setProjetos(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar projetos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCentrosCusto = async () => {
    if (!selectedCompany) return;
    
    try {
      const { data, error } = await supabase
        .from("cost_centers")
        .select("*")
        .eq("company_id", selectedCompany.id)
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      setCentrosCusto(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar centros de custo:", error);
    }
  };

  const handleNew = () => {
    setEditingProjeto(null);
    form.reset({ nome: "", codigo: "", cost_center_id: "", ativo: true });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: ProjectFormData) => {
    if (!selectedCompany) return;

    try {
      const projetoData = {
        nome: data.nome,
        codigo: data.codigo,
        cost_center_id: data.cost_center_id || null,
        ativo: data.ativo,
        company_id: selectedCompany.id,
      };

      if (editingProjeto) {
        const { error } = await supabase
          .from("projects")
          .update(projetoData)
          .eq("id", editingProjeto.id);

        if (error) throw error;
        toast.success("Projeto atualizado!");
      } else {
        const { error } = await supabase.from("projects").insert([projetoData]);
        if (error) throw error;
        toast.success("Projeto cadastrado!");
      }

      setIsDialogOpen(false);
      fetchProjetos();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    }
  };

  const columns = [
    { header: "Código", accessor: "codigo" as keyof Project },
    { header: "Nome", accessor: "nome" as keyof Project },
    {
      header: "Centro de Custo",
      accessor: (item: any) => {
        const costCenter = item.cost_center;
        if (!costCenter) return "-";
        return `${costCenter.codigo} - ${costCenter.nome}`;
      },
    },
    {
      header: "Status",
      accessor: (item: Project) => (
        <Badge variant={item.ativo ? "default" : "secondary"}>
          {item.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
  ];

  if (loading) return <div>Carregando...</div>;

  return (
    <RequireEntity entityName="projects" action="read">
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
        onNew={handleNew}
        onExport={() => toast.info("Exportação em desenvolvimento")}
        searchPlaceholder="Buscar por código ou nome..."
        newButtonLabel="Novo Projeto"
        showNewButton={canCreateEntity('projects')}
      />

      <PermissionGuard entity="projects" action="create">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProjeto ? "Editar" : "Novo"} Projeto</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="codigo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {centrosCusto.map((cc) => (
                          <SelectItem key={cc.id} value={cc.id}>
                            {cc.codigo} - {cc.nome}
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
      </PermissionGuard>
    </div>
    </RequireEntity>
  );
}
