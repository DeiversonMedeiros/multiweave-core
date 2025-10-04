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
    if (selectedCompany) {
      fetchMateriais();
    }
  }, [selectedCompany]);

  const fetchMateriais = async () => {
    if (!selectedCompany) return;
    
    try {
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .eq("company_id", selectedCompany.id)
        .order("codigo");

      if (error) throw error;
      setMateriais(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar materiais: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setEditingMaterial(null);
    form.reset({
      nome: "",
      codigo: "",
      tipo: "produto",
      unidade_medida: "",
      classe: "",
      ncm: "",
      cfop: "",
      cst: "",
      ativo: true,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: MaterialFormData) => {
    if (!selectedCompany) return;

    try {
      const materialData = {
        nome: data.nome,
        codigo: data.codigo,
        tipo: data.tipo,
        unidade_medida: data.unidade_medida,
        classe: data.classe || null,
        ncm: data.ncm || null,
        cfop: data.cfop || null,
        cst: data.cst || null,
        ativo: data.ativo,
        company_id: selectedCompany.id,
      };

      if (editingMaterial) {
        const { error } = await supabase
          .from("materials")
          .update(materialData)
          .eq("id", editingMaterial.id);

        if (error) throw error;
        toast.success("Material atualizado!");
      } else {
        const { error } = await supabase.from("materials").insert([materialData]);
        if (error) throw error;
        toast.success("Material cadastrado!");
      }

      setIsDialogOpen(false);
      fetchMateriais();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      produto: "Produto",
      servico: "Serviço",
      materia_prima: "Matéria-Prima",
    };
    return labels[tipo] || tipo;
  };

  const columns = [
    { header: "Código", accessor: "codigo" as keyof Material },
    { header: "Nome", accessor: "nome" as keyof Material },
    {
      header: "Tipo",
      accessor: (item: Material) => (
        <Badge variant="outline">{getTipoLabel(item.tipo)}</Badge>
      ),
    },
    { header: "UN", accessor: "unidade_medida" as keyof Material },
    {
      header: "Status",
      accessor: (item: Material) => (
        <Badge variant={item.ativo ? "default" : "secondary"}>
          {item.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
  ];

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Materiais e Serviços</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie produtos, serviços e matérias-primas
        </p>
      </div>

      <DataTable
        data={materiais}
        columns={columns}
        onNew={handleNew}
        onExport={() => toast.info("Exportação em desenvolvimento")}
        searchPlaceholder="Buscar por código ou nome..."
        newButtonLabel="Novo Material"
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMaterial ? "Editar" : "Novo"} Material</DialogTitle>
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="produto">Produto</SelectItem>
                          <SelectItem value="servico">Serviço</SelectItem>
                          <SelectItem value="materia_prima">Matéria-Prima</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
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
                  name="unidade_medida"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade de Medida *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="UN, KG, M, etc" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="classe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Classe</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input {...field} />
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cst"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CST</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
    </div>
  );
}
