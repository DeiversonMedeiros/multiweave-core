import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Checkbox } from '../ui/checkbox';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  UserPlus
} from 'lucide-react';
import { useBankHoursAssignments, useCreateBankHoursAssignment, useUpdateBankHoursAssignment, useDeleteBankHoursAssignment, useAssignDefaultType, useAssignType } from '../../hooks/useBankHoursAssignments';
import { useBankHoursTypes } from '../../hooks/useBankHoursTypes';
import { useEmployees } from '../../hooks/rh/useEmployees';
import { BankHoursAssignmentForm } from '../../integrations/supabase/bank-hours-types-v2';

interface BankHoursAssignmentsManagerProps {
  companyId: string;
}

export function BankHoursAssignmentsManager({ companyId }: BankHoursAssignmentsManagerProps) {
  const { data: assignmentsData, loading, error } = useBankHoursAssignments();
  const { data: typesData } = useBankHoursTypes();
  const { data: employeesData } = useEmployees();
  
  const createAssignment = useCreateBankHoursAssignment();
  const updateAssignment = useUpdateBankHoursAssignment();
  const deleteAssignment = useDeleteBankHoursAssignment();
  const assignDefaultType = useAssignDefaultType();
  const assignType = useAssignType();
  
  const assignments = assignmentsData?.data || [];
  const types = typesData?.data || [];
  const employees = Array.isArray(employeesData?.data) ? employeesData.data : [];
  
  const [showForm, setShowForm] = useState(false);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<string | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [formData, setFormData] = useState<BankHoursAssignmentForm>({
    employee_id: '',
    bank_hours_type_id: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAssignment) {
        await updateAssignment.mutateAsync({ id: editingAssignment, assignment: formData });
      } else {
        await createAssignment.mutateAsync(formData);
      }
      setShowForm(false);
      setEditingAssignment(null);
      resetForm();
    } catch (err) {
      console.error('Erro ao salvar vínculo:', err);
    }
  };

  const handleBulkAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!selectedTypeId) {
        alert('Por favor, selecione um tipo de banco de horas');
        return;
      }
      
      await assignType.mutateAsync({ 
        employeeIds: selectedEmployees, 
        typeId: selectedTypeId 
      });
      setShowBulkAssign(false);
      setSelectedEmployees([]);
      setSelectedTypeId('');
    } catch (err) {
      console.error('Erro ao atribuir tipo de banco de horas:', err);
    }
  };

  const handleEdit = (assignment: any) => {
    setEditingAssignment(assignment.id);
    setFormData({
      employee_id: assignment.employee_id,
      bank_hours_type_id: assignment.bank_hours_type_id,
      notes: assignment.notes || '',
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setShowBulkAssign(false);
    setEditingAssignment(null);
    setSelectedEmployees([]);
    setSelectedTypeId('');
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este vínculo?')) {
      try {
        await deleteAssignment.mutateAsync(id);
      } catch (err) {
        console.error('Erro ao remover vínculo:', err);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      bank_hours_type_id: '',
      notes: '',
    });
  };

  const handleEmployeeSelect = (employeeId: string, checked: boolean) => {
    if (checked) {
      setSelectedEmployees(prev => [...prev, employeeId]);
    } else {
      setSelectedEmployees(prev => prev.filter(id => id !== employeeId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const unassignedEmployeeIds = employees
        .filter(emp => !assignments.some(a => a.employee_id === emp.id && a.is_active))
        .map(emp => emp.id);
      setSelectedEmployees(unassignedEmployeeIds);
    } else {
      setSelectedEmployees([]);
    }
  };

  // Filtrar funcionários que já têm vínculo ativo
  const unassignedEmployees = employees.filter(emp => 
    !assignments.some(a => a.employee_id === emp.id && a.is_active)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Carregando vínculos de banco de horas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Vínculos de Funcionários</h2>
          <p className="text-muted-foreground">
            Vincule funcionários aos tipos de banco de horas configurados
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowBulkAssign(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Atribuição em Lote
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Vínculo
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingAssignment ? 'Editar Vínculo' : 'Novo Vínculo'}
            </CardTitle>
            <CardDescription>
              Vincule um funcionário a um tipo de banco de horas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employee_id">Funcionário *</Label>
                  <Select
                    value={formData.employee_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, employee_id: value }))}
                    disabled={!!editingAssignment} // Não permitir alterar funcionário na edição
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um funcionário" />
                    </SelectTrigger>
                    <SelectContent>
                      {unassignedEmployees.map(employee => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.nome} {employee.matricula && `(${employee.matricula})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank_hours_type_id">Tipo de Banco de Horas *</Label>
                  <Select
                    value={formData.bank_hours_type_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, bank_hours_type_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {types.filter(type => type.is_active).map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name} {type.is_default && '(Padrão)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Observações opcionais sobre o vínculo"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingAssignment ? 'Atualizar' : 'Criar'} Vínculo
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showBulkAssign && (
        <Card>
          <CardHeader>
            <CardTitle>Atribuição em Lote</CardTitle>
            <CardDescription>
              Selecione o tipo de banco de horas e os funcionários para atribuir em massa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBulkAssign} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-type-select">Tipo de Banco de Horas *</Label>
                  <Select
                    value={selectedTypeId}
                    onValueChange={setSelectedTypeId}
                  >
                    <SelectTrigger id="bulk-type-select">
                      <SelectValue placeholder="Selecione um tipo de banco de horas" />
                    </SelectTrigger>
                    <SelectContent>
                      {types.filter(type => type.is_active).map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name} {type.is_default && '(Padrão)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Funcionários</Label>
                  <div className="flex items-center space-x-2 mb-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedEmployees.length === unassignedEmployees.length && unassignedEmployees.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <Label htmlFor="select-all">Selecionar todos os funcionários sem vínculo</Label>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-4">
                    {unassignedEmployees.map(employee => (
                      <div key={employee.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`employee-${employee.id}`}
                          checked={selectedEmployees.includes(employee.id)}
                          onCheckedChange={(checked) => handleEmployeeSelect(employee.id, checked as boolean)}
                        />
                        <Label htmlFor={`employee-${employee.id}`} className="flex-1 cursor-pointer">
                          {employee.nome} {employee.matricula && `(${employee.matricula})`}
                        </Label>
                      </div>
                    ))}
                  </div>

                  {unassignedEmployees.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border rounded-md">
                      <Users className="h-12 w-12 mx-auto mb-4" />
                      <p>Todos os funcionários já possuem vínculo de banco de horas</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={selectedEmployees.length === 0 || !selectedTypeId}
                >
                  Atribuir ({selectedEmployees.length} funcionário{selectedEmployees.length !== 1 ? 's' : ''})
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {assignments.map((assignment) => (
          <Card key={assignment.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold">
                      {assignment.employee?.nome || 'Funcionário não encontrado'}
                    </h3>
                    {assignment.employee?.matricula && (
                      <Badge variant="secondary">{assignment.employee.matricula}</Badge>
                    )}
                    <Badge variant={assignment.is_active ? 'default' : 'secondary'}>
                      {assignment.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Tipo:</span>
                    <Badge variant="outline">
                      {assignment.bank_hours_type?.name || 'Tipo não encontrado'}
                    </Badge>
                    {assignment.bank_hours_type?.is_default && (
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Padrão
                      </Badge>
                    )}
                  </div>

                  {assignment.notes && (
                    <p className="text-sm text-muted-foreground">{assignment.notes}</p>
                  )}

                  <p className="text-sm text-muted-foreground">
                    Vinculado em: {new Date(assignment.assigned_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(assignment)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(assignment.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {assignments.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhum vínculo encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Vincule funcionários aos tipos de banco de horas para começar a usar o sistema.
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Vínculo
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
