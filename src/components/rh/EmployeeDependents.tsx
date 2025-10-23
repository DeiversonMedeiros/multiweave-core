import React, { useState } from 'react';
import { 
  Dependent, 
  DependentCreateData, 
  DependentUpdateData,
  Employee
} from '@/integrations/supabase/rh-types';
import { useDependentManagement } from '@/hooks/rh/useDependents';
import { DependentForm } from './forms/DependentForm';
import { DependentsList } from './DependentsList';
import { Button } from '@/components/ui/button';
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
  Shield
} from 'lucide-react';

interface EmployeeDependentsProps {
  employee: Employee;
  onClose?: () => void;
}

export function EmployeeDependents({ employee, onClose }: EmployeeDependentsProps) {
  const {
    dependentsByEmployee,
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
  } = useDependentManagement(employee.id);

  const [deleteReason, setDeleteReason] = useState('');

  const handleCreateSubmit = (data: DependentCreateData) => {
    handleCreate({
      ...data,
      employee_id: employee.id,
      company_id: employee.company_id,
    });
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

  const handleSuspendConfirm = (dependent: Dependent) => {
    const reason = prompt('Motivo da suspensão (opcional):');
    handleSuspend(dependent.id, reason || undefined);
  };

  const getStatusCount = (status: string) => {
    return dependentsByEmployee.filter(d => d.status === status).length;
  };

  const getDeficiencyCount = () => {
    return dependentsByEmployee.filter(d => d.possui_deficiencia).length;
  };

  const getSpecialCareCount = () => {
    return dependentsByEmployee.filter(d => d.necessita_cuidados_especiais).length;
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dependentes de {employee.nome}</h2>
          <p className="text-muted-foreground">
            {employee.matricula && `Matrícula: ${employee.matricula}`}
            {employee.matricula && employee.cpf && ' • '}
            {employee.cpf && `CPF: ${employee.cpf}`}
          </p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        )}
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dependentsByEmployee.length}</div>
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
              {getStatusCount('ativo')}
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
              {getDeficiencyCount()}
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
              {getSpecialCareCount()}
            </div>
            <p className="text-xs text-muted-foreground">
              necessitam cuidados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status dos Dependentes */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="default">
          Ativos: {getStatusCount('ativo')}
        </Badge>
        <Badge variant="secondary">
          Inativos: {getStatusCount('inativo')}
        </Badge>
        <Badge variant="destructive">
          Suspensos: {getStatusCount('suspenso')}
        </Badge>
        <Badge variant="outline">
          Excluídos: {getStatusCount('excluido')}
        </Badge>
      </div>

      {/* Lista de Dependentes */}
      <DependentsList
        dependents={dependentsByEmployee}
        isLoading={isLoading}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
        onActivate={handleActivate}
        onSuspend={handleSuspendConfirm}
        onCreate={openCreateModal}
        showEmployeeInfo={false}
      />

      {/* Modal de Criação */}
      <Dialog open={isCreateModalOpen} onOpenChange={closeModals}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Dependente</DialogTitle>
            <DialogDescription>
              Preencha os dados do dependente de {employee.nome}
            </DialogDescription>
          </DialogHeader>
          <DependentForm
            employeeId={employee.id}
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
            employeeId={employee.id}
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
  );
}
