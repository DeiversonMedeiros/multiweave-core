import { useEffect, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { User } from "@/lib/supabase-types";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UsuarioForm } from "@/components/forms/UsuarioForm";
import { UpdatePasswordDialog } from "@/components/forms/UpdatePasswordDialog";
import { Button } from "@/components/ui/button";
import { Key, Edit } from "lucide-react";
import { toast } from "sonner";
import { RequireEntity } from "@/components/RequireAuth";
import { PermissionGuard } from "@/components/PermissionGuard";
import { usePermissions } from "@/hooks/usePermissions";
import { useMultiTenancy } from "@/hooks/useMultiTenancy";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<User | null>(null);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<User | null>(null);
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
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

  const handleUpdatePassword = (user: User) => {
    setSelectedUserForPassword(user);
    setIsPasswordDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUsuario(user);
    setIsDialogOpen(true);
  };

  const handleExport = () => {
    try {
      if (usuarios.length === 0) {
        toast.warning("Não há usuários para exportar");
        return;
      }

      // Definir cabeçalhos do CSV
      const headers = ["Nome", "Email", "Nome de Usuário", "Status", "Data de Criação", "Data de Atualização"];
      
      // Converter dados para linhas CSV
      const rows = usuarios.map((user) => {
        const formatDate = (date: string | null | undefined) => {
          if (!date) return "";
          try {
            return new Date(date).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
          } catch {
            return date;
          }
        };

        const escapeCSV = (value: any) => {
          if (value === null || value === undefined) return "";
          const stringValue = String(value);
          // Se contém vírgula, aspas ou quebra de linha, envolver em aspas e escapar aspas internas
          if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        };

        return [
          escapeCSV(user.nome),
          escapeCSV(user.email),
          escapeCSV(user.username || ""),
          escapeCSV(user.ativo ? "Ativo" : "Inativo"),
          escapeCSV(formatDate(user.created_at)),
          escapeCSV(formatDate(user.updated_at)),
        ].join(",");
      });

      // Combinar cabeçalhos e linhas
      const csvContent = [headers.join(","), ...rows].join("\n");

      // Adicionar BOM para UTF-8 (garante que Excel abra corretamente)
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

      // Criar link de download
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `usuarios_${timestamp}.csv`;

      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exportação concluída: ${usuarios.length} usuário(s) exportado(s)`);
    } catch (error: any) {
      console.error("Erro ao exportar usuários:", error);
      toast.error("Erro ao exportar usuários: " + (error.message || "Erro desconhecido"));
    }
  };

  const columns = [
    { header: "Nome", accessor: "nome" as keyof User },
    { header: "Email", accessor: "email" as keyof User },
    { header: "Nome de usuário", accessor: "username" as keyof User },
    {
      header: "Status",
      accessor: (item: User) => (
        <Badge variant={item.ativo ? "default" : "secondary"} className={item.ativo ? "badge-success" : ""}>
          {item.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      header: "Ações",
      accessor: (item: User) => {
        const canUpdate = canEditEntity('users'); // Usar canEditEntity para update também
        return (
          <div className="flex gap-2">
            {canUpdate && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(item)}
                  title="Editar usuário"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUpdatePassword(item)}
                  title="Atualizar senha"
                >
                  <Key className="h-4 w-4 mr-1" />
                  Senha
                </Button>
              </>
            )}
          </div>
        );
      },
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
    <RequireEntity entityName="users" action="read">
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
          onNew={canCreateEntity('users') ? () => {
            setEditingUsuario(null);
            setIsDialogOpen(true);
          } : undefined}
          onExport={handleExport}
          searchPlaceholder="Buscar por nome, email ou usuário..."
          newButtonLabel="Novo Usuário"
        />

        {(canCreateEntity('users') || canEditEntity('users')) && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingUsuario(null);
            }
          }}>
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
                  setEditingUsuario(null);
                  fetchUsuarios();
                }}
                onCancel={() => {
                  setIsDialogOpen(false);
                  setEditingUsuario(null);
                }}
              />
            </DialogContent>
          </Dialog>
        )}

        {selectedUserForPassword && (
          <UpdatePasswordDialog
            user={selectedUserForPassword}
            open={isPasswordDialogOpen}
            onOpenChange={(open) => {
              setIsPasswordDialogOpen(open);
              if (!open) {
                setSelectedUserForPassword(null);
              }
            }}
            onSuccess={() => {
              fetchUsuarios();
            }}
          />
        )}
      </div>
    </RequireEntity>
  );
}
