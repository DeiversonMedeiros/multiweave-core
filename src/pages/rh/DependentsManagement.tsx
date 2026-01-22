import React from 'react';
import { useDependentManagement } from '@/hooks/rh/useDependents';
import { DependentForm } from '@/components/rh/forms/DependentForm';
import { DependentsList } from '@/components/rh/DependentsList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Users, 
  UserCheck, 
  UserX, 
  AlertTriangle,
  FileText,
  Heart,
  Shield,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { DependentCreateData, DependentUpdateData } from '@/integrations/supabase/rh-types';

import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

export default function DependentsManagement() {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  const {
    dependents,
    stats,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isActivating,
    isSuspending,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleActivate,
    handleSuspend,
    openCreateModal,
    openEditModal,
    openDeleteModal,
    closeModals,
    isCreateModalOpen,
    isEditModalOpen,
    isDeleteModalOpen,
    selectedDependent
  } = useDependentManagement();

  const [deleteReason, setDeleteReason] = React.useState('');

  const handleCreateSubmit = (data: DependentCreateData) => {
    handleCreate(data);
  };

  const handleUpdateSubmit = (data: DependentUpdateData) => {
    if (selectedDependent) {
      handleUpdate(selectedDependent.id, data);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedDependent) {
      handleDelete(selectedDependent.id, deleteReason || undefined);
      setDeleteReason('');
    }
  };

  const handleSuspendConfirm = (dependent: any) => {
    const reason = prompt('Motivo da suspensão (opcional):');
    handleSuspend(dependent.id, reason || undefined);
  };

  return (
    <RequirePage pagePath="/rh/dependents*" action="read">
      <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dependentes</h1>
          <p className="text-muted-foreground">
            Gerencie os dependentes de todos os funcionários
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                dependentes cadastrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ativos</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.ativos}
              </div>
              <p className="text-xs text-muted-foreground">
                dependentes ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Com Deficiência</CardTitle>
              <Shield className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.comDeficiencia}
              </div>
              <p className="text-xs text-muted-foreground">
                com deficiência
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cuidados Especiais</CardTitle>
              <Heart className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.cuidadosEspeciais}
              </div>
              <p className="text-xs text-muted-foreground">
                necessitam cuidados
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Distribuição por Parentesco */}
      {stats?.porParentesco && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Distribuição por Parentesco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.porParentesco).map(([parentesco, count]) => (
                <Badge key={parentesco} variant="outline" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {parentesco}: {count as number}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Dependentes */}
      <DependentsList
        dependents={dependents}
        isLoading={isLoading}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
        onActivate={handleActivate}
        onSuspend={handleSuspendConfirm}
        onCreate={openCreateModal}
        showEmployeeInfo={true}
      />

      {/* Modal de Criação */}
      <Dialog open={isCreateModalOpen} onOpenChange={closeModals}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Dependente</DialogTitle>
            <DialogDescription>
              Preencha os dados do novo dependente
            </DialogDescription>
          </DialogHeader>
          <DependentForm
            onSubmit={handleCreateSubmit}
            onCancel={closeModals}
            isLoading={isCreating}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={isEditModalOpen} onOpenChange={closeModals}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Dependente</DialogTitle>
            <DialogDescription>
              Atualize os dados do dependente {selectedDependent?.nome}
            </DialogDescription>
          </DialogHeader>
          <DependentForm
            dependent={selectedDependent || undefined}
            onSubmit={handleUpdateSubmit}
            onCancel={closeModals}
            isLoading={isUpdating}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={closeModals}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o dependente <strong>{selectedDependent?.nome}</strong>?
              <br />
              <br />
              Esta ação marcará o dependente como excluído, mas manterá os dados para fins de auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label htmlFor="delete-reason" className="text-sm font-medium">
              Motivo da exclusão (opcional):
            </label>
            <textarea
              id="delete-reason"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Digite o motivo da exclusão..."
              className="w-full p-2 border rounded-md resize-none"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteReason('')}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </RequirePage>
  );
}
