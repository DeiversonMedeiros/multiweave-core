import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserCompanyForm } from "@/components/forms/UserCompanyForm";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { useAllUserCompanies } from "@/hooks/useAllUserCompanies";
import { useCompany } from "@/lib/company-context";
import { Plus, Edit, Trash2, Users, Building2, Filter } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { RequireModule } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

export default function UserCompanies() {
  const { canCreateModule, canEditModule, canDeleteModule } = usePermissions();
  const { selectedCompany, companies } = useCompany();
  const { userCompanies, loading, deleteUserCompany } = useUserCompanies();
  const { allUserCompanies, loading: allLoading, deleteUserCompany: deleteAllUserCompany } = useAllUserCompanies();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUserCompany, setEditingUserCompany] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'current' | 'all'>('current');
  const [filterCompany, setFilterCompany] = useState<string>('all');


  // Filtrar dados baseado no modo de visualização
  const filteredData = viewMode === 'current' 
    ? userCompanies 
    : allUserCompanies.filter(uc => 
        filterCompany === 'all' || uc.company_id === filterCompany
      );

  const currentLoading = viewMode === 'current' ? loading : allLoading;

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja remover este vínculo?")) {
      try {
        if (viewMode === 'current') {
          await deleteUserCompany(id);
        } else {
          await deleteAllUserCompany(id);
        }
        toast.success("Vínculo removido com sucesso!");
      } catch (error: any) {
        toast.error(error.message || "Erro ao remover vínculo");
      }
    }
  };

  const handleEdit = (userCompany: any) => {
    setEditingUserCompany(userCompany);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingUserCompany(null);
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingUserCompany(null);
  };

  const columns = [
    {
      header: "Usuário",
      accessor: (item: any) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{item.user?.nome}</div>
            <div className="text-sm text-muted-foreground">{item.user?.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Perfil",
      accessor: (item: any) => (
        <Badge variant="secondary">
          {item.profile?.nome}
        </Badge>
      ),
    },
    {
      header: "Empresa",
      accessor: (item: any) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{item.company?.razao_social}</div>
            {item.company?.nome_fantasia && (
              <div className="text-sm text-muted-foreground">
                {item.company.nome_fantasia}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      accessor: (item: any) => (
        <Badge variant={item.ativo ? "default" : "secondary"}>
          {item.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      header: "Criado em",
      accessor: (item: any) => (
        <div className="text-sm text-muted-foreground">
          {new Date(item.created_at).toLocaleDateString('pt-BR')}
        </div>
      ),
    },
    {
      header: "Ações",
      accessor: (item: any) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(item)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(item.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (!selectedCompany) {
    return (
      <RequireModule moduleName="cadastros" action="read">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Nenhuma empresa selecionada</h3>
            <p className="text-muted-foreground">
              Selecione uma empresa para gerenciar os vínculos de usuários.
            </p>
          </div>
        </div>
      </RequireModule>
    );
  }

  return (
    <RequireModule moduleName="cadastros" action="read">
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vínculos Usuário-Empresa</h1>
          <p className="text-muted-foreground">
            Gerencie os vínculos entre usuários, empresas e perfis
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Vínculo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingUserCompany ? "Editar Vínculo" : "Novo Vínculo"}
              </DialogTitle>
            </DialogHeader>
            <UserCompanyForm
              userCompany={editingUserCompany}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
              allowCompanySelection={viewMode === 'all'}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Controles de Filtro */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Visualização:</span>
            </div>
            
            <Select value={viewMode} onValueChange={(value: 'current' | 'all') => setViewMode(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">
                  Empresa Atual ({selectedCompany?.razao_social})
                </SelectItem>
                <SelectItem value="all">Todas as Empresas</SelectItem>
              </SelectContent>
            </Select>

            {viewMode === 'all' && (
              <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {viewMode === 'current' 
              ? `Vínculos da Empresa: ${selectedCompany?.razao_social}`
              : filterCompany === 'all' 
                ? 'Todos os Vínculos'
                : `Vínculos da Empresa: ${companies.find(c => c.id === filterCompany)?.razao_social}`
            }
          </CardTitle>
          <CardDescription>
            {viewMode === 'current' 
              ? 'Lista de todos os vínculos de usuários com esta empresa'
              : 'Lista de todos os vínculos de usuários com todas as empresas'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredData}
            searchPlaceholder="Buscar por usuário..."
          />
        </CardContent>
      </Card>
    </div>
    </RequireModule>
  );
}
