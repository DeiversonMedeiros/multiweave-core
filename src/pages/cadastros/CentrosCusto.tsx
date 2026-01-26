import { useEffect, useState, useMemo } from "react";
import { DataTable } from "@/components/DataTable";
import { CostCenter } from "@/lib/supabase-types";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useCompany } from "@/lib/company-context";
import { Employee } from "@/integrations/supabase/rh-types";
import { ChevronRight, ChevronDown } from "lucide-react";
import { useRHData } from "@/hooks/generic/useEntityData";

import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

const costCenterSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(100),
  codigo: z.string().min(1, "Código é obrigatório").max(50),
  descricao: z.string().max(500).optional(),
  tipo: z.enum(['producao', 'administrativo', 'comercial', 'financeiro', 'operacional', 'outros']).default('outros'),
  responsavel_id: z.string().uuid().optional().nullable(),
  data_inicio: z.string().optional().nullable(),
  data_fim: z.string().optional().nullable(),
  orcamento_anual: z.string().optional().nullable().transform((val) => val ? parseFloat(val) : null),
  observacoes: z.string().max(1000).optional(),
  parent_id: z.string().uuid().optional().nullable(),
  ativo: z.boolean().default(true),
});

type CostCenterFormData = z.infer<typeof costCenterSchema>;

interface CostCenterWithChildren extends CostCenter {
  children?: CostCenterWithChildren[];
  parent?: CostCenterWithChildren;
  nivel?: number;
}

export default function CentrosCusto() {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  const [centros, setCentros] = useState<CostCenter[]>([]);
  const [centrosHierarquicos, setCentrosHierarquicos] = useState<CostCenterWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCentro, setEditingCentro] = useState<CostCenter | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('tree');
  const { selectedCompany } = useCompany();

  const { data: employeesData = [], isLoading: employeesLoading } = useRHData<Employee>(
    'employees',
    selectedCompany?.id || '',
    undefined
  );

  const employees = useMemo(() => {
    const list = (employeesData as Employee[]) || [];
    const active = list.filter((emp) => (emp as any).status === 'ativo');
    return active.length > 0 ? active : list;
  }, [employeesData]);

  const form = useForm<CostCenterFormData>({
    resolver: zodResolver(costCenterSchema),
    defaultValues: {
      nome: "",
      codigo: "",
      descricao: "",
      tipo: "outros",
      responsavel_id: null,
      data_inicio: null,
      data_fim: null,
      orcamento_anual: null,
      observacoes: "",
      parent_id: null,
      ativo: true,
    },
  });

  useEffect(() => {
    if (selectedCompany) {
      fetchCentros();
    }
  }, [selectedCompany]);

  const fetchCentros = async () => {
    if (!selectedCompany) return;
    
    try {
      const { data, error } = await supabase
        .from("cost_centers")
        .select("*")
        .eq("company_id", selectedCompany.id)
        .order("codigo");

      if (error) throw error;
      setCentros(data || []);
      buildHierarchy(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar centros de custo: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const buildHierarchy = (centros: CostCenter[]) => {
    const centroMap = new Map<string, CostCenterWithChildren>();
    const roots: CostCenterWithChildren[] = [];

    // Primeiro, criar mapa de todos os centros
    centros.forEach(centro => {
      centroMap.set(centro.id, { ...centro, children: [], nivel: 0 });
    });

    // Depois, construir a hierarquia
    centroMap.forEach((centro, id) => {
      const parentId = (centro as any).parent_id;
      if (parentId) {
        const parent = centroMap.get(parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(centro);
          centro.parent = parent;
          centro.nivel = (parent.nivel || 0) + 1;
        } else {
          // Parent não encontrado, tratar como raiz
          roots.push(centro);
        }
      } else {
        roots.push(centro);
      }
    });

    // Ordenar por código
    const sortByCode = (a: CostCenterWithChildren, b: CostCenterWithChildren) => {
      return a.codigo.localeCompare(b.codigo);
    };

    roots.sort(sortByCode);
    roots.forEach(root => {
      if (root.children) {
        root.children.sort(sortByCode);
      }
    });

    setCentrosHierarquicos(roots);
  };

  const handleNew = () => {
    setEditingCentro(null);
    form.reset({
      nome: "",
      codigo: "",
      descricao: "",
      tipo: "outros",
      responsavel_id: null,
      data_inicio: null,
      data_fim: null,
      orcamento_anual: null,
      observacoes: "",
      parent_id: null,
      ativo: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (centro: CostCenter) => {
    setEditingCentro(centro);
    form.reset({
      nome: centro.nome,
      codigo: centro.codigo,
      descricao: (centro as any).descricao || "",
      tipo: (centro as any).tipo || "outros",
      responsavel_id: (centro as any).responsavel_id || null,
      data_inicio: (centro as any).data_inicio || null,
      data_fim: (centro as any).data_fim || null,
      orcamento_anual: (centro as any).orcamento_anual?.toString() || null,
      observacoes: (centro as any).observacoes || "",
      parent_id: (centro as any).parent_id || null,
      ativo: centro.ativo ?? true,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: CostCenterFormData) => {
    if (!selectedCompany) return;

    try {
      // Validar que não está tentando ser pai de si mesmo
      if (editingCentro && data.parent_id === editingCentro.id) {
        toast.error("Um centro de custo não pode ser pai de si mesmo!");
        return;
      }

      const centroData: any = {
        nome: data.nome,
        codigo: data.codigo,
        descricao: data.descricao || null,
        tipo: data.tipo,
        responsavel_id: data.responsavel_id || null,
        data_inicio: data.data_inicio || null,
        data_fim: data.data_fim || null,
        orcamento_anual: data.orcamento_anual || null,
        observacoes: data.observacoes || null,
        parent_id: data.parent_id || null,
        ativo: data.ativo,
        company_id: selectedCompany.id,
      };

      if (editingCentro) {
        const { error } = await supabase
          .from("cost_centers")
          .update(centroData)
          .eq("id", editingCentro.id);

        if (error) throw error;
        toast.success("Centro de custo atualizado!");
      } else {
        const { error } = await supabase.from("cost_centers").insert([centroData]);
        if (error) throw error;
        toast.success("Centro de custo cadastrado!");
      }

      setIsDialogOpen(false);
      fetchCentros();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    }
  };

  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const renderTreeItem = (centro: CostCenterWithChildren, nivel: number = 0) => {
    const hasChildren = centro.children && centro.children.length > 0;
    const isExpanded = expandedNodes.has(centro.id);
    const indent = nivel * 24;

    return (
      <div key={centro.id}>
        <div
          className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-md"
          style={{ paddingLeft: `${indent + 8}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleNode(centro.id)}
              className="p-1 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}
          <div className="flex-1 grid grid-cols-12 gap-4 items-center">
            <div className="col-span-2 font-mono text-sm">{centro.codigo}</div>
            <div className="col-span-4">{centro.nome}</div>
            <div className="col-span-2">
              <Badge variant="outline">
                {((centro as any).tipo || 'outros').charAt(0).toUpperCase() + ((centro as any).tipo || 'outros').slice(1)}
              </Badge>
            </div>
            <div className="col-span-2">
              <Badge variant={centro.ativo ? "default" : "secondary"}>
                {centro.ativo ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <div className="col-span-2 flex gap-2 justify-end">
              {canEditPage('/cadastros/centros-custo*') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(centro)}
                >
                  Editar
                </Button>
              )}
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {centro.children!.map(child => renderTreeItem(child, nivel + 1))}
          </div>
        )}
      </div>
    );
  };

  const columns = [
    { header: "Código", accessor: "codigo" as keyof CostCenter },
    { header: "Nome", accessor: "nome" as keyof CostCenter },
    {
      header: "Tipo",
      accessor: (item: CostCenter) => {
        const tipo = (item as any).tipo || 'outros';
        return (
          <Badge variant="outline">
            {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
          </Badge>
        );
      },
    },
    {
      header: "Status",
      accessor: (item: CostCenter) => (
        <Badge variant={item.ativo ? "default" : "secondary"}>
          {item.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
  ];

  // Filtrar centros disponíveis para parent (excluir o próprio centro se estiver editando)
  const availableParents = useMemo(() => {
    return centros.filter(c => !editingCentro || c.id !== editingCentro.id);
  }, [centros, editingCentro]);

  if (loading) return <div>Carregando...</div>;

  return (
    <RequirePage pagePath="/cadastros/centros-custo*" action="read">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Centros de Custo</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os centros de custo da empresa com hierarquia e informações detalhadas
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'tree' ? 'default' : 'outline'}
              onClick={() => setViewMode('tree')}
            >
              Árvore
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              onClick={() => setViewMode('table')}
            >
              Tabela
            </Button>
          </div>
        </div>

        {viewMode === 'tree' ? (
          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="grid grid-cols-12 gap-4 pb-2 border-b font-semibold text-sm flex-1">
                <div className="col-span-2">Código</div>
                <div className="col-span-4">Nome</div>
                <div className="col-span-2">Tipo</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2"></div>
              </div>
              {canCreatePage('/cadastros/centros-custo*') && (
                <Button onClick={handleNew} className="ml-4">
                  Novo Centro de Custo
                </Button>
              )}
            </div>
            <div className="space-y-1">
              {centrosHierarquicos.map(centro => renderTreeItem(centro))}
            </div>
            {centrosHierarquicos.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum centro de custo cadastrado
              </div>
            )}
          </div>
        ) : (
          <DataTable
            data={centros}
            columns={columns}
            onNew={canCreatePage('/cadastros/centros-custo*') ? handleNew : undefined}
            onExport={() => toast.info("Exportação em desenvolvimento")}
            searchPlaceholder="Buscar por código ou nome..."
            newButtonLabel="Novo Centro de Custo"
          />
        )}

        <PermissionGuard page="/cadastros/centros-custo*" action="create">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCentro ? "Editar" : "Novo"} Centro de Custo
                </DialogTitle>
                <DialogDescription>
                  Preencha as informações do centro de custo. Campos marcados com * são obrigatórios.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="codigo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: CC001" />
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
                            <Input {...field} placeholder="Nome do centro de custo" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="descricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Descrição detalhada do centro de custo"
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
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
                              <SelectItem value="producao">Produção</SelectItem>
                              <SelectItem value="administrativo">Administrativo</SelectItem>
                              <SelectItem value="comercial">Comercial</SelectItem>
                              <SelectItem value="financeiro">Financeiro</SelectItem>
                              <SelectItem value="operacional">Operacional</SelectItem>
                              <SelectItem value="outros">Outros</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="parent_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Centro de Custo Pai</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                            value={field.value || "none"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Nenhum (centro raiz)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Nenhum (centro raiz)</SelectItem>
                              {availableParents.map((cc) => (
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
                  </div>

                  <FormField
                    control={form.control}
                    name="responsavel_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Responsável</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                          value={field.value || "none"}
                          disabled={employeesLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={employeesLoading ? "Carregando..." : "Selecione o responsável"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {employees.length > 0 ? (
                              employees.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {emp.nome} {emp.matricula ? `(${emp.matricula})` : ''}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-employees" disabled>
                                {employeesLoading ? "Carregando..." : "Nenhum funcionário encontrado"}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="data_inicio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Início</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="data_fim"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Fim</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="orcamento_anual"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Orçamento Anual (R$)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="observacoes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Observações e notas adicionais"
                            rows={3}
                          />
                        </FormControl>
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

                  <div className="flex gap-2 justify-end pt-4">
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
