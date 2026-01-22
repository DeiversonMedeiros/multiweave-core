import { useEffect, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { Project, Partner } from "@/lib/supabase-types";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "@/lib/company-context";

import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

// Tipo para Service (será atualizado quando os tipos do Supabase forem regenerados)
type Service = {
  id: string;
  company_id: string;
  nome: string;
  codigo: string;
  descricao?: string | null;
  project_id?: string | null;
  partner_id?: string | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
  project?: Project | null;
  partner?: Partner | null;
};

const serviceSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(200),
  codigo: z.string().min(1, "Código é obrigatório").max(50),
  descricao: z.string().optional(),
  project_id: z.string().optional().nullable().transform((val) => val === "none" ? null : val),
  partner_id: z.string().optional().nullable().transform((val) => val === "none" ? null : val),
  ativo: z.boolean().default(true),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

export default function Servicos() {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  const [servicos, setServicos] = useState<Service[]>([]);
  const [projetos, setProjetos] = useState<Project[]>([]);
  const [parceiros, setParceiros] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServico, setEditingServico] = useState<Service | null>(null);
  const { selectedCompany } = useCompany();

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      nome: "",
      codigo: "",
      descricao: "",
      project_id: null,
      partner_id: null,
      ativo: true,
    },
  });

  useEffect(() => {
    if (selectedCompany) {
      fetchServicos();
      fetchProjetos();
      fetchParceiros();
    }
  }, [selectedCompany]);

  const fetchServicos = async () => {
    if (!selectedCompany) return;
    
    try {
      const { data, error } = await (supabase as any)
        .from("services")
        .select(`
          *,
          project:projects!project_id (
            id,
            codigo,
            nome
          ),
          partner:partners!partner_id (
            id,
            razao_social,
            nome_fantasia
          )
        `)
        .eq("company_id", selectedCompany.id)
        .order("codigo");

      if (error) throw error;
      setServicos((data || []) as Service[]);
    } catch (error: any) {
      toast.error("Erro ao carregar serviços: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjetos = async () => {
    if (!selectedCompany) return;
    
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("company_id", selectedCompany.id)
        .eq("ativo", true)
        .order("codigo");

      if (error) throw error;
      setProjetos(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar projetos:", error);
    }
  };

  const fetchParceiros = async () => {
    if (!selectedCompany) return;
    
    try {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("company_id", selectedCompany.id)
        .eq("ativo", true)
        .order("razao_social");

      if (error) throw error;
      // Filtrar apenas parceiros que são clientes
      const clientes = (data || []).filter((partner) => 
        partner.tipo && Array.isArray(partner.tipo) && partner.tipo.includes("cliente")
      );
      setParceiros(clientes);
    } catch (error: any) {
      console.error("Erro ao carregar parceiros:", error);
    }
  };

  const handleNew = async () => {
    setEditingServico(null);
    
    // Gerar código automaticamente quando criar novo serviço
    if (selectedCompany) {
      try {
        const { data, error } = await (supabase as any).rpc('get_next_service_code', {
          p_company_id: selectedCompany.id
        });
        
        if (error) throw error;
        
        const codigoGerado = typeof data === 'string' ? data : (data || "");
        
        form.reset({ 
          nome: "", 
          codigo: codigoGerado, 
          descricao: "",
          project_id: null, 
          partner_id: null,
          ativo: true 
        });
      } catch (error: any) {
        console.error("Erro ao gerar código do serviço:", error);
        form.reset({ 
          nome: "", 
          codigo: "", 
          descricao: "",
          project_id: null, 
          partner_id: null,
          ativo: true 
        });
      }
    } else {
      form.reset({ 
        nome: "", 
        codigo: "", 
        descricao: "",
        project_id: null, 
        partner_id: null,
        ativo: true 
      });
    }
    
    setIsDialogOpen(true);
  };

  const handleEdit = (servico: Service) => {
    setEditingServico(servico);
    form.reset({
      nome: servico.nome,
      codigo: servico.codigo,
      descricao: servico.descricao || "",
      project_id: servico.project_id || "none",
      partner_id: servico.partner_id || "none",
      ativo: servico.ativo,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (servico: Service) => {
    if (!confirm(`Deseja realmente excluir o serviço "${servico.nome}"?`)) return;

    try {
      const { error } = await (supabase as any)
        .from("services")
        .delete()
        .eq("id", servico.id);

      if (error) throw error;
      toast.success("Serviço excluído!");
      fetchServicos();
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  const onSubmit = async (data: ServiceFormData) => {
    if (!selectedCompany) return;

    try {
      const serviceData = {
        nome: data.nome,
        codigo: data.codigo,
        descricao: data.descricao || null,
        project_id: data.project_id || null,
        partner_id: data.partner_id || null,
        ativo: data.ativo,
        company_id: selectedCompany.id,
      };

      if (editingServico) {
        const { error } = await (supabase as any)
          .from("services")
          .update(serviceData)
          .eq("id", editingServico.id);

        if (error) throw error;
        toast.success("Serviço atualizado!");
      } else {
        const { error } = await (supabase as any).from("services").insert([serviceData]);
        if (error) throw error;
        toast.success("Serviço cadastrado!");
      }

      setIsDialogOpen(false);
      fetchServicos();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    }
  };

  const columns = [
    { header: "Código", accessor: "codigo" as keyof Service },
    { header: "Nome", accessor: "nome" as keyof Service },
    {
      header: "Projeto",
      accessor: (item: any) => {
        const project = item.project;
        if (!project) return "-";
        return `${project.codigo} - ${project.nome}`;
      },
    },
    {
      header: "Cliente",
      accessor: (item: any) => {
        const partner = item.partner;
        if (!partner) return "-";
        return partner.nome_fantasia || partner.razao_social;
      },
    },
    {
      header: "Status",
      accessor: (item: Service) => (
        <Badge variant={item.ativo ? "default" : "secondary"}>
          {item.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      header: "Ações",
      accessor: (item: Service) => (
        <div className="flex gap-2">
          {canEditPage('/cadastros/servicos*') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(item)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {canDeletePage('/cadastros/servicos*') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(item)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (loading) return <div>Carregando...</div>;

  return (
    <RequirePage pagePath="/cadastros/servicos*" action="read">
      <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Serviços</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie os serviços da empresa
        </p>
      </div>

      <DataTable
        data={servicos}
        columns={columns}
        onNew={canCreatePage('/cadastros/servicos*') ? handleNew : undefined}
        onExport={() => toast.info("Exportação em desenvolvimento")}
        searchPlaceholder="Buscar por código ou nome..."
        newButtonLabel="Novo Serviço"
      />

      <PermissionGuard entity="services" action="create">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingServico ? "Editar" : "Novo"} Serviço</DialogTitle>
            <DialogDescription>
              {editingServico ? "Edite as informações do serviço" : "Preencha os dados para cadastrar um novo serviço"}
            </DialogDescription>
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
                      <Input 
                        {...field} 
                        readOnly={!editingServico} 
                        className={!editingServico ? "bg-muted cursor-not-allowed" : ""} 
                      />
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
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projeto</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? null : value)} 
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um projeto..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {projetos.map((projeto) => (
                          <SelectItem key={projeto.id} value={projeto.id}>
                            {projeto.codigo} - {projeto.nome}
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
                name="partner_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? null : value)} 
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um cliente..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {parceiros.map((parceiro) => (
                          <SelectItem key={parceiro.id} value={parceiro.id}>
                            {parceiro.nome_fantasia || parceiro.razao_social}
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
    </RequirePage>
  );
}

