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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatDate } from "@/utils/dateUtils";
import { toast } from "sonner";
import { useCompany } from "@/lib/company-context";
import { useQueryClient } from "@tanstack/react-query";

import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

const projectSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(100),
  codigo: z.string().min(1, "Código é obrigatório").max(50),
  cost_center_id: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
  regiao: z.enum(["CENTRO-OESTE", "NORDESTE", "NORTE", "SUDESTE", "SUL"]).optional().nullable(),
  data_inicio: z.date().optional().nullable(),
  ativo: z.boolean().default(true),
});

// Lista de estados brasileiros
const ESTADOS_BRASIL = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
];

// Lista de regiões brasileiras
const REGIOES_BRASIL = [
  { value: "CENTRO-OESTE", label: "Centro-Oeste" },
  { value: "NORDESTE", label: "Nordeste" },
  { value: "NORTE", label: "Norte" },
  { value: "SUDESTE", label: "Sudeste" },
  { value: "SUL", label: "Sul" },
];

// Mapeamento de UF para Região
const UF_PARA_REGIAO: Record<string, "CENTRO-OESTE" | "NORDESTE" | "NORTE" | "SUDESTE" | "SUL"> = {
  // Norte
  "AC": "NORTE",
  "AP": "NORTE",
  "AM": "NORTE",
  "PA": "NORTE",
  "RO": "NORTE",
  "RR": "NORTE",
  "TO": "NORTE",
  // Nordeste
  "AL": "NORDESTE",
  "BA": "NORDESTE",
  "CE": "NORDESTE",
  "MA": "NORDESTE",
  "PB": "NORDESTE",
  "PE": "NORDESTE",
  "PI": "NORDESTE",
  "RN": "NORDESTE",
  "SE": "NORDESTE",
  // Centro-Oeste
  "DF": "CENTRO-OESTE",
  "GO": "CENTRO-OESTE",
  "MT": "CENTRO-OESTE",
  "MS": "CENTRO-OESTE",
  // Sudeste
  "ES": "SUDESTE",
  "MG": "SUDESTE",
  "RJ": "SUDESTE",
  "SP": "SUDESTE",
  // Sul
  "PR": "SUL",
  "RS": "SUL",
  "SC": "SUL",
};

type ProjectFormData = z.infer<typeof projectSchema>;

export default function Projetos() {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  const [projetos, setProjetos] = useState<Project[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProjeto, setEditingProjeto] = useState<Project | null>(null);
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      nome: "",
      codigo: "",
      cost_center_id: "",
      cidade: "",
      uf: "",
      regiao: null,
      data_inicio: null,
      ativo: true,
    },
  });

  useEffect(() => {
    if (selectedCompany) {
      fetchProjetos();
      fetchCentrosCusto();
    }
  }, [selectedCompany]);

  // Observar mudanças no campo UF para atualizar Região automaticamente
  const ufValue = form.watch("uf");

  useEffect(() => {
    if (ufValue && UF_PARA_REGIAO[ufValue]) {
      form.setValue("regiao", UF_PARA_REGIAO[ufValue]);
    } else if (!ufValue) {
      // Se UF for removida, limpar Região também
      form.setValue("regiao", null);
    }
  }, [ufValue, form]);

  // Preencher formulário quando editar projeto
  useEffect(() => {
    if (editingProjeto) {
      const regiaoValue = (editingProjeto as any).regiao;
      const ufValue = (editingProjeto as any).uf;
      
      // Se não tiver região mas tiver UF, usar o mapeamento
      const regiaoFinal = regiaoValue && REGIOES_BRASIL.some(r => r.value === regiaoValue) 
        ? regiaoValue 
        : (ufValue && UF_PARA_REGIAO[ufValue] ? UF_PARA_REGIAO[ufValue] : null);
      
      form.reset({
        nome: editingProjeto.nome || "",
        codigo: editingProjeto.codigo || "",
        cost_center_id: editingProjeto.cost_center_id || "",
        cidade: (editingProjeto as any).cidade || "",
        uf: ufValue || "",
        regiao: regiaoFinal,
        data_inicio: (editingProjeto as any).data_inicio 
          ? new Date((editingProjeto as any).data_inicio) 
          : null,
        ativo: editingProjeto.ativo ?? true,
      });
    }
  }, [editingProjeto, form]);

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

  const handleNew = async () => {
    setEditingProjeto(null);
    
    // Gerar código automaticamente quando criar novo projeto
    if (selectedCompany) {
      try {
        const { data, error } = await (supabase as any).rpc('get_next_project_code', {
          p_company_id: selectedCompany.id
        });
        
        if (error) throw error;
        
        const codigoGerado = typeof data === 'string' ? data : (data || "");
        
        form.reset({ 
          nome: "", 
          codigo: codigoGerado, 
          cost_center_id: "", 
          cidade: "",
          uf: "",
          regiao: null,
          data_inicio: null,
          ativo: true 
        });
      } catch (error: any) {
        console.error("Erro ao gerar código do projeto:", error);
        form.reset({ 
          nome: "", 
          codigo: "", 
          cost_center_id: "", 
          cidade: "",
          uf: "",
          regiao: null,
          data_inicio: null,
          ativo: true 
        });
      }
    } else {
      form.reset({ 
        nome: "", 
        codigo: "", 
        cost_center_id: "", 
        cidade: "",
        uf: "",
        regiao: null,
        data_inicio: null,
        ativo: true 
      });
    }
    
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: ProjectFormData) => {
    if (!selectedCompany) return;

    try {
      const projetoData = {
        nome: data.nome,
        codigo: data.codigo,
        cost_center_id: data.cost_center_id || null,
        cidade: data.cidade || null,
        uf: data.uf || null,
        regiao: data.regiao || null,
        data_inicio: data.data_inicio ? format(data.data_inicio, 'yyyy-MM-dd') : null,
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

      // Invalidar cache do React Query para atualizar outras páginas
      if (selectedCompany?.id) {
        queryClient.invalidateQueries({ queryKey: ['public', 'projects', selectedCompany.id] });
        queryClient.invalidateQueries({ queryKey: ['public', 'projects', 'active', selectedCompany.id] });
      }

      setIsDialogOpen(false);
      fetchProjetos();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    }
  };

  const handleEdit = (projeto: Project) => {
    setEditingProjeto(projeto);
    setIsDialogOpen(true);
  };

  const handleDelete = async (projeto: Project) => {
    if (!confirm(`Tem certeza que deseja excluir o projeto "${projeto.nome}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projeto.id);

      if (error) throw error;
      
      // Invalidar cache do React Query para atualizar outras páginas
      if (selectedCompany?.id) {
        queryClient.invalidateQueries({ queryKey: ['public', 'projects', selectedCompany.id] });
        queryClient.invalidateQueries({ queryKey: ['public', 'projects', 'active', selectedCompany.id] });
      }
      
      toast.success("Projeto excluído!");
      fetchProjetos();
    } catch (error: any) {
      toast.error("Erro ao excluir projeto: " + error.message);
    }
  };

  // Função auxiliar para obter o label da região
  const getRegiaoLabel = (regiaoValue: string | null | undefined): string => {
    if (!regiaoValue) return "-";
    const regiao = REGIOES_BRASIL.find(r => r.value === regiaoValue);
    return regiao ? regiao.label : regiaoValue;
  };

  const columns = [
    { header: "Código", accessor: "codigo" as keyof Project },
    { header: "Nome", accessor: "nome" as keyof Project },
    {
      header: "Região",
      accessor: (item: any) => {
        const regiao = (item as any).regiao;
        return regiao ? getRegiaoLabel(regiao) : "-";
      },
    },
    {
      header: "UF",
      accessor: (item: any) => {
        const uf = (item as any).uf;
        return uf || "-";
      },
    },
    {
      header: "Data Início",
      accessor: (item: any) => {
        const dataInicio = (item as any).data_inicio;
        return formatDate(dataInicio);
      },
    },
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
    {
      header: "Ações",
      accessor: (item: Project) => (
        <div className="flex gap-2">
          {canEditPage('/cadastros/projetos*') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(item)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {canDeletePage('/cadastros/projetos*') && (
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
    <RequirePage pagePath="/cadastros/projetos*" action="read">
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
        onNew={canCreatePage('/cadastros/projetos*') ? handleNew : undefined}
        onExport={() => toast.info("Exportação em desenvolvimento")}
        searchPlaceholder="Buscar por código ou nome..."
        newButtonLabel="Novo Projeto"
      />

      {(canCreatePage('/cadastros/projetos*') || canEditPage('/cadastros/projetos*')) && (
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
                      <Input {...field} readOnly={!editingProjeto} className={!editingProjeto ? "bg-muted cursor-not-allowed" : ""} />
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Digite a cidade" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="uf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UF</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ESTADOS_BRASIL.map((estado) => (
                            <SelectItem key={estado.value} value={estado.value}>
                              {estado.value} - {estado.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="regiao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Região</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "" ? null : value)} 
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {REGIOES_BRASIL.map((regiao) => (
                          <SelectItem key={regiao.value} value={regiao.value}>
                            {regiao.label}
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
                name="data_inicio"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data Início</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ptBR })
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
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
      )}
    </div>
    </RequirePage>
  );
}
