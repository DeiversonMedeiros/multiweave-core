import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Clock,
  User,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { EmployeeShift, WorkShift } from '@/integrations/supabase/rh-types';

interface EmployeeShiftManagementProps {
  employeeShifts: EmployeeShift[];
  workShifts: WorkShift[];
  employees: any[]; // Assumindo que existe um tipo Employee
  onAdd: (data: any) => void;
  onEdit: (id: string, data: any) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export function EmployeeShiftManagement({
  employeeShifts,
  workShifts,
  employees,
  onAdd,
  onEdit,
  onDelete,
  isLoading = false
}: EmployeeShiftManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingShift, setEditingShift] = useState<EmployeeShift | null>(null);
  const [formData, setFormData] = useState({
    funcionario_id: '',
    turno_id: '',
    data_inicio: '',
    data_fim: '',
    ativo: true,
    observacoes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingShift) {
      onEdit(editingShift.id, formData);
    } else {
      onAdd(formData);
    }
    
    setShowForm(false);
    setEditingShift(null);
    setFormData({
      funcionario_id: '',
      turno_id: '',
      data_inicio: '',
      data_fim: '',
      ativo: true,
      observacoes: ''
    });
  };

  const handleEdit = (shift: EmployeeShift) => {
    setEditingShift(shift);
    setFormData({
      funcionario_id: shift.funcionario_id || '',
      turno_id: shift.turno_id || '',
      data_inicio: shift.data_inicio || '',
      data_fim: shift.data_fim || '',
      ativo: shift.ativo || true,
      observacoes: shift.observacoes || ''
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingShift(null);
    setFormData({
      funcionario_id: '',
      turno_id: '',
      data_inicio: '',
      data_fim: '',
      ativo: true,
      observacoes: ''
    });
  };

  const filteredShifts = employeeShifts.filter(shift =>
    (shift.funcionario_nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (shift.turno_nome || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee?.nome || 'Funcionário não encontrado';
  };

  const getWorkShiftName = (shiftId: string) => {
    const shift = workShifts.find(ws => ws.id === shiftId);
    return shift?.nome || 'Turno não encontrado';
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Carregando turnos de funcionários...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Turnos de Funcionários</h2>
          <p className="text-muted-foreground">
            Gerencie os turnos atribuídos aos funcionários
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Atribuição
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar por funcionário ou turno..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle>Atribuições de Turnos</CardTitle>
          <CardDescription>
            {filteredShifts.length} atribuição(ões) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredShifts.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma atribuição encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Data Início</TableHead>
                  <TableHead>Data Fim</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">
                          {getEmployeeName(shift.funcionario_id || '')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{getWorkShiftName(shift.turno_id || '')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(shift.data_inicio || '').toLocaleDateString('pt-BR')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {shift.data_fim ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {new Date(shift.data_fim).toLocaleDateString('pt-BR')}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={shift.ativo ? 'default' : 'secondary'}>
                        {shift.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(shift)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDelete(shift.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                {editingShift ? 'Editar Atribuição' : 'Nova Atribuição'}
              </CardTitle>
              <CardDescription>
                {editingShift 
                  ? 'Atualize as informações da atribuição de turno.' 
                  : 'Preencha as informações para criar uma nova atribuição.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="funcionario_id">Funcionário</Label>
                  <Select
                    value={formData.funcionario_id}
                    onValueChange={(value) => setFormData({ ...formData, funcionario_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o funcionário" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees && employees.length > 0 ? (
                        employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.nome}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-employees" disabled>
                          Nenhum funcionário encontrado
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="turno_id">Turno</Label>
                  <Select
                    value={formData.turno_id}
                    onValueChange={(value) => setFormData({ ...formData, turno_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o turno" />
                    </SelectTrigger>
                    <SelectContent>
                      {workShifts.map((shift) => (
                        <SelectItem key={shift.id} value={shift.id}>
                          {shift.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_inicio">Data Início</Label>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_fim">Data Fim (opcional)</Label>
                  <Input
                    id="data_fim"
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="ativo">Ativo</Label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingShift ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

