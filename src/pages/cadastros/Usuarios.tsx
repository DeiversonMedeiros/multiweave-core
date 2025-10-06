import { useEffect, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { User } from "@/lib/supabase-types";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UsuarioForm } from "@/components/forms/UsuarioForm";
import { toast } from "sonner";
import { RequireModule } from "@/components/RequireAuth";
import { PermissionGuard, PermissionButton } from "@/components/PermissionGuard";
import { usePermissions } from "@/hooks/usePermissions";
import { useMultiTenancy } from "@/hooks/useMultiTenancy";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<User | null>(null);
  const { canCreateModule, canEditModule, canDeleteModule } = usePermissions();
  const { currentCompany, isAdmin } = useMultiTenancy();

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("nome");

      if (error) throw error;
      setUsuarios(data || []);
    } catch (err: any) {
      console.error("Erro ao carregar usuários:", err);
      setError(err.message || 'Erro ao carregar usuários');
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (userData: any) => {
    try {
      const { error } = await supabase
        .from('users')
        .insert(userData);

      if (error) throw error;
      
      toast.success('Usuário criado com sucesso');
      fetchUsuarios();
    } catch (error: any) {
      toast.error('Erro ao criar usuário: ' + error.message);
    }
  };

  const handleUpdate = async (id: string, userData: any) => {
    try {
      const { error } = await supabase
        .from('users')
        .update(userData)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Usuário atualizado com sucesso');
      fetchUsuarios();
    } catch (error: any) {
      toast.error('Erro ao atualizar usuário: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Usuário excluído com sucesso');
      fetchUsuarios();
    } catch (error: any) {
      toast.error('Erro ao excluir usuário: ' + error.message);
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
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Erro ao carregar usuários: {error}</p>
        <button 
          onClick={fetchUsuarios}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <RequireModule moduleName="users" action="read">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Usuários</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os usuários do sistema
            {currentCompany && (
              <span className="block text-sm">
                Empresa: {currentCompany.nome_fantasia}
              </span>
            )}
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
          showNewButton={canCreateModule('users')}
        />

        <PermissionGuard module="users" action="create">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingUsuario ? "Editar" : "Novo"} Usuário
                </DialogTitle>
              </DialogHeader>
              <UsuarioForm
                usuario={editingUsuario || undefined}
                onSuccess={(userData) => {
                  setIsDialogOpen(false);
                  if (editingUsuario) {
                    handleUpdate(editingUsuario.id, userData);
                  } else {
                    handleCreate(userData);
                  }
                }}
                onCancel={() => setIsDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </PermissionGuard>
      </div>
    </RequireModule>
  );
}
