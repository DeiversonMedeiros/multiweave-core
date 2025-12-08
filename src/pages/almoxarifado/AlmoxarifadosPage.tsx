import { useEffect, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCompany } from "@/lib/company-context";
import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  useAlmoxarifados, 
  useCreateAlmoxarifado, 
  useUpdateAlmoxarifado, 
  useDeleteAlmoxarifado 
} from '@/hooks/almoxarifado/useAlmoxarifadosQuery';
import type { Almoxarifado } from '@/services/almoxarifado/almoxarifadoService';
import { Building2, MapPin, User, Edit, Trash2 } from "lucide-react";

const almoxarifadoSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(255),
  codigo: z.string().min(1, "Código é obrigatório").max(50),
  endereco: z.string().optional(),
  responsavel_id: z.string().optional(),
  ativo: z.boolean().default(true),
});

type AlmoxarifadoFormData = z.infer<typeof almoxarifadoSchema>;

export default function AlmoxarifadosPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { data: almoxarifados = [], isLoading } = useAlmoxarifados();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAlmoxarifado, setEditingAlmoxarifado] = useState<Almoxarifado | null>(null);
  const [usuarios, setUsuarios] = useState<Array<{ id: string; nome: string }>>([]);
  const { selectedCompany } = useCompany();

  const createMutation = useCreateAlmoxarifado();
  const updateMutation = useUpdateAlmoxarifado();
  const deleteMutation = useDeleteAlmoxarifado();

  const form = useForm<AlmoxarifadoFormData>({
    resolver: zodResolver(almoxarifadoSchema),
    defaultValues: {
      nome: "",
      codigo: "",
      endereco: "",
      responsavel_id: "",
      ativo: true,
    },
  });

  useEffect(() => {
    if (selectedCompany) {
      fetchUsuarios();
    }
  }, [selectedCompany]);

  const fetchUsuarios = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      setUsuarios(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar usuários:", error);
    }
  };

  const handleNew = () => {
    setEditingAlmoxarifado(null);
    form.reset({
      nome: "",
      codigo: "",
      endereco: "",
      responsavel_id: "",
      ativo: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (almoxarifado: Almoxarifado) => {
    setEditingAlmoxarifado(almoxarifado);
    form.reset({
      nome: almoxarifado.nome,
      codigo: almoxarifado.codigo,
      endereco: almoxarifado.endereco || "",
      responsavel_id: almoxarifado.responsavel_id || "",
      ativo: almoxarifado.ativo,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (almoxarifado: Almoxarifado) => {
    if (!confirm(`Tem certeza que deseja excluir o almoxarifado "${almoxarifado.nome}"?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(almoxarifado.id);
      toast.success("Almoxarifado excluído com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao excluir almoxarifado: " + error.message);
    }
  };

  const onSubmit = async (data: AlmoxarifadoFormData) => {
    if (!selectedCompany) return;

    try {
      const almoxarifadoData = {
        nome: data.nome,
        codigo: data.codigo,
        endereco: data.endereco || null,
        responsavel_id: data.responsavel_id || null,
        ativo: data.ativo,
      };

      if (editingAlmoxarifado) {
        await updateMutation.mutateAsync({
          id: editingAlmoxarifado.id,
          data: almoxarifadoData,
        });
        toast.success("Almoxarifado atualizado!");
      } else {
        await createMutation.mutateAsync(almoxarifadoData);
        toast.success("Almoxarifado cadastrado!");
      }

      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    }
  };

  const columns = [
    { header: "Código", accessor: "codigo" as keyof Almoxarifado },
    { header: "Nome", accessor: "nome" as keyof Almoxarifado },
    {
      header: "Endereço",
      accessor: (item: Almoxarifado) => item.endereco || "-",
    },
    {
      header: "Status",
      accessor: (item: Almoxarifado) => (
        <Badge variant={item.ativo ? "default" : "secondary"}>
          {item.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      header: "Ações",
      accessor: (item: Almoxarifado) => (
        <div className="flex gap-2">
          {canEditEntity('almoxarifados') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(item)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {canDeleteEntity('almoxarifados') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(item)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) return <div>Carregando...</div>;

  return (
    <RequireEntity entityName="almoxarifados" action="read">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Almoxarifados
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os almoxarifados da empresa
          </p>
        </div>

        <DataTable
          data={almoxarifados}
          columns={columns}
          onNew={canCreateEntity('almoxarifados') ? handleNew : undefined}
          onExport={() => toast.info("Exportação em desenvolvimento")}
          searchPlaceholder="Buscar por código ou nome..."
          newButtonLabel="Novo Almoxarifado"
        />

        <PermissionGuard entity="almoxarifados" action="create">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {editingAlmoxarifado ? "Editar" : "Novo"} Almoxarifado
                </DialogTitle>
                <DialogDescription>
                  {editingAlmoxarifado 
                    ? "Edite as informações do almoxarifado" 
                    : "Preencha os dados para criar um novo almoxarifado"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="codigo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: ALM-001" />
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
                            <Input {...field} placeholder="Ex: Almoxarifado Central" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="endereco"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Endereço
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Endereço completo do almoxarifado..."
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="responsavel_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Responsável
                        </FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value === "none" ? "" : value);
                          }} 
                          value={field.value && field.value !== "" ? field.value : "none"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o responsável..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhum responsável</SelectItem>
                            {usuarios.map((usuario) => (
                              <SelectItem key={usuario.id} value={usuario.id}>
                                {usuario.nome}
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

                  <div className="flex gap-2 justify-end pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {createMutation.isPending || updateMutation.isPending 
                        ? "Salvando..." 
                        : "Salvar"}
                    </Button>
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

