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

const costCenterSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(100),
  codigo: z.string().min(1, "Código é obrigatório").max(50),
  ativo: z.boolean().default(true),
});

type CostCenterFormData = z.infer<typeof costCenterSchema>;

export default function CentrosCusto() {
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
    if (!selectedCompany) return;
    
    try {
      const { data, error } = await supabase
        .from("cost_centers")
        .select("*")
        .eq("company_id", selectedCompany.id)
        .order("codigo");

      if (error) throw error;
      setCentros(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar centros de custo: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setEditingCentro(null);
    form.reset({ nome: "", codigo: "", ativo: true });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: CostCenterFormData) => {
    if (!selectedCompany) return;

    try {
      const centroData = {
        nome: data.nome,
        codigo: data.codigo,
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

  const columns = [
    { header: "Código", accessor: "codigo" as keyof CostCenter },
    { header: "Nome", accessor: "nome" as keyof CostCenter },
    {
      header: "Status",
      accessor: (item: CostCenter) => (
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
        searchPlaceholder="Buscar por código ou nome..."
        newButtonLabel="Novo Centro de Custo"
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCentro ? "Editar" : "Novo"} Centro de Custo
            </DialogTitle>
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
