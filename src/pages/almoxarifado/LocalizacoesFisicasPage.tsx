import { useEffect, useState } from "react";
import { DataTable } from "@/components/DataTable";
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
import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { useAlmoxarifados } from '@/hooks/almoxarifado/useAlmoxarifadosQuery';
import { useLocalizacoesFisicas, type LocalizacaoFisica } from '@/hooks/almoxarifado/useLocalizacoesFisicas';
import { EntityService } from '@/services/generic/entityService';
import { MapPin, Building2, Grid3x3, Edit, Trash2 } from "lucide-react";

const localizacaoSchema = z.object({
  almoxarifado_id: z.string().min(1, "Almoxarifado é obrigatório"),
  rua: z.string().max(10).optional(),
  nivel: z.string().max(10).optional(),
  posicao: z.string().max(10).optional(),
  descricao: z.string().optional(),
  ativo: z.boolean().default(true),
});

type LocalizacaoFormData = z.infer<typeof localizacaoSchema>;

export default function LocalizacoesFisicasPage() {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  const { data: almoxarifados = [] } = useAlmoxarifados();
  const [selectedAlmoxarifadoId, setSelectedAlmoxarifadoId] = useState<string>("");
  const [localizacoes, setLocalizacoes] = useState<LocalizacaoFisica[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocalizacao, setEditingLocalizacao] = useState<LocalizacaoFisica | null>(null);
  const { selectedCompany } = useCompany();

  const form = useForm<LocalizacaoFormData>({
    resolver: zodResolver(localizacaoSchema),
    defaultValues: {
      almoxarifado_id: "",
      rua: "",
      nivel: "",
      posicao: "",
      descricao: "",
      ativo: true,
    },
  });

  useEffect(() => {
    if (selectedAlmoxarifadoId && selectedCompany) {
      fetchLocalizacoes();
    } else {
      setLocalizacoes([]);
    }
  }, [selectedAlmoxarifadoId, selectedCompany]);

  const fetchLocalizacoes = async () => {
    if (!selectedAlmoxarifadoId || !selectedCompany?.id) return;

    try {
      setLoading(true);
      const result = await EntityService.list<LocalizacaoFisica>({
        schema: 'almoxarifado',
        table: 'localizacoes_fisicas',
        companyId: selectedCompany.id,
        filters: { almoxarifado_id: selectedAlmoxarifadoId },
        orderBy: 'rua, nivel, posicao',
        orderDirection: 'ASC'
      });

      setLocalizacoes(result.data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar localizações: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    if (!selectedAlmoxarifadoId) {
      toast.error("Selecione um almoxarifado primeiro");
      return;
    }
    setEditingLocalizacao(null);
    form.reset({
      almoxarifado_id: selectedAlmoxarifadoId,
      rua: "",
      nivel: "",
      posicao: "",
      descricao: "",
      ativo: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (localizacao: LocalizacaoFisica) => {
    setEditingLocalizacao(localizacao);
    form.reset({
      almoxarifado_id: localizacao.almoxarifado_id,
      rua: localizacao.rua || "",
      nivel: localizacao.nivel || "",
      posicao: localizacao.posicao || "",
      descricao: localizacao.descricao || "",
      ativo: localizacao.ativo,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (localizacao: LocalizacaoFisica) => {
    const localizacaoStr = [localizacao.rua, localizacao.nivel, localizacao.posicao]
      .filter(Boolean)
      .join("-") || "esta localização";
    
    if (!confirm(`Tem certeza que deseja excluir a localização "${localizacaoStr}"?`)) {
      return;
    }

    if (!selectedCompany?.id) return;

    try {
      await EntityService.update({
        schema: 'almoxarifado',
        table: 'localizacoes_fisicas',
        companyId: selectedCompany.id,
        id: localizacao.id,
        data: { ativo: false }
      });
      toast.success("Localização excluída com sucesso!");
      fetchLocalizacoes();
    } catch (error: any) {
      toast.error("Erro ao excluir localização: " + error.message);
    }
  };

  const onSubmit = async (data: LocalizacaoFormData) => {
    if (!selectedCompany) return;

    try {
      const localizacaoData = {
        almoxarifado_id: data.almoxarifado_id,
        rua: data.rua || null,
        nivel: data.nivel || null,
        posicao: data.posicao || null,
        descricao: data.descricao || null,
        ativo: data.ativo,
      };

      if (editingLocalizacao) {
        await EntityService.update<LocalizacaoFisica>({
          schema: 'almoxarifado',
          table: 'localizacoes_fisicas',
          companyId: selectedCompany.id,
          id: editingLocalizacao.id,
          data: localizacaoData
        });
        toast.success("Localização atualizada!");
      } else {
        await EntityService.create<LocalizacaoFisica>({
          schema: 'almoxarifado',
          table: 'localizacoes_fisicas',
          companyId: selectedCompany.id,
          data: localizacaoData
        });
        toast.success("Localização cadastrada!");
      }

      setIsDialogOpen(false);
      fetchLocalizacoes();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    }
  };

  const getLocalizacaoString = (localizacao: LocalizacaoFisica) => {
    const parts = [localizacao.rua, localizacao.nivel, localizacao.posicao].filter(Boolean);
    return parts.length > 0 ? parts.join("-") : "Não definido";
  };

  const getAlmoxarifadoNome = (almoxarifadoId: string) => {
    const almoxarifado = almoxarifados.find(a => a.id === almoxarifadoId);
    return almoxarifado ? `${almoxarifado.codigo} - ${almoxarifado.nome}` : "-";
  };

  const columns = [
    {
      header: "Localização",
      accessor: (item: LocalizacaoFisica) => (
        <div className="flex items-center gap-2">
          <Grid3x3 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{getLocalizacaoString(item)}</span>
        </div>
      ),
    },
    {
      header: "Descrição",
      accessor: (item: LocalizacaoFisica) => item.descricao || "-",
    },
    {
      header: "Status",
      accessor: (item: LocalizacaoFisica) => (
        <Badge variant={item.ativo ? "default" : "secondary"}>
          {item.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      header: "Ações",
      accessor: (item: LocalizacaoFisica) => (
        <div className="flex gap-2">
          {canEditPage('/almoxarifado/localizacoes*') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(item)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {canDeletePage('/almoxarifado/localizacoes*') && (
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

  return (
    <RequirePage pagePath="/almoxarifado/localizacoes*" action="read">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MapPin className="h-8 w-8" />
            Localizações Físicas
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as localizações físicas dentro dos almoxarifados
          </p>
        </div>

        <div className="flex gap-4 items-end">
          <div className="flex-1 max-w-md">
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Almoxarifado
            </label>
            <Select value={selectedAlmoxarifadoId} onValueChange={setSelectedAlmoxarifadoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um almoxarifado..." />
              </SelectTrigger>
              <SelectContent>
                {almoxarifados
                  .filter(a => a.ativo)
                  .map((almoxarifado) => (
                    <SelectItem key={almoxarifado.id} value={almoxarifado.id}>
                      {almoxarifado.codigo} - {almoxarifado.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {selectedAlmoxarifadoId && (
            <Button 
              onClick={handleNew}
              disabled={!canCreatePage('/almoxarifado/localizacoes*')}
            >
              Nova Localização
            </Button>
          )}
        </div>

        {selectedAlmoxarifadoId ? (
          loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando localizações...
            </div>
          ) : (
            <DataTable
              data={localizacoes}
              columns={columns}
              onNew={canCreatePage('/almoxarifado/localizacoes*') ? handleNew : undefined}
              onExport={() => toast.info("Exportação em desenvolvimento")}
              searchPlaceholder="Buscar localizações..."
              newButtonLabel="Nova Localização"
            />
          )
        ) : (
          <div className="border-2 border-dashed rounded-lg p-12 text-center text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-base font-medium mb-1">Nenhum almoxarifado selecionado</p>
            <p className="text-sm">Selecione um almoxarifado acima para visualizar suas localizações</p>
          </div>
        )}

        <PermissionGuard entity="localizacoes_fisicas" action="create">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {editingLocalizacao ? "Editar" : "Nova"} Localização Física
                </DialogTitle>
                <DialogDescription>
                  {editingLocalizacao 
                    ? "Edite as informações da localização física" 
                    : "Preencha os dados para criar uma nova localização física no almoxarifado"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="almoxarifado_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Almoxarifado *
                        </FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={!!editingLocalizacao}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o almoxarifado..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {almoxarifados
                              .filter(a => a.ativo)
                              .map((almoxarifado) => (
                                <SelectItem key={almoxarifado.id} value={almoxarifado.id}>
                                  {almoxarifado.codigo} - {almoxarifado.nome}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="rua"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rua</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: A, B, C" maxLength={10} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="nivel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nível</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: 1, 2, 3" maxLength={10} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="posicao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Posição</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: 01, 02, 03" maxLength={10} />
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
                            placeholder="Descrição adicional da localização..."
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
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">
                      Salvar
                    </Button>
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

