import { useEffect, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { Company } from "@/lib/supabase-types";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmpresaForm } from "@/components/forms/EmpresaForm";
import { toast } from "sonner";

export default function Empresas() {
  const [empresas, setEmpresas] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Company | null>(null);

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const fetchEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("nome_fantasia");

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar empresas: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { header: "Nome Fantasia", accessor: "nome_fantasia" as keyof Company },
    { header: "Razão Social", accessor: "razao_social" as keyof Company },
    { header: "CNPJ", accessor: "cnpj" as keyof Company },
    {
      header: "Status",
      accessor: (item: Company) => (
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Empresas / Filiais</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie as empresas e filiais do grupo
        </p>
      </div>

      <DataTable
        data={empresas}
        columns={columns}
        onNew={() => {
          setEditingEmpresa(null);
          setIsDialogOpen(true);
        }}
        onExport={() => toast.info("Exportação em desenvolvimento")}
        searchPlaceholder="Buscar por nome ou CNPJ..."
        newButtonLabel="Nova Empresa"
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEmpresa ? "Editar" : "Nova"} Empresa
            </DialogTitle>
          </DialogHeader>
          <EmpresaForm
            empresa={editingEmpresa || undefined}
            onSuccess={() => {
              setIsDialogOpen(false);
              fetchEmpresas();
            }}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
