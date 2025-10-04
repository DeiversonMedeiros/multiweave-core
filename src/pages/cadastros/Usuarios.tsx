import { useEffect, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { User } from "@/lib/supabase-types";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UsuarioForm } from "@/components/forms/UsuarioForm";
import { toast } from "sonner";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<User | null>(null);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("nome");

      if (error) throw error;
      setUsuarios(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar usuários: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { header: "Nome", accessor: "nome" as keyof User },
    { header: "Email", accessor: "email" as keyof User },
    {
      header: "Status",
      accessor: (item: User) => (
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
        <h1 className="text-3xl font-bold">Usuários</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie os usuários do sistema
        </p>
      </div>

      <DataTable
        data={usuarios}
        columns={columns}
        onNew={() => {
          setEditingUsuario(null);
          setIsDialogOpen(true);
        }}
        onExport={() => toast.info("Exportação em desenvolvimento")}
        searchPlaceholder="Buscar por nome ou email..."
        newButtonLabel="Novo Usuário"
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingUsuario ? "Editar" : "Novo"} Usuário
            </DialogTitle>
          </DialogHeader>
          <UsuarioForm
            usuario={editingUsuario || undefined}
            onSuccess={() => {
              setIsDialogOpen(false);
              fetchUsuarios();
            }}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
