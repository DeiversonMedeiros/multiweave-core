import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileForm } from "@/components/forms/ProfileForm";
import { PermissionManager } from "@/components/PermissionManager";
import { PermissionSync } from "@/components/PermissionSync";
import { UserPermissions } from "@/components/UserPermissions";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/lib/supabase-types";
import { Plus, Edit, Trash2, Shield, Users, Settings, Key } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { RequireModule } from "@/components/RequireAuth";

export default function Perfis() {
  const { isAdmin } = usePermissions();
  const [searchParams] = useSearchParams();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState("perfis");

  useEffect(() => {
    loadProfiles();
  }, []);

  // Detectar query string para abrir aba específica
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['perfis', 'permissoes', 'minhas-permissoes'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("nome");

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar perfis:", error);
      toast.error("Erro ao carregar perfis: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este perfil? Esta ação não pode ser desfeita.")) {
      try {
        // Verificar se o perfil está sendo usado
        const { data: userCompanies, error: checkError } = await supabase
          .from("user_companies")
          .select("id")
          .eq("profile_id", id)
          .limit(1);

        if (checkError) throw checkError;

        if (userCompanies && userCompanies.length > 0) {
          toast.error("Este perfil está sendo usado por usuários e não pode ser excluído.");
          return;
        }

        const { error } = await supabase
          .from("profiles")
          .delete()
          .eq("id", id);

        if (error) throw error;

        toast.success("Perfil excluído com sucesso!");
        loadProfiles();
      } catch (error: any) {
        console.error("Erro ao excluir perfil:", error);
        toast.error("Erro ao excluir perfil: " + error.message);
      }
    }
  };

  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingProfile(null);
    loadProfiles();
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingProfile(null);
  };

  const columns = [
    {
      header: "Nome",
      accessor: (item: Profile) => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{item.nome}</div>
            {item.descricao && (
              <div className="text-sm text-muted-foreground">{item.descricao}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      accessor: (item: Profile) => (
        <Badge variant={item.is_active ? "default" : "secondary"}>
          {item.is_active ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      header: "Criado em",
      accessor: (item: Profile) => (
        <div className="text-sm text-muted-foreground">
          {new Date(item.created_at).toLocaleDateString('pt-BR')}
        </div>
      ),
    },
    {
      header: "Ações",
      accessor: (item: Profile) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(item)}
            title="Editar perfil"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(item.id)}
            title="Excluir perfil"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Acesso Negado</h3>
          <p className="text-muted-foreground">
            Apenas super administradores podem gerenciar perfis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <RequireModule moduleName="configuracoes" action="read">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gerenciamento de Perfis e Permissões</h1>
            <p className="text-muted-foreground">
              Crie e gerencie perfis de acesso e configure suas permissões específicas
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="perfis" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Perfis de Acesso
            </TabsTrigger>
            <TabsTrigger value="permissoes" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Gerenciar Permissões
            </TabsTrigger>
            <TabsTrigger value="minhas-permissoes" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Minhas Permissões
            </TabsTrigger>
          </TabsList>

          <TabsContent value="perfis" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Perfis de Acesso</h2>
                <p className="text-muted-foreground">
                  Crie e gerencie perfis para diferentes tipos de usuários
                </p>
              </div>
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Perfil
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProfile ? "Editar Perfil" : "Novo Perfil"}
                    </DialogTitle>
                  </DialogHeader>
                  <ProfileForm
                    profile={editingProfile || undefined}
                    onSuccess={handleFormSuccess}
                    onCancel={handleFormCancel}
                  />
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Lista de Perfis
                </CardTitle>
                <CardDescription>
                  Todos os perfis disponíveis no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={columns}
                  data={profiles}
                  searchPlaceholder="Buscar por nome do perfil..."
                  loading={loading}
                />
              </CardContent>
            </Card>
          </TabsContent>

            <TabsContent value="permissoes" className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold">Gerenciar Permissões</h2>
                <p className="text-muted-foreground">
                  Configure as permissões específicas para cada perfil
                </p>
              </div>
              <PermissionSync />
              <PermissionManager />
            </TabsContent>

          <TabsContent value="minhas-permissoes" className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold">Minhas Permissões</h2>
              <p className="text-muted-foreground">
                Visualize suas permissões atuais no sistema
              </p>
            </div>
            <UserPermissions showDetails={true} />
          </TabsContent>
        </Tabs>
      </div>
    </RequireModule>
  );
}
